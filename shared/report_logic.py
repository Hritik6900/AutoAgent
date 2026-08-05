"""Report synthesis logic shared by the two independent report-gen processes
(premium on its own port, cheap on its own port - see services/report-gen and
services/report-gen-cheap). Splitting them into separate processes, rather than two
routes on one app, means killing one during a demo genuinely leaves the other
reachable, so the orchestrator's tier-fallback is a real failover, not a no-op.
"""
import re

from fastapi import HTTPException, Request

from .llm import call_llm, extract_json, has_llm


def heuristic_report(query: str, sections: list[dict], *, reason: str = "no LLM key configured") -> dict:
    by_type: dict[str, list[dict]] = {}
    for s in sections:
        by_type.setdefault(s["task_type"], []).append(s)

    md = f"# Research Report: {query}\n\n"
    citations = []
    for task_type, group in by_type.items():
        md += f"## {task_type.replace('_', ' ')}\n\n"
        for s in group:
            content = str(s.get("content") or "")
            claim = re.split(r"(?<=[.!?])\s+", content)[0][:220] if content else "(no content)"
            md += f"- {claim} [{s['task_id']}]\n"
            citations.append(
                {
                    "claim": claim,
                    "source_service": s.get("source_service"),
                    "source_url": s.get("url"),
                    "task_id": s["task_id"],
                }
            )
        md += "\n"
    md += f"\n_Generated with a deterministic template ({reason})._\n"
    return {"report_markdown": md, "citations": citations}


_REPORT_MARKER = "===REPORT==="
_CITATIONS_MARKER = "===CITATIONS==="


async def llm_report(query: str, sections: list[dict], tier: str) -> dict:
    sections_text = "\n\n---\n\n".join(
        f"[task_id={s['task_id']} type={s['task_type']} source={s.get('source_service')}"
        f"{' url=' + s['url'] if s.get('url') else ''}]\n{str(s.get('content'))[:1500]}"
        for s in sections
    )

    # Deliberately NOT JSON mode: forcing an entire multi-paragraph markdown report to
    # live inside one JSON string value made models (Gemini in particular) frequently
    # emit unescaped newlines/quotes that broke parsing outright, or get truncated
    # mid-string with no valid closing. A plain-text delimiter format sidesteps that
    # class of bug entirely - the markdown is raw text needing no escaping, and only
    # the short citations list needs to parse as JSON (much lower risk of malformed
    # output at that size).
    result_text = await call_llm(
        tier=tier,
        system=(
            "You are a research report writer. Given a user query and a set of source sections (each tagged "
            "with a task_id and source service), write a well-organized, cited markdown research report, "
            "then list every citation.\n\n"
            f"Respond in EXACTLY this format and nothing else:\n\n{_REPORT_MARKER}\n"
            "<the markdown report, with headings - every substantive claim should reference its task_id in "
            f"brackets like [t2]>\n\n{_CITATIONS_MARKER}\n"
            '<a JSON array only, e.g. [{"claim": "...", "source_service": "...", "source_url": "..."|null, '
            '"task_id": "..."}] - one entry per claim you attributed, matched to the task_id and source_service '
            "it came from>"
        ),
        user=f"Query: {query}\n\nSource sections:\n\n{sections_text}",
        json_mode=False,
        max_tokens=2200 if tier == "strong" else 1400,
        timeout=30,
    )

    if _REPORT_MARKER not in result_text or _CITATIONS_MARKER not in result_text:
        raise ValueError(f"LLM report response missing required section markers: {result_text[:200]}")

    _, rest = result_text.split(_REPORT_MARKER, 1)
    report_markdown, citations_raw = rest.split(_CITATIONS_MARKER, 1)
    report_markdown = report_markdown.strip()
    citations = extract_json(citations_raw.strip())

    if not report_markdown or not isinstance(citations, list):
        raise ValueError("LLM report response missing required fields")
    return {"report_markdown": report_markdown, "citations": citations}


def make_report_handler(tier: str):
    async def handler(request: Request):
        body = await request.json()
        query = body.get("query")
        sections = body.get("sections")
        if not query or not isinstance(sections, list):
            raise HTTPException(status_code=400, detail="Missing required fields: query (string), sections (array)")

        if not has_llm(tier):
            return {
                **heuristic_report(query, sections, reason=f"no LLM key configured for the '{tier}' tier"),
                "tier": tier,
                "method": "heuristic",
            }

        try:
            result = await llm_report(query, sections, tier)
            return {**result, "tier": tier, "method": "llm"}
        except Exception as err:
            print(f"[report-gen:{tier}] LLM call failed, falling back to heuristic: {err}")
            short_reason = " ".join(str(err).split())[:180]
            return {
                **heuristic_report(query, sections, reason=f"the '{tier}' LLM call failed this run: {short_reason}"),
                "tier": tier,
                "method": "heuristic",
            }

    return handler
