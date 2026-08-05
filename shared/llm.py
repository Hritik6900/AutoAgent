"""LLM wrapper: Groq for the cheap/fast tier (planner, per-task summarization,
fact-check, enrichment), Gemini for the strong tier (final report synthesis only).
Both are used via their OpenAI-compatible chat-completions endpoints, so a single
generic caller handles both - no separate request/response parsing per provider.
"""
import json
import os
import re

import httpx

GROQ_BASE_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"


def _provider_for(tier: str) -> str:
    # TEMPORARY: Gemini billing credits ran out (2026-08-03) - routing the strong tier
    # through Groq too until credits are topped up. To revert, delete this line and
    # uncomment the one below.
    return "groq"
    # return "gemini" if tier == "strong" else "groq"


def has_llm(tier: str = "cheap") -> bool:
    provider = _provider_for(tier)
    if provider == "groq":
        return bool(os.getenv("GROQ_API_KEY"))
    return bool(os.getenv("GEMINI_API_KEY"))


def _model_for(tier: str) -> str:
    if _provider_for(tier) == "groq":
        return os.getenv("LLM_MODEL_CHEAP_GROQ", "llama-3.3-70b-versatile")
    # Gemini 2.5 Pro is paid-tier only as of this writing - Flash is the free-tier
    # default; override via env if your account has Pro access.
    return os.getenv("LLM_MODEL_STRONG_GEMINI", "gemini-2.5-flash")


async def _call_openai_compatible(
    *, base_url: str, api_key: str, model: str, system: str, user: str, max_tokens: int, json_mode: bool,
    timeout: float = 60,
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

    async with httpx.AsyncClient(timeout=timeout) as client:
        res = await client.post(
            base_url,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
            json=body,
        )
    if res.status_code >= 400:
        raise RuntimeError(f"LLM API error {res.status_code} ({base_url}): {res.text[:500]}")
    data = res.json()
    return data["choices"][0]["message"]["content"]


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


async def call_llm(
    *,
    tier: str,
    system: str,
    user: str,
    json_mode: bool = False,
    max_tokens: int = 1024,
    timeout: float = 60,
):
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
    )

    if json_mode:
        return extract_json(text)
    return text
