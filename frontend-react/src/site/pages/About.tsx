import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { ExecutionPulse, Reveal, SectionHeading } from '../components/primitives';

const STACK = [
  { group: 'Orchestration', items: ['Python 3.11', 'FastAPI', 'asyncio', 'httpx'] },
  { group: 'Payments', items: ['x402 protocol', 'EIP-3009 USDC', 'Base Sepolia', 'eth-account / web3.py'] },
  { group: 'Intelligence', items: ['Groq · llama-3.3-70b', 'Gemini 2.5 Flash', 'Tavily search'] },
  { group: 'Interface', items: ['React 19', 'Vite', 'Tailwind CSS', 'Framer Motion'] },
];

const REALITY = [
  {
    piece: 'x402 sign / verify / settle',
    real: 'Always real — genuine EIP-3009 signature, public facilitator',
    fallback: null,
  },
  {
    piece: 'On-chain settlement',
    real: 'Real Base Sepolia transaction once the wallet holds testnet USDC',
    fallback: 'Signs and verifies, then fails at settle until funded',
  },
  {
    piece: 'Reverse auction',
    real: 'Always real — 3 processes, live /quote calls, ledger-derived reliability',
    fallback: null,
  },
  {
    piece: 'Search results',
    real: 'Live web results via Tavily',
    fallback: 'Curated mock results when no key is set',
  },
  {
    piece: 'Fact-check, enrichment, summarize',
    real: 'LLM call on the cheap tier',
    fallback: 'Keyword-overlap heuristics',
  },
  {
    piece: 'Report synthesis',
    real: 'LLM call with cited claims',
    fallback: 'Deterministic template, still fully cited',
  },
  {
    piece: 'Provenance receipt',
    real: 'Real transaction carrying the report hash as calldata',
    fallback: 'Skipped cleanly; the job still completes',
  },
];

export const About = () => (
  <>
    <PageHero
      eyebrow="About"
      title={
        <>
          A working answer to
          <br className="hidden sm:block" /> “can agents pay each other?”
        </>
      }
      body="AutoResearch was built to test one idea end to end: if an AI agent had its own wallet and a budget, could it hire other services on the open web, negotiate a price, pay them autonomously, and account for every cent afterwards?"
    />

    {/* story */}
    <section className="pb-24">
      <div className="site-container grid gap-14 lg:grid-cols-[1.15fr_0.85fr]">
        <Reveal>
          <div className="space-y-5">
            <h2 className="text-[26px] tracking-tight">Why HTTP 402</h2>
            <p className="prose-body">
              Status code 402 has been in the HTTP specification since 1997, reserved and
              almost entirely unused. The x402 protocol finally gives it a job: a server can
              answer a request with a machine-readable price, and a client can pay it in the
              very next round trip.
            </p>
            <p className="prose-body">
              That matters for agents specifically. Today an autonomous agent cannot buy
              anything without a human first creating an account, adding a card and pasting an
              API key. With x402 there is no account, no key and no prior relationship — the
              agent signs a transfer authorization and the work is unlocked.
            </p>
            <p className="prose-body">
              This project takes that primitive and builds a real economy on top: several paid
              services, competing providers, a budget the agent must respect, and a full
              accounting trail linking every sentence of the output back to the money that
              bought it.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="card p-7">
            <h3 className="text-[17px]">At a glance</h3>
            <dl className="mt-5 space-y-4">
              {[
                ['Network', 'Base Sepolia testnet'],
                ['Asset', 'USDC (EIP-3009 gasless transfers)'],
                ['Facilitator', 'x402.org public testnet'],
                ['Paid services', '8 independent processes'],
                ['Typical job cost', '$0.015 – $0.020 USDC'],
                ['Typical job time', '~20 seconds'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] pb-3 last:border-0">
                  <dt className="text-[13px] text-[var(--color-ink-3)]">{k}</dt>
                  <dd className="mono text-right text-[13px] font-medium text-[var(--color-ink)]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>

    <div className="site-container">
      <div className="rule-node" />
    </div>

    {/* architecture */}
    <section id="architecture" className="scroll-mt-28 section-band py-24">
      <div className="site-container">
        <Reveal>
          <SectionHeading eyebrow="Architecture" title="Nine processes, one budget" body="The orchestrator holds the wallet. Everything it talks to is a separate paid service that refuses to work until it has been paid." />
        </Reveal>

        <Reveal delay={0.08} className="mt-14">
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/60 px-5 py-3">
              <ExecutionPulse color="#A5B4FC" />
              <span className="mono text-[11px] text-[var(--color-ink-3)]">live process tree</span>
            </div>
            <pre className="overflow-x-auto bg-[var(--cockpit-bg)] p-7">
              <code className="mono whitespace-pre text-[12px] leading-[1.85] text-[#A5B4FC]">{`  orchestrator  :4000   plans · runs the auction · holds the wallet
        │
        ├─ pays ─▶ search        :4001  ┐
        ├─ pays ─▶ search-b      :4007  ├─ reverse auction (3 bidders)
        ├─ pays ─▶ search-c      :4008  ┘
        ├─ pays ─▶ fact-check    :4002
        ├─ pays ─▶ enrichment    :4003
        ├─ pays ─▶ summarizer    :4004
        ├─ pays ─▶ report-gen    :4005  ┐
        └─ pays ─▶ report-cheap  :4006  ┘─ tiered failover

  every arrow above is a real USDC transfer on Base Sepolia`}<span className="cursor-blink h-[1em] bg-[#A5B4FC]" /></code>
            </pre>
          </div>
        </Reveal>

        <div className="card-grid mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map((s, i) => (
            <Reveal key={s.group} delay={i * 0.05}>
              <div className="card card-hover h-full p-6">
                <div className="eyebrow">{s.group}</div>
                <ul className="mt-4 space-y-2">
                  {s.items.map((it) => (
                    <li key={it} className="mono text-[12.5px] text-[var(--color-ink-2)]">
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <div className="site-container">
      <div className="rule-node" />
    </div>

    {/* what's real */}
    <section id="real" className="scroll-mt-28 py-24">
      <div className="site-container">
        <Reveal>
          <SectionHeading
            eyebrow="Full disclosure"
            title="What is real, and what degrades"
            body="Judging a demo is easier when it tells you where the seams are. Every row here is honest about what happens when a key or funding is missing."
          />
        </Reveal>

        <Reveal delay={0.08} className="mt-14">
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[1.1fr_1.4fr_1.2fr] gap-4 border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/60 px-6 py-3.5 md:grid">
              {['Piece', 'Real behaviour', 'Falls back to'].map((h) => (
                <div key={h} className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-3)]">
                  {h}
                </div>
              ))}
            </div>
            <div className="divide-y divide-[var(--color-line)]">
              {REALITY.map((r) => (
                <div key={r.piece} className="grid gap-2 px-6 py-4 md:grid-cols-[1.1fr_1.4fr_1.2fr] md:gap-4">
                  <div className="text-[13.5px] font-semibold text-[var(--color-ink)]">{r.piece}</div>
                  <div className="flex items-start gap-2 text-[13px] text-[var(--color-ink-2)]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-signal)]" />
                    {r.real}
                  </div>
                  <div className="flex items-start gap-2 text-[13px] text-[var(--color-ink-3)]">
                    {r.fallback ? (
                      <>
                        <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-ink-4)]" />
                        {r.fallback}
                      </>
                    ) : (
                      <span className="text-[var(--color-ink-4)]">— never degrades</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mx-auto mt-8 max-w-[560px] text-center text-[13px] leading-relaxed text-[var(--color-ink-3)]">
            Everything runs on Base Sepolia testnet. The mechanics — signatures, settlement,
            chain state — are genuinely real and publicly verifiable, but the USDC involved is
            testnet currency with no monetary value. That is deliberate.
          </p>
        </Reveal>
      </div>
    </section>

    <section className="section-band py-20">
      <div className="site-container text-center">
        <Reveal>
          <h2 className="text-[30px] tracking-tight">Go watch it spend</h2>
          <p className="lede mx-auto mt-4 max-w-[460px]">
            One query, one budget, twenty seconds, and a report where every claim has a price.
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
