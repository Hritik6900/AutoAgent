/**
 * The panel that appears over whatever page the reporter is reading.
 *
 * Everything renders inside a shadow root. A news site's stylesheet is arbitrary and
 * frequently aggressive - resets, global `* { }` rules, z-index wars - and without the
 * shadow boundary the panel would inherit all of it. Inside the boundary nothing gets in
 * and nothing leaks out.
 *
 * This file is injected on demand and may be injected again on the same tab, so the whole
 * thing is guarded: a second run must not stack a second message listener.
 */
(() => {
  if (window.__autoresearchPanelReady) return;
  window.__autoresearchPanelReady = true;

  const AMBER = '#F5A623';
  const HOST_ID = 'autoresearch-panel-host';

  const STYLES = `
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .panel {
      font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: rgba(17, 17, 17, 0.97);
      backdrop-filter: blur(24px) saturate(1.4);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 16px;
      box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(0, 0, 0, 0.35);
      overflow: hidden;
      animation: ar-in 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @keyframes ar-in {
      from { opacity: 0; transform: translateY(-8px) scale(0.985); }
      to   { opacity: 1; transform: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .panel { animation: none; }
    }

    .head {
      display: flex; align-items: center; gap: 8px;
      padding: 11px 13px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      background: rgba(10, 10, 10, 0.6);
    }
    .mark {
      width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
      background: linear-gradient(140deg, ${AMBER}, #D97706);
    }
    .title { font-size: 12.5px; font-weight: 650; color: #F7F2EA; letter-spacing: -0.01em; }
    .spacer { flex: 1; }
    .close {
      width: 22px; height: 22px; border-radius: 6px; border: none; cursor: pointer;
      background: transparent; color: #9C8A70; font-size: 15px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s ease, color 0.2s ease;
    }
    .close:hover { background: rgba(255, 255, 255, 0.07); color: #F7F2EA; }

    .body { padding: 14px 13px; max-height: min(70vh, 620px); overflow-y: auto; }
    .body::-webkit-scrollbar { width: 8px; }
    .body::-webkit-scrollbar-thumb {
      background: rgba(245, 166, 35, 0.3); border-radius: 999px;
    }
    .body::-webkit-scrollbar-thumb:hover { background: rgba(245, 166, 35, 0.5); }

    .claim {
      font-size: 12.5px; line-height: 1.55; color: #C4B49C;
      border-left: 2px solid rgba(245, 166, 35, 0.4);
      padding: 2px 0 2px 10px; margin-bottom: 13px;
      max-height: 84px; overflow: hidden;
    }

    .row { display: flex; align-items: center; gap: 8px; }
    .spin {
      width: 13px; height: 13px; flex-shrink: 0;
      border: 2px solid rgba(245, 166, 35, 0.25);
      border-top-color: ${AMBER};
      border-radius: 50%;
      animation: ar-spin 0.7s linear infinite;
    }
    @keyframes ar-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spin { animation-duration: 2s; } }
    .note { font-size: 12.5px; color: #C4B49C; }

    .verdict {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 999px;
      font-size: 11.5px; font-weight: 650; letter-spacing: 0.02em;
      border: 1px solid; text-transform: uppercase;
    }
    .v-supported  { color: #4ADE80; background: rgba(34, 197, 94, 0.1);  border-color: rgba(34, 197, 94, 0.28); }
    .v-disputed   { color: #F87171; background: rgba(220, 38, 38, 0.1);  border-color: rgba(220, 38, 38, 0.28); }
    .v-unverified { color: ${AMBER}; background: rgba(245, 166, 35, 0.09); border-color: rgba(245, 166, 35, 0.25); }

    .conf { font-size: 11.5px; color: #9C8A70; font-variant-numeric: tabular-nums; }
    .explain { font-size: 12.5px; line-height: 1.6; color: #E8DFD1; margin-top: 11px; }

    .meta {
      margin-top: 13px; padding-top: 11px;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
      display: flex; flex-direction: column; gap: 7px;
    }
    .metarow { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.09em; color: #776853; }
    .value {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11.5px; color: #E8DFD1; font-variant-numeric: tabular-nums;
    }
    .money { color: ${AMBER}; }

    a.link {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11.5px; color: ${AMBER}; text-decoration: none;
      display: inline-flex; align-items: center; gap: 4px;
      border-bottom: 1px solid rgba(245, 166, 35, 0.3);
      transition: opacity 0.2s ease;
    }
    a.link:hover { opacity: 0.78; }

    .steps { display: flex; flex-direction: column; gap: 5px; margin-top: 12px; }
    .step {
      display: flex; align-items: center; gap: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px; color: #C4B49C;
    }
    .dot { width: 5px; height: 5px; border-radius: 999px; flex-shrink: 0; background: #4A3218; }
    .dot.paid { background: ${AMBER}; }
    .dot.run  { background: #4ADE80; }
    .step .amt { margin-left: auto; color: ${AMBER}; font-variant-numeric: tabular-nums; }

    .bar {
      height: 3px; border-radius: 999px; background: rgba(255, 255, 255, 0.07);
      overflow: hidden; margin-top: 12px;
    }
    .bar > i {
      display: block; height: 100%; border-radius: 999px;
      background: linear-gradient(90deg, #D97706, ${AMBER});
      transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .btn {
      width: 100%; margin-top: 12px; padding: 8px 12px;
      border-radius: 9px; border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.05); color: #F7F2EA;
      font-size: 12.5px; font-weight: 600; cursor: pointer;
      font-family: inherit;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .btn:hover { background: rgba(255, 255, 255, 0.09); border-color: rgba(255, 255, 255, 0.2); }

    .report {
      margin-top: 12px; padding: 11px;
      border-radius: 9px; border: 1px solid rgba(255, 255, 255, 0.07);
      background: rgba(0, 0, 0, 0.3);
      font-size: 12px; line-height: 1.65; color: #D8CFC0;
      max-height: 210px; overflow-y: auto; white-space: pre-wrap;
    }
    .err { font-size: 12.5px; line-height: 1.6; color: #FCA5A5; }
  `;

  let shadow = null;

  function ensureHost() {
    let host = document.getElementById(HOST_ID);
    if (host && shadow) return shadow;

    host = document.createElement('div');
    host.id = HOST_ID;
    // Positioning also set inline: insertCSS can lose a race with a page that rewrites
    // its own stylesheet, and a panel that lands mid-document is worse than no panel.
    host.style.cssText =
      'position:fixed;top:20px;right:20px;z-index:2147483647;width:384px;max-width:calc(100vw - 40px);';
    document.documentElement.appendChild(host);

    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLES;
    shadow.appendChild(style);
    const mount = document.createElement('div');
    mount.className = 'mount';
    shadow.appendChild(mount);
    return shadow;
  }

  function close() {
    const host = document.getElementById(HOST_ID);
    if (host) host.remove();
    shadow = null;
  }

  const esc = (s) =>
    String(s == null ? '' : s).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

  const short = (h, n = 20) => (h ? `${String(h).slice(0, n)}…` : '—');

  function render(inner) {
    const sh = ensureHost();
    const mount = sh.querySelector('.mount');
    mount.innerHTML = `
      <div class="panel">
        <div class="head">
          <span class="mark"></span>
          <span class="title">AutoResearch</span>
          <span class="spacer"></span>
          <button class="close" title="Close">&times;</button>
        </div>
        <div class="body">${inner}</div>
      </div>`;
    mount.querySelector('.close').addEventListener('click', close);
    return mount;
  }

  function claimBlock(text) {
    return `<div class="claim">${esc(text)}</div>`;
  }

  function verdictClass(v) {
    const s = String(v || '').toLowerCase();
    if (s.includes('disputed') || s.includes('false')) return 'v-disputed';
    if (s.includes('support')) return 'v-supported';
    return 'v-unverified';
  }

  function renderLoading({ claim, note }) {
    render(`
      ${claimBlock(claim)}
      <div class="row"><span class="spin"></span><span class="note">${esc(note)}</span></div>
    `);
  }

  function renderFactCheck(d) {
    const conf = typeof d.confidence === 'number' ? `${Math.round(d.confidence * 100)}% confidence` : '';
    render(`
      ${claimBlock(d.claim)}
      <div class="row">
        <span class="verdict ${verdictClass(d.verdict)}">${esc(String(d.verdict).replace(/_/g, ' '))}</span>
        <span class="conf">${esc(conf)}</span>
      </div>
      ${d.explanation ? `<p class="explain">${esc(d.explanation)}</p>` : ''}
      <div class="meta">
        ${
          d.evidence_url
            ? `<div class="metarow"><span class="label">Source</span>
                 <a class="link" href="${esc(d.evidence_url)}" target="_blank" rel="noreferrer">open ↗</a></div>`
            : ''
        }
        <div class="metarow"><span class="label">Cost</span>
          <span class="value money">$${Number(d.cost_usdc || 0).toFixed(4)} USDC</span></div>
        <div class="metarow"><span class="label">Settlement</span>
          ${
            d.explorer_url
              ? `<a class="link" href="${esc(d.explorer_url)}" target="_blank" rel="noreferrer">${esc(short(d.tx_hash, 16))} ↗</a>`
              : `<span class="value">not settled</span>`
          }
        </div>
      </div>
    `);
  }

  function renderProgress(trace) {
    const steps = trace.steps || [];
    const done = steps.filter((s) => s.status === 'completed' || s.status === 'paid').length;
    const pct = steps.length ? Math.round((done / steps.length) * 100) : 8;
    const last = (trace.narration || []).slice(-1)[0];

    render(`
      <div class="row"><span class="spin"></span>
        <span class="note">${esc(trace.status)} · ${done}/${steps.length || '?'} tasks</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      ${last ? `<p class="explain">${esc(last.text)}</p>` : ''}
      <div class="steps">
        ${steps
          .slice(-6)
          .map((s) => {
            const cls = s.tx_hash ? 'paid' : s.status === 'paying' ? 'run' : '';
            const amt = s.amount_usdc ? `$${Number(s.amount_usdc).toFixed(4)}` : '';
            return `<div class="step"><span class="dot ${cls}"></span>
              <span>${esc(s.task_type || s.task_id)}</span>
              <span class="amt">${esc(amt)}</span></div>`;
          })
          .join('')}
      </div>
      <div class="meta">
        <div class="metarow"><span class="label">Spent so far</span>
          <span class="value money">$${Number(trace.total_spent_usdc || 0).toFixed(4)}</span></div>
      </div>
    `);
  }

  function renderReport(report, trace) {
    const cites = report.citations || [];
    const settled = (trace.steps || []).filter((s) => s.tx_hash);
    const mount = render(`
      ${claimBlock(report.query)}
      <div class="meta" style="margin-top:0;border-top:none;padding-top:0">
        <div class="metarow"><span class="label">Total spent</span>
          <span class="value money">$${Number(report.total_spent_usdc || 0).toFixed(4)} USDC</span></div>
        <div class="metarow"><span class="label">Citations</span>
          <span class="value">${cites.length}</span></div>
        ${
          typeof report.trust_score === 'number'
            ? `<div class="metarow"><span class="label">Trust score</span>
                 <span class="value">${report.trust_score.toFixed(2)}</span></div>`
            : ''
        }
        <div class="metarow"><span class="label">Settlements</span>
          <span class="value">${settled.length} on Base Sepolia</span></div>
      </div>
      <div class="report">${esc((report.report_markdown || '').slice(0, 4000))}</div>
      <button class="btn" id="ar-copy">Copy report as Markdown</button>
      <div class="steps">
        ${settled
          .map(
            (s) => `<div class="step"><span class="dot paid"></span>
              <span>${esc(s.task_type)}</span>
              <a class="link" href="${esc(s.explorer_url)}" target="_blank" rel="noreferrer" style="margin-left:auto">${esc(short(s.tx_hash, 12))} ↗</a>
            </div>`,
          )
          .join('')}
      </div>
    `);

    const btn = mount.querySelector('#ar-copy');
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(report.report_markdown || '');
        btn.textContent = 'Copied';
      } catch {
        // Some pages block clipboard access; say so rather than looking like it worked.
        btn.textContent = 'Copy blocked by this page';
      }
      setTimeout(() => {
        btn.textContent = 'Copy report as Markdown';
      }, 1800);
    });
  }

  function renderError(message) {
    render(`<p class="err">${esc(message)}</p>`);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'AR_LOADING') renderLoading(msg);
    else if (msg.type === 'AR_FACTCHECK_RESULT') renderFactCheck(msg.data);
    else if (msg.type === 'AR_PROGRESS') renderProgress(msg.trace);
    else if (msg.type === 'AR_REPORT') renderReport(msg.report, msg.trace);
    else if (msg.type === 'AR_ERROR') renderError(msg.message);
  });
})();
