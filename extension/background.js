/**
 * Service worker: owns the context menus and every call to the orchestrator.
 *
 * All network calls happen here rather than in the content script on purpose. The content
 * script runs in the page's origin, so its requests would be cross-origin and subject to
 * whatever CSP the page happens to set; the worker runs under the extension's own
 * host_permissions and is unaffected by either. The content script only ever renders what
 * it is handed.
 */

const DEFAULTS = { apiUrl: 'http://localhost:4000', apiKey: '' };

/* A research job settles ~6 paid calls and typically finishes inside a minute. The cap
   is generous rather than tight - giving up on a job that is still paying would strand
   money that was actually spent. */
const POLL_MS = 3000;
const POLL_LIMIT = 60;

async function getConfig() {
  const c = await chrome.storage.sync.get(DEFAULTS);
  return {
    apiUrl: (c.apiUrl || DEFAULTS.apiUrl).replace(/\/+$/, ''),
    apiKey: (c.apiKey || '').trim(),
  };
}

function authHeaders(apiKey) {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

/** Turns any failure - unreachable, refused, malformed - into a message worth showing.
 *  The orchestrator's own `detail` is passed through: it already names the limit that was
 *  hit and what would fit, which is more useful than anything this side could invent. */
async function callApi(path, { method = 'GET', body } = {}) {
  const { apiUrl, apiKey } = await getConfig();
  let res;
  try {
    res = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(apiKey),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      `Can't reach AutoResearch at ${apiUrl}. Is the backend running? (./run_all.sh)`,
    );
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j && j.detail) detail = j.detail;
    } catch {
      /* non-JSON error body - the status line is all we have */
    }
    if (res.status === 401) {
      throw new Error(`${detail} Set your API key from the extension popup.`);
    }
    throw new Error(detail);
  }

  return res.json();
}

/** Makes sure the panel code is present in the tab, then hands it a message.
 *  content.js guards against double-injection itself, so re-running it on a tab that
 *  already has it is harmless. */
async function sendToTab(tabId, message) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
  } catch (err) {
    // Chrome refuses injection on its own pages (chrome://, the Web Store). Nothing to
    // render into, so there is no panel to fall back to.
    console.warn('[AutoResearch] cannot inject into this page:', err);
    return false;
  }
  try {
    await chrome.tabs.sendMessage(tabId, message);
    return true;
  } catch (err) {
    console.warn('[AutoResearch] panel not reachable:', err);
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'ar-factcheck',
      title: 'Fact-check with AutoResearch',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: 'ar-research',
      title: 'Deep research this with AutoResearch',
      contexts: ['selection'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;
  const selection = (info.selectionText || '').trim();
  if (!selection) return;

  if (info.menuItemId === 'ar-factcheck') {
    await runFactCheck(tab.id, selection, info.pageUrl);
  } else if (info.menuItemId === 'ar-research') {
    await runResearch(tab.id, selection);
  }
});

async function runFactCheck(tabId, claim, pageUrl) {
  const ok = await sendToTab(tabId, {
    type: 'AR_LOADING',
    mode: 'factcheck',
    claim,
    note: 'Paying the fact-check service over x402…',
  });
  if (!ok) return;

  try {
    const data = await callApi('/api/fact-check', {
      method: 'POST',
      body: { claim, context: pageUrl || null },
    });
    await chrome.tabs.sendMessage(tabId, { type: 'AR_FACTCHECK_RESULT', data });
  } catch (err) {
    await chrome.tabs.sendMessage(tabId, { type: 'AR_ERROR', message: err.message });
  }
}

async function runResearch(tabId, query) {
  const ok = await sendToTab(tabId, {
    type: 'AR_LOADING',
    mode: 'research',
    claim: query,
    note: 'Planning the job…',
  });
  if (!ok) return;

  let jobId;
  try {
    const started = await callApi('/api/research', {
      method: 'POST',
      body: { query, budget_cap_usdc: 0.05 },
    });
    jobId = started.job_id;
  } catch (err) {
    await chrome.tabs.sendMessage(tabId, { type: 'AR_ERROR', message: err.message });
    return;
  }

  for (let i = 0; i < POLL_LIMIT; i++) {
    await new Promise((r) => setTimeout(r, POLL_MS));

    let trace;
    try {
      trace = await callApi(`/api/research/${jobId}/trace`);
    } catch {
      continue; // a single dropped poll is not a failed job - keep watching
    }

    try {
      await chrome.tabs.sendMessage(tabId, { type: 'AR_PROGRESS', trace });
    } catch {
      return; // the tab was closed or navigated away; stop polling for a panel that's gone
    }

    if (trace.status === 'completed') {
      try {
        const report = await callApi(`/api/research/${jobId}/report`);
        await chrome.tabs.sendMessage(tabId, { type: 'AR_REPORT', report, trace });
      } catch (err) {
        await chrome.tabs.sendMessage(tabId, { type: 'AR_ERROR', message: err.message });
      }
      return;
    }

    if (trace.status === 'failed' || trace.status === 'budget_exceeded') {
      await chrome.tabs.sendMessage(tabId, {
        type: 'AR_ERROR',
        message:
          trace.status === 'budget_exceeded'
            ? `The job stopped at its budget cap after spending $${(trace.total_spent_usdc || 0).toFixed(4)}.`
            : 'The research job failed. Check the orchestrator logs.',
      });
      return;
    }
  }

  await chrome.tabs.sendMessage(tabId, {
    type: 'AR_ERROR',
    message: 'The job is taking unusually long. Check the console for its progress.',
  });
}

// The popup talks to the orchestrator through here too, so there is one place that knows
// how to reach it and one place that formats its errors.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'AR_PING') {
    callApi('/api/quota')
      .then((quota) => sendResponse({ ok: true, quota }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // response is async
  }
  return false;
});
