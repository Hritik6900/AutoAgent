import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CircleSlash, Loader2 } from 'lucide-react';
import { apiClient } from '../../api/client';
import type { Step } from '../../api/client';
import { cn } from '../../utils/cn';

type JobRow = { jobId: string; steps: Step[]; total: number; when: string };

/** Groups the persisted ledger into jobs and spotlights the newest one. The ledger is
 *  the durable source here (SQLite), so this still works for jobs whose in-memory
 *  trace is long gone after a backend restart. */
function latestJob(ledger: Step[]): JobRow | null {
  const byJob = new Map<string, Step[]>();
  for (const row of ledger) {
    const jobId = (row as unknown as { job_id?: string }).job_id;
    if (!jobId) continue;
    if (!byJob.has(jobId)) byJob.set(jobId, []);
    byJob.get(jobId)!.push(row);
  }
  if (byJob.size === 0) return null;

  const jobs = [...byJob.entries()].map(([jobId, steps]) => {
    const settled = steps.filter((s) => (s.status === 'paid' || s.status === 'completed') && s.tx_hash);
    return {
      jobId,
      steps: settled,
      total: settled.reduce((sum, s) => sum + (s.amount_usdc || 0), 0),
      when: steps[steps.length - 1]?.timestamp ?? '',
    };
  });

  jobs.sort((a, b) => (a.when < b.when ? 1 : -1));
  return jobs.find((j) => j.steps.length > 0) ?? null;
}

export const LiveJobSpotlight = () => {
  const [job, setJob] = useState<JobRow | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'offline'>('loading');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { ledger } = await apiClient.getLedger();
        if (cancelled) return;
        const found = latestJob(ledger);
        setJob(found);
        setState(found ? 'ready' : 'empty');
      } catch {
        if (!cancelled) setState('offline');
      }
    };
    load();
    const id = window.setInterval(load, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="card flex items-center justify-center gap-2 py-20 text-[13.5px] text-[var(--color-ink-3)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Reading the ledger…
      </div>
    );
  }

  if (state !== 'ready' || !job) {
    return (
      <div className="card flex flex-col items-center gap-3 py-16 text-center">
        <CircleSlash className="h-5 w-5 text-[var(--color-ink-4)]" />
        <p className="text-[14px] font-semibold text-[var(--color-ink-2)]">
          {state === 'offline' ? 'The orchestrator is not reachable' : 'No settled jobs on this machine yet'}
        </p>
        <p className="max-w-[380px] text-[13px] text-[var(--color-ink-3)]">
          {state === 'offline'
            ? 'Start the backend on port 4000 and this section fills itself with real transactions.'
            : 'Run one job in the console and its real transactions appear here automatically.'}
        </p>
        <Link to="/console" className="btn-secondary mt-2 px-5 py-2.5 text-[13px]">
          Open the console
        </Link>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/60 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-[var(--color-signal)]" />
          <span className="mono text-[12px] text-[var(--color-ink-3)]">job {job.jobId.slice(0, 8)}…</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-ink-4)]">
              Settlements
            </div>
            <div className="mono text-[15px] font-semibold">{job.steps.length}</div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-ink-4)]">
              Total paid
            </div>
            <div className="mono text-[15px] font-semibold text-[var(--color-signal)]">
              ${job.total.toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[var(--color-line)]">
        {job.steps.map((s, i) => (
          <div
            key={`${s.tx_hash}-${i}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4 transition-colors hover:bg-[var(--color-paper-3)]/40"
          >
            <span className="mono w-8 text-[12px] text-[var(--color-ink-4)]">{s.task_id}</span>
            <span className="min-w-[130px] text-[13.5px] font-semibold text-[var(--color-ink)]">
              {s.task_type?.replace(/_/g, ' ')}
            </span>
            <span
              className={cn(
                'rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                'border-[var(--color-line)] bg-[var(--color-paper-3)] text-[var(--color-ink-3)]',
              )}
            >
              {s.tier}
            </span>
            <span className="mono text-[13px] text-[var(--color-signal)]">
              ${s.amount_usdc?.toFixed(4)}
            </span>
            <a
              href={s.explorer_url ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="group ml-auto inline-flex items-center gap-1.5"
            >
              <span className="mono text-[12px] text-[var(--color-ink-3)] transition-colors group-hover:text-[var(--color-ink)]">
                {s.tx_hash?.slice(0, 14)}…
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-[var(--color-ink-4)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--color-line)] bg-[var(--color-paper-3)]/40 px-6 py-3.5 text-center text-[12px] text-[var(--color-ink-4)]">
        Every hash above is a real Base Sepolia transaction — open any of them on BaseScan.
      </div>
    </div>
  );
};
