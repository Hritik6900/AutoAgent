import asyncio
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from shared.config import PORTS
from shared.ledger import get_all_ledger
from shared.schemas import ResearchRequest, ResearchAccepted, TraceResponse, ReportResponse

from . import job_store
from .orchestrate import run_job

app = FastAPI(title="AutoResearch Orchestrator")

# Basic CORS so a local frontend dev server can call this without a proxy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.post("/api/research", response_model=ResearchAccepted, status_code=202)
async def submit_research(req: ResearchRequest):
    if not req.query:
        raise HTTPException(status_code=400, detail="Missing required field: query (string)")
    if req.budget_cap_usdc <= 0:
        raise HTTPException(status_code=400, detail="Missing or invalid field: budget_cap_usdc (positive number)")

    job_id = str(uuid.uuid4())
    job_store.create_job(job_id, req.query, req.budget_cap_usdc)

    # Fire and forget; progress is polled via /trace.
    asyncio.create_task(run_job(job_id))

    return ResearchAccepted(job_id=job_id)


@app.get("/api/research/{job_id}/trace", response_model=TraceResponse)
async def get_trace(job_id: str):
    trace = job_store.serialize_trace(job_id)
    if not trace:
        raise HTTPException(status_code=404, detail="job not found")
    return trace


@app.get("/api/research/{job_id}/report", response_model=ReportResponse)
async def get_report(job_id: str):
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job not found")
    if job["status"] != "completed":
        raise HTTPException(status_code=409, detail=f"job is not completed yet (status: {job['status']})")

    trace = job_store.serialize_trace(job_id)
    return ReportResponse(
        job_id=job["job_id"],
        query=job["query"],
        report_markdown=job["report"]["report_markdown"],
        citations=job["report"]["citations"],
        payment_ledger=trace["steps"],
        total_spent_usdc=trace["total_spent_usdc"],
        report_hash=job["report"].get("report_hash"),
        provenance_tx_hash=job["report"].get("provenance_tx_hash"),
        provenance_explorer_url=job["report"].get("provenance_explorer_url"),
        trust_score=job["report"].get("trust_score"),
        weak_claims_count=job["report"].get("weak_claims_count"),
    )


# Convenience endpoint: full raw payment ledger across all jobs (handy for demoing).
@app.get("/api/ledger")
async def get_ledger():
    return {"ledger": get_all_ledger()}


@app.get("/health")
async def health():
    return {"ok": True, "service": "orchestrator"}


if __name__ == "__main__":
    import uvicorn

    print(f"[orchestrator] listening on :{PORTS['orchestrator']}")
    uvicorn.run(app, host="0.0.0.0", port=PORTS["orchestrator"])
