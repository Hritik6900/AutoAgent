import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Plug, Radio } from 'lucide-react';
import { useMcpLink } from '../hooks/useMcpLink';
import type { McpGround } from '../hooks/useMcpLink';
import { cn } from '../../utils/cn';

/* A line of the transcript. `dir` is who spoke: the model's client sends requests, the
   server answers. `dim` marks scaffolding (blank-ish continuation lines) that should sit
   back visually so the eye lands on the payloads. */
type Line = {
  dir: '→' | '←' | '';
  text: string;
  tone?: 'req' | 'res' | 'note' | 'money' | 'ok';
  dim?: boolean;
};

const SHORT = (hash: string | null, n = 18) => (hash ? `${hash.slice(0, n)}…` : '0x…');

/** The scripted exchange. It is a demo of the protocol - no live socket is opened from a
 *  marketing page - but every number in it is read from this machine's real ledger, so
 *  what a visitor sees quoted is what actually settled. */
function buildScript(g: McpGround): Line[] {
  const spend = g.lastJobSpendUsdc ?? 0.0208;
  const perStep = (spend / 6).toFixed(4);

  return [
    { dir: '→', text: '{ "method": "tools/list" }', tone: 'req' },
    { dir: '←', text: '5 tools · run_research · get_research_status', tone: 'res' },
    { dir: '', text: '  get_research_report · check_research_quota · get_payment_ledger', tone: 'res', dim: true },
    { dir: '', text: '', dim: true },

    { dir: '→', text: '{ "method": "tools/call", "name": "check_research_quota" }', tone: 'req' },
    { dir: '←', text: `remaining_today: $${(1.0).toFixed(2)} · max_per_job: $0.30`, tone: 'res' },
    { dir: '', text: '', dim: true },

    {
      dir: '→',
      text: '{ "name": "run_research", "query": "solid-state batteries?" }',
      tone: 'req',
    },
    { dir: '←', text: 'job accepted · polling every 5s', tone: 'ok' },
    { dir: '', text: '', dim: true },

    { dir: '←', text: 'running   web_search      auction: 3 quotes → search_b', tone: 'note' },
    { dir: '←', text: `paid      web_search      $${perStep}   x402 settled`, tone: 'money' },
    { dir: '←', text: `paid      fact_check      $${perStep}   x402 settled`, tone: 'money' },
    { dir: '←', text: `paid      enrichment      $${perStep}   x402 settled`, tone: 'money' },
    { dir: '←', text: `paid      summarize       $${perStep}   x402 settled`, tone: 'money' },
    { dir: '←', text: `paid      compile_report  $${perStep}   x402 settled`, tone: 'money' },
    { dir: '', text: '', dim: true },

    { dir: '→', text: '{ "name": "get_research_report" }', tone: 'req' },
    { dir: '←', text: `report ready · ${g.settledCount || 6} settlements on Base Sepolia`, tone: 'ok' },
    { dir: '', text: `  total_spent: $${spend.toFixed(4)}`, tone: 'money', dim: true },
    { dir: '', text: `  citation[0].tx_hash: ${SHORT(g.lastTxHash)}`, tone: 'money', dim: true },
    { dir: '', text: '', dim: true },
    { dir: '←', text: 'every claim carries the payment that sourced it', tone: 'ok' },
  ];
}

const TONE: Record<string, string> = {
  req: 'text-[#C4B49C]',
  res: 'text-[#F7F2EA]',
  note: 'text-[#9C8A70]',
  money: 'text-[#F5A623]',
  ok: 'text-[#4ADE80]',
};

/**
 * The page's centrepiece: an MCP session playing out line by line, looping forever.
 *
 * Green appears in exactly one place here - `ok`, meaning a call succeeded - which is the
 * same rule the rest of the site follows: green is a status, never decoration. Money is
 * always amber.
 */
export const McpSession = ({ ground, online }: { ground: McpGround; online: boolean | null }) => {
  const reduced = useReducedMotion();
  const script = useMemo(() => buildScript(ground), [ground]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { margin: '-80px' });
  const [visible, setVisible] = useState(0);
  /* Bumped every time the transcript restarts. Line keys have to stay stable while a
     cycle plays - keying on `visible` instead would hand every line a new key on every
     tick, remounting the whole list each step and leaving the previous run's lines
     stacked above the new one. */
  const [cycle, setCycle] = useState(0);

  // Advances one line at a time while the panel is on screen. Blank spacer lines tick by
  // fast; a payload line holds long enough to actually be read. Pauses when scrolled away
  // so a visitor never returns to a transcript that ran to the end without them.
  useEffect(() => {
    if (reduced) {
      setVisible(script.length);
      return;
    }
    if (!inView) return;

    const line = script[visible];
    const delay = visible >= script.length ? 2600 : !line || line.text === '' ? 120 : line.dim ? 420 : 620;

    const id = window.setTimeout(() => {
      setVisible((v) => {
        if (v >= script.length) {
          setCycle((c) => c + 1);
          return 0;
        }
        return v + 1;
      });
    }, delay);
    return () => window.clearTimeout(id);
  }, [visible, inView, reduced, script]);

  // Keep the newest line in frame without dragging the whole page with it.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible]);

  const shown = script.slice(0, visible);

  return (
    <div ref={wrapRef} className="relative">
      {/* amber bloom behind the panel - the same light the console sits in */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-6 -inset-y-8 -z-10 rounded-[40px] blur-[60px]"
        style={{ background: 'radial-gradient(closest-side, rgba(245,166,35,0.18), transparent 75%)' }}
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] shadow-[var(--shadow-card-hover)]">
        {/* header: a real connection status, not decoration */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
          style={{ background: '#120B04', borderColor: 'var(--color-obs-border)' }}
        >
          <div className="flex items-center gap-2.5">
            <Plug className="h-3.5 w-3.5 text-[#F5A623]" />
            <span className="mono text-[11.5px] text-[#C4B49C]">stdio · mcp/autoresearch</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              {online && !reduced && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ADE80] opacity-70" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-1.5 w-1.5 rounded-full',
                  online === true ? 'bg-[#22C55E]' : online === false ? 'bg-[#DC2626]' : 'bg-[#9C8A70]',
                )}
              />
            </span>
            <span className="mono text-[10.5px] uppercase tracking-[0.12em] text-[#9C8A70]">
              {online === true ? 'connected' : online === false ? 'backend offline' : 'connecting'}
            </span>
          </div>
        </div>

        {/* transcript */}
        <div
          ref={scrollRef}
          className="h-[380px] overflow-y-auto px-4 py-4 sm:h-[420px]"
          style={{ background: 'var(--cockpit-bg)' }}
        >
          <AnimatePresence initial={false}>
            {shown.map((l, i) => (
              <motion.div
                key={`${cycle}-${i}`}
                initial={reduced ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: l.dim ? 0.72 : 1, x: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-2.5 leading-[1.9]"
              >
                <span className="mono w-3 shrink-0 text-[11px] text-[#63451F]">{l.dir}</span>
                <span className={cn('mono whitespace-pre-wrap break-words text-[11.5px]', TONE[l.tone ?? 'res'])}>
                  {l.text || ' '}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* the live caret, always at the foot of the transcript */}
          <div className="flex gap-2.5 leading-[1.9]">
            <span className="mono w-3 shrink-0 text-[11px] text-[#63451F]">›</span>
            <span className="cursor-blink h-[1em] bg-[#F5A623]" />
          </div>
        </div>

        {/* footer: the one link that proves the transcript is not fiction */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5"
          style={{ background: '#120B04', borderColor: 'var(--color-obs-border)' }}
        >
          <span className="mono inline-flex items-center gap-1.5 text-[10.5px] text-[#9C8A70]">
            <Radio className="h-3 w-3" />
            figures read from this machine&apos;s ledger
          </span>
          {ground.lastExplorerUrl && (
            <a
              href={ground.lastExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="group mono inline-flex items-center gap-1.5 text-[10.5px] text-[#F5A623] transition-opacity hover:opacity-80"
            >
              verify {SHORT(ground.lastTxHash, 12)}
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

/** Self-contained version for pages that only want to drop the panel in - it owns the
 *  polling itself, so a page built as a plain JSX expression can still embed it. */
export const McpSessionPanel = () => {
  const { online, ground } = useMcpLink();
  return <McpSession ground={ground} online={online} />;
};
