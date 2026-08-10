import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Gauge,
  KeyRound,
  Play,
  Receipt,
  ShieldCheck,
  Terminal,
  Wallet,
} from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { McpSession } from '../components/McpSession';
import { CountUp, Reveal, SectionHeading } from '../components/primitives';
import { useMcpLink } from '../hooks/useMcpLink';
import { API_BASE_URL } from '../../api/client';
import { cn } from '../../utils/cn';

/* The five tools exactly as the server registers them (mcp_server/server.py). Kept in the
   same order the client discovers them, so what a developer reads here is what
   tools/list returns. */
const TOOLS = [
  {
    name: 'run_research',
    icon: Play,
    args: 'query: string, budget_cap_usdc: number = 0.05',
    desc: 'Starts a job and returns a job_id immediately. The work runs in the background — the agent polls for it.',
    returns: '{ job_id, next_step }',
  },
  {
    name: 'get_research_status',
    icon: Activity,
    args: 'job_id: string',
    desc: 'Progress, spend so far, and a live narration of the orchestrator’s own decisions — which provider won, when it failed over.',
    returns: '{ status, tasks_done, spent_usdc, steps[] }',
  },
  {
    name: 'get_research_report',
    icon: BookOpen,
    args: 'job_id: string',
    desc: 'The finished write-up, with every citation carrying the transaction hash of the payment that sourced it.',
    returns: '{ report_markdown, citations[], provenance }',
  },
  {
    name: 'check_research_quota',
    icon: Gauge,
    args: '—',
    desc: 'How much budget this caller has left today. Lets an agent check its headroom instead of discovering it by being refused.',
    returns: '{ remaining_today_usdc, max_job_budget_usdc }',
  },
  {
    name: 'get_payment_ledger',
    icon: Receipt,
    args: 'limit: number = 20',
    desc: 'Recent x402 settlements with BaseScan links. The audit trail — what the agent actually paid for, not what it claims.',
    returns: '{ total_settlements, recent[] }',
  },
];

const CLIENTS = ['Claude Desktop', 'Claude Code', 'Hosted'] as const;
type Client = (typeof CLIENTS)[number];

const CONFIGS: Record<Client, string> = {
  'Claude Desktop': `{
  "mcpServers": {
    "autoresearch": {
      "command": "/path/to/AutoAgent/.venv/bin/python",
      "args": ["-m", "mcp_server"],
      "cwd": "/path/to/AutoAgent",
      "env": {
        "AUTORESEARCH_API_URL": "${API_BASE_URL}",
        "AUTORESEARCH_API_KEY": "ar_sk_your_key_here"
      }
    }
  }
}`,
  'Claude Code': `claude mcp add autoresearch \\
  --env AUTORESEARCH_API_URL=${API_BASE_URL} \\
  --env AUTORESEARCH_API_KEY=ar_sk_your_key_here \\
  -- /path/to/AutoAgent/.venv/bin/python -m mcp_server`,
  Hosted: `# serve every client from one endpoint
python -m mcp_server --transport streamable-http --port 8080

# each client sends its own key; the server forwards it,
# so quotas are per-user rather than pooled
{
  "mcpServers": {
    "autoresearch": {
      "url": "https://your-host/mcp",
      "headers": { "Authorization": "Bearer ar_sk_their_own_key" }
    }
  }
}`,
};

const CEILINGS = [
  {
    icon: Wallet,
    title: 'Per job',
    body: 'The largest budget a single call may request. Ask for more and the job is never created.',
  },
  {
    icon: KeyRound,
    title: 'Per caller',
    body: 'A rolling daily cap on one API key. Every consumer gets their own key, their own budget, and can be revoked alone.',
  },
  {
    icon: ShieldCheck,
    title: 'Service-wide',
    body: 'A hard ceiling across every caller combined — the last line of defence on the wallet, however many keys exist.',
  },
];

export const Mcp = () => {
  const { online, quota, ground } = useMcpLink();
  const [client, setClient] = useState<Client>('Claude Desktop');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONFIGS[client]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable (insecure context) - the config is still selectable */
    }
  };

  const usedPct = quota
    ? Math.min(100, (quota.spent_or_committed_today_usdc / Math.max(quota.daily_cap_usdc, 1e-9)) * 100)
    : 0;

  return (
    <>
      <PageHero
        eyebrow="Model Context Protocol"
        title={
          <>
            Give any agent
            <br className="hidden sm:block" /> a research desk.
          </>
        }
        body="AutoResearch runs as an MCP server. Claude, Cursor or anything else that speaks the protocol gets five tools — and behind them, an agent that plans the work, auctions it to competing services, and pays each one in USDC over x402."
      />

      {/* ---------- the live session ---------- */}
      <section className="pb-24">
        <div className="site-container">
          <div className="grid items-start gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <div className="eyebrow">Live protocol</div>
              <h2 className="mt-4 text-[30px] leading-[1.12] tracking-[-0.02em] sm:text-[36px]">
                What the model sees
              </h2>
              <p className="prose-body mt-5 text-[15px]">
                A session, line by line. The client discovers the tools, checks its budget,
                starts a job, and watches six services get paid — each one a real settlement
                on Base Sepolia.
              </p>
              <p className="prose-body mt-4 text-[15px]">
                x402, the wallet, the reverse auction and the failover never surface. The
                model asks a question and gets an answer where every claim has a receipt.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {['tools/list', 'tools/call', 'stdio', 'streamable-http'].map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#setup" className="btn-primary px-6 py-3">
                  <Terminal className="h-4 w-4" />
                  Connect a client
                </a>
                <Link to="/console" className="btn-secondary px-6 py-3">
                  Watch it run
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <McpSession ground={ground} online={online} />
            </Reveal>
          </div>
        </div>
      </section>

      <div className="site-container">
        <div className="rule-node" />
      </div>

      {/* ---------- the tools ---------- */}
      <section className="section-band py-24">
        <div className="site-container">
          <Reveal>
            <SectionHeading
              eyebrow="Tool surface"
              title="Five tools, one job"
              body="The whole API an agent needs. Start a job, watch it, read it — plus the two that keep it honest about money."
            />
          </Reveal>

          <div className="mt-14 space-y-3">
            {TOOLS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.05}>
                <div className="card card-hover group flex flex-wrap items-start gap-x-5 gap-y-3 p-6">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--tone-amber-border)] bg-[var(--tone-amber-bg)] text-[var(--tone-amber-text)] transition-transform duration-500 group-hover:scale-110">
                    <t.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-[260px] flex-1">
                    <code className="mono text-[14.5px] font-semibold text-[var(--color-ink)]">{t.name}</code>
                    <code className="mono ml-2 text-[11.5px] text-[var(--color-ink-4)]">({t.args})</code>
                    <p className="prose-body mt-2 text-[13.5px]">{t.desc}</p>
                  </div>
                  <code className="mono rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[11.5px] text-[var(--color-ink-3)]">
                    {t.returns}
                  </code>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div className="site-container">
        <div className="rule-node" />
      </div>

      {/* ---------- spend limits, with the live meter ---------- */}
      <section className="py-24">
        <div className="site-container">
          <Reveal>
            <SectionHeading
              eyebrow="Spending controls"
              title="An agent with a wallet needs a leash"
              body="Every call spends real testnet USDC out of one wallet. What a client asks for is a ceiling for that one job — never a grant. Three limits decide the rest, and all three are enforced server-side."
            />
          </Reveal>

          <div className="card-grid mt-14 grid gap-4 md:grid-cols-3">
            {CEILINGS.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.06}>
                <div className="card card-hover h-full p-7">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--tone-amber-border)] bg-[var(--tone-amber-bg)] text-[var(--tone-amber-text)]">
                    <c.icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-5 text-[17px] font-bold text-[var(--color-ink)]">{c.title}</h3>
                  <p className="prose-body mt-2.5 text-[13.5px]">{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* live quota - the actual current reading from this orchestrator */}
          <Reveal delay={0.1}>
            <div className="card mt-4 overflow-hidden p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Gauge className="h-4 w-4 text-[var(--tone-amber-text)]" />
                  <span className="text-[14px] font-bold text-[var(--color-ink)]">
                    This orchestrator, right now
                  </span>
                </div>
                <span className="mono text-[11px] text-[var(--color-ink-4)]">
                  {quota ? `caller: ${quota.caller}` : online === false ? 'backend offline' : 'reading…'}
                </span>
              </div>

              {quota ? (
                <>
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="mono text-[30px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
                      <CountUp value={quota.remaining_today_usdc} decimals={4} prefix="$" />
                    </span>
                    <span className="text-[13px] text-[var(--color-ink-3)]">
                      left of ${quota.daily_cap_usdc.toFixed(2)} today
                    </span>
                  </div>

                  {/* the bar is the reading - width is the real ratio, not an animation */}
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #D97706, #F5A623)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${usedPct}%` }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
                    {[
                      ['spent today', `$${quota.spent_or_committed_today_usdc.toFixed(4)}`],
                      ['max per job', `$${quota.max_job_budget_usdc.toFixed(2)}`],
                      ['jobs this hour', `${quota.jobs_last_hour} / ${quota.max_jobs_per_hour}`],
                      ['settled all-time', `${ground.settledCount}`],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <div className="mono text-[13.5px] font-semibold text-[var(--color-ink)]">{value}</div>
                        <div className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-[var(--color-ink-4)]">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="prose-body mt-5 text-[13.5px]">
                  {online === false
                    ? 'The orchestrator is not reachable from this page. Start it with ./run_all.sh to see live quota.'
                    : 'Waiting for the orchestrator to report its quota…'}
                </p>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <div className="site-container">
        <div className="rule-node" />
      </div>

      {/* ---------- setup ---------- */}
      <section id="setup" className="section-band scroll-mt-28 py-24">
        <div className="site-container">
          <Reveal>
            <SectionHeading
              eyebrow="Setup"
              title="Three steps to connect"
              body="Run the backend, mint a key, point your client at it. The key is shown once — only its hash is stored."
            />
          </Reveal>

          <Reveal delay={0.06}>
            <div className="mx-auto mt-12 grid max-w-[900px] gap-3 sm:grid-cols-3">
              {[
                ['01', './run_all.sh', 'Orchestrator plus the eight paid services.'],
                ['02', 'manage_keys.py create', 'Mint a key for this client, with its own cap.'],
                ['03', 'paste the config', 'Restart the client and the tools appear.'],
              ].map(([n, cmd, desc]) => (
                <div key={n} className="card p-5">
                  <span className="mono text-[11px] text-[var(--tone-amber-text)]">{n}</span>
                  <code className="mono mt-2 block text-[12.5px] font-semibold text-[var(--color-ink)]">{cmd}</code>
                  <p className="prose-body mt-2 text-[12.5px]">{desc}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mx-auto mt-4 max-w-[900px]">
              <div className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/60 px-4 py-3">
                  <div className="flex items-center gap-1">
                    {CLIENTS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setClient(c)}
                        className={cn(
                          'rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                          client === c
                            ? 'bg-[var(--color-paper-2)] text-[var(--color-ink)] shadow-sm'
                            : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-line-2)]"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-[var(--color-signal)]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="max-w-full overflow-x-auto bg-[var(--cockpit-bg)] p-6">
                  <code className="mono whitespace-pre text-[12.5px] leading-[1.75] text-[#F0E4CE]">
                    {CONFIGS[client]}
                    <span className="cursor-blink h-[1em] bg-[#F5A623]" />
                  </code>
                </pre>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] px-5 py-4">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--color-ink-3)]" />
                <span className="text-[13.5px] text-[var(--color-ink-2)]">
                  Exposing it beyond your machine? Set
                </span>
                <code className="mono rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-1 text-[12.5px]">
                  REQUIRE_API_KEY=true
                </code>
                <span className="text-[13.5px] text-[var(--color-ink-2)]">
                  first — otherwise anyone with the URL can spend your wallet.
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.14}>
            <div className="mt-10 text-center">
              <Link
                to="/developers"
                className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-ink-2)] underline decoration-[var(--color-line-2)] underline-offset-4 transition-colors hover:text-[var(--color-ink)]"
              >
                Prefer the raw HTTP API?
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};
