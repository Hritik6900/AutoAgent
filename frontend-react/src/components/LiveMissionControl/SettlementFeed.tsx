import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Receipt } from 'lucide-react';
import type { Step } from '../../api/client';

/** Every settled payment for this run, newest first, each linking to the real
 *  transaction on BaseScan. */
export const SettlementFeed = ({ steps }: { steps: Step[] }) => {
  const settled = steps
    .filter((s) => (s.status === 'completed' || s.status === 'paid') && s.tx_hash)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  const total = settled.reduce((sum, s) => sum + (s.amount_usdc || 0), 0);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/50 px-5 py-3.5">
        <Receipt className="h-3.5 w-3.5 text-[var(--color-ink-3)]" />
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-ink-2)]">
          On-chain settlements
        </h2>
        <span className="mono ml-auto text-[11.5px] font-semibold text-[var(--color-signal)]">
          ${total.toFixed(4)}
        </span>
      </div>

      {settled.length === 0 ? (
        <div className="px-5 py-10 text-center text-[12.5px] text-[var(--color-ink-4)]">
          No payments have settled yet.
        </div>
      ) : (
        <div className="max-h-[280px] divide-y divide-[var(--color-line)] overflow-y-auto">
          <AnimatePresence initial={false}>
            {settled.map((s) => (
              <motion.a
                key={s.tx_hash}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                href={s.explorer_url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--color-paper-3)]/50"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-signal)]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-[var(--color-ink)]">
                    {s.task_type?.replace(/_/g, ' ')}
                  </span>
                  <span className="mono block truncate text-[11px] text-[var(--color-ink-4)]">
                    {s.tx_hash?.slice(0, 20)}…
                  </span>
                </span>
                <span className="mono shrink-0 text-[12px] font-semibold text-[var(--color-signal)]">
                  ${s.amount_usdc?.toFixed(4)}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-ink-4)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </motion.a>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
