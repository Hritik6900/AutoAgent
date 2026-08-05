import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Check,
  Layers,
  Loader2,
  Lock,
  Search,
  Sparkles,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import type { Step } from '../../api/client';
import { cn } from '../../utils/cn';

const ICONS: Record<string, typeof Search> = {
  web_search: Search,
  fact_check: BadgeCheck,
  data_enrichment: Layers,
  summarize: Sparkles,
  compile_report: BookOpen,
};

const LABELS: Record<string, string> = {
  web_search: 'Web search',
  fact_check: 'Fact check',
  data_enrichment: 'Data enrichment',
  summarize: 'Summarize',
  compile_report: 'Compile report',
};

type Tone = { ring: string; icon: string; chipBg: string; chipText: string; label: string };

function toneFor(status: string): Tone {
  switch (status) {
    case 'completed':
    case 'paid':
      return {
        ring: 'border-[var(--tone-signal-border)] bg-[var(--tone-signal-bg)]',
        icon: 'text-[var(--tone-signal-text)]',
        chipBg: 'bg-[var(--tone-signal-bg)] border-[var(--tone-signal-border)]',
        chipText: 'text-[var(--tone-signal-text)]',
        label: 'Settled',
      };
    case 'paying':
      return {
        ring: 'border-[var(--tone-brand-border)] bg-[var(--tone-brand-bg)]',
        icon: 'text-[var(--tone-brand-text)]',
        chipBg: 'bg-[var(--tone-brand-bg)] border-[var(--tone-brand-border)]',
        chipText: 'text-[var(--tone-brand-text)]',
        label: 'Paying',
      };
    case 'failed':
      return {
        ring: 'border-[var(--tone-danger-border)] bg-[var(--tone-danger-bg)]',
        icon: 'text-[var(--tone-danger-text)]',
        chipBg: 'bg-[var(--tone-danger-bg)] border-[var(--tone-danger-border)]',
        chipText: 'text-[var(--tone-danger-text)]',
        label: 'Failed',
      };
    case 'tier_downgraded':
    case 'skipped_budget_exceeded':
      return {
        ring: 'border-[var(--tone-warn-border)] bg-[var(--tone-warn-bg)]',
        icon: 'text-[var(--tone-warn-text)]',
        chipBg: 'bg-[var(--tone-warn-bg)] border-[var(--tone-warn-border)]',
        chipText: 'text-[var(--tone-warn-text)]',
        label: status === 'tier_downgraded' ? 'Downgraded' : 'Skipped',
      };
    default:
      return {
        ring: 'border-[var(--color-line-2)] bg-[var(--color-paper-3)]',
        icon: 'text-[var(--color-ink-4)]',
        chipBg: 'bg-[var(--color-paper-3)] border-[var(--color-line)]',
        chipText: 'text-[var(--color-ink-3)]',
        label: status,
      };
  }
}

export const StageTimeline = ({ steps, live }: { steps: Step[]; live: boolean }) => {
  const ordered = [...steps].sort((a, b) => a.task_id.localeCompare(b.task_id, undefined, { numeric: true }));

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/50 px-5 py-3.5">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-ink-2)]">
          Execution pipeline
        </h2>
        <span className="mono text-[11.5px] text-[var(--color-ink-4)]">
          {ordered.filter((s) => s.status === 'completed' || s.status === 'paid').length}/{ordered.length} settled
        </span>
      </div>

      <div className="p-5">
        {ordered.length === 0 ? (
          <div className="flex items-center justify-center gap-2.5 py-16 text-[13.5px] text-[var(--color-ink-3)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Planning the task graph…
          </div>
        ) : (
          <ol className="relative space-y-2.5">
            {ordered.map((step, i) => (
              <StageRow key={step.task_id} step={step} index={i} last={i === ordered.length - 1} live={live} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

const StageRow = ({ step, index, last, live }: { step: Step; index: number; last: boolean; live: boolean }) => {
  const Icon = ICONS[step.task_type] ?? Layers;
  const tone = toneFor(step.status);
  const paying = step.status === 'paying';
  const settled = step.status === 'completed' || step.status === 'paid';

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25) }}
      className="relative"
    >
      {/* connector */}
      {!last && (
        <span className="absolute left-[21px] top-[46px] bottom-[-14px] w-px overflow-hidden bg-[var(--color-line)]">
          {paying && live && (
            <span className="animate-flow absolute inset-x-[-1px] h-6 bg-gradient-to-b from-transparent via-[var(--color-brand)] to-transparent" />
          )}
        </span>
      )}

      <div
        className={cn(
          'flex items-start gap-3.5 rounded-xl border p-3.5 transition-colors',
          paying
            ? 'border-[var(--tone-brand-border)] bg-[var(--tone-brand-bg)]/40'
            : 'border-[var(--color-line)] bg-[var(--color-paper-2)]',
        )}
      >
        <span
          className={cn(
            'relative mt-0.5 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl border-2',
            tone.ring,
          )}
        >
          {paying ? (
            <Lock className={cn('h-4 w-4', tone.icon)} />
          ) : settled ? (
            <Check className={cn('h-4 w-4', tone.icon)} />
          ) : step.status === 'failed' ? (
            <TriangleAlert className={cn('h-4 w-4', tone.icon)} />
          ) : (
            <Icon className={cn('h-4 w-4', tone.icon)} />
          )}
          {paying && live && (
            <span className="absolute inset-0 animate-ping rounded-xl border-2 border-[#F59E0B] opacity-40" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="mono text-[11px] text-[var(--color-ink-4)]">{step.task_id}</span>
            <span className="text-[14px] font-semibold text-[var(--color-ink)]">
              {LABELS[step.task_type] ?? step.task_type?.replace(/_/g, ' ')}
            </span>
            <span
              className={cn(
                'rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                tone.chipBg,
                tone.chipText,
              )}
            >
              {tone.label}
            </span>
            {step.provider_switched && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[var(--tone-warn-border)] bg-[var(--tone-warn-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[var(--tone-warn-text)]">
                <Zap className="h-2.5 w-2.5" />
                Recovered
              </span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            {step.tier && (
              <span className="mono text-[var(--color-ink-3)]">
                provider <span className="text-[var(--color-ink-2)]">{step.tier}</span>
              </span>
            )}
            {typeof step.amount_usdc === 'number' && (
              <span className={cn('mono font-semibold', settled ? 'text-[var(--color-signal)]' : 'text-[var(--color-ink-3)]')}>
                ${step.amount_usdc.toFixed(4)}
              </span>
            )}
          </div>

          {step.provider_switched && step.switched_from && (
            <p className="mt-1.5 text-[12px] text-[var(--tone-warn-text)]">
              {step.switched_from} failed — rerouted to {step.switched_to} without dropping the task.
            </p>
          )}

          <AnimatePresence>
            {settled && step.tx_hash && (
              <motion.a
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                href={step.explorer_url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="group mt-2 flex items-center gap-1.5 text-[11.5px]"
              >
                <span className="mono truncate text-[var(--color-ink-3)] transition-colors group-hover:text-[var(--color-ink)]">
                  {step.tx_hash.slice(0, 22)}…
                </span>
                <ArrowUpRight className="h-3 w-3 shrink-0 text-[var(--color-ink-4)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </motion.a>
            )}
          </AnimatePresence>

          {step.status === 'failed' && step.error && (
            <p className="mono mt-2 line-clamp-2 rounded-lg bg-[var(--tone-danger-bg)] px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--tone-danger-text-strong)]">
              {step.error}
            </p>
          )}
        </div>
      </div>
    </motion.li>
  );
};
