"""Local testing UI for AutoResearch. Not part of the production API - just a quick
way to submit a research query, watch the live x402 payment trace, and inspect the
final cited report + payment ledger without curl/Postman.

Run with:  streamlit run frontend/app.py
"""
import time
from datetime import datetime

import requests
import streamlit as st

st.set_page_config(page_title="AutoResearch — Test Console", layout="wide")

# ---------------------------------------------------------------------------
# Sidebar: connection + job submission
# ---------------------------------------------------------------------------
st.sidebar.title("AutoResearch")
st.sidebar.caption("x402-powered multi-agent research orchestrator — test console")

orchestrator_url = st.sidebar.text_input("Orchestrator URL", value="http://localhost:4000").rstrip("/")

st.sidebar.divider()
st.sidebar.subheader("New research job")
query = st.sidebar.text_area(
    "Query",
    value="What is the current state of quantum computing error correction?",
    height=100,
)
budget_cap = st.sidebar.slider("Budget cap (USDC)", min_value=0.01, max_value=1.00, value=0.05, step=0.01)
submit = st.sidebar.button("Run research", type="primary", use_container_width=True)

st.sidebar.divider()
if st.sidebar.button("Check orchestrator + services health", use_container_width=True):
    with st.sidebar:
        try:
            r = requests.get(f"{orchestrator_url}/health", timeout=5)
            st.success(f"orchestrator: {r.json()}")
        except Exception as e:
            st.error(f"orchestrator unreachable: {e}")


def status_badge(status: str) -> str:
    colors = {
        "completed": "🟢",
        "running": "🟡",
        "queued": "🟡",
        "budget_exceeded": "🟠",
        "failed": "🔴",
        "paying": "🟡",
        "paid": "🟢",
        "tier_downgraded": "🟠",
        "skipped_budget_exceeded": "🟠",
    }
    return f"{colors.get(status, '⚪')} {status}"


def render_steps_table(steps: list[dict]):
    if not steps:
        st.info("No steps yet...")
        return
    rows = []
    for s in steps:
        rows.append(
            {
                "task": s["task_id"],
                "type": s.get("task_type"),
                "status": status_badge(s.get("status", "")),
                "tier": s.get("tier") or "",
                "amount ($)": s.get("amount_usdc"),
                "tx / note": s.get("tx_hash") or s.get("note") or s.get("error") or "",
                "explorer": s.get("explorer_url") or "",
            }
        )
    st.dataframe(
        rows,
        use_container_width=True,
        column_config={
            "explorer": st.column_config.LinkColumn("explorer", display_text="view tx ↗"),
        },
        hide_index=True,
    )


def render_narration(narration: list[dict]):
    if not narration:
        return
    st.subheader("🧠 Live AI reasoning stream")
    for n in narration:
        st.markdown(f"- {n['text']}")


def render_auction_details(steps: list[dict]):
    auction_steps = [s for s in steps if s.get("quotes_considered")]
    if not auction_steps:
        return
    with st.expander("🔨 Reverse auction details (price × reliability)"):
        for s in auction_steps:
            st.markdown(f"**{s['task_id']}** — winner: `{s.get('chosen_provider')}`")
            quote_rows = [
                {
                    "provider": q["provider"],
                    "price ($)": q.get("price_usdc"),
                    "reliability": f"{q.get('success_rate', 1.0):.0%}" if q.get("price_usdc") is not None else "n/a",
                    "error": q.get("error") or "",
                }
                for q in s["quotes_considered"]
            ]
            st.dataframe(quote_rows, use_container_width=True, hide_index=True)


_CONFIDENCE_BADGE = {"strong": "🟢 strong", "moderate": "🟡 moderate", "weak": "🔴 weak"}


def render_report(report: dict):
    st.subheader("Final report")
    st.markdown(report["report_markdown"])

    if report.get("trust_score") is not None:
        col1, col2 = st.columns(2)
        col1.metric("Self-critique trust score", f"{report['trust_score']:.0%}")
        col2.metric("Weak claims flagged", report.get("weak_claims_count", 0))

    st.subheader("Citations")
    for c in report["citations"]:
        url_bit = f" — [{c['source_url']}]({c['source_url']})" if c.get("source_url") else ""
        badge = _CONFIDENCE_BADGE.get(c.get("review_confidence"))
        badge_bit = f"  {badge}" if badge else ""
        note_bit = f" _({c['review_note']})_" if c.get("review_note") else ""
        cost_bit = f" · ${c['cost_usdc']:.6f}" if c.get("cost_usdc") is not None else ""
        st.markdown(f"- **[{c['task_id']}]** _{c['source_service']}_: {c['claim']}{url_bit}{badge_bit}{cost_bit}{note_bit}")

    st.subheader("Payment ledger")
    render_steps_table(report["payment_ledger"])
    render_auction_details(report["payment_ledger"])
    st.metric("Total spent (USDC)", f"${report['total_spent_usdc']:.6f}")

    if report.get("provenance_tx_hash"):
        st.subheader("On-chain provenance receipt")
        st.markdown(f"Report hash: `{report.get('report_hash')}`")
        st.markdown(f"[View provenance tx ↗]({report['provenance_explorer_url']})")


def poll_job(job_id: str, budget_cap_usdc: float):
    status_placeholder = st.empty()
    progress_placeholder = st.empty()
    narration_placeholder = st.empty()
    table_placeholder = st.empty()

    start = time.time()
    timeout_s = 180
    trace = None

    while time.time() - start < timeout_s:
        try:
            resp = requests.get(f"{orchestrator_url}/api/research/{job_id}/trace", timeout=10)
            resp.raise_for_status()
            trace = resp.json()
        except Exception as e:
            status_placeholder.error(f"Failed to poll trace: {e}")
            return None

        status_placeholder.markdown(f"### Job `{job_id}` — {status_badge(trace['status'])}")
        spent = trace["total_spent_usdc"]
        cap = trace["budget_cap_usdc"]
        progress_placeholder.progress(min(1.0, spent / cap if cap else 0), text=f"${spent:.6f} / ${cap:.2f} spent")
        with narration_placeholder.container():
            render_narration(trace.get("narration", []))
        with table_placeholder.container():
            render_steps_table(trace["steps"])
            render_auction_details(trace["steps"])

        if trace["status"] in ("completed", "budget_exceeded", "failed"):
            break
        time.sleep(1.5)

    return trace


# ---------------------------------------------------------------------------
# Tabs
# ---------------------------------------------------------------------------
tab_run, tab_lookup, tab_ledger = st.tabs(["Run research", "Check existing job", "All payments (ledger)"])

with tab_run:
    if submit:
        if not query.strip():
            st.error("Query cannot be empty.")
        else:
            try:
                submit_resp = requests.post(
                    f"{orchestrator_url}/api/research",
                    json={"query": query, "budget_cap_usdc": budget_cap},
                    timeout=10,
                )
                submit_resp.raise_for_status()
                job_id = submit_resp.json()["job_id"]
                st.session_state["last_job_id"] = job_id
            except Exception as e:
                st.error(f"Failed to submit job: {e}")
                job_id = None

            if job_id:
                final_trace = poll_job(job_id, budget_cap)

                if final_trace and final_trace["status"] == "completed":
                    try:
                        report_resp = requests.get(f"{orchestrator_url}/api/research/{job_id}/report", timeout=10)
                        report_resp.raise_for_status()
                        render_report(report_resp.json())
                    except Exception as e:
                        st.error(f"Failed to fetch report: {e}")
                elif final_trace and final_trace["status"] == "budget_exceeded":
                    st.warning("Job stopped: budget cap was reached before the report could be compiled.")
                elif final_trace and final_trace["status"] == "failed":
                    st.error("Job failed. Check the step errors above (often: unfunded buyer wallet or a service being down).")
                elif final_trace is None:
                    pass
                else:
                    st.warning("Timed out waiting for the job to finish.")
    else:
        st.info("Set a query and budget cap in the sidebar, then click **Run research**.")

with tab_lookup:
    st.subheader("Look up a previous job")
    default_job_id = st.session_state.get("last_job_id", "")
    lookup_id = st.text_input("Job ID", value=default_job_id)
    if st.button("Fetch trace / report"):
        try:
            trace_resp = requests.get(f"{orchestrator_url}/api/research/{lookup_id}/trace", timeout=10)
            if trace_resp.status_code == 404:
                st.error("Job not found.")
            else:
                trace_resp.raise_for_status()
                trace = trace_resp.json()
                st.markdown(f"### Job `{lookup_id}` — {status_badge(trace['status'])}")
                st.progress(
                    min(1.0, trace["total_spent_usdc"] / trace["budget_cap_usdc"]) if trace["budget_cap_usdc"] else 0,
                    text=f"${trace['total_spent_usdc']:.6f} / ${trace['budget_cap_usdc']:.2f} spent",
                )
                render_narration(trace.get("narration", []))
                render_steps_table(trace["steps"])
                render_auction_details(trace["steps"])

                if trace["status"] == "completed":
                    report_resp = requests.get(f"{orchestrator_url}/api/research/{lookup_id}/report", timeout=10)
                    if report_resp.ok:
                        render_report(report_resp.json())
        except Exception as e:
            st.error(f"Lookup failed: {e}")

with tab_ledger:
    st.subheader("Raw payment ledger (all jobs)")
    if st.button("Refresh ledger"):
        st.rerun()
    try:
        ledger_resp = requests.get(f"{orchestrator_url}/api/ledger", timeout=10)
        ledger_resp.raise_for_status()
        entries = ledger_resp.json()["ledger"]
        if not entries:
            st.info("No payments recorded yet.")
        else:
            rows = [
                {
                    "time": e.get("timestamp"),
                    "job": e.get("job_id"),
                    "task": e.get("task_id"),
                    "type": e.get("task_type"),
                    "status": status_badge(e.get("status", "")),
                    "amount ($)": e.get("amount_usdc"),
                    "tier": e.get("tier"),
                    "tx_hash": e.get("tx_hash") or "",
                    "explorer": e.get("explorer_url") or "",
                }
                for e in reversed(entries)
            ]
            st.dataframe(
                rows,
                use_container_width=True,
                column_config={
                    "explorer": st.column_config.LinkColumn("explorer", display_text="view tx ↗"),
                },
                hide_index=True,
            )
            total_paid = sum(e["amount_usdc"] for e in entries if e.get("status") in ("paid", "completed") and e.get("amount_usdc"))
            st.metric("Total settled across all jobs (USDC)", f"${total_paid:.6f}")
    except Exception as e:
        st.error(f"Failed to load ledger: {e}")
