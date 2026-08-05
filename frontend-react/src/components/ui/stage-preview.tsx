import React from 'react';
import { Coins, FileText, Gavel, Globe, ListTree, ShieldCheck } from 'lucide-react';

/** The six stages a job actually runs through, previewed as a loop before you launch.
 *
 *  Every chip carries the same keyframes with a staggered delay, so the highlight walks
 *  left to right the way a real run does - no timers, no state, no re-renders. It's a
 *  legend and an ambient animation at once: by the time the user hits launch they already
 *  know what the live view is going to show them.
 */
const STAGES = [
  { icon: ListTree, label: 'Plan' },
  { icon: Gavel, label: 'Auction' },
  { icon: Coins, label: 'Pay' },
  { icon: Globe, label: 'Fetch' },
  { icon: ShieldCheck, label: 'Critique' },
  { icon: FileText, label: 'Report' },
];

const CYCLE = 5.4;

export const StagePreview: React.FC = () => (
  <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
    {STAGES.map((s, i) => (
      <React.Fragment key={s.label}>
        {i > 0 && (
          <span
            className="stage-chip h-px w-4 bg-[var(--color-line-2)] sm:w-7"
            style={{
              animation: `stage-pulse ${CYCLE}s ease-in-out infinite`,
              animationDelay: `${i * (CYCLE / STAGES.length) - 0.2}s`,
            }}
          />
        )}
        <span
          className="stage-chip inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)]/50 px-2.5 py-1 backdrop-blur-sm"
          style={{
            animation: `stage-pulse ${CYCLE}s ease-in-out infinite`,
            animationDelay: `${i * (CYCLE / STAGES.length)}s`,
          }}
        >
          <s.icon className="h-3 w-3 text-[var(--color-brand-2)]" style={{ width: 12, height: 12 }} />
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--color-ink-2)]">
            {s.label}
          </span>
        </span>
      </React.Fragment>
    ))}
  </div>
);
