import { useEffect, useState } from 'react';
import { API_BASE_URL, apiClient } from '../../api/client';

export interface McpQuota {
  caller: string;
  anonymous: boolean;
  spent_or_committed_today_usdc: number;
  daily_cap_usdc: number;
  remaining_today_usdc: number;
  max_job_budget_usdc: number;
  jobs_last_hour: number;
  max_jobs_per_hour: number;
}

/** Real numbers pulled from the orchestrator's ledger, used to ground the MCP session
 *  transcript. The transcript is a scripted demo of the protocol, but the figures inside
 *  it are the machine's own - a made-up transaction hash on a page whose entire claim is
 *  "every payment is verifiable" would be the one lie that discredits the rest. */
export interface McpGround {
  lastTxHash: string | null;
  lastExplorerUrl: string | null;
  settledCount: number;
  totalSpentUsdc: number;
  lastJobSpendUsdc: number | null;
}

/** Polls what the MCP layer actually exposes: whether the orchestrator answers at all,
 *  the caller's live spend quota, and enough real ledger data to keep the demo honest.
 *
 *  `quota` is null - rather than zeroed - when /api/quota is unreachable or the caller
 *  has no key, so the UI can say "unknown" instead of showing a confident 0.0000 that
 *  looks like a real reading. */
export function useMcpLink(pollMs = 12000) {
  const [online, setOnline] = useState<boolean | null>(null);
  const [quota, setQuota] = useState<McpQuota | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [ground, setGround] = useState<McpGround>({
    lastTxHash: null,
    lastExplorerUrl: null,
    settledCount: 0,
    totalSpentUsdc: 0,
    lastJobSpendUsdc: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { ledger } = await apiClient.getLedger();
        if (cancelled) return;
        setOnline(true);

        const settled = ledger.filter(
          (e) => (e.status === 'paid' || e.status === 'completed') && !!e.tx_hash,
        );
        const last = settled[settled.length - 1];

        // What one job costs, taken from the most recent job that actually ran, so the
        // transcript quotes a real total rather than a rounded guess.
        const lastJobId = last ? (last as unknown as { job_id?: string }).job_id : undefined;
        const lastJobSpend = lastJobId
          ? settled
              .filter((e) => (e as unknown as { job_id?: string }).job_id === lastJobId)
              .reduce((sum, e) => sum + (e.amount_usdc || 0), 0)
          : null;

        setGround({
          lastTxHash: last?.tx_hash ?? null,
          lastExplorerUrl: last?.explorer_url ?? null,
          settledCount: settled.length,
          totalSpentUsdc: settled.reduce((sum, e) => sum + (e.amount_usdc || 0), 0),
          lastJobSpendUsdc: lastJobSpend,
        });
      } catch {
        if (!cancelled) setOnline(false);
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/quota`);
        if (cancelled) return;
        if (res.ok) {
          setQuota(await res.json());
          setQuotaError(null);
        } else if (res.status === 401) {
          setQuota(null);
          setQuotaError('This orchestrator requires an API key.');
        } else {
          setQuota(null);
          setQuotaError(null);
        }
      } catch {
        if (!cancelled) setQuota(null);
      }
    };

    load();
    const id = window.setInterval(load, pollMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return { online, quota, quotaError, ground };
}
