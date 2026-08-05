import { ArrowUpRight, CircleSlash } from 'lucide-react';
import { CountUp, LiveDot } from './primitives';
import { useNetworkStats } from '../hooks/useNetworkStats';
import { cn } from '../../utils/cn';

/** Replaces the usual "trusted by" logo wall with something a hackathon project can
 *  actually back up: figures computed live from the real on-chain payment ledger. */
export const LiveProofStrip = () => {
  const { stats, online } = useNetworkStats();

  const items = [
    {
      label: 'USDC settled',
      node: <CountUp value={stats?.totalSettledUsdc ?? 0} decimals={4} prefix="$" />,
    },
    { label: 'Payments settled', node: <CountUp value={stats?.settledTxCount ?? 0} /> },
    { label: 'Jobs run', node: <CountUp value={stats?.jobCount ?? 0} /> },
    { label: 'Agent services', node: <span className="mono">8</span> },
  ];

  return (
    <div className="site-container">
      <div className="rule-node mx-auto max-w-[720px]" />

      <div className="flex items-center justify-center gap-2 pt-9 pb-10">
        <LiveDot online={online} />
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-3)]">
          {online === false ? 'Ledger unreachable' : 'Live from the payment ledger'}
        </span>
      </div>

      {online === false ? (
        /* Offline is a real state a visitor can hit, so it gets designed rather than
           reduced to a grey strip: the metric labels stay visible with placeholder
           dashes, so the shape of what's missing is still legible. */
        <div className="mx-auto max-w-[760px]">
          <div className="grid grid-cols-2 gap-y-9 sm:flex sm:items-start sm:justify-center sm:gap-0 sm:divide-x sm:divide-[var(--color-line)]">
            {items.map((it) => (
              <div key={it.label} className="px-4 text-center sm:flex-1 sm:px-8">
                <div className="mono text-[32px] font-semibold tracking-tight text-[var(--color-ink-4)] sm:text-[38px]">
                  —
                </div>
                <div className="mt-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-4)]">
                  {it.label}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-2 text-center">
            <CircleSlash className="h-3.5 w-3.5 text-[var(--color-ink-4)]" />
            <span className="text-[13px] text-[var(--color-ink-3)]">
              These fill in from the live ledger once the orchestrator is running —
            </span>
            <code className="mono rounded-md border border-[var(--color-line)] bg-[var(--color-paper-2)] px-2 py-1 text-[12px] text-[var(--color-ink-2)]">
              ./run_all.sh
            </code>
          </div>
        </div>
      ) : (
        /* No card, no border, no shadow - just the numbers, the way a magazine states a
           statistic rather than boxing it into a dashboard widget. A hairline divides
           each figure from the next; the flagship number (real USDC settled) is the one
           thing here that gets the amber accent, so it reads first. */
        <div className="mx-auto max-w-[820px] grid grid-cols-2 gap-y-9 sm:flex sm:items-start sm:justify-center sm:gap-0 sm:divide-x sm:divide-[var(--color-line)]">
          {items.map((it, i) => (
            <div key={it.label} className="px-4 text-center sm:flex-1 sm:px-8">
              <div
                className={cn(
                  'font-display text-[32px] font-extrabold tracking-tight sm:text-[38px]',
                  i === 0 ? 'text-[var(--tone-amber-text)]' : 'text-[var(--color-ink)]',
                )}
              >
                {it.node}
              </div>
              <div className="mt-2 text-[11.5px] font-medium uppercase tracking-[0.06em] text-[var(--color-ink-3)]">
                {it.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Marquee of genuinely settled transactions, each linking to BaseScan. If the ledger
 *  is empty or unreachable we say so rather than inventing filler hashes. */
export const TxTicker = () => {
  const { stats, online } = useNetworkStats();
  const rows = stats?.recent ?? [];

  if (online === false || rows.length === 0) {
    /* Keep the rail's shape (ghost chips drifting past) so the section still reads as
       "a live feed, currently empty" rather than a stray line of grey text. */
    const ghosts = Array.from({ length: 8 });
    return (
      <div className="relative overflow-hidden border-y border-[var(--color-line)] bg-[var(--color-paper-2)]/50 py-3.5 backdrop-blur-[2px]">
        <div className="animate-marquee flex w-max items-center gap-3 opacity-40">
          {[...ghosts, ...ghosts].map((_, i) => (
            <span
              key={i}
              className="flex h-[30px] w-[190px] shrink-0 items-center gap-2.5 rounded-full border border-[var(--color-line)] bg-[var(--color-paper-3)]/60 px-3.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-ink-4)]" />
              <span className="h-1.5 flex-1 rounded-full bg-[var(--color-line-2)]" />
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)]/90 px-4 py-1.5 text-[12.5px] text-[var(--color-ink-3)] backdrop-blur">
            <LiveDot online={online} />
            {online === false
              ? 'Transaction feed offline — start the orchestrator to stream settlements'
              : 'No settlements yet — run a job to populate the feed'}
          </span>
        </div>
      </div>
    );
  }

  const loop = [...rows, ...rows];

  return (
    <div className="relative overflow-hidden border-y border-[var(--color-line)] bg-[var(--color-paper-2)] py-3.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--color-paper-2)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--color-paper-2)] to-transparent" />
      <div className="animate-marquee flex w-max items-center gap-3">
        {loop.map((tx, i) => (
          <a
            key={`${tx.tx_hash}-${i}`}
            href={tx.explorer_url}
            target="_blank"
            rel="noreferrer"
            className="group flex shrink-0 items-center gap-2.5 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-1.5 transition-colors hover:border-[var(--color-line-2)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-signal)]" />
            <span className="text-[11.5px] font-semibold text-[var(--color-ink-2)]">
              {tx.task_type?.replace(/_/g, ' ')}
            </span>
            <span className="mono text-[11.5px] text-[var(--color-signal)]">
              ${tx.amount_usdc?.toFixed(4)}
            </span>
            <span className="mono text-[11.5px] text-[var(--color-ink-4)]">
              {tx.tx_hash.slice(0, 10)}…
            </span>
            <ArrowUpRight className="h-3 w-3 text-[var(--color-ink-4)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ))}
      </div>
    </div>
  );
};
