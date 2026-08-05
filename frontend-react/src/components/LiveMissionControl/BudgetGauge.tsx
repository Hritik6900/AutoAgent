import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

/** Spend against the cap. The number is driven straight off the polled ledger total,
 *  so it visibly ticks up mid-job rather than jumping at the end. */
export const BudgetGauge = ({ spent, cap, live }: { spent: number; cap: number; live: boolean }) => {
  const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 0;
  const tight = pct >= 85;

  return (
    <div className="border-t border-[var(--color-line)] bg-[var(--color-paper-3)]/50 px-6 py-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <motion.span
            key={spent}
            initial={{ opacity: 0.5, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={cn(
              'mono text-[26px] font-semibold leading-none',
              tight ? 'text-[var(--color-ember)]' : 'text-[var(--color-ink)]',
            )}
          >
            ${spent.toFixed(4)}
          </motion.span>
          <span className="mono text-[13px] text-[var(--color-ink-4)]">/ ${cap.toFixed(2)} USDC</span>
        </div>
        <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
          {live ? 'Spending live' : 'Final spend'} · {pct.toFixed(0)}% of cap
        </span>
      </div>

      <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-line)]">
        <motion.div
          className={cn(
            'relative h-full rounded-full',
            tight ? 'bg-[var(--color-ember)]' : 'bg-[var(--color-signal)]',
          )}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {live && pct > 0 && <span className="shimmer absolute inset-0 overflow-hidden rounded-full" />}
        </motion.div>
      </div>
    </div>
  );
};
