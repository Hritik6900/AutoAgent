import { Link } from 'react-router-dom';
import { ArrowRight, Coins, Gavel, Radio, Receipt, ShieldCheck, Stamp, Zap } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { Badge, ExecutionPulse, Reveal } from '../components/primitives';
import { cn } from '../../utils/cn';

type Feature = {
  id: string;
  icon: typeof Coins;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  visual: 'payment' | 'auction' | 'narration' | 'failover' | 'cost' | 'critique' | 'provenance';
  accent: string;
};

const FEATURES: Feature[] = [
  {
    id: 'payments',
    icon: Coins,
    eyebrow: 'x402 payments',
    title: 'The agent holds the wallet',
    body: 'Every paid call is a genuine EIP-3009 USDC transfer settled on Base Sepolia through the public x402 facilitator. The agent signs with its own key — no human approves each payment, and no service is called before its money has moved.',
    points: [
      'Gasless for the agent — no ETH needed to pay',
      'Verified and settled by a public facilitator',
      'Real hash returned on the X-PAYMENT-RESPONSE header',
      'Testnet only, by design — never mainnet funds',
    ],
    visual: 'payment',
    accent: '#059669',
  },
  {
    id: 'auction',
    icon: Gavel,
    eyebrow: 'Reverse auction',
    title: 'Cheapest does not always win',
    body: 'Three independent search providers each expose a live /quote endpoint. Before paying, the orchestrator asks all of them in parallel — then divides each price by that provider\'s historical success rate, drawn from the payment ledger.',
    points: [
      'score = price ÷ max(success_rate, 0.05)',
      'A flaky provider gets priced out of contention',
      'No history yet? It defaults to 1.0 — no cold-start penalty',
      'Every bid is preserved in the trace, including the losers',
    ],
    visual: 'auction',
    accent: '#F59E0B',
  },
  {
    id: 'narration',
    icon: Radio,
    eyebrow: 'Live reasoning stream',
    title: 'It tells you why, while it happens',
    body: 'At each genuinely interesting decision — an auction result, a budget downgrade, a failover recovery — a fast model writes one sentence explaining the choice, using the real numbers involved. It streams into the console as the job runs.',
    points: [
      'Narrated only at decision points, so the feed stays signal',
      'Uses the actual prices and success rates, not vague filler',
      'Falls back to a deterministic sentence if the model is down',
      'Never blocks or fails the pipeline',
    ],
    visual: 'narration',
    accent: '#D97706',
  },
  {
    id: 'failover',
    icon: Zap,
    eyebrow: 'Resilience',
    title: 'Kill a service. It reroutes.',
    body: 'Each provider is its own process on its own port. When a call fails, the orchestrator records the real error, finds the next candidate that still fits the budget, and retries — marking the recovery on the step.',
    points: [
      'Report synthesis has two tiers on separate ports',
      'Search falls through three competing processes',
      'Budget is re-checked before every retry',
      'No alternate available? Clean failure, job continues',
    ],
    visual: 'failover',
    accent: '#EA580C',
  },
  {
    id: 'cost',
    icon: Receipt,
    eyebrow: 'Cost attribution',
    title: 'Every sentence has a receipt',
    body: 'Each citation carries the exact amount that produced it and the transaction that settled it. Costs split evenly across the claims a task backed, with orchestration overhead spread across all of them — so the numbers reconcile exactly.',
    points: [
      'sum(cost_usdc) equals total_spent_usdc, to the cent',
      'Last citation absorbs the rounding residual',
      'Retried tasks attribute to the attempt that succeeded',
      'Each claim links straight to its hash on BaseScan',
    ],
    visual: 'cost',
    accent: '#059669',
  },
  {
    id: 'critique',
    icon: ShieldCheck,
    eyebrow: 'Self-critique',
    title: 'The agent grades its own work',
    body: 'After the report is written, a second and independent model reviews every citation and marks it strong, moderate or weak with a short reason — flagging unsourced or vague claims before you read a word of it.',
    points: [
      'Distinct from the mid-pipeline fact-check task',
      'Weighted aggregate becomes a trust score',
      'Unreviewed returns null, never a flattering default',
      'Weak claims are surfaced, not buried',
    ],
    visual: 'critique',
    accent: '#F59E0B',
  },
  {
    id: 'provenance',
    icon: Stamp,
    eyebrow: 'Provenance receipt',
    title: 'The report itself gets hashed on-chain',
    body: 'Once compiled, the orchestrator takes a SHA-256 over the canonical report — markdown, citations and payment ledger together — and writes that hash into a Base Sepolia transaction as calldata.',
    points: [
      'Anyone can refetch, recompute and compare the hash',
      'Proves the report was not edited after publication',
      'The one transaction that is not gasless — it needs ETH',
      'Skipped gracefully when unfunded; the job still completes',
    ],
    visual: 'provenance',
    accent: '#D97706',
  },
];

export const Features = () => (
  <>
    <PageHero
      eyebrow="Capabilities"
      title={
        <>
          Seven things you can
          <br className="hidden sm:block" /> watch it actually do
        </>
      }
      body="None of these are aspirational. Each one is observable in the live trace or the final report while a job runs — and most of them leave a transaction hash behind."
    />

    <section className="pb-24">
      <div className="site-container space-y-4">
        {FEATURES.map((f, i) => (
          <Reveal key={f.id} delay={0.04}>
            <div id={f.id} className="card scroll-mt-28 overflow-hidden">
              <div
                className={cn(
                  'grid gap-0 md:grid-cols-2',
                  i % 2 === 1 && 'md:[&>*:first-child]:order-2',
                )}
              >
                <div className="p-7 sm:p-10">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${f.accent}15`, color: f.accent }}
                  >
                    <f.icon style={{ width: 18, height: 18 }} />
                  </span>
                  <div className="eyebrow mt-5">{f.eyebrow}</div>
                  <h2 className="mt-2 text-[28px] leading-[1.15] tracking-tight">{f.title}</h2>
                  <p className="prose-body mt-4">{f.body}</p>
                  <ul className="mt-6 space-y-2.5">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-[13.5px] text-[var(--color-ink-2)]">
                        <span
                          className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: f.accent }}
                        />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative min-h-[300px] overflow-hidden border-t border-[var(--color-line)] bg-[var(--cockpit-bg)] p-7 md:border-l md:border-t-0">
                  <div className="absolute inset-0 grid-bg opacity-[0.07]" />
                  <div
                    className="absolute -right-20 -top-20 h-60 w-60 rounded-full blur-[80px] opacity-45"
                    style={{ background: `radial-gradient(closest-side, ${f.accent}, transparent)` }}
                  />
                  <div className="relative flex h-full items-center">
                    <FeatureVisual kind={f.visual} accent={f.accent} />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>

    <div className="site-container">
      <div className="rule-node" />
    </div>

    <section className="section-band py-20">
      <div className="site-container text-center">
        <Reveal>
          <Badge tone="signal">All of it, live</Badge>
          <h2 className="mt-5 text-[30px] tracking-tight">Stop reading. Run one.</h2>
          <p className="lede mx-auto mt-4 max-w-[480px]">
            A single job exercises every capability on this page in about twenty seconds.
          </p>
          <Link to="/console" className="btn-primary mt-8 px-7 py-3.5">
            Launch the console
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  </>
);

/* ---------------- visuals ---------------- */

const Row = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3', className)}>
    {children}
  </div>
);

const FeatureVisual = ({ kind, accent }: { kind: Feature['visual']; accent: string }) => {
  if (kind === 'payment') {
    return (
      <div className="w-full space-y-2.5">
        {[
          ['POST', '/api/fact-check', 'rgba(255,255,255,0.45)'],
          ['402', 'price: $0.0030 USDC', '#FB923C'],
          ['SIGN', 'EIP-3009 · gasless', '#A5B4FC'],
          ['200', 'settled · 0x844d9c…', accent],
        ].map(([m, p, c]) => (
          <Row key={p}>
            <div className="flex items-center gap-2.5">
              {m === '200' && <ExecutionPulse color={c as string} />}
              <span className="mono rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${c}22`, color: c }}>
                {m}
              </span>
              <span className="mono text-[11.5px] text-white/65">{p}</span>
            </div>
          </Row>
        ))}
      </div>
    );
  }

  if (kind === 'auction') {
    return (
      <div className="w-full space-y-2.5">
        {[
          ['search_b', '$0.0022', 86, true],
          ['search_c', '$0.0020', 41, false],
          ['search', '$0.0036', 92, false],
        ].map(([n, p, r, win]) => (
          <Row key={n as string} className={win ? 'border-white/20 bg-white/[0.07]' : undefined}>
            <div className="flex items-center justify-between">
              <span className="mono text-[12px] font-semibold text-white/85">{n as string}</span>
              <span className="mono text-[12px]" style={{ color: win ? accent : 'rgba(255,255,255,0.5)' }}>
                {p as string}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${r as number}%`, background: win ? accent : 'rgba(255,255,255,0.28)' }}
              />
            </div>
          </Row>
        ))}
        <p className="pt-1 text-center text-[10.5px] text-white/35">$0.0020 lost to a 41% success rate</p>
      </div>
    );
  }

  if (kind === 'narration') {
    return (
      <div className="w-full space-y-2">
        {[
          ['PLANNED', 'Allocates 6 tasks across search, enrichment and synthesis.'],
          ['AUCTION_WON', 'Picked search_b at $0.0022 — cheapest with a solid record.'],
          ['PROVIDER_SWITCHED', 'search_c refused payment; search_b took over cleanly.'],
          ['SELF_CRITIQUE', 'Flags 2 of 5 claims as weak before finalising.'],
        ].map(([tag, line]) => (
          <div key={tag} className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
            <span className="mono text-[10px] font-bold" style={{ color: accent }}>
              [{tag}]
            </span>
            <p className="mt-1 text-[11.5px] leading-snug text-white/60">{line}</p>
          </div>
        ))}
      </div>
    );
  }

  if (kind === 'failover') {
    return (
      <div className="w-full space-y-3">
        <Row className="border-[#F8717133] bg-[#F871711a]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F87171]" />
            <span className="mono text-[11.5px] text-white/70">report-gen :4005</span>
            <span className="mono ml-auto text-[10.5px] text-[#F87171]">connection refused</span>
          </div>
        </Row>
        <div className="flex items-center justify-center">
          <span className="mono text-[10.5px] text-white/35">↓ retry next candidate</span>
        </div>
        <Row className="border-white/20 bg-white/[0.07]">
          <div className="flex items-center gap-2">
            <ExecutionPulse color={accent} />
            <span className="mono text-[11.5px] text-white/80">report-gen-cheap :4006</span>
            <span className="mono ml-auto text-[10.5px]" style={{ color: accent }}>
              200 OK
            </span>
          </div>
        </Row>
        <Row>
          <span className="mono text-[10.5px] text-white/45">
            provider_switched: true
            <br />
            switched_from: "premium" → "cheap"
          </span>
        </Row>
      </div>
    );
  }

  if (kind === 'cost') {
    return (
      <div className="w-full space-y-2.5">
        {[
          ['t1', 'Search API', '$0.0034'],
          ['t3', 'Enrichment API', '$0.0032'],
          ['t4', 'Fact-Check API', '$0.0042'],
          ['t5', 'Summarizer API', '$0.0052'],
        ].map(([id, svc, cost]) => (
          <Row key={id}>
            <div className="flex items-center gap-2.5">
              <span className="mono text-[11px]" style={{ color: accent }}>
                [{id}]
              </span>
              <span className="text-[11.5px] text-white/60">{svc}</span>
              <span className="mono ml-auto text-[11.5px] text-white/80">{cost}</span>
            </div>
          </Row>
        ))}
        <div
          className="flex items-center justify-between rounded-xl border px-3.5 py-3"
          style={{ borderColor: `${accent}33`, background: `${accent}12` }}
        >
          <span className="text-[11.5px] font-semibold text-white/70">Total spent</span>
          <span className="mono text-[13px] font-semibold" style={{ color: accent }}>
            $0.0160
          </span>
        </div>
      </div>
    );
  }

  if (kind === 'critique') {
    return (
      <div className="w-full space-y-2.5">
        {[
          ['STRONG', 'Official source, URL attached', '#34D399'],
          ['MODERATE', 'Single recent source', '#FBBF24'],
          ['WEAK', 'No URL, vague entities', '#F87171'],
          ['WEAK', 'Generic, unquantified claim', '#F87171'],
        ].map(([g, n, c], i) => (
          <Row key={i}>
            <div className="flex items-center gap-3">
              <span
                className="rounded px-1.5 py-0.5 text-[9.5px] font-bold"
                style={{ background: `${c}1f`, color: c }}
              >
                {g}
              </span>
              <span className="text-[11.5px] text-white/55">{n}</span>
            </div>
          </Row>
        ))}
        <div
          className="flex items-center justify-between rounded-xl border px-3.5 py-3"
          style={{ borderColor: `${accent}33`, background: `${accent}12` }}
        >
          <span className="text-[11.5px] font-semibold text-white/70">Trust score</span>
          <span className="mono text-[15px] font-semibold" style={{ color: accent }}>
            0.52
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <Row>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
          SHA-256 of the canonical report
        </div>
        <div className="mono mt-2 break-all text-[11px] leading-relaxed" style={{ color: accent }}>
          a3f9c1e0b47d2856fa19c3d7e88b04512c6a9f3d1e7b04a25c8f9d6e3b1a7c04
          <span className="cursor-blink h-[1em]" style={{ background: accent }} />
        </div>
      </Row>
      <div className="flex items-center justify-center">
        <span className="mono text-[10.5px] text-white/35">↓ written as calldata</span>
      </div>
      <Row className="border-white/20 bg-white/[0.07]">
        <div className="flex items-center gap-2">
          <ExecutionPulse color={accent} />
          <span className="mono text-[11.5px] text-white/75">Base Sepolia tx</span>
          <span className="mono ml-auto text-[10.5px] text-white/45">0x9c2a…</span>
        </div>
      </Row>
      <p className="text-center text-[10.5px] leading-relaxed text-white/35">
        Refetch the report, recompute the hash, compare. Tampering shows up immediately.
      </p>
    </div>
  );
};
