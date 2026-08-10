# AutoResearch — browser extension

Select any sentence on any page, right-click, and get it fact-checked. The check is a real
x402 payment in USDC on Base Sepolia, and the result comes back with the transaction hash
that paid for it.

Built for the case the console can't cover: a reporter reading an article who wants one
claim verified *without* leaving the page, switching tabs, or retyping the sentence into
a form.

```
page selection → service worker → orchestrator → fact-check service (x402) → Base Sepolia
                                        ↓
                             panel injected back into the page
```

## Two actions

**Fact-check with AutoResearch** — one claim, one paid call, a few seconds, ~$0.003.
Returns a verdict (supported / disputed / unverified), a confidence score, an explanation,
the corroborating source, and the settlement's BaseScan link.

**Deep research this with AutoResearch** — runs the full pipeline on the selected text:
planning, a live provider auction, six paid calls, ~$0.02, about a minute. The panel shows
live progress while it spends, then the finished report with a copy-as-Markdown button and
every settlement listed.

## Install

Chrome no longer allows loading unpacked extensions from the command line, so this is a
manual step:

1. Start the backend — `./run_all.sh` from the repo root.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Open the extension's popup and confirm it says **connected**. If your orchestrator is
   not on `http://localhost:4000`, set the URL there.

An API key is optional while the orchestrator runs locally. If you have set
`REQUIRE_API_KEY=true`, mint one with `python scripts/manage_keys.py create "browser"` and
paste it into the popup.

## Pointing at a hosted orchestrator

`host_permissions` in `manifest.json` deliberately lists only localhost — asking for
`https://*/*` would make Chrome warn that the extension can read every site you visit,
which is far more access than it needs. To use a hosted backend, add that one origin:

```json
"host_permissions": ["http://localhost/*", "http://127.0.0.1/*", "https://your-host.example/*"]
```

Then reload the extension.

## How it is put together

| File | Role |
|---|---|
| `background.js` | Service worker. Owns the context menus and **every** network call. |
| `content.js` | Injects and renders the panel. Talks to nothing but the worker. |
| `popup.html/js/css` | Settings and a live reading of today's remaining budget. |

Two decisions worth knowing about:

**All network calls happen in the service worker, never the content script.** The content
script runs in the page's origin, so its requests would be cross-origin and subject to
whatever Content-Security-Policy that page sets. The worker runs under the extension's own
permissions and is unaffected by either. The content script only renders what it is handed.

**The panel lives in a shadow root.** A news site's CSS is arbitrary and often aggressive —
global resets, `!important` everywhere, z-index wars. Inside the shadow boundary none of it
reaches the panel, and none of the panel's styles leak back into the article.

## Spending

Every action spends real testnet USDC from the orchestrator's wallet, so both are subject
to the same server-side limits as any other caller: a per-job ceiling, a rolling daily cap,
an hourly rate limit, and a service-wide ceiling. A refusal comes back as a readable
message in the panel — nothing is charged, because the call is rejected before any payment
is attempted.

Base Sepolia testnet only. No mainnet funds anywhere in this project.
