import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radio } from 'lucide-react';
import type { Narration } from '../../api/client';

const EVENT_COLOR: Record<string, string> = {
  planned: '#A5B4FC',
  auction_won: '#7DD3FC',
  tier_downgraded: '#FDBA74',
  skipped_budget_exceeded: '#FDBA74',
  provider_switched: '#FCA5A5',
  failed_no_fallback: '#FCA5A5',
  self_critique: '#6EE7B7',
  completed: '#6EE7B7',
};

/** The agent's own commentary. Kept as a dark cockpit panel on purpose - it reads as
 *  machine output inside the otherwise light UI, the same treatment the marketing site
 *  gives live data. */
export const NarrationTerminal = ({ narration, live }: { narration: Narration[]; live: boolean }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [narration.length]);

  return (
    <div className="cockpit overflow-hidden rounded-2xl border border-[var(--color-line)]">
      <div className="relative overflow-hidden bg-[var(--cockpit-bg)]">
        <div className="absolute inset-0 grid-bg opacity-[0.06]" />
        <div
          className="absolute -right-20 -top-20 h-48 w-48 rounded-full blur-[70px] opacity-40"
          style={{ background: 'radial-gradient(closest-side, var(--narration-glow), transparent)' }}
        />

        <div className="relative flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
          <Radio className="h-3.5 w-3.5 text-[#FCA5A5]" />
          <span className="text-[12px] font-bold uppercase tracking-wider text-white/70">
            Agent reasoning
          </span>
          {live && (
            <span className="ml-auto inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6EE7B7]" />
              <span className="mono text-[10.5px] text-white/40">streaming</span>
            </span>
          )}
        </div>

        <div className="relative max-h-[260px] min-h-[168px] space-y-2.5 overflow-y-auto p-4">
          {narration.length === 0 ? (
            <div className="mono flex h-[136px] items-center justify-center text-[11.5px] text-white/30">
              {live ? 'waiting for the first decision…' : 'no narration recorded'}
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {narration.map((n, i) => {
                const color = EVENT_COLOR[n.event] ?? '#CBD5E1';
                return (
                  <motion.div
                    key={`${n.timestamp}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="mono text-[10px] font-bold uppercase" style={{ color }}>
                        {n.event}
                      </span>
                      {n.task_id && <span className="mono text-[10px] text-white/25">{n.task_id}</span>}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-snug text-white/70">{n.text}</p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};
