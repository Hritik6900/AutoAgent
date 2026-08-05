import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Coins,
  Gavel,
  Lock,
  MousePointer2,
  Radio,
  Receipt,
  ShieldCheck,
  Stamp,
  Zap,
} from 'lucide-react';
import { Hero } from '../components/Hero';
import { LiveProofStrip, TxTicker } from '../components/LiveProof';
import { PipelineDiagram } from '../components/PipelineDiagram';
import { SettlementGraph } from '../components/SettlementGraph';
import { Reveal, SectionHeading } from '../components/primitives';
import { cn } from '../../utils/cn';

const FEATURES = [
  {
    icon: Coins,
    title: 'Real money, not a mock',
    body: 'Every service call is settled as an actual USDC transfer on Base Sepolia. Each one returns a transaction hash anybody can open on BaseScan.',
    tint: 'text-[var(--tone-signal-text)] bg-[var(--tone-signal-bg)]',
    to: '/features#payments',
  },
  {
    icon: Gavel,
    title: 'Providers bid for the work',
    body: 'Three search services quote live prices. The agent weighs each quote against that provider\'s track record, then pays the best value — not always the cheapest.',
    tint: 'text-[var(--tone-brand-text)] bg-[var(--tone-brand-bg)]',
    to: '/features#auction',
  },
  {
    icon: Radio,
    title: 'It explains itself as it goes',
    body: 'A second model narrates each decision in plain English while the job runs — which provider won, why a fallback fired, what it thinks of its own output.',
    tint: 'text-[var(--tone-violet-text)] bg-[var(--tone-violet-bg)]',
    to: '/features#narration',
  },
  {
    icon: Zap,
    title: 'Survives a service dying',
    body: 'Kill a microservice mid-run and the orchestrator catches it, reroutes to an alternate provider and marks the recovery in the trace. No hang, no crash.',
    tint: 'text-[var(--tone-warn-text)] bg-[var(--tone-warn-bg)]',
    to: '/features#failover',
  },
  {
    icon: Receipt,
    title: 'Every claim has a price',
    body: 'Citations carry the exact cost that produced them and the hash that settled it. The per-claim costs reconcile to the total spend, to the cent.',
    tint: 'text-[var(--tone-signal-text)] bg-[var(--tone-signal-bg)]',
    to: '/features#cost',
  },
  {
    icon: ShieldCheck,
    title: 'The agent red-teams itself',
    body: 'Before you see the report, an independent pass grades every citation strong, moderate or weak — and says why. Unreviewed is never shown as trusted.',
    tint: 'text-[var(--tone-brand-text)] bg-[var(--tone-brand-bg)]',
    to: '/features#critique',
  },
];

const GRAPH_CAPS = [
  {
    icon: Gavel,
    title: 'Reverse-auction routing',
    body: 'Search work is quoted by three competing providers live; the orchestrator pays whichever wins on price times reliability, not just the cheapest bid.',
  },
  {
    icon: Coins,
    title: 'Budget-aware execution',
    body: 'Every task is checked against your cap before it runs. One that would overspend downgrades a tier or halts the job — it never blows through the limit.',
  },
  {
    icon: Lock,
    title: 'Gasless settlement',
    body: 'Payments are signed EIP-3009 authorizations, verified and settled by the public x402 facilitator. The agent never needs to hold ETH.',
  },
  {
    icon: Stamp,
    title: 'On-chain receipts',
    body: 'Every settlement is a real transaction hash. Hover a node in the graph and its most recent one is right there.',
  },
];

export const Home = () => (
  <>
    <Hero />

    <section className="pb-16">
      <LiveProofStrip />
    </section>

    <TxTicker />

    {/* ---------- settlement graph ---------- */}
    <section className="py-24">
      <div className="site-container">
        <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <Reveal>
            <div className="eyebrow mb-4">Live orchestration</div>
            <h2 className="text-[32px] sm:text-[38px] leading-[1.1] tracking-[-0.02em]">
              The graph is the system,
              <br />
              not a picture of it.
            </h2>
            <p className="lede mt-5">
              Every node on the right is a process this agent actually calls. Every edge is a
              real code path. When a pulse crosses one, that's an actual dollar moving on Base
              Sepolia — not a loop.
            </p>

            <ul className="mt-9 space-y-5">
              {GRAPH_CAPS.map((c) => (
                <li key={c.title} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--tone-amber-bg)] text-[var(--tone-amber-text)]">
                    <c.icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--color-ink)]">{c.title}</div>
                    <p className="prose-body mt-1 text-[13.5px]">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-9 inline-flex items-center gap-2 text-[12.5px] text-[var(--color-ink-4)]">
              <MousePointer2 className="h-3.5 w-3.5" />
              Hover a node in the graph to trace its execution path.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <SettlementGraph />
          </Reveal>
        </div>
      </div>
    </section>

    <div className="site-container">
      <div className="rule-node" />
    </div>

    {/* ---------- the orchestrator ---------- */}
    <section className="py-24">
      <div className="site-container">
        <Reveal>
          <SectionHeading
            eyebrow="The orchestrator"
            title={
              <>
                Six stages. Every one of them
                <br className="hidden sm:block" /> costs the agent money.
              </>
            }
            body="Nothing here is a simulation of an agent economy. The planner really does spend a budget, the providers really do compete, and the payments really do land on-chain before any work is returned."
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <PipelineDiagram />
        </Reveal>

        <Reveal delay={0.15} className="mt-8 text-center">
          <Link
            to="/how-it-works"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
          >
            Read the full walkthrough
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </section>

    <div className="site-container">
      <div className="rule-node" />
    </div>

    {/* ---------- features ---------- */}
    <section className="section-band py-24">
      <div className="site-container">
        <Reveal>
          <SectionHeading
            eyebrow="Capabilities"
            title="Built to be inspected, not just demoed"
            body="Each of these is observable in the live trace while a job runs — not a claim on a slide."
          />
        </Reveal>

        {/* card-grid drives the nth-child elevation hierarchy in index.css - a six-card
            grid of identical tiles reads as wallpaper without it. */}
        <div className="card-grid mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.05}>
              <Link
                to={f.to}
                className="card card-hover group flex h-full flex-col p-7"
              >
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', f.tint)}>
                  <f.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </span>
                <h3 className="mt-6 text-[17px] tracking-tight">{f.title}</h3>
                <p className="prose-body mt-3 flex-1 text-[14px]">{f.body}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-ink-3)] transition-colors group-hover:text-[var(--color-ink)]">
                  <span className="link-underline">Learn more</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- closing CTA ---------- */}
    <section className="py-24">
      <div className="site-container">
        <Reveal>
          <div
            className="relative overflow-hidden rounded-[28px] px-8 py-16 text-center sm:px-16"
            style={{ background: 'var(--cta-bg)' }}
          >
            {/* Aurora: three wide, heavily blurred bands sweeping on different periods.
                They read as one moving light source rather than three separate blobs.
                The colours are tokens because this panel is dark in *both* themes - light
                keeps its warm ember mix, dark gets a single amber key light with two
                near-white fills (see --cta-* in index.css). */}
            <div
              className="animate-aurora absolute -left-1/4 -top-1/2 h-[160%] w-[85%]"
              style={{
                background: 'radial-gradient(50% 50% at 50% 50%, var(--cta-glow-1), transparent 70%)',
                filter: 'blur(90px)',
                opacity: 'var(--cta-glow-1-opacity)',
              }}
            />
            <div
              className="amb-b absolute -right-1/4 -bottom-1/2 h-[160%] w-[80%]"
              style={{
                background: 'radial-gradient(50% 50% at 50% 50%, var(--cta-glow-2), transparent 70%)',
                filter: 'blur(95px)',
                opacity: 'var(--cta-glow-2-opacity)',
              }}
            />
            <div
              className="amb-c absolute left-1/3 -top-1/3 h-[150%] w-[60%]"
              style={{
                background: 'radial-gradient(50% 50% at 50% 50%, var(--cta-glow-3), transparent 70%)',
                filter: 'blur(100px)',
                opacity: 'var(--cta-glow-3-opacity)',
              }}
            />
            <div className="absolute inset-0 grid-bg opacity-[0.10]" />
            {/* keeps the copy readable wherever the aurora happens to be brightest */}
            <div className="absolute inset-0" style={{ background: 'var(--cta-veil)' }} />

            <div className="relative">
              <h2 className="mx-auto max-w-[620px] text-[34px] leading-[1.12] tracking-tight text-white sm:text-[44px]">
                Give it a question.
                <br />
                Watch it spend to answer you.
              </h2>
              <p className="mx-auto mt-5 max-w-[500px] text-[16px] leading-relaxed text-white/60">
                The console streams the auction, the payments and the agent's own reasoning
                as it happens — then hands you a fully cited, fully priced report.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/console"
                  /* The panel is dark in both themes, so this button is deliberately
                     fixed-colour: --color-ink would turn near-white in dark mode and
                     vanish against the white pill. */
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-[14px] font-semibold text-[#0B0B0F] transition-transform hover:scale-[1.02] active:scale-[0.99]"
                >
                  Launch the console
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/developers"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Read the API
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  </>
);
