import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { Badge, Reveal, SectionHeading } from '../components/primitives';
import { API_BASE_URL } from '../../api/client';
import { cn } from '../../utils/cn';

const LANGS = ['Python', 'JavaScript', 'cURL'] as const;
type Lang = (typeof LANGS)[number];

const SNIPPETS: Record<Lang, string> = {
  Python: `import time, requests

BASE = "${API_BASE_URL}"

# 1. Kick off a research job with a hard budget cap
job = requests.post(f"{BASE}/api/research", json={
    "query": "What is the state of quantum error correction?",
    "budget_cap_usdc": 0.05,
}).json()

# 2. Poll the trace - spend and narration update live
while True:
    trace = requests.get(f"{BASE}/api/research/{job['job_id']}/trace").json()
    print(trace["status"], trace["total_spent_usdc"])
    if trace["status"] in ("completed", "failed", "budget_exceeded"):
        break
    time.sleep(1.2)

# 3. Pull the cited report once it completes
report = requests.get(f"{BASE}/api/research/{job['job_id']}/report").json()
print(report["report_markdown"])`,

  JavaScript: `const BASE = "${API_BASE_URL}";

// 1. Kick off a research job with a hard budget cap
const job = await fetch(\`\${BASE}/api/research\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    query: "What is the state of quantum error correction?",
    budget_cap_usdc: 0.05,
  }),
}).then((r) => r.json());

// 2. Poll the trace - spend and narration update live
let trace;
do {
  await new Promise((r) => setTimeout(r, 1200));
  trace = await fetch(
    \`\${BASE}/api/research/\${job.job_id}/trace\`
  ).then((r) => r.json());
  console.log(trace.status, trace.total_spent_usdc);
} while (!["completed", "failed", "budget_exceeded"].includes(trace.status));

// 3. Pull the cited report once it completes
const report = await fetch(
  \`\${BASE}/api/research/\${job.job_id}/report\`
).then((r) => r.json());`,

  cURL: `# 1. Kick off a research job
curl -X POST ${API_BASE_URL}/api/research \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What is the state of quantum error correction?",
    "budget_cap_usdc": 0.05
  }'
# => { "job_id": "5bebed9a-9244-40f4-99c7-7c39d23a45a1" }

# 2. Watch it spend, live
curl ${API_BASE_URL}/api/research/$JOB_ID/trace

# 3. Fetch the cited report (409 until completed)
curl ${API_BASE_URL}/api/research/$JOB_ID/report`,
};

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/research',
    desc: 'Start a job. Returns 202 with a job_id immediately; work continues in the background.',
    body: '{ query: string, budget_cap_usdc: number }',
    tone: 'signal' as const,
  },
  {
    method: 'GET',
    path: '/api/research/{job_id}/trace',
    desc: 'Live state: every step, the auction bids, the narration feed and spend against the cap. Poll this.',
    body: 'steps[] · narration[] · total_spent_usdc',
    tone: 'brand' as const,
  },
  {
    method: 'GET',
    path: '/api/research/{job_id}/report',
    desc: 'The finished report with priced citations. Returns 409 until the job reaches completed.',
    body: 'report_markdown · citations[] · trust_score',
    tone: 'brand' as const,
  },
  {
    method: 'GET',
    path: '/api/ledger',
    desc: 'Every payment ever made on this machine, across all jobs. Persisted in SQLite.',
    body: 'ledger[]',
    tone: 'neutral' as const,
  },
  {
    method: 'GET',
    path: '/api/quota',
    desc: 'This caller’s remaining daily budget, per-job maximum and rate-limit usage. POST /api/research answers 402 with the limit it hit rather than overspending.',
    body: 'remaining_today_usdc · max_job_budget_usdc',
    tone: 'neutral' as const,
  },
];

const SHAPES = [
  {
    title: 'A trace step',
    code: `{
  "task_id": "t1",
  "task_type": "web_search",
  "status": "completed",
  "amount_usdc": 0.0022,
  "tier": "search_b",
  "tx_hash": "0x4e5a53d31c1899a05e0bbf617…",
  "explorer_url": "https://sepolia.basescan.org/tx/0x4e5a…",
  "provider_switched": null,
  "quotes_considered": [
    { "provider": "search",   "price_usdc": 0.0022, "success_rate": 0.211 },
    { "provider": "search_b", "price_usdc": 0.0022, "success_rate": 0.286 },
    { "provider": "search_c", "price_usdc": 0.0034, "success_rate": 0.333 }
  ],
  "chosen_provider": "search_b"
}`,
  },
  {
    title: 'A priced citation',
    code: `{
  "claim": "Current error rates are typically 1% to 0.1%…",
  "source_service": "Search API",
  "source_url": "https://quantum.microsoft.com/…",
  "task_id": "t1",
  "cost_usdc": 0.0034,
  "tx_hash": "0x4e5a53d31c1899a05e0bbf617…",
  "paid_at": "2026-08-01T18:11:31.994469+00:00",
  "review_confidence": "strong",
  "review_note": "Official Microsoft source"
}`,
  },
];

export const Developers = () => {
  const [lang, setLang] = useState<Lang>('Python');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SNIPPETS[lang]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable (insecure context) - the snippet is still selectable */
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Developers"
        title={
          <>
            Plain HTTP.
            <br className="hidden sm:block" /> No SDK required.
          </>
        }
        body="The orchestrator is a plain FastAPI service. Start a job, poll the trace, fetch the report — that is the whole surface area. Everything below runs against your local backend."
      />

      {/* quickstart */}
      <section id="quickstart" className="scroll-mt-28 pb-24">
        <div className="site-container">
          <Reveal>
            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/60 px-4 py-3">
                <div className="flex items-center gap-1">
                  {LANGS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={cn(
                        'rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                        lang === l
                          ? 'bg-[var(--color-paper-2)] text-[var(--color-ink)] shadow-sm'
                          : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]',
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper-2)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-line-2)]"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[var(--color-signal)]" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="max-w-full overflow-x-auto bg-[var(--cockpit-bg)] p-6">
                <code className="mono whitespace-pre text-[12.5px] leading-[1.75] text-[#C7D2FE]">
                  {SNIPPETS[lang]}
                  <span className="cursor-blink h-[1em] bg-[#C7D2FE]" />
                </code>
              </pre>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] px-5 py-4">
              <Terminal className="h-4 w-4 text-[var(--color-ink-3)]" />
              <span className="text-[13.5px] text-[var(--color-ink-2)]">
                Backend not running? Start the whole stack with
              </span>
              <code className="mono rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-1 text-[12.5px]">
                ./run_all.sh
              </code>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="site-container">
        <div className="rule-node" />
      </div>

      {/* endpoints */}
      <section className="section-band py-24">
        <div className="site-container">
          <Reveal>
            <SectionHeading
              eyebrow="API reference"
              title="The whole surface area"
              body="Keys are optional while the orchestrator runs on your machine, alongside the eight paid services it hires. Set REQUIRE_API_KEY=true before exposing it and every call needs one."
            />
          </Reveal>

          <div className="mt-14 space-y-3">
            {ENDPOINTS.map((e, i) => (
              <Reveal key={e.path} delay={i * 0.05}>
                <div className="card card-hover flex flex-wrap items-start gap-x-5 gap-y-3 p-6">
                  <span
                    className={cn(
                      'mono rounded-md border px-2 py-1 text-[11px] font-bold',
                      e.method === 'POST'
                        ? 'border-[var(--tone-signal-border)] bg-[var(--tone-signal-bg)] text-[var(--tone-signal-text)]'
                        : 'border-[var(--tone-brand-border)] bg-[var(--tone-brand-bg)] text-[var(--tone-brand-text)]',
                    )}
                  >
                    {e.method}
                  </span>
                  <div className="min-w-[260px] flex-1">
                    <code className="mono text-[14px] font-semibold text-[var(--color-ink)]">{e.path}</code>
                    <p className="prose-body mt-2 text-[13.5px]">{e.desc}</p>
                  </div>
                  <code className="mono rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[11.5px] text-[var(--color-ink-3)]">
                    {e.body}
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

      {/* shapes */}
      <section id="shapes" className="scroll-mt-28 py-24">
        <div className="site-container">
          <Reveal>
            <SectionHeading
              eyebrow="Response shapes"
              title="What comes back"
              body="Real payloads from a real run — including the auction bids that lost."
            />
          </Reveal>

          <div className="mt-14 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {SHAPES.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <div className="card card-hover h-full min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-paper-3)]/60 px-5 py-3">
                    <Badge>{s.title}</Badge>
                  </div>
                  <pre className="max-w-full overflow-x-auto bg-[var(--cockpit-bg)] p-5">
                    <code className="mono whitespace-pre text-[11.5px] leading-[1.7] text-[#A5B4FC]">
                      {s.code}
                      {i === SHAPES.length - 1 && (
                        <span className="cursor-blink h-[1em] bg-[#A5B4FC]" />
                      )}
                    </code>
                  </pre>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
