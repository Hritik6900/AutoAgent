/**
 * Where the orchestrator lives, in precedence order:
 *
 *   1. `localStorage.API_BASE_URL` — set from the console at runtime. Highest priority so
 *      a deployed build can be pointed at a different backend without rebuilding, which
 *      is what makes one deployment demo-able against whatever machine is running the
 *      stack that day.
 *   2. `VITE_API_BASE_URL` — baked in at build time from `.env` / the host's env vars.
 *      This is what a real deployment sets.
 *   3. `http://localhost:4000` — the local-dev default.
 *
 * The fallback is deliberately a *last* resort: a deployed page that quietly falls back
 * to localhost sends every request to the visitor's own machine, where nothing is
 * listening, and the whole site reads as broken with no clue why. `apiTarget()` below
 * exists so the UI can say which of these three is in play.
 */
const STORED_BASE = (() => {
  try {
    return localStorage.getItem('API_BASE_URL');
  } catch {
    return null; // storage blocked (private mode, embedded webview)
  }
})();

const BUILT_IN_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = (STORED_BASE || BUILT_IN_BASE || 'http://localhost:4000').replace(
  /\/+$/,
  '',
);

/** Which source won, and whether this looks like a misconfigured deployment - a page
 *  served over https that is about to call http://localhost. */
export function apiTarget() {
  const source = STORED_BASE ? 'localStorage' : BUILT_IN_BASE ? 'build' : 'default';
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(API_BASE_URL);
  const pageIsHttps = typeof location !== 'undefined' && location.protocol === 'https:';
  return { url: API_BASE_URL, source, isLocal, pageIsHttps, mismatched: pageIsHttps && isLocal };
}

export interface ResearchRequest {
  query: string;
  budget_cap_usdc: number;
}

export interface Step {
  task_id: string;
  task_type: string;
  status: string;
  endpoint: string;
  amount_usdc: number;
  tier: string;
  tx_hash: string | null;
  explorer_url: string | null;
  note: string | null;
  error: string | null;
  timestamp: string;
  provider_switched: boolean | null;
  switched_from: string | null;
  switched_to: string | null;
  quotes_considered: Array<{
    provider: string;
    price_usdc: number;
    error: string | null;
    success_rate: number;
  }> | null;
  chosen_provider: string | null;
}

export interface Narration {
  event: string;
  text: string;
  task_id: string | null;
  timestamp: string;
}

export interface TraceResponse {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'budget_exceeded' | 'failed';
  steps: Step[];
  narration: Narration[];
  total_spent_usdc: number;
  budget_cap_usdc: number;
}

export interface Citation {
  claim: string;
  source_service: string;
  source_url: string | null;
  task_id: string;
  cost_usdc: number;
  tx_hash: string | null;
  paid_at: string;
  review_confidence: 'strong' | 'moderate' | 'weak' | null;
  review_note: string | null;
}

export interface ReportResponse {
  job_id: string;
  query: string;
  report_markdown: string;
  citations: Citation[];
  payment_ledger: Step[];
  total_spent_usdc: number;
  report_hash: string | null;
  provenance_tx_hash: string | null;
  provenance_explorer_url: string | null;
  trust_score: number | null;
  weak_claims_count: number;
}

export const apiClient = {
  async launchResearch(req: ResearchRequest): Promise<{ job_id: string }> {
    const res = await fetch(`${API_BASE_URL}/api/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('Failed to launch research');
    return res.json();
  },

  async getTrace(jobId: string): Promise<TraceResponse> {
    const res = await fetch(`${API_BASE_URL}/api/research/${jobId}/trace`);
    if (!res.ok) throw new Error('Failed to fetch trace');
    return res.json();
  },

  async getReport(jobId: string): Promise<ReportResponse> {
    const res = await fetch(`${API_BASE_URL}/api/research/${jobId}/report`);
    if (!res.ok) throw new Error('Failed to fetch report');
    return res.json();
  },

  async getLedger(): Promise<{ ledger: Step[] }> {
    const res = await fetch(`${API_BASE_URL}/api/ledger`);
    if (!res.ok) throw new Error('Failed to fetch ledger');
    return res.json();
  },

  async checkHealth(): Promise<{ ok: boolean; service: string }> {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },
};

export interface NetworkStats {
  totalSettledUsdc: number;
  settledTxCount: number;
  jobCount: number;
  serviceCount: number;
  recent: Array<{ tx_hash: string; explorer_url: string; amount_usdc: number; task_type: string }>;
}

/** Derives headline numbers from the real payment ledger - every figure shown on the
 *  marketing site is computed from actual settled on-chain payments, never mocked. */
export function deriveNetworkStats(ledger: Step[]): NetworkStats {
  const settled = ledger.filter(
    (e) => (e.status === 'paid' || e.status === 'completed') && !!e.tx_hash,
  );
  const jobIds = new Set(ledger.map((e) => (e as unknown as { job_id?: string }).job_id).filter(Boolean));
  const endpoints = new Set(ledger.map((e) => e.endpoint).filter(Boolean));

  return {
    totalSettledUsdc: settled.reduce((sum, e) => sum + (e.amount_usdc || 0), 0),
    settledTxCount: settled.length,
    jobCount: jobIds.size,
    serviceCount: endpoints.size,
    recent: settled
      .slice(-24)
      .reverse()
      .map((e) => ({
        tx_hash: e.tx_hash as string,
        explorer_url: e.explorer_url as string,
        amount_usdc: e.amount_usdc,
        task_type: e.task_type,
      })),
  };
}
