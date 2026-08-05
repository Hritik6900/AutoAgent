import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BadgeCheck,
  BookOpen,
  Brain,
  Gavel,
  Layers,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../utils/cn';

type Stage = {
  id: string;
  icon: typeof Search;
  name: string;
  kicker: string;
  body: string;
  detail: string[];
  cost: string | null;
  accent: string;
};

const STAGES: Stage[] = [
  {
    id: 'plan',
    icon: Brain,
    name: 'Plan',
    kicker: 'Free · runs in-process',
    body: 'An LLM turns your question into a dependency graph of typed tasks — searches, checks, enrichment, a summary and a final report — then the orchestrator topologically sorts it so independent work runs in parallel.',
    detail: ['Groq · llama-3.3-70b', 'Cycle detection on the graph', 'Parallel layers via asyncio.gather'],
    cost: null,
    accent: '#D97706',
  },
  {
    id: 'auction',
    icon: Gavel,
    name: 'Auction',
    kicker: 'Before every search',
    body: 'Three independent search providers each quote a live price. The orchestrator does not simply take the cheapest — it divides price by each provider\'s historical success rate, so a slightly dearer but reliable service can win.',
    detail: ['GET /quote in parallel', 'score = price ÷ success_rate', 'History read from the SQLite ledger'],
    cost: null,
    accent: '#F59E0B',
  },
  {
    id: 'pay',
    icon: Lock,
    name: 'Pay',
    kicker: 'HTTP 402 · x402 protocol',
    body: 'The service answers 402 Payment Required with its price. The agent signs an EIP-3009 authorization with its own wallet and retries. The facilitator verifies and settles it as a real USDC transfer on Base Sepolia.',
    detail: ['Gasless transferWithAuthorization', 'Public x402.org facilitator', 'Returns a real transaction hash'],
    cost: '$0.0022',
    accent: '#059669',
  },
  {
    id: 'execute',
    icon: Layers,
    name: 'Execute',
    kicker: 'Paid work happens',
    body: 'Only after settlement does the service run. Searches hit the live web, fact-check cross-references a claim against a second source, enrichment pulls entities and statistics, and the summarizer condenses it all.',
    detail: ['Tavily-backed live search', 'Independent processes per service', 'Failure reroutes to an alternate'],
    cost: '$0.0090',
    accent: '#F59E0B',
  },
  {
    id: 'synthesize',
    icon: BookOpen,
    name: 'Synthesize',
    kicker: 'The most expensive call',
    body: 'A stronger model writes the actual report from every paid section, attributing each claim back to the task that produced it. Two tiers exist as separate processes, so killing one leaves the other reachable.',
    detail: ['Premium and cheap tiers', 'Claims tagged [t1], [t2]…', 'Genuine process-level failover'],
    cost: '$0.0060',
    accent: '#EA580C',
  },
  {
    id: 'critique',
    icon: ShieldCheck,
    name: 'Critique',
    kicker: 'The agent grades itself',
    body: 'A second, independent model reviews every citation the report produced and marks each strong, moderate or weak — flagging unsourced or vague claims before you ever read them. Unreviewed never means "trusted".',
    detail: ['Per-claim confidence grade', 'Aggregate trust score', 'Null rather than a faked default'],
    cost: null,
    accent: '#059669',
  },
];

const MINI_ICONS = [Search, BadgeCheck, Layers, Sparkles];

export const PipelineDiagram = () => {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!auto) return;
    timer.current = window.setInterval(() => setActive((i) => (i + 1) % STAGES.length), 4200);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [auto]);

  const stage = STAGES[active];

  return (
    <div className="card overflow-hidden">
      {/* rail */}
      <div className="relative border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/60 px-4 py-5 sm:px-6">
        <div className="relative flex items-center justify-between gap-1 overflow-x-auto pb-1">
          {/* connecting line */}
          <div className="pointer-events-none absolute left-0 right-0 top-[22px] hidden h-px bg-[var(--color-line-2)] sm:block" />
          <motion.div
            className="pointer-events-none absolute top-[22px] hidden h-px sm:block"
            style={{ background: stage.accent }}
            animate={{ width: `${(active / (STAGES.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />

          {STAGES.map((s, i) => {
            const isActive = i === active;
            const isPast = i < active;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActive(i);
                  setAuto(false);
                }}
                className="relative z-10 flex min-w-[92px] flex-1 flex-col items-center gap-2 px-1"
              >
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all duration-300',
                    isActive
                      ? 'scale-110 bg-white shadow-[0_8px_24px_-8px_rgba(11,11,15,0.28)]'
                      : isPast
                        ? 'bg-white'
                        : 'border-[var(--color-line-2)] bg-[var(--color-paper-2)]',
                  )}
                  style={isActive || isPast ? { borderColor: s.accent } : undefined}
                >
                  <s.icon
                    className="h-4.5 w-4.5"
                    style={{ color: isActive || isPast ? s.accent : 'var(--color-ink-4)', width: 18, height: 18 }}
                  />
                </span>
                <span
                  className={cn(
                    'text-center text-[12px] font-semibold transition-colors',
                    isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-3)]',
                  )}
                >
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* detail */}
      <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28 }}
            >
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                style={{ color: stage.accent, background: `${stage.accent}14` }}
              >
                Step {active + 1} · {stage.kicker}
              </div>
              <h3 className="mt-4 text-[26px] tracking-tight">{stage.name}</h3>
              <p className="prose-body mt-3 max-w-[520px]">{stage.body}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                {stage.detail.map((d) => (
                  <span
                    key={d}
                    className="mono rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-1.5 text-[11.5px] text-[var(--color-ink-2)]"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* visual */}
        <div className="relative min-h-[280px] overflow-hidden border-t border-[var(--color-line)] bg-[var(--cockpit-bg)] p-6 md:border-l md:border-t-0">
          <div className="absolute inset-0 grid-bg opacity-[0.07]" />
          {/* Bloom of the active stage's accent. Its strength is a token because a
              saturated colour field is exactly the kind of thing the dark theme keeps
              near-invisible, while light can carry it at full weight. */}
          <div
            className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-[80px] transition-all duration-700"
            style={{
              background: `radial-gradient(closest-side, ${stage.accent}, transparent)`,
              opacity: 'var(--stage-glow-opacity)',
            }}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3 }}
              className="relative flex h-full flex-col justify-center"
            >
              {stage.id === 'plan' && <PlanViz accent={stage.accent} />}
              {stage.id === 'auction' && <AuctionViz accent={stage.accent} />}
              {stage.id === 'pay' && <PayViz accent={stage.accent} />}
              {stage.id === 'execute' && <ExecuteViz accent={stage.accent} />}
              {stage.id === 'synthesize' && <SynthViz accent={stage.accent} />}
              {stage.id === 'critique' && <CritiqueViz accent={stage.accent} />}
            </motion.div>
          </AnimatePresence>

          {stage.cost && (
            <div className="absolute bottom-4 right-5 text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                This step costs
              </div>
              <div className="mono text-[18px] font-semibold" style={{ color: stage.accent }}>
                {stage.cost}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- per-stage visuals ---------------- */

const PlanViz = ({ accent }: { accent: string }) => (
  <div className="space-y-2">
    {[
      { id: 't1', label: 'web_search', dep: '' },
      { id: 't2', label: 'web_search', dep: '' },
      { id: 't3', label: 'data_enrichment', dep: '← t1' },
      { id: 't4', label: 'fact_check', dep: '← t1, t2' },
      { id: 't5', label: 'summarize', dep: '← t3, t4' },
      { id: 't6', label: 'compile_report', dep: '← t5' },
    ].map((t, i) => (
      <motion.div
        key={t.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.07 }}
        className="flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2"
        style={{ marginLeft: t.dep ? `${Math.min(t.dep.split(',').length, 2) * 10}px` : 0 }}
      >
        <span className="mono text-[11px] font-semibold" style={{ color: accent }}>
          {t.id}
        </span>
        <span className="mono text-[11.5px] text-white/70">{t.label}</span>
        <span className="mono ml-auto text-[10.5px] text-white/30">{t.dep}</span>
      </motion.div>
    ))}
  </div>
);

const AuctionViz = ({ accent }: { accent: string }) => {
  const rows = [
    { name: 'search_b', price: 0.0022, rel: 0.86, win: true },
    { name: 'search_c', price: 0.002, rel: 0.41, win: false },
    { name: 'search', price: 0.0036, rel: 0.92, win: false },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <motion.div
          key={r.name}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={cn(
            'rounded-xl border px-3.5 py-3',
            r.win ? 'border-white/20 bg-white/[0.07]' : 'border-white/[0.07] bg-white/[0.025]',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="mono text-[12px] font-semibold text-white/85">
              {r.name}
              {r.win && (
                <span className="ml-2 rounded px-1.5 py-0.5 text-[9.5px] font-bold" style={{ background: accent, color: '#05140D' }}>
                  WINNER
                </span>
              )}
            </span>
            <span className="mono text-[12px]" style={{ color: r.win ? accent : 'rgba(255,255,255,0.5)' }}>
              ${r.price.toFixed(4)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-14 text-[9.5px] uppercase tracking-wider text-white/30">reliab.</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: r.win ? accent : 'rgba(255,255,255,0.28)' }}
                initial={{ width: 0 }}
                animate={{ width: `${r.rel * 100}%` }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
              />
            </div>
            <span className="mono w-9 text-right text-[10.5px] text-white/45">
              {Math.round(r.rel * 100)}%
            </span>
          </div>
        </motion.div>
      ))}
      <div className="pt-1 text-center text-[10.5px] text-white/35">
        Cheapest quote lost — reliability decided it
      </div>
    </div>
  );
};

const PayViz = ({ accent }: { accent: string }) => (
  <div className="space-y-2.5">
    {[
      { m: 'POST', p: '/api/search', s: '→', c: 'rgba(255,255,255,0.5)' },
      { m: '402', p: 'Payment Required', s: '←', c: '#FB923C' },
      { m: 'SIGN', p: 'EIP-3009 authorization', s: '⚿', c: '#A5B4FC' },
      { m: 'POST', p: 'X-PAYMENT header attached', s: '→', c: 'rgba(255,255,255,0.5)' },
      { m: '200', p: 'settled + results', s: '←', c: accent },
    ].map((r, i) => (
      <motion.div
        key={r.p}
        initial={{ opacity: 0, x: r.s === '←' ? 12 : -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.12 }}
        className="flex items-center gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2"
      >
        <span className="mono w-3 text-center text-[12px]" style={{ color: r.c }}>
          {r.s}
        </span>
        <span className="mono rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${r.c}22`, color: r.c }}>
          {r.m}
        </span>
        <span className="mono truncate text-[11.5px] text-white/65">{r.p}</span>
      </motion.div>
    ))}
  </div>
);

const ExecuteViz = ({ accent }: { accent: string }) => (
  <div className="grid grid-cols-2 gap-2.5">
    {[
      { n: 'Search', d: 'live web' },
      { n: 'Fact-check', d: '2nd source' },
      { n: 'Enrichment', d: 'entities' },
      { n: 'Summarize', d: 'condense' },
    ].map((s, i) => {
      const Icon = MINI_ICONS[i];
      return (
        <motion.div
          key={s.n}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.09 }}
          className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5"
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
          <div className="mt-2 text-[12.5px] font-semibold text-white/85">{s.n}</div>
          <div className="text-[10.5px] text-white/35">{s.d}</div>
          <motion.div
            className="mt-2.5 h-0.5 rounded-full"
            style={{ background: accent }}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
          />
        </motion.div>
      );
    })}
  </div>
);

const SynthViz = ({ accent }: { accent: string }) => (
  <div className="space-y-2.5">
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
      <div className="space-y-1.5">
        {['w-full', 'w-[92%]', 'w-[97%]', 'w-[70%]'].map((w, i) => (
          <motion.div
            key={i}
            className={cn('h-2 rounded bg-white/[0.09]', w)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.12 }}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-1.5">
        {['t1', 't2', 't3', 't5'].map((t, i) => (
          <motion.span
            key={t}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className="mono rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{ background: `${accent}22`, color: accent }}
          >
            [{t}]
          </motion.span>
        ))}
      </div>
    </div>
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
      <span className="text-[11.5px] text-white/55">Premium tier · port 4005</span>
      <span className="mono ml-auto text-[10.5px] text-white/30">fallback :4006</span>
    </div>
  </div>
);

const CritiqueViz = ({ accent }: { accent: string }) => (
  <div className="space-y-2.5">
    {[
      { c: 'strong', n: 'Official source, URL attached', col: '#34D399' },
      { c: 'moderate', n: 'Single source, recent', col: '#FBBF24' },
      { c: 'weak', n: 'No URL, vague entities', col: '#F87171' },
    ].map((r, i) => (
      <motion.div
        key={r.c}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.11 }}
        className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3"
      >
        <span
          className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ background: `${r.col}1f`, color: r.col }}
        >
          {r.c}
        </span>
        <span className="text-[11.5px] text-white/55">{r.n}</span>
      </motion.div>
    ))}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.45 }}
      className="flex items-center justify-between rounded-xl border px-3.5 py-3"
      style={{ borderColor: `${accent}33`, background: `${accent}12` }}
    >
      <span className="text-[11.5px] font-semibold text-white/70">Trust score</span>
      <span className="mono text-[16px] font-semibold" style={{ color: accent }}>
        0.70
      </span>
    </motion.div>
  </div>
);
