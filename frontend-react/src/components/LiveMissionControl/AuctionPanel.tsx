import { motion } from 'framer-motion';
import { Gavel } from 'lucide-react';
import type { Step } from '../../api/client';
import { cn } from '../../utils/cn';

/** Shows the most recent completed auction: every provider that quoted, its price, its
 *  historical reliability, and which one actually won. The winner is frequently NOT the
 *  cheapest, which is the whole point - so both dimensions are always visible. */
export const AuctionPanel = ({ steps }: { steps: Step[] }) => {
  const auctions = steps.filter((s) => s.quotes_considered && s.quotes_considered.length > 0);
  const latest = auctions[auctions.length - 1];

  if (!latest?.quotes_considered) return null;

  const quotes = [...latest.quotes_considered].sort(
    (a, b) => (a.price_usdc ?? 99) - (b.price_usdc ?? 99),
  );
  const maxPrice = Math.max(...quotes.map((q) => q.price_usdc ?? 0), 0.0001);
  const cheapest = quotes[0]?.provider;
  const winner = latest.chosen_provider;
  const upsetWin = winner && cheapest && winner !== cheapest;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/50 px-5 py-3.5">
        <Gavel className="h-3.5 w-3.5 text-[var(--color-ink-3)]" />
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-ink-2)]">
          Live auction
        </h2>
        <span className="mono ml-auto text-[11px] text-[var(--color-ink-4)]">{latest.task_id}</span>
      </div>

      <div className="space-y-2.5 p-4">
        {quotes.map((q, i) => {
          const isWinner = q.provider === winner;
          const price = q.price_usdc ?? 0;
          const rel = q.success_rate ?? 1;

          return (
            <motion.div
              key={q.provider}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={cn(
                'rounded-xl border px-3.5 py-3',
                isWinner
                  ? 'border-[var(--tone-signal-border)] bg-[var(--tone-signal-bg)]'
                  : 'border-[var(--color-line)] bg-[var(--color-paper-2)]',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="mono flex items-center gap-2 text-[12.5px] font-semibold text-[var(--color-ink)]">
                  {q.provider}
                  {isWinner && (
                    <span className="rounded bg-[var(--color-signal)] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
                      won
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'mono text-[12.5px] font-semibold',
                    isWinner ? 'text-[var(--color-signal)]' : 'text-[var(--color-ink-3)]',
                  )}
                >
                  {q.error ? 'no quote' : `$${price.toFixed(4)}`}
                </span>
              </div>

              <div className="mt-2 space-y-1.5">
                <Bar
                  label="price"
                  pct={(price / maxPrice) * 100}
                  color={isWinner ? 'var(--color-signal)' : 'var(--color-line-2)'}
                  value={`$${price.toFixed(4)}`}
                />
                <Bar
                  label="reliab."
                  pct={rel * 100}
                  color={isWinner ? 'var(--color-brand)' : 'var(--color-line-2)'}
                  value={`${Math.round(rel * 100)}%`}
                />
              </div>
            </motion.div>
          );
        })}

        <p className="pt-1 text-center text-[11.5px] leading-relaxed text-[var(--color-ink-4)]">
          {upsetWin
            ? `${cheapest} quoted lower — reliability decided it.`
            : 'Scored on price ÷ historical success rate.'}
        </p>
      </div>
    </div>
  );
};

const Bar = ({ label, pct, color, value }: { label: string; pct: number; color: string; value: string }) => (
  <div className="flex items-center gap-2">
    <span className="w-12 shrink-0 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--color-ink-4)]">
      {label}
    </span>
    <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
    <span className="mono w-12 shrink-0 text-right text-[10px] text-[var(--color-ink-4)]">{value}</span>
  </div>
);
