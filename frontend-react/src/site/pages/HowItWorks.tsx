import { Link } from 'react-router-dom';
import { ArrowRight, Info } from 'lucide-react';
import { PipelineDiagram } from '../components/PipelineDiagram';
import { Reveal, SectionHeading, Badge } from '../components/primitives';
import { PageHero } from '../components/PageHero';
import { LiveJobSpotlight } from '../components/LiveJobSpotlight';

const ANATOMY = [
  {
    step: '01',
    title: 'The agent asks for something it has not paid for',
    body: 'A plain POST to a service endpoint. No API key, no account, no prior relationship with the provider — the agent has never spoken to it before.',
    code: 'POST /api/search\n{ "query": "quantum error correction" }',
  },
  {
    step: '02',
    title: 'The service refuses, and names its price',
    body: 'Instead of 401 Unauthorized, it answers 402 Payment Required — a status code that has sat unused in the HTTP spec since 1997 — with a machine-readable quote.',
    code: '402 Payment Required\n{\n  "maxAmountRequired": "2200",\n  "asset": "0x036CbD…USDC",\n  "network": "base-sepolia",\n  "payTo": "0xe779B2…"\n}',
  },
  {
    step: '03',
    title: 'The agent signs a transfer authorization',
    body: 'It signs an EIP-3009 transferWithAuthorization with its own wallet key. No gas is spent by the agent, and no on-chain approval was needed beforehand.',
    code: 'X-PAYMENT: <signed authorization>\nPOST /api/search  (retry)',
  },
  {
    step: '04',
    title: 'A facilitator settles it, then the work runs',
    body: 'The public x402 facilitator verifies the signature and broadcasts the transfer. Only once USDC has actually moved does the service execute and return results.',
    code: '200 OK\nX-PAYMENT-RESPONSE: { "transaction": "0x4e5a53…" }',
  },
];

export const HowItWorks = () => (
  <>
    <PageHero
      eyebrow="How it works"
      title={
        <>
          An agent with a wallet,
          <br className="hidden sm:block" /> a budget and a deadline
        </>
      }
      body="AutoResearch is not one model answering a question. It is an orchestrator that decomposes the work, shops for the cheapest reliable provider of each piece, pays for it in real money, and refuses to overspend."
    />

    {/* pipeline */}
    <section className="pb-24">
      <div className="site-container">
        <Reveal>
          <PipelineDiagram />
        </Reveal>
      </div>
    </section>

    <div className="site-container">
      <div className="rule-node" />
    </div>

    {/* anatomy of a payment */}
    <section id="payment" className="section-band py-24">
      <div className="site-container">
        <Reveal>
          <SectionHeading
            eyebrow="Anatomy of one payment"
            title="What actually happens on a 402"
            body="This exchange repeats for every single task in the graph. Six tasks means six settlements, six hashes, six receipts."
          />
        </Reveal>

        <div className="mt-14 space-y-4">
          {ANATOMY.map((a, i) => (
            <Reveal key={a.step} delay={i * 0.06}>
              <div className="card grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_1fr] md:items-center">
                <div>
                  <span className="mono text-[12px] font-semibold text-[var(--color-ink-4)]">{a.step}</span>
                  <h3 className="mt-2 text-[20px] leading-snug tracking-tight">{a.title}</h3>
                  <p className="prose-body mt-3">{a.body}</p>
                </div>
                <pre className="overflow-x-auto rounded-xl bg-[var(--cockpit-bg)] p-5">
                  <code className="mono whitespace-pre text-[12px] leading-relaxed text-[#A5B4FC]">
                    {a.code}
                    {i === ANATOMY.length - 1 && (
                      <span className="cursor-blink h-[1em] bg-[#A5B4FC]" />
                    )}
                  </code>
                </pre>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="card mt-6 flex items-start gap-3 border-[var(--tone-brand-border)] bg-[var(--tone-brand-bg)] p-5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tone-brand-text)]" />
            <p className="text-[13.5px] leading-relaxed text-[var(--tone-brand-text-strong)]">
              <strong className="font-semibold">Why this matters.</strong> Today an AI agent
              cannot buy anything without a human first creating an account and pasting in a
              card. x402 turns any HTTP endpoint into something an agent can transact with
              autonomously, in one round trip, with no prior relationship.
            </p>
          </div>
        </Reveal>
      </div>
    </section>

    {/* budget + failover */}
    <section id="execution" className="py-24">
      <div className="site-container grid gap-14 lg:grid-cols-2">
        <Reveal>
          <Badge tone="ember">Budget guard</Badge>
          <h3 className="mt-4 text-[26px] tracking-tight">It stops before it overspends</h3>
          <p className="prose-body mt-3">
            Before each task the orchestrator checks committed spend against your cap. If the
            preferred provider would breach it but a cheaper tier fits, it downgrades that one
            task and marks it <span className="mono text-[13px]">tier_downgraded</span>. If
            nothing fits, the job halts cleanly as{' '}
            <span className="mono text-[13px]">budget_exceeded</span> rather than blowing
            through your limit.
          </p>
          <ul className="mt-5 space-y-2.5">
            {[
              'Spend recomputed from the ledger, not a cached counter',
              'Downgrade is per-task, not per-job',
              'A halted job still returns everything it already paid for',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[14px] text-[var(--color-ink-2)]">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-ember)]" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.08}>
          <Badge tone="signal">Live failover</Badge>
          <h3 className="mt-4 text-[26px] tracking-tight">Kill a service mid-run. It keeps going.</h3>
          <p className="prose-body mt-3">
            Every provider runs as its own process. If a call fails — connection refused, a
            timeout, a bad response — the orchestrator logs the real error, walks to the next
            candidate that still fits the budget, and retries. Recovery is recorded on the step
            as <span className="mono text-[13px]">provider_switched</span>.
          </p>
          <ul className="mt-5 space-y-2.5">
            {[
              'Report synthesis has premium and cheap tiers on separate ports',
              'Search has three competing processes to fall through',
              'No alternate? The step fails cleanly and the job continues',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[14px] text-[var(--color-ink-2)]">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-signal)]" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>

    <div className="site-container">
      <div className="rule-node" />
    </div>

    {/* real job */}
    <section id="synthesis" className="section-band py-24">
      <div className="site-container">
        <Reveal>
          <SectionHeading
            eyebrow="Proof, not screenshots"
            title="The most recent real job"
            body="Pulled live from the payment ledger on this machine. If the backend is running, these are transactions that actually settled."
          />
        </Reveal>
        <Reveal delay={0.1} className="mt-14">
          <LiveJobSpotlight />
        </Reveal>
      </div>
    </section>

    <section className="py-20">
      <div className="site-container text-center">
        <Reveal>
          <h2 className="text-[30px] tracking-tight">See it happen in real time</h2>
          <p className="lede mx-auto mt-4 max-w-[520px]">
            The console streams every step of this pipeline live — auction bids, settlements,
            the agent's own commentary — as the job runs.
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
