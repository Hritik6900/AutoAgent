"""LLM wrapper: Groq for the cheap/fast tier (planner, per-task summarization,
fact-check, enrichment), Gemini for the strong tier (final report synthesis only).
Both are used via their OpenAI-compatible chat-completions endpoints, so a single
generic caller handles both - no separate request/response parsing per provider.
"""
import asyncio
import json
import os
import re

import httpx

GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

# Groq's free tier is 12,000 tokens/minute, which a few back-to-back jobs will exhaust.
# Its 429 body says exactly how long to wait ("Please try again in 5.51s"), so honour that
# rather than guessing. Worth waiting for: the caller has already paid for this task over
# x402, and giving up here means shipping a heuristic answer for a call that cost money.
_RETRY_AFTER = re.compile(r"try again in ([0-9.]+)\s*(ms|s)\b", re.I)
_MAX_RATE_LIMIT_WAIT = 15.0


def _retry_after_seconds(body: str) -> float:
    m = _RETRY_AFTER.search(body)
    if not m:
        return 3.0
    value = float(m.group(1))
    seconds = value / 1000 if m.group(2).lower() == "ms" else value
    # A little headroom, then clamp - a long stated wait means the window is genuinely
    # exhausted and blocking a paid request on it is worse than degrading.
    return min(seconds + 0.4, _MAX_RATE_LIMIT_WAIT)


# Which work goes to which provider, and why the split exists.
#
#   cheap  -> Groq    the paid microservices' own reasoning (planner, fact-check,
#                     enrichment, summarizer). This is the work a caller pays x402 for.
#   strong -> Gemini  final report synthesis.
#   aux    -> Gemini  orchestrator-side extras: the live narration feed and the
#                     self-critique pass.
#
# `aux` exists to keep those extras off Groq. They are free niceties, but they are also
# chatty - one job alone made enough calls to exhaust Groq's 12,000 tokens/minute free
# tier, at which point the *paid* tasks were the ones degrading to heuristics. Splitting
# providers means a rate limit on one can no longer damage work on the other.
_GEMINI_TIERS = frozenset({"strong", "aux"})


def _provider_for(tier: str) -> str:
    # Falls back to Groq when no Gemini key is set, so these tiers degrade to a working
    # model rather than raising KeyError on GEMINI_API_KEY at request time.
    if tier in _GEMINI_TIERS and os.getenv("GEMINI_API_KEY"):
        return "gemini"
    return "groq"


def has_llm(tier: str = "cheap") -> bool:
    provider = _provider_for(tier)
    if provider == "groq":
        return bool(os.getenv("GROQ_API_KEY"))
    return bool(os.getenv("GEMINI_API_KEY"))


def _model_for(tier: str) -> str:
    if _provider_for(tier) == "groq":
        return os.getenv("LLM_MODEL_CHEAP_GROQ", "llama-3.3-70b-versatile")
    # The 2.x line (gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash) still appears in
    # the models listing but 404s for keys created after it was retired - "no longer
    # available to new users". 3.5 Flash is the current stable equivalent. Avoid the
    # `-latest` aliases here: they can point at a reasoning model whose output is not a
    # bare completion, which breaks the JSON path.
    return os.getenv("LLM_MODEL_STRONG_GEMINI", "gemini-3.5-flash")


async def _call_openai_compatible(
    *, base_url: str, api_key: str, model: str, system: str, user: str, max_tokens: int, json_mode: bool,
    timeout: float = 60, reasoning_effort: str | None = None,
) -> str:
    body = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    if reasoning_effort:
        body["reasoning_effort"] = reasoning_effort

    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}

    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(3):
            res = await client.post(base_url, headers=headers, json=body)
            if res.status_code != 429 or attempt == 2:
                break
            wait = _retry_after_seconds(res.text)
            print(f"[llm] rate limited, waiting {wait:.1f}s then retrying ({base_url.split('/')[2]})")
            await asyncio.sleep(wait)

    if res.status_code >= 400:
        raise RuntimeError(f"LLM API error {res.status_code} ({base_url}): {res.text[:500]}")

    data = res.json()
    choice = (data.get("choices") or [{}])[0]
    content = (choice.get("message") or {}).get("content")

    if not content:
        # A 200 with no content at all. Gemini's thinking models do this when the whole
        # token budget goes to reasoning and none is left to answer with
        # (finish_reason "length", completion_tokens 0) - which is why every strong-tier
        # caller here passes reasoning_effort="none". Callers already fall back to their
        # heuristic on any exception; this exists so the log says which of those two
        # things happened instead of a bare KeyError: 'content'.
        raise RuntimeError(
            f"LLM returned no content (finish_reason={choice.get('finish_reason')!r}, "
            f"usage={data.get('usage')}). If finish_reason is 'length' with zero completion "
            f"tokens, the model spent the budget on reasoning - raise max_tokens or pass "
            f"reasoning_effort='none'."
        )
    return content


def extract_json(text: str):
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    candidate = fenced.group(1) if fenced else text
    match = re.search(r"[\[{]", candidate)
    if not match:
        raise ValueError(f"No JSON found in LLM output: {text[:200]}")
    slice_ = candidate[match.start():]
    for end in range(len(slice_), 0, -1):
        try:
            # strict=False tolerates raw control characters (literal newlines/tabs)
            # inside string values - some models emit those instead of \n escapes
            # despite being told not to.
            return json.loads(slice_[:end], strict=False)
        except json.JSONDecodeError:
            continue
    raise ValueError(f"Could not parse JSON from LLM output: {text[:200]}")


def _effort_for(provider: str, requested: str | None, json_mode: bool) -> str | None:
    """Reconcile one `reasoning_effort` request with what each provider actually accepts.

    The two providers need opposite handling, both learned the hard way:

    * **Gemini** accepts "none" and needs it. Left to think freely it can spend the entire
      token budget reasoning and return a 200 with no content at all (finish_reason
      "length", completion_tokens 0), which is what `_call_openai_compatible` now reports
      explicitly.

    * **Groq** rejects "none" outright ("must be one of `low`, `medium`, `high`") and its
      gpt-oss models need *some* thinking to reliably close a JSON object: without it,
      structured calls fail with "Failed to generate JSON" roughly half the time, and the
      caller silently drops to its heuristic. So "none" is floored to "low" there, and any
      JSON-mode call gets "low" by default even when the caller asked for nothing.

    Getting this wrong is invisible in normal use - every caller catches the failure and
    falls back - so it shows up as the whole pipeline quietly looking templated.
    """
    if provider == "gemini":
        return requested
    if requested in (None, "none"):
        return "low" if (json_mode or requested == "none") else None
    return requested


async def call_llm(
    *,
    tier: str,
    system: str,
    user: str,
    json_mode: bool = False,
    max_tokens: int = 1024,
    timeout: float = 60,
    reasoning_effort: str | None = None,
):
    """`reasoning_effort` ("none" / "low" / …) controls how much a reasoning model thinks
    before answering. Both providers now expose it, but they disagree about the vocabulary
    and about what the safe setting is, so this function normalises rather than passing it
    through - see `_effort_for` below.

    Worth setting on any call whose output must match a strict format: with thinking left
    unconstrained, Gemini 3.x intermittently emits part of its own reasoning into the
    content field ("wait, the brackets are …"), which silently fails any parser expecting
    the requested shape."""
    provider = _provider_for(tier)
    model = _model_for(tier)
    sys_prompt = (
        f"{system}\n\nRespond with ONLY valid JSON, no prose, no markdown code fences."
        if json_mode
        else system
    )

    if provider == "groq":
        base_url, api_key = GROQ_BASE_URL, os.environ["GROQ_API_KEY"]
    else:
        base_url, api_key = GEMINI_BASE_URL, os.environ["GEMINI_API_KEY"]

    text = await _call_openai_compatible(
        base_url=base_url, api_key=api_key, model=model, system=sys_prompt, user=user,
        max_tokens=max_tokens, json_mode=json_mode, timeout=timeout,
        reasoning_effort=_effort_for(provider, reasoning_effort, json_mode),
    )

    if json_mode:
        return extract_json(text)
    return text
