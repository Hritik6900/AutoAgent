import asyncio
import uuid

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from shared import api_keys
from shared.api_keys import Caller
from shared.config import PORTS, PRICES, SERVICE_URLS, TASK_SERVICE_MAP
from shared.ledger import get_all_ledger
from shared.schemas import (
    AlgorandAccount,
    AlgorandFundRequest,
    AlgorandFundResponse,
    AlgorandVerifyRequest,
    AlgorandVerifyResponse,
    FactCheckRequest,
    FactCheckResponse,
    ResearchRequest,
    ResearchAccepted,
    TraceResponse,
    ReportResponse,
)
from shared.x402_client import pay_and_fetch_json, price_to_number

from . import job_store
from .auth import assert_can_read_job, resolve_caller
from .orchestrate import run_job

app = FastAPI(title="AutoResearch Orchestrator")

# Basic CORS so a local frontend dev server can call this without a proxy.
#
# allow_private_network exists for the deployed-frontend case. Chrome treats a request
# from a public origin (a hosted page on https) to a private one (http://localhost:4000)
# as crossing a network boundary: it sends a preflight carrying
# `Access-Control-Request-Private-Network: true` and refuses the real request unless the
# response grants it. Without this, Starlette fails that preflight with 400 "Disallowed
# CORS private-network" and every call from a hosted page dies with an opaque CORS error
# while curl to the same URL works fine.
#
# That pairing - a hosted frontend driving a stack on the presenter's own laptop - is
# exactly how this gets demoed. Safe here because the server already allows every origin:
# it keeps no cookies or session state, and its spending routes are gated by an API key
# rather than by origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_private_network=True,
)


@app.post("/api/research", response_model=ResearchAccepted, status_code=202)
async def submit_research(req: ResearchRequest, caller: Caller = Depends(resolve_caller)):
    if not req.query:
        raise HTTPException(status_code=400, detail="Missing required field: query (string)")
    if req.budget_cap_usdc <= 0:
        raise HTTPException(status_code=400, detail="Missing or invalid field: budget_cap_usdc (positive number)")

    # Every job spends real testnet USDC from one shared wallet, so what the caller may
    # spend is decided here rather than taken from the request. 402 (not 403) because the
    # refusal is specifically about money: the request is well-formed and authenticated,
    # there is simply no budget left for it.
    refusal = api_keys.authorize_launch(caller, req.budget_cap_usdc)
    if refusal:
        raise HTTPException(status_code=402, detail=refusal)

    job_id = str(uuid.uuid4())
    # Recorded before the job starts: the reservation is what stops a burst of concurrent
    # launches from each seeing a spend of zero and all being approved.
    api_keys.record_job(job_id, caller.key_id, req.budget_cap_usdc)
    job_store.create_job(job_id, req.query, req.budget_cap_usdc)

    # Fire and forget; progress is polled via /trace.
    asyncio.create_task(run_job(job_id))

    return ResearchAccepted(job_id=job_id)


@app.post("/api/fact-check", response_model=FactCheckResponse)
async def fact_check_claim(req: FactCheckRequest, caller: Caller = Depends(resolve_caller)):
    """Check a single claim against a second source, paid for with one x402 settlement.

    This is the browser extension's entry point: a reporter highlights a sentence on any
    page and gets back a verdict plus the transaction that paid for it. It runs the one
    paid call directly rather than going through the planner, because the full research
    pipeline costs ~$0.019 and takes a minute - far too heavy for checking one sentence.

    Synchronous on purpose. The whole thing takes a few seconds, and a job id to poll
    would make the caller's side harder for no benefit.
    """
    claim = (req.claim or "").strip()
    if not claim:
        raise HTTPException(status_code=400, detail="Missing required field: claim (string)")
    if len(claim) > 1200:
        raise HTTPException(
            status_code=400,
            detail="claim is too long (max 1200 characters) - select a single sentence or passage",
        )

    price = PRICES["fact_check"]
    amount = price_to_number(price)

    # Same gate as a full job: this spends real USDC from the same wallet, so it is
    # subject to the same daily cap, per-job ceiling and rate limit. A fact-check costs a
    # fraction of a research job but counts as one call against the hourly limit, which
    # is the conservative reading and keeps one accounting story rather than two.
    refusal = api_keys.authorize_launch(caller, amount)
    if refusal:
        raise HTTPException(status_code=402, detail=refusal)

    job_id = f"fc-{uuid.uuid4()}"
    api_keys.record_job(job_id, caller.key_id, amount)

    service = TASK_SERVICE_MAP["fact_check"]
    url = f"{SERVICE_URLS[service['service']]}{service['path']}"

    try:
        result = await pay_and_fetch_json(
            job_id=job_id,
            task_id="fc1",
            task_type="fact_check",
            url=url,
            price_usdc=price,
            tier="standard",
            body={"claim": claim, "context": req.context},
        )
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"Fact-check service unavailable: {err}") from err
    finally:
        # Released whether the call paid, failed or raised - otherwise a failed check
        # would hold its reservation against the caller's quota until midnight UTC.
        api_keys.settle_job(job_id)

    data = result["data"] or {}
    return FactCheckResponse(
        claim=data.get("claim", claim),
        verdict=data.get("verdict", "unverified"),
        confidence=data.get("confidence"),
        explanation=data.get("explanation"),
        evidence_url=data.get("evidence_url"),
        method=data.get("method"),
        cost_usdc=amount,
        tx_hash=result["tx_hash"],
        explorer_url=result["explorer_url"],
    )


@app.get("/api/quota")
async def get_quota(caller: Caller = Depends(resolve_caller)):
    """What this caller has left today. Exposed so an agent can check its own headroom
    instead of finding out by being refused mid-conversation."""
    return api_keys.quota_snapshot(caller)


@app.get("/api/research/{job_id}/trace", response_model=TraceResponse)
async def get_trace(job_id: str, caller: Caller = Depends(resolve_caller)):
    assert_can_read_job(caller, job_id)
    trace = job_store.serialize_trace(job_id)
    if not trace:
        raise HTTPException(status_code=404, detail="job not found")
    return trace


@app.get("/api/research/{job_id}/report", response_model=ReportResponse)
async def get_report(job_id: str, caller: Caller = Depends(resolve_caller)):
    assert_can_read_job(caller, job_id)
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


# Full raw payment ledger across all jobs. Deliberately left unauthenticated even when
# REQUIRE_API_KEY is set: every row is a settlement that is already public on BaseScan,
# and the marketing site's live counters poll this without holding a key. It exposes no
# query text, no report content and no key identity - only amounts and tx hashes.
@app.get("/api/ledger")
async def get_ledger():
    return {"ledger": get_all_ledger()}


# --- Algorand TestNet -------------------------------------------------------
#
# A second chain, carrying a different concern. Base Sepolia settles what the agent
# *spends* (x402/USDC, from one wallet this deployment owns); Algorand carries who the
# *user* is and what they can prove - an account they generated in their own browser and
# hold the only key to, which signs the integrity anchor over their finished report.
#
# Nothing here touches x402, the buyer wallet, or the research pipeline, and no endpoint
# below ever handles a user's private key: the browser signs, and these routes only read
# public chain state or send from the demo faucet.
#
# Unauthenticated for the same reason /api/ledger is: they read data that is already
# public on-chain, and the faucet spends valueless TestNet ALGO that is separately
# rate-limited per address in shared/algorand.py.


@app.get("/api/algorand/status")
async def algorand_status():
    """Whether this deployment can auto-fund a new wallet, and from which account.

    The frontend calls this before offering one-click funding, so a deployment with no
    faucet configured degrades to linking the public dispenser instead of showing a
    button that would always fail.
    """
    from shared import algorand

    return algorand.faucet_status()


@app.get("/api/algorand/account/{address}", response_model=AlgorandAccount)
async def algorand_account(address: str):
    from shared import algorand

    try:
        return algorand.account_snapshot(address)
    except algorand.AlgorandError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"Algorand node unreachable: {err}") from err


@app.post("/api/algorand/fund", response_model=AlgorandFundResponse)
async def algorand_fund(req: AlgorandFundRequest):
    """Give a freshly created user wallet its first TestNet ALGO.

    Exists because every public dispenser now sits behind a login or captcha, which in a
    live demo means a minute of dead air between signing in and being able to transact.
    A no-op (funded=False with a reason) when the account already holds enough or was
    topped up moments ago - both are success states for the caller, not errors.
    """
    from shared import algorand

    # A blocking call: algosdk's client is synchronous and waits for confirmation
    # (~3s on Algorand). Off-thread so it cannot stall the event loop that is
    # concurrently running research jobs.
    try:
        return await asyncio.to_thread(algorand.fund_account, req.address)
    except algorand.AlgorandError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"Funding failed: {err}") from err


@app.post("/api/algorand/verify-anchor", response_model=AlgorandVerifyResponse)
async def algorand_verify_anchor(req: AlgorandVerifyRequest):
    """Confirm an anchor transaction really carries the report hash it claims to.

    The point of anchoring is that anyone can check it, so the check itself is an
    endpoint rather than something only the UI knows how to do: it reads the note field
    back off-chain and compares it to the hash the caller expects. A mismatch returns
    verified=False with both values, never an error - being able to *see* the mismatch
    is exactly what makes the anchor meaningful.
    """
    import base64

    from shared import algorand

    expected = (req.report_hash or "").strip().lower()
    try:
        info = await asyncio.to_thread(algorand.get_transaction, req.tx_id)
    except Exception as err:
        raise HTTPException(status_code=502, detail=f"Algorand node unreachable: {err}") from err

    if not info:
        return AlgorandVerifyResponse(
            verified=False,
            tx_id=req.tx_id,
            expected_hash=expected,
            explorer_url=algorand.explorer_tx_url(req.tx_id),
            detail="Transaction not found yet - it may still be confirming.",
        )

    note = ""
    if info.get("note_b64"):
        try:
            note = base64.b64decode(info["note_b64"]).decode("utf-8", "replace")
        except Exception:
            note = ""

    # The note is written as "autoresearch:v1:<sha256>" by the browser (see
    # frontend-react/src/lib/algorand.ts), so the prefix is stripped before comparing.
    on_chain = note.split(":")[-1].strip().lower() if note else None

    return AlgorandVerifyResponse(
        verified=bool(on_chain) and on_chain == expected,
        tx_id=req.tx_id,
        confirmed_round=info.get("confirmed_round"),
        on_chain_hash=on_chain,
        expected_hash=expected,
        sender=info.get("sender"),
        explorer_url=info.get("explorer_url"),
        detail=None if on_chain == expected else "The on-chain note does not match this report's hash.",
    )


@app.get("/health")
async def health():
    return {"ok": True, "service": "orchestrator"}


if __name__ == "__main__":
    import uvicorn

    print(f"[orchestrator] listening on :{PORTS['orchestrator']}")
    uvicorn.run(app, host="0.0.0.0", port=PORTS["orchestrator"])
