import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Atom,
  BatteryCharging,
  CornerDownLeft,
  Cpu,
  Flame,
  Gauge,
  Microscope,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LaunchDeck } from '@/components/ui/launch-deck';
import { StagePreview } from '@/components/ui/stage-preview';
import { useAutoResizeTextarea } from '@/hooks/use-auto-resize-textarea';
import { useNetworkStats } from '../site/hooks/useNetworkStats';
import { useAgent } from '../context/AgentContext';
import { cn } from '../utils/cn';

/** Short label + the question it fills in. The row has to stay a strip of compact pills,
 *  which only works if the label is a couple of words - the full query would wrap three
 *  of them onto their own lines. */
const QUICK_ACTIONS = [
  { icon: Atom, label: 'Quantum error correction', query: 'What is the current state of quantum computing error correction?' },
  { icon: BatteryCharging, label: 'Solid-state batteries', query: 'How close are solid-state batteries to mass production?' },
  { icon: Scale, label: 'EU AI regulation', query: 'What happened with AI regulation in the EU this year?' },
  { icon: Flame, label: 'Fusion power', query: 'Is fusion power actually getting closer to viability?' },
  { icon: Microscope, label: 'CRISPR therapies', query: 'Which CRISPR gene therapies have reached approval so far?' },
  { icon: Cpu, label: 'Chip export controls', query: 'How have semiconductor export controls reshaped the AI chip market?' },
];

/** Cycled through the empty prompt so the field suggests its own range instead of sitting
 *  on one static line of grey text. */
const PLACEHOLDERS = [
  'Ask anything researchable…',
  'What changed in this field over the last year?',
  'Who is actually shipping, and who is only announcing?',
  'What does the evidence say — and how strong is it?',
];

/** A typical job settles six tasks at roughly these prices, so we can tell the user what
 *  their cap actually buys instead of leaving the slider abstract. */
const TYPICAL_JOB_COST = 0.019;

/* A job costs about $0.019, so a $1.00 ceiling put every useful setting in the first 3%
   of the slider. Capping at $0.30 - still fifteen full jobs - spreads the range people
   actually use across the whole track. */
const BUDGET_MIN = 0.02;
const BUDGET_MAX = 0.3;

export const HeroConsole: React.FC = () => {
  const { launchResearch, status, error } = useAgent();
  const { stats } = useNetworkStats(20000);
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState(0.1);
  /* Drives the dome behind the deck. The panel's own border reacts through CSS
     :hover/:focus-within, but the backdrop is a sibling, so its state comes through React. */
  const [engaged, setEngaged] = useState(false);
  const [placeholder, setPlaceholder] = useState(0);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 72, maxHeight: 220 });

  useEffect(() => {
    const id = window.setInterval(() => setPlaceholder((i) => (i + 1) % PLACEHOLDERS.length), 3800);
    return () => window.clearInterval(id);
  }, []);

  if (status !== 'idle') return null;

  const canRun = query.trim().length > 0 && budget > 0;

  const run = () => {
    if (canRun) launchResearch({ query: query.trim(), budget_cap_usdc: budget });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run();
  };

  /* A textarea swallows Enter, so give the keyboard a way out that doesn't cost the user
     their newlines. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      run();
    }
  };

  const fill = (q: string) => {
    setQuery(q);
    // Set programmatically, so the input event that normally drives the resize never
    // fires - measure on the next frame, once React has painted the new value.
    requestAnimationFrame(() => adjustHeight());
    textareaRef.current?.focus();
  };

  const headroom = budget / TYPICAL_JOB_COST;
  const verdict =
    headroom < 1
      ? { text: 'below one full job', tone: 'text-[var(--tone-warn-text)]' }
      : { text: `≈ ${Math.floor(headroom)} full ${Math.floor(headroom) === 1 ? 'job' : 'jobs'}`, tone: 'text-[var(--color-ink-3)]' };

  return (
    <section className="relative flex min-h-[calc(100svh-66px)] flex-col justify-center overflow-hidden py-14">
      <LaunchDeck active={engaged} />

      <div className="relative z-10 mx-auto w-full max-w-[760px] px-5">
        {/* ---------- title ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <h1 className="font-display text-[42px] font-extrabold leading-[1.06] tracking-[-0.035em] sm:text-[56px]">
            What should it <span className="gradient-text">research</span>?
          </h1>
          <p className="lede mx-auto mt-4 max-w-[520px]">
            Set a budget. The agent plans the work, auctions each search to competing
            providers, pays them on-chain, and accounts for every cent.
          </p>
          {/* Real ledger totals. Kept out here rather than inside the prompt - it's context
              for the page, not a control, and it made the input box read as a dashboard. */}
          <p className="mono mt-4 text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-4)]">
            Base Sepolia · x402
            {stats && ` · ${stats.settledTxCount} tx settled · $${stats.totalSettledUsdc.toFixed(4)} spent to date`}
          </p>
        </motion.div>

        {/* ---------- the prompt ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-10"
        >
          {/* Sits directly behind the glass panel so the panel's blur/saturate actually
              has coloured light to reveal - without this the composer just looks like a
              dim solid box, since the arc's own dome doesn't reach this high. */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[220px] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-[40px] blur-[50px]"
            style={{ background: 'radial-gradient(closest-side, var(--composer-glow), transparent 75%)' }}
          />
          <form
            onSubmit={submit}
            onMouseEnter={() => setEngaged(true)}
            onMouseLeave={() => setEngaged(false)}
            onFocus={() => setEngaged(true)}
            onBlur={() => setEngaged(false)}
            className="arc-input rounded-[20px] border border-[var(--color-line)] p-2"
            style={{ background: 'var(--composer-bg)' }}
          >
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={onKeyDown}
                required
                className="min-h-[72px] resize-none border-none bg-transparent px-4 pt-4 pr-20 pb-2 text-[16.5px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
                style={{ overflow: 'hidden' }}
              />

              {/* Own placeholder layer rather than the native attribute, so it can cross-fade
                  between prompts. Not mode="wait": that empties the slot between the two,
                  so the field flashes blank every few seconds. */}
              {!query && (
                <div className="pointer-events-none absolute left-4 top-4 right-20 h-[30px] overflow-hidden">
                  <AnimatePresence>
                    <motion.span
                      key={placeholder}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-x-0 top-0 block text-[16.5px] leading-relaxed text-[var(--color-ink-4)]"
                    >
                      {PLACEHOLDERS[placeholder]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}

              <span
                className={cn(
                  'mono pointer-events-none absolute right-3 top-3.5 inline-flex items-center gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-paper-3)]/80 px-1.5 py-1 text-[10px] font-semibold text-[var(--color-ink-4)] transition-opacity duration-300',
                  engaged && canRun ? 'opacity-100' : 'opacity-0',
                )}
              >
                ⌘
                <CornerDownLeft className="h-3 w-3" style={{ width: 12, height: 12 }} />
              </span>
            </div>

            {/* ---------- budget + run ---------- */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-2 pb-1 pt-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-4)]">
                <Gauge className="h-3.5 w-3.5" style={{ width: 14, height: 14 }} />
                Cap
              </span>

              <input
                type="range"
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={0.01}
                value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value))}
                aria-label="Budget cap in USDC"
                className="h-1 w-24 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-line-2)] accent-[var(--color-brand)] sm:w-32 sm:flex-none"
              />

              <span className="flex items-baseline gap-2">
                <span className="mono text-[15px] font-semibold text-[var(--color-ink)]">
                  ${budget.toFixed(2)}
                </span>
                <span className={cn('mono text-[11px]', verdict.tone)}>{verdict.text}</span>
              </span>

              <Button
                type="submit"
                disabled={!canRun}
                className="group/btn relative ml-auto h-11 shrink-0 gap-2 overflow-hidden rounded-xl px-6 text-[14.5px] transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-40"
              >
                {/* gloss sweep on hover */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
                />
                Run the agent
                <ArrowRight className="h-4 w-4" style={{ width: 16, height: 16 }} />
              </Button>
            </div>
          </form>

          {error && (
            <div className="mt-3 rounded-xl border border-[var(--tone-danger-border)] bg-[var(--tone-danger-bg)] px-4 py-3 text-[13px] text-[var(--tone-danger-text-strong)]">
              {error}
            </div>
          )}

          {/* ---------- what it will do, on a loop ---------- */}
          <div className="mt-7">
            <StagePreview />
          </div>

          {/* ---------- quick actions ---------- */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {QUICK_ACTIONS.map((a, i) => (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.32 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fill(a.query)}
                  className="h-9 gap-2 rounded-full px-3.5 backdrop-blur-md transition-transform hover:-translate-y-0.5"
                >
                  <a.icon className="h-3.5 w-3.5" style={{ width: 14, height: 14 }} />
                  <span className="text-xs">{a.label}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
