import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView, useReducedMotion, useMotionValue, useSpring } from 'framer-motion';
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  BookOpen,
  Database,
  Layers,
  Search,
  Server,
  Sparkles,
  Wallet,
  Workflow,
} from 'lucide-react';
import { CountUp, LiveDot } from './primitives';
import { useSettlementFeed, GRAPH_TASK_TYPES } from '../hooks/useSettlementFeed';
import type { GraphTaskType } from '../hooks/useSettlementFeed';
import { cn } from '../../utils/cn';

type NodeId = GraphTaskType | 'hub' | 'wallet' | 'providers' | 'payment' | 'ledger';

type Float = { dx: number; dy: number; dur: number; delay: number };

/* One warm family, no blue/green/violet identity colours - a handful of amber shades
   so nine nodes still read as distinct without breaking the site's one-accent rule.
   Green stays reserved for genuine online/success states (LiveDot), never for a node's
   resting identity. */
const WORK: Record<GraphTaskType, { label: string; icon: typeof Search; accent: string; float: Float }> = {
  web_search: { label: 'Search', icon: Search, accent: '#F59E0B', float: { dx: 4, dy: 5, dur: 5.4, delay: 0 } },
  fact_check: { label: 'Fact-Check', icon: BadgeCheck, accent: '#D97706', float: { dx: 5, dy: 4, dur: 6.1, delay: 0.4 } },
  data_enrichment: { label: 'Enrichment', icon: Layers, accent: '#FBBF24', float: { dx: 4, dy: 6, dur: 5.8, delay: 0.8 } },
  summarize: { label: 'Summarizer', icon: Sparkles, accent: '#EA580C', float: { dx: 6, dy: 4, dur: 6.6, delay: 0.2 } },
  compile_report: { label: 'Report-Gen', icon: BookOpen, accent: '#F59E0B', float: { dx: 5, dy: 5, dur: 5.2, delay: 0.6 } },
};

const INFRA: Record<'wallet' | 'providers' | 'payment' | 'ledger', { label: string; icon: typeof Wallet; accent: string; float: Float }> = {
  wallet: { label: 'Wallet', icon: Wallet, accent: '#F5A623', float: { dx: 4, dy: 4, dur: 7.0, delay: 0.3 } },
  providers: { label: 'Providers', icon: Server, accent: '#FCD34D', float: { dx: 5, dy: 4, dur: 6.8, delay: 0.9 } },
  payment: { label: 'Payment', icon: Banknote, accent: '#D97706', float: { dx: 4, dy: 5, dur: 7.4, delay: 0.1 } },
  ledger: { label: 'Ledger', icon: Database, accent: '#EA580C', float: { dx: 5, dy: 5, dur: 6.4, delay: 0.5 } },
};

/* A fixed 520x520 coordinate space shared by the SVG edge/pulse layer and the
   absolutely-positioned HTML node layer on top of it - two rings around the hub, five
   work nodes at 72 degrees apart, four infrastructure nodes at 90 degrees apart in the
   gaps between them, so nothing visually collides. */
const HUB = { x: 260, y: 260 };
const POS: Record<NodeId, { x: number; y: number }> = {
  hub: HUB,
  web_search: { x: 260, y: 135 },
  fact_check: { x: 378.9, y: 221.4 },
  data_enrichment: { x: 333.5, y: 361.1 },
  summarize: { x: 186.5, y: 361.1 },
  compile_report: { x: 141.1, y: 221.4 },
  providers: { x: 419.1, y: 100.9 },
  payment: { x: 419.1, y: 419.1 },
  ledger: { x: 100.9, y: 419.1 },
  wallet: { x: 100.9, y: 100.9 },
};

type Edge = { id: string; from: NodeId; to: NodeId };
const EDGES: Edge[] = [
  { id: 'e-wallet', from: 'wallet', to: 'hub' },
  { id: 'e-providers', from: 'hub', to: 'providers' },
  { id: 'e-payment', from: 'hub', to: 'payment' },
  { id: 'e-ledger', from: 'payment', to: 'ledger' },
  ...GRAPH_TASK_TYPES.map((t) => ({ id: `e-${t}`, from: 'hub' as NodeId, to: t as NodeId })),
];
const edgeById = new Map(EDGES.map((e) => [e.id, e]));

/* The idle choreography from the product brief: even with nobody actively running a
   job, the system narrates its own architecture on a slow, non-obvious loop - the
   wallet funds the orchestrator, providers get queried, a payment settles, it's
   recorded, then the analysis nodes take their turn, closing on the report. This never
   touches the real counters; it only decides which edge gets a dim ambient packet next. */
const SCRIPT: { nodes: NodeId[]; edges: string[] }[] = [
  { nodes: ['wallet', 'hub'], edges: ['e-wallet'] },
  { nodes: ['hub', 'providers'], edges: ['e-providers'] },
  { nodes: ['web_search'], edges: ['e-web_search'] },
  { nodes: ['payment'], edges: ['e-payment'] },
  { nodes: ['ledger'], edges: ['e-ledger'] },
  { nodes: ['fact_check', 'summarize'], edges: ['e-fact_check', 'e-summarize'] },
  { nodes: ['data_enrichment'], edges: ['e-data_enrichment'] },
  { nodes: ['compile_report'], edges: ['e-compile_report'] },
];

const pct = (v: number, total: number) => `${(v / total) * 100}%`;
const touches = (edge: Edge, id: NodeId) => edge.from === id || edge.to === id;
const floatStyle = (f: Float) =>
  ({ '--float-dx': `${f.dx}px`, '--float-dy': `${f.dy}px`, '--float-dur': `${f.dur}s`, '--float-delay': `${f.delay}s` }) as React.CSSProperties;

type LegBPulse = { id: string; txHash: string | null };
type AmbientPacket = { id: string; edgeId: string };

export const SettlementGraph = () => {
  const { online, totalSettled, settledTxCount, jobCount, lastTier, nodes, pulses, removePulse, lastTx } =
    useSettlementFeed();
  const reduced = useReducedMotion();

  const [hotNodes, setHotNodes] = useState<Set<NodeId>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<NodeId | null>(null);
  const [hubBeat, setHubBeat] = useState(0);
  const [ledgerPulses, setLedgerPulses] = useState<LegBPulse[]>([]);
  const [bootPulses, setBootPulses] = useState<Edge[]>([]);
  const [ambient, setAmbient] = useState<AmbientPacket[]>([]);
  const [booted, setBooted] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const inView = useInView(panelRef, { once: true, margin: '-100px' });
  const bootedOnce = useRef(false);

  const flash = (id: NodeId, ms = 700) => {
    setHotNodes((s) => new Set(s).add(id));
    window.setTimeout(() => {
      setHotNodes((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }, ms);
  };

  // boot sequence: field -> nodes -> edges draw -> a single wave along every edge -> idle engine takes over
  useEffect(() => {
    if (!inView || bootedOnce.current) return;
    bootedOnce.current = true;
    const t1 = window.setTimeout(
      () => {
        setBootPulses(EDGES);
        window.setTimeout(() => setBootPulses([]), 1600);
      },
      reduced ? 0 : 1250,
    );
    const t2 = window.setTimeout(() => setBooted(true), reduced ? 100 : 2100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [inView, reduced]);

  // the always-on idle script - only runs once the boot wave has landed
  useEffect(() => {
    if (!booted) return;
    let i = 0;
    let timer: number;
    const step = () => {
      const phase = SCRIPT[i % SCRIPT.length];
      i += 1;
      phase.nodes.forEach((n) => flash(n, 900));
      setHubBeat((b) => b + 1);
      if (!reduced) {
        phase.edges.forEach((edgeId) => {
          const pid = `${edgeId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          setAmbient((a) => [...a, { id: pid, edgeId }]);
          window.setTimeout(() => setAmbient((a) => a.filter((p) => p.id !== pid)), 1500);
        });
      }
      timer = window.setTimeout(step, 2600 + Math.random() * 700);
    };
    timer = window.setTimeout(step, 400);
    return () => window.clearTimeout(timer);
  }, [booted, reduced]);

  // real settlements pre-empt the ambient script with a brighter, two-leg journey
  const prevPulseCount = useRef(0);
  useEffect(() => {
    if (pulses.length > prevPulseCount.current) {
      flash('providers', 600);
      setHubBeat((n) => n + 1);
    }
    prevPulseCount.current = pulses.length;
  }, [pulses]);

  const arriveAtNode = (pulseId: string, taskType: GraphTaskType, txHash: string | null) => {
    removePulse(pulseId);
    flash(taskType);
    setLedgerPulses((p) => [...p, { id: `${pulseId}-ledger`, txHash }]);
  };

  const arriveAtLedger = (id: string) => {
    setLedgerPulses((p) => p.filter((x) => x.id !== id));
    flash('payment', 550);
    window.setTimeout(() => flash('ledger', 600), 220);
  };

  // two-speed parallax: the background field drifts less than the node layer, faking depth
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const fgX = useSpring(mvX, { stiffness: 55, damping: 18, mass: 0.4 });
  const fgY = useSpring(mvY, { stiffness: 55, damping: 18, mass: 0.4 });
  const bgX = useSpring(mvX, { stiffness: 40, damping: 20, mass: 0.6 });
  const bgY = useSpring(mvY, { stiffness: 40, damping: 20, mass: 0.6 });
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    mvX.set(((e.clientX - r.left) / r.width - 0.5) * 14);
    mvY.set(((e.clientY - r.top) / r.height - 0.5) * 14);
  };
  const onMouseLeave = () => {
    mvX.set(0);
    mvY.set(0);
    setHoveredNode(null);
  };

  const activeId = hoveredNode;
  const dimmed = activeId !== null;
  const edgeState = (edge: Edge): 'active' | 'dim' | 'idle' => {
    if (!dimmed) return 'idle';
    return touches(edge, activeId as NodeId) ? 'active' : 'dim';
  };
  const nodeState = (id: NodeId): 'active' | 'dim' | 'hot' | 'idle' => {
    if (dimmed) {
      if (id === activeId) return 'active';
      const connected = EDGES.some((e) => touches(e, activeId as NodeId) && (e.from === id || e.to === id));
      return connected ? 'idle' : 'dim';
    }
    return hotNodes.has(id) ? 'hot' : 'idle';
  };

  const infoFor = (id: NodeId | null) => {
    if (!id) return null;
    if (id === 'hub') {
      return { title: 'Orchestrator', detail: online === false ? 'unreachable' : `${jobCount} job${jobCount === 1 ? '' : 's'} run`, sub: online === false ? 'offline' : 'online' };
    }
    if (id === 'wallet') {
      return { title: 'Wallet', detail: `$${totalSettled.toFixed(4)} routed`, sub: 'gasless · EIP-3009' };
    }
    if (id === 'providers') {
      return { title: 'Providers', detail: `8 processes`, sub: lastTier ? `last routed to ${lastTier}` : 'reverse-auctioned' };
    }
    if (id === 'payment') {
      return { title: 'Payment', detail: `${settledTxCount} settlements`, sub: 'x402 facilitator' };
    }
    if (id === 'ledger') {
      return { title: 'Ledger', detail: lastTx ? `${lastTx.hash.slice(0, 14)}…` : 'no settlements yet', sub: 'persisted · SQLite' };
    }
    const meta = WORK[id];
    const stat = nodes[id];
    return {
      title: meta.label,
      detail: stat.count > 0 ? `${stat.count} settled · $${stat.total.toFixed(4)}` : 'no settlements yet',
      sub: stat.lastTier ? `last via ${stat.lastTier}` : undefined,
    };
  };

  const tooltip = infoFor(hoveredNode);

  return (
    <div className="relative">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LiveDot online={online} />
          <span className="mono text-[11.5px] text-[var(--color-ink-3)]">live orchestration engine</span>
        </div>
        <div className="flex items-center gap-3">
          {lastTx && (
            <a href={lastTx.url} target="_blank" rel="noreferrer" className="group hidden items-center gap-1.5 sm:inline-flex">
              <span className="mono text-[11px] text-[var(--color-ink-4)] transition-colors group-hover:text-[var(--color-ink-2)]">
                {lastTx.hash.slice(0, 10)}…
              </span>
              <ArrowUpRight className="h-3 w-3 text-[var(--color-ink-4)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-2.5 py-1">
            <span className="mono text-[10.5px] text-[var(--color-ink-3)]">base-sepolia</span>
          </span>
        </div>
      </div>

      <div
        ref={panelRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className="relative aspect-square w-full sm:aspect-[520/470]"
      >
        {/* ambient field: bleeds into the section, no hard rectangle */}
        <motion.div className="graph-field-mask pointer-events-none absolute inset-0" style={{ x: bgX, y: bgY }}>
          <div className="absolute inset-0 grid-bg opacity-[0.05]" />
          <div
            className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px]"
            style={{ background: 'radial-gradient(closest-side, rgba(245,166,35,0.16), transparent)' }}
          />
        </motion.div>

        <motion.div className="absolute inset-0" style={{ x: fgX, y: fgY }}>
          <svg viewBox="0 0 520 520" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
            {EDGES.map((edge) => {
              const state = edgeState(edge);
              const from = POS[edge.from];
              const to = POS[edge.to];
              const isLit = hotNodes.has(edge.from) && hotNodes.has(edge.to);
              return (
                <motion.line
                  key={edge.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={state === 'active' || isLit ? '#F5A623' : 'var(--color-line-2)'}
                  strokeWidth={state === 'active' ? 1.7 : 1}
                  strokeOpacity={state === 'dim' ? 0.25 : state === 'active' || isLit ? 0.9 : 0.55}
                  vectorEffect="non-scaling-stroke"
                  initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                  animate={inView ? { pathLength: 1, opacity: 1 } : {}}
                  transition={{ duration: 1, delay: reduced ? 0 : 0.15 + Math.random() * 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transition: 'stroke 0.4s ease, stroke-opacity 0.4s ease, stroke-width 0.4s ease' }}
                />
              );
            })}

            <AnimatePresence>
              {pulses.map((pulse) => {
                const from = POS.wallet;
                const via = HUB;
                const to = POS[pulse.taskType];
                const accent = WORK[pulse.taskType].accent;
                return (
                  <motion.circle
                    key={pulse.id}
                    r={reduced ? 0 : 3.6}
                    fill={accent}
                    initial={{ cx: from.x, cy: from.y, opacity: 0 }}
                    animate={{ cx: [from.x, via.x, to.x], cy: [from.y, via.y, to.y], opacity: reduced ? [0, 1, 0] : [0, 1, 1, 1, 0] }}
                    transition={{ duration: reduced ? 0.4 : 1.4, ease: [0.4, 0, 0.2, 1], times: reduced ? [0, 0.5, 1] : [0, 0.08, 0.5, 0.9, 1] }}
                    onAnimationComplete={() => arriveAtNode(pulse.id, pulse.taskType, pulse.txHash)}
                  />
                );
              })}
            </AnimatePresence>

            <AnimatePresence>
              {ledgerPulses.map((lp) => {
                const from = POS.hub;
                const via = POS.payment;
                const to = POS.ledger;
                return (
                  <motion.circle
                    key={lp.id}
                    r={reduced ? 0 : 3}
                    fill="#F5A623"
                    initial={{ cx: from.x, cy: from.y, opacity: 0 }}
                    animate={{ cx: [from.x, via.x, to.x], cy: [from.y, via.y, to.y], opacity: reduced ? [0, 1, 0] : [0, 1, 1, 0] }}
                    transition={{ duration: reduced ? 0.35 : 0.95, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
                    onAnimationComplete={() => arriveAtLedger(lp.id)}
                  />
                );
              })}
            </AnimatePresence>

            <AnimatePresence>
              {ambient.map((p) => {
                const edge = edgeById.get(p.edgeId);
                if (!edge) return null;
                const from = POS[edge.from];
                const to = POS[edge.to];
                const accent = (WORK as Record<string, { accent: string }>)[edge.to]?.accent
                  ?? (INFRA as Record<string, { accent: string }>)[edge.to]?.accent
                  ?? '#F5A623';
                return (
                  <motion.circle
                    key={p.id}
                    r={1.8}
                    fill={accent}
                    initial={{ cx: from.x, cy: from.y, opacity: 0 }}
                    animate={{ cx: to.x, cy: to.y, opacity: [0, 0.7, 0] }}
                    transition={{ duration: 1.4, ease: [0.45, 0, 0.15, 1] }}
                  />
                );
              })}
            </AnimatePresence>

            <AnimatePresence>
              {bootPulses.map((edge) => {
                const from = POS[edge.from];
                const to = POS[edge.to];
                return (
                  <motion.circle
                    key={`boot-${edge.id}`}
                    r={3}
                    fill="#F5A623"
                    initial={{ cx: from.x, cy: from.y, opacity: 0 }}
                    animate={{ cx: to.x, cy: to.y, opacity: [0, 1, 0] }}
                    transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
                    onAnimationComplete={() => flash(edge.to, 500)}
                  />
                );
              })}
            </AnimatePresence>
          </svg>

          {/* hub */}
          <div
            className="absolute"
            style={{ left: pct(HUB.x, 520), top: pct(HUB.y, 520), transform: 'translate(-50%, -50%)' }}
            onMouseEnter={() => setHoveredNode('hub')}
          >
            {!reduced && (
              <>
                <svg width={124} height={124} viewBox="0 0 124 124" className="hub-ring pointer-events-none absolute -left-[12px] -top-[12px]" style={{ opacity: online === false ? 0.15 : 0.45 }}>
                  <circle cx={62} cy={62} r={58} fill="none" stroke="#F5A623" strokeWidth={1.2} strokeDasharray="18 240" strokeLinecap="round" />
                </svg>
                <div className="orbit-a pointer-events-none absolute left-1/2 top-1/2 h-[130px] w-[130px] -translate-x-1/2 -translate-y-1/2">
                  <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 rounded-full bg-[#F5A623]" style={{ opacity: online === false ? 0.15 : 0.55 }} />
                </div>
                <div className="orbit-b pointer-events-none absolute left-1/2 top-1/2 h-[152px] w-[152px] -translate-x-1/2 -translate-y-1/2">
                  <span className="absolute left-1/2 top-0 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-white/40" />
                </div>
              </>
            )}
            <AnimatePresence>
              {hubBeat > 0 && (
                <motion.span
                  key={hubBeat}
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ boxShadow: '0 0 0 1px rgba(245,166,35,0.5)' }}
                  initial={{ scale: 0.6, opacity: 0.9 }}
                  animate={{ scale: reduced ? 0.6 : 2.2, opacity: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.7 }}
              animate={inView ? { opacity: nodeState('hub') === 'dim' ? 0.4 : 1, scale: 1 } : {}}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className={cn('hub-breathe relative flex cursor-default flex-col items-center justify-center rounded-full border text-center', reduced && 'hub-breathe-still')}
              style={{
                width: 100,
                height: 100,
                borderColor: online === false ? 'var(--color-line)' : 'rgba(245,166,35,0.35)',
                background: online === false ? 'var(--color-paper-2)' : 'rgba(245,166,35,0.09)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <Workflow className="h-4 w-4" style={{ color: online === false ? 'var(--color-ink-4)' : '#F5A623' }} />
              <div className="mt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-3)]">
                Orchestrator
              </div>
              <div className="mono mt-0.5 text-[9px] text-[var(--color-ink-4)]">{online === false ? 'offline' : 'online'}</div>
            </motion.div>
          </div>

          {/* work ring */}
          {GRAPH_TASK_TYPES.map((t, i) => {
            const meta = WORK[t];
            const stat = nodes[t];
            const state = nodeState(t);
            const lit = state === 'hot' || state === 'active';
            return (
              <div
                key={t}
                className="absolute flex flex-col items-center gap-1.5 text-center"
                style={{ left: pct(POS[t].x, 520), top: pct(POS[t].y, 520), transform: 'translate(-50%, -50%)' }}
                onMouseEnter={() => setHoveredNode(t)}
              >
                <div className={cn(!reduced && 'node-float')} style={floatStyle(meta.float)}>
                  <motion.div
                    initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                    animate={inView ? { opacity: state === 'dim' ? 0.32 : 1, scale: lit ? 1.15 : 1 } : {}}
                    transition={{
                      opacity: { duration: 0.4 },
                      scale: { duration: 0.35, delay: inView && !lit ? 0 : 0.5 + i * 0.08, ease: [0.22, 1, 0.36, 1] },
                    }}
                    className="flex h-10 w-10 cursor-default items-center justify-center rounded-xl border"
                    style={{
                      borderColor: lit ? meta.accent : 'var(--graph-node-border-idle)',
                      background: lit ? `${meta.accent}1f` : 'var(--color-paper-2)',
                      boxShadow: lit ? `0 0 22px -4px ${meta.accent}` : 'var(--graph-node-shadow-idle)',
                      transition: 'border-color 0.4s ease, background 0.4s ease, box-shadow 0.4s ease',
                    }}
                  >
                    <meta.icon className="h-4 w-4" style={{ color: lit ? meta.accent : 'var(--color-ink-3)' }} />
                  </motion.div>
                </div>
                <div
                  className="text-[10.5px] font-semibold text-[var(--color-ink-2)] transition-opacity duration-150"
                  style={{ opacity: hoveredNode === t ? 0 : state === 'dim' ? 0.35 : 1 }}
                >
                  {meta.label}
                </div>
                <div
                  className="mono text-[9px] text-[var(--color-ink-4)] transition-opacity duration-150"
                  style={{ opacity: hoveredNode === t ? 0 : state === 'dim' ? 0.35 : 1 }}
                >
                  {stat.count > 0 ? (
                    <>
                      <CountUp value={stat.count} /> · $<CountUp value={stat.total} decimals={4} />
                    </>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            );
          })}

          {/* infrastructure ring */}
          {(Object.keys(INFRA) as Array<keyof typeof INFRA>).map((id, i) => {
            const meta = INFRA[id];
            const state = nodeState(id);
            const lit = state === 'hot' || state === 'active';
            return (
              <div
                key={id}
                className="absolute flex flex-col items-center gap-1.5 text-center"
                style={{ left: pct(POS[id].x, 520), top: pct(POS[id].y, 520), transform: 'translate(-50%, -50%)' }}
                onMouseEnter={() => setHoveredNode(id)}
              >
                <div className={cn(!reduced && 'node-float')} style={floatStyle(meta.float)}>
                  <motion.div
                    initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                    animate={inView ? { opacity: state === 'dim' ? 0.32 : 1, scale: lit ? 1.15 : 1 } : {}}
                    transition={{
                      opacity: { duration: 0.4 },
                      scale: { duration: 0.35, delay: inView && !lit ? 0 : 0.85 + i * 0.08, ease: [0.22, 1, 0.36, 1] },
                    }}
                    className="flex h-9 w-9 cursor-default items-center justify-center rounded-full border"
                    style={{
                      borderColor: lit ? meta.accent : 'var(--graph-node-border-idle)',
                      background: lit ? `${meta.accent}1f` : 'var(--color-paper-2)',
                      boxShadow: lit ? `0 0 18px -4px ${meta.accent}` : 'var(--graph-node-shadow-idle)',
                      transition: 'border-color 0.4s ease, background 0.4s ease, box-shadow 0.4s ease',
                    }}
                  >
                    <meta.icon className="h-3.5 w-3.5" style={{ color: lit ? meta.accent : 'var(--color-ink-4)' }} />
                  </motion.div>
                </div>
                <div
                  className="text-[9.5px] font-medium text-[var(--color-ink-3)] transition-opacity duration-150"
                  style={{ opacity: hoveredNode === id ? 0 : state === 'dim' ? 0.35 : 1 }}
                >
                  {meta.label}
                </div>
              </div>
            );
          })}
        </motion.div>

        <AnimatePresence>
          {tooltip && hoveredNode && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="pointer-events-none absolute z-20 min-w-[168px] rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-2)] px-3.5 py-2.5 shadow-[var(--shadow-card-hover)]"
              style={{
                left: pct(POS[hoveredNode].x, 520),
                top: pct(POS[hoveredNode].y, 520),
                transform: POS[hoveredNode].y > 160 ? 'translate(-50%, calc(-100% - 26px))' : 'translate(-50%, 26px)',
              }}
            >
              <div className="text-[12.5px] font-semibold text-[var(--color-ink)]">{tooltip.title}</div>
              <div className="mono mt-1 text-[11px] text-[var(--color-ink-2)]">{tooltip.detail}</div>
              {tooltip.sub && <div className="mt-0.5 text-[10.5px] text-[var(--color-ink-4)]">{tooltip.sub}</div>}
            </motion.div>
          )}
        </AnimatePresence>

        {online === false && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)]/90 px-6 py-4 text-center backdrop-blur-sm">
              <p className="text-[13px] font-semibold text-[var(--color-ink-2)]">Orchestrator unreachable</p>
              <p className="mt-1 text-[12px] text-[var(--color-ink-4)]">
                Start the backend and this engine comes online with real settlements.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
