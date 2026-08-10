import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '../../utils/cn';

/** The nine primitives a job actually touches, in the order they appear on the wire.
 *  Purely decorative — a compact restatement of the pipeline diagram below the fold —
 *  but it's what makes the hero read as "orchestration system" before anyone scrolls. */
const TOKENS = ['Planner', 'Auction', 'Executor', 'x402', 'Base', 'USDC', 'Search', 'Critique', 'Compile'];

export const OrchestrationStrip = () => {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) return;
    timer.current = window.setInterval(() => setActive((i) => (i + 1) % TOKENS.length), 1700);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [reduced]);

  return (
    <div
      className="mx-auto mt-10 flex max-w-[560px] flex-wrap items-center justify-center gap-1.5"
      aria-hidden="true"
    >
      {TOKENS.map((t, i) => (
        <span key={t} className={cn('chip', i === active && 'chip-active')}>
          {t}
        </span>
      ))}
    </div>
  );
};
