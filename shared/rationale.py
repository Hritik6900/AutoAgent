"""Best-effort natural-language narration of orchestrator decisions - the "live AI
reasoning stream" shown in the frontend. Only called at genuinely interesting
decision points (auction results, tier downgrades, budget skips, failover
recoveries) - not on every routine task, so the feed stays signal not noise.

Always degrades to a deterministic templated sentence if no LLM key is set or the
call fails/times out - narration is a demo nicety, never something the pipeline
should wait long on or fail a job over.
"""
from .llm import call_llm, has_llm

_FALLBACKS = {
    "planned": "Planned {n_tasks} tasks for this query: {task_types}.",
    "auction_won": "Queried {n_quoted} search providers live; picked '{chosen}' at ${price:.4f} "
    "(reliability {success_rate:.0%}), the best price/reliability tradeoff.",
    "tier_downgraded": "Switched {task_type} to the cheaper '{chosen}' tier to stay within the "
    "${budget_cap:.2f} budget cap.",
    "skipped_budget_exceeded": "Skipped {task_type}: even the cheapest option (${price:.4f}) would "
    "exceed the remaining budget.",
    "provider_switched": "'{from_name}' failed ({error}); retried with '{to_name}' and it went through.",
    "failed_no_fallback": "'{task_type}' failed with no alternate provider available; continuing without it.",
    "self_critique": "Self-review flagged {weak} of {total} claims as weak before finalizing the report.",
    "completed": "Job complete: {n_citations} cited claims for ${total_spent:.4f}.",
}


def _fallback(event: str, ctx: dict) -> str:
    template = _FALLBACKS.get(event, "{event}")
    try:
        return template.format(event=event, **ctx)
    except Exception:
        return event


async def explain(event: str, ctx: dict) -> str:
    if not has_llm("cheap"):
        return _fallback(event, ctx)
    try:
        text = await call_llm(
            tier="cheap",
            system=(
                "You narrate an autonomous AI research agent's live decisions for a technical demo "
                "audience, in ONE short punchy sentence (max 22 words). Describe the concrete outcome and "
                "WHY it happened using the specific numbers given (price, percentages, provider/tier "
                "names) - never describe the event mechanically (do not say things like 'processing X "
                "event' or restate the event name/field names verbatim). Present tense, active voice, no "
                "preamble, no quotes, no markdown, no leading dash. "
                "Example good output for an auction win: \"Picked search_c at $0.002 over pricier rivals - "
                "cheapest quote with a solid reliability record.\""
            ),
            user=f"Event: {event}\nDetails: {ctx}",
            max_tokens=60,
            timeout=8,
        )
        line = text.strip().splitlines()[0].strip().strip('"')
        return line[:240] if line else _fallback(event, ctx)
    except Exception:
        return _fallback(event, ctx)
