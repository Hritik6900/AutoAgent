/** Settings and a live reading of what this caller has left to spend today.
 *
 *  The quota call goes through the service worker rather than being made here, so there
 *  is one place that knows how to reach the orchestrator and one place that turns its
 *  failures into sentences. */

const DEFAULTS = { apiUrl: 'http://localhost:4000', apiKey: '' };

const $ = (id) => document.getElementById(id);

async function load() {
  const c = await chrome.storage.sync.get(DEFAULTS);
  $('apiUrl').value = c.apiUrl || DEFAULTS.apiUrl;
  $('apiKey').value = c.apiKey || '';
}

function setStatus(state, text) {
  const el = $('status');
  el.classList.remove('on', 'off');
  if (state) el.classList.add(state);
  $('status-text').textContent = text;
}

function showQuota(q) {
  $('quota').hidden = false;
  $('q-remaining').textContent = `$${Number(q.remaining_today_usdc).toFixed(4)}`;
  $('q-cap').textContent = `left of $${Number(q.daily_cap_usdc).toFixed(2)} today`;
  $('q-caller').textContent = q.caller || '—';
  $('q-jobs').textContent = `${q.jobs_last_hour}/${q.max_jobs_per_hour} this hour`;

  const used = q.daily_cap_usdc
    ? Math.min(100, (q.spent_or_committed_today_usdc / q.daily_cap_usdc) * 100)
    : 0;
  // Next frame, so the bar animates from 0 rather than appearing already filled.
  requestAnimationFrame(() => {
    $('q-bar').style.width = `${used}%`;
  });
}

function ping() {
  setStatus(null, 'checking…');
  $('error').hidden = true;
  $('quota').hidden = true;

  chrome.runtime.sendMessage({ type: 'AR_PING' }, (res) => {
    if (chrome.runtime.lastError || !res) {
      setStatus('off', 'unreachable');
      $('error').hidden = false;
      $('error').textContent = 'The extension could not reach its own service worker. Try reloading the extension.';
      return;
    }
    if (res.ok) {
      setStatus('on', 'connected');
      showQuota(res.quota);
    } else {
      setStatus('off', 'offline');
      $('error').hidden = false;
      $('error').textContent = res.error;
    }
  });
}

$('save').addEventListener('click', async () => {
  await chrome.storage.sync.set({
    apiUrl: $('apiUrl').value.trim() || DEFAULTS.apiUrl,
    apiKey: $('apiKey').value.trim(),
  });
  $('saved').hidden = false;
  setTimeout(() => {
    $('saved').hidden = true;
  }, 1400);
  ping();
});

load().then(ping);
