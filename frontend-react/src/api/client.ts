export const API_BASE_URL = localStorage.getItem('API_BASE_URL') || 'http://localhost:4000';

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
