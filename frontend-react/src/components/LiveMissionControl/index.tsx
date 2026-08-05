import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useAgent } from '../../context/AgentContext';
import { StageTimeline } from './StageTimeline';
import { NarrationTerminal } from './NarrationTerminal';
import { AuctionPanel } from './AuctionPanel';
import { SettlementFeed } from './SettlementFeed';
import { BudgetGauge } from './BudgetGauge';
import { cn } from '../../utils/cn';

const STATUS: Record<string, { dot: string; text: string; label: string }> = {
  queued: { dot: 'bg-[var(--color-ink-4)]', text: 'text-[var(--color-ink-3)]', label: 'Queued' },
  running: { dot: 'bg-[var(--color-brand)]', text: 'text-[var(--color-brand)]', label: 'Running' },
  completed: { dot: 'bg-[var(--color-signal)]', text: 'text-[var(--color-signal)]', label: 'Completed' },
  budget_exceeded: { dot: 'bg-[var(--color-ember)]', text: 'text-[var(--color-ember)]', label: 'Budget reached' },
  failed: { dot: 'bg-[var(--tone-danger-text)]', text: 'text-[var(--tone-danger-text)]', label: 'Failed' },
};

export const LiveMissionControl = () => {
  const { status, trace, query, jobId, elapsedMs, error, reset } = useAgent();

  if (status === 'idle') return null;

  const s = STATUS[status] ?? STATUS.queued;
  const isLive = status === 'queued' || status === 'running';
  const seconds = (elapsedMs / 1000).toFixed(1);

  // Failed before any trace arrived - usually the backend being unreachable.
  if (!trace && (status === 'failed' || status === 'budget_exceeded')) {
    return (
      <section className="mx-auto max-w-[720px] px-5 pt-16">
        <div className="card flex items-start gap-4 border-[var(--tone-danger-border)] bg-[var(--tone-danger-bg)] p-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tone-danger-text)]" />
          <div className="flex-1">
            <h2 className="text-[17px] text-[var(--tone-danger-text-strong)]">
              {status === 'budget_exceeded' ? 'Budget reached' : 'The run could not start'}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--tone-danger-text-strong)]">
              {error || 'The workflow terminated before producing a trace.'}
            </p>
          </div>
          <button onClick={reset} className="btn-secondary shrink-0 px-4 py-2 text-[13px]">
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1240px] px-5 pb-16 pt-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="card overflow-hidden"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="min-w-[240px] flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="relative flex h-2 w-2">
                {isLive && (
                  <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-70', s.dot)} />
                )}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', s.dot)} />
              </span>
              <span className={cn('text-[12px] font-bold uppercase tracking-wider', s.text)}>{s.label}</span>
              <span className="mono text-[11.5px] text-[var(--color-ink-4)]">{jobId?.slice(0, 8)}…</span>
              <span className="mono text-[11.5px] text-[var(--color-ink-4)]">{seconds}s</span>
            </div>
            <h1 className="mt-3 max-w-[620px] text-[20px] leading-snug tracking-tight sm:text-[22px]">
              {query}
            </h1>
          </div>

          {!isLive && (
            <button onClick={reset} className="btn-secondary px-5 py-2.5 text-[13px]">
              <RotateCcw className="h-3.5 w-3.5" />
              New run
            </button>
          )}
        </div>

        <BudgetGauge spent={trace?.total_spent_usdc ?? 0} cap={trace?.budget_cap_usdc ?? 0} live={isLive} />
      </motion.div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <StageTimeline steps={trace?.steps ?? []} live={isLive} />
        <div className="flex flex-col gap-4">
          <NarrationTerminal narration={trace?.narration ?? []} live={isLive} />
          <AuctionPanel steps={trace?.steps ?? []} />
          <SettlementFeed steps={trace?.steps ?? []} />
        </div>
      </div>
    </section>
  );
};
