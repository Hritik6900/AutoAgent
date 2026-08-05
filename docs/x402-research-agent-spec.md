# AutoResearch — x402-Powered Multi-Agent Research Orchestrator
### Technical Build Spec (AI/Orchestration Side)

## 1. Project one-liner
An autonomous agent that decomposes a research query into sub-tasks, autonomously discovers and pays x402-gated APIs for each sub-task (search, fact-check, enrichment, summarization), settles payment in testnet USDC on Base Sepolia, and compiles the results into one cited research report — with full transparency into every payment made.

## 2. Users / positioning
- Demo audience: hackathon judges evaluating "agent orchestration + autonomous payments."
- Real-world persona: analysts/journalists/students who want pay-per-use research instead of subscriptions; also a reference implementation for other AI agents that want to consume paid data services (agent-to-agent commerce).

## 3. Budget constraints
- Use **Base Sepolia testnet** + **faucet-funded test USDC** — zero real money.
- Use a cheap/fast LLM for sub-agent calls (planning, per-task summarization); reserve a stronger model only for the final report synthesis pass.
- Total real spend should be LLM token cost only, target: under ₹400 for the full 4-day build + demo.

## 4. System architecture

```
User Query
   │
   ▼
[Planner Agent] --(LLM call, structured JSON output)--> Task Graph
   │
   ▼
[Orchestrator]
   ├─► Task: web_search        ──► x402 Search Service
   ├─► Task: fact_check         ──► x402 FactCheck Service   (parallel branch)
   ├─► Task: data_enrichment    ──► x402 Enrichment Service  (parallel branch)
   │         │
   │         ▼ (fan-in once all complete)
   ├─► Task: summarize_each     ──► x402 Summarizer Service
   └─► Task: compile_report     ──► x402 ReportGen Service (or local LLM call)
   │
   ▼
[Citation Compiler] → merges outputs + attributes claims to source services
   │
   ▼
Final Report (JSON + Markdown) + Payment Ledger
```

## 5. x402 payment flow (per task, implement once as a reusable client)

1. Orchestrator calls target microservice endpoint, e.g. `POST /api/search`.
2. Service responds `402 Payment Required` with a payment envelope (network, token = USDC, amount, recipient address, resource id).
3. x402 client:
   - Reads payment requirements from response.
   - Constructs and signs a payment authorization (EIP-3009 transferWithAuthorization for USDC — gasless).
   - Retries the original request with the signed payment attached in the request header.
4. Service verifies payment via facilitator (use Coinbase's public CDP facilitator for Base Sepolia — free), releases the resource.
5. Orchestrator logs: `{task_id, endpoint, amount, tx_hash, timestamp, status}` to the payment ledger.
6. Before step 3, check cumulative spend against user's budget cap. If a task would exceed it, either skip/ask-user or select a cheaper alternate provider for that task type.

Use the official x402 Node.js or Python SDK (available from CDP) rather than hand-rolling the signing — don't reinvent EIP-3009 signing logic.

## 6. Microservices to build (each is a small Express/FastAPI app wrapped with x402 middleware)

| Service | Task | Underlying logic | Price (test) |
|---|---|---|---|
| Search API | web_search | Wrap a real search API (Tavily/SerpAPI) or curated mock data | $0.002 |
| Fact-Check API | fact_check | Cross-reference claims against 2nd source / simple LLM verifier | $0.003 |
| Enrichment API | data_enrichment | Add structured metadata (dates, entities, stats) | $0.002 |
| Summarizer API | summarize | LLM summarization call | $0.004 |
| Report-Gen API | compile_report | Final LLM synthesis with citation formatting | $0.006 |

Build 2 tiers (cheap/premium) for at least one service type to demo the "agent picks cheaper provider" wow factor.

## 7. API contract for the frontend (for Rudra)

### `POST /api/research`
Request:
```json
{
  "query": "string",
  "budget_cap_usdc": 0.50
}
```
Response: `202 Accepted` with `{ "job_id": "uuid" }`

### `GET /api/research/:job_id/trace` (poll or SSE stream)
Returns live orchestrator trace:
```json
{
  "job_id": "uuid",
  "status": "running | completed | budget_exceeded | failed",
  "steps": [
    {
      "task_id": "t1",
      "task_type": "web_search",
      "status": "paying | paid | completed | failed",
      "endpoint": "https://.../api/search",
      "amount_usdc": 0.002,
      "tx_hash": "0xabc123...",
      "explorer_url": "https://sepolia.basescan.org/tx/0xabc123...",
      "timestamp": "2026-07-31T10:00:00Z"
    }
  ],
  "total_spent_usdc": 0.013,
  "budget_cap_usdc": 0.50
}
```

### `GET /api/research/:job_id/report`
```json
{
  "job_id": "uuid",
  "query": "string",
  "report_markdown": "string",
  "citations": [
    { "claim": "string", "source_service": "Search API", "source_url": "string", "task_id": "t1" }
  ],
  "payment_ledger": [ /* same shape as trace steps */ ],
  "total_spent_usdc": 0.013
}
```

Frontend needs: query form with budget slider → live trace view (poll `/trace` every 1-2s or use SSE) → final report view with clickable citations and a payments tab showing the ledger with explorer links.

## 8. Build order (4 days)
1. **Day 1**: Wallet + one working 402→pay→retry cycle end-to-end (highest technical risk, de-risk first).
2. **Day 2**: Planner agent + 2-3 microservices wired to orchestrator, sequential execution.
3. **Day 3**: Parallel task execution, budget guard, cheaper-alternative fallback, citation compiler, payment ledger.
4. **Day 4**: Frontend integration, polish, record a backup demo video, rehearse pitch.

## 9. Demo script (for judging)
1. Submit query with a visible budget cap.
2. Show live trace: task fires, 402 received, payment signed, tx confirmed (click through to Base Sepolia explorer).
3. Show one task auto-switching to a cheaper provider to stay under budget.
4. Show final report with clickable citations back to which paid service produced each claim.
5. Show payment ledger summary — total spend vs. budget cap.
