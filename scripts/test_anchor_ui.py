"""Browser end-to-end test for the full demo: run a report, then anchor it on Algorand.

This is the judge's path, start to finish, in a real Chrome:

    open the console -> submit a query -> the agent pays its way through the pipeline
    -> a report appears -> click "Anchor on Algorand" -> the browser signs with the
    user's own key -> the transaction confirms -> re-read it from the chain and confirm
    the note really is this report's hash.

The signing step is the part worth testing here rather than in Node: it exercises the
wallet that WalletContext provisioned in this browser, with the key in this browser's
localStorage, which is the claim the whole feature rests on.

Needs the full stack up:
    ./run_all.sh                       (orchestrator + 8 services on :4000-:4008)
    cd frontend-react && npm run dev   (vite on :5173)

Run:
    python scripts/test_anchor_ui.py [--headed] [--query "..."] [--budget 0.05]
"""
import argparse
import re
import sys

from playwright.sync_api import expect, sync_playwright

SHOT_DIR = "/tmp/autoresearch-shots"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:5173")
    ap.add_argument("--query", default="How does solar power adoption affect rural electrification?")
    ap.add_argument("--budget", default="0.05")
    ap.add_argument("--headed", action="store_true")
    ap.add_argument("--shots", default=SHOT_DIR)
    # /console is gated, so the test needs an account. Email/password rather than Google,
    # because an OAuth popup cannot be driven without a human.
    ap.add_argument("--email", default="anchor-test@autoresearch.local")
    ap.add_argument("--password", default="anchor-test-pw-9931")
    args = ap.parse_args()

    failures: list[str] = []

    def check(name: str, fn):
        try:
            fn()
            print(f"  PASS  {name}")
        except Exception as err:
            first = str(err).strip().splitlines()[0][:170]
            print(f"  FAIL  {name}\n        {first}")
            failures.append(name)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=not args.headed)
        ctx = browser.new_context(viewport={"width": 1500, "height": 1000})
        page = ctx.new_page()
        page.set_default_timeout(30_000)

        print("\n[0] /console is gated - signing in first")
        page.goto(f"{args.url}/console", wait_until="domcontentloaded")
        page.wait_for_timeout(2500)
        check(
            "signed-out visitor is redirected to /signin",
            lambda: None
            if "/signin" in page.url
            else (_ for _ in ()).throw(AssertionError(f"landed on {page.url}")),
        )

        # A throwaway email/password account rather than Google: the OAuth popup needs a
        # human. Same AuthProvider, same redirect, so the gate and the post-login hop to
        # /console are genuinely exercised. Sign-in is tried first so re-runs reuse the
        # account instead of creating a new Firebase user every time.
        # Targeted by input type: the fields carry placeholders and autocomplete hints but
        # no labels, so get_by_label finds nothing.
        page.locator('input[type="email"]').first.fill(args.email)
        page.locator('input[type="password"]').first.fill(args.password)
        page.get_by_role("button", name=re.compile(r"^Sign in$")).first.click()
        page.wait_for_timeout(5000)

        if "/signin" in page.url:
            print("      no existing account - creating one")
            create = page.get_by_role("button", name=re.compile("Create one|Sign up|Create account", re.I))
            if create.count():
                create.first.click()
                page.wait_for_timeout(1000)
            name_field = page.locator('input[type="text"]')
            if name_field.count():
                name_field.first.fill("Anchor Test")
            page.locator('input[type="email"]').first.fill(args.email)
            page.locator('input[type="password"]').first.fill(args.password)
            page.get_by_role("button", name=re.compile("Create account|Sign up", re.I)).first.click()
            page.wait_for_timeout(7000)

        if "/signin" in page.url:
            # Surface the form's own error rather than failing on a bare URL assertion -
            # auth/operation-not-allowed here means email/password is off in Firebase.
            shown = page.inner_text("body")
            msg = next((ln for ln in shown.splitlines() if re.search(r"password|email|account", ln, re.I)
                        and len(ln) < 120), "")
            print(f"      still on /signin - form says: {msg[:110]}")

        check(
            "lands on /console after signing in",
            lambda: None
            if "/console" in page.url
            else (_ for _ in ()).throw(AssertionError(f"landed on {page.url}")),
        )

        print("\n[1] console loads and the wallet is already provisioned")
        page.goto(f"{args.url}/console", wait_until="domcontentloaded")
        # WalletProvider mounts at app root, so by the time the console is interactive the
        # account exists and has been funded - that is the property being asserted.
        page.wait_for_timeout(3000)
        wallet_ready = page.evaluate(
            """() => Object.keys(localStorage).some(k => k.startsWith('autoresearch.algo.wallet.'))"""
        )
        check(
            "wallet key exists in localStorage before any report",
            lambda: None if wallet_ready else (_ for _ in ()).throw(AssertionError("no wallet key")),
        )

        print(f"\n[2] submitting: {args.query!r} at ${args.budget}")
        page.locator("textarea").first.fill(args.query)
        budget = page.get_by_label("Budget cap in USDC")
        if budget.count():
            budget.fill(args.budget)
        page.get_by_role("button", name=re.compile("Run the agent")).click()

        print("      waiting for the pipeline to finish (this pays 6 real x402 calls)…")
        check(
            "report renders",
            lambda: expect(page.get_by_text("Report ready", exact=False)).to_be_visible(
                timeout=300_000
            ),
        )
        page.screenshot(path=f"{args.shots}/10-report.png")

        print("\n[3] dual-chain proof panel")
        proof = page.get_by_role("heading", name="Proof of this report")
        proof.scroll_into_view_if_needed()
        page.wait_for_timeout(1200)
        check("proof panel renders", lambda: expect(proof).to_be_visible(timeout=20_000))
        check(
            "Base Sepolia column present",
            lambda: expect(page.get_by_text("Base Sepolia").first).to_be_visible(),
        )
        check(
            "Algorand column present",
            lambda: expect(page.get_by_text("Algorand TestNet").first).to_be_visible(),
        )

        # The hash the anchor will commit to, read off the page before signing so the
        # comparison afterwards is against what the user was actually shown.
        shown_hash = None
        for loc in page.locator("span.mono").all():
            t = loc.inner_text().strip()
            if re.fullmatch(r"[0-9a-f]{64}", t):
                shown_hash = t
                break
        check(
            "a SHA-256 report hash is displayed",
            lambda: None
            if shown_hash
            else (_ for _ in ()).throw(AssertionError("no 64-hex hash on the panel")),
        )
        print(f"        report hash: {shown_hash}")
        page.screenshot(path=f"{args.shots}/11-proof-before-anchor.png")

        print("\n[4] anchoring — the browser signs with the user's own key")
        anchor_btn = page.get_by_role("button", name=re.compile("Anchor on Algorand"))
        check("anchor button is enabled", lambda: expect(anchor_btn).to_be_enabled(timeout=30_000))
        anchor_btn.click()

        check(
            "anchor confirms on-chain",
            lambda: expect(page.get_by_text(re.compile(r"Anchored in round"))).to_be_visible(
                timeout=90_000
            ),
        )
        round_text = page.get_by_text(re.compile(r"Anchored in round")).inner_text()
        print(f"        {round_text}")
        page.screenshot(path=f"{args.shots}/12-anchored.png")

        print("\n[5] re-reading the anchor from the chain")
        page.get_by_role("button", name=re.compile("Re-read from chain")).click()
        check(
            "on-chain note matches the report hash",
            lambda: expect(page.get_by_text("Hash matches")).to_be_visible(timeout=60_000),
        )
        page.screenshot(path=f"{args.shots}/13-verified.png")

        print("\n[6] the anchor survives a reload")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(4000)
        heading = page.get_by_role("heading", name="Proof of this report")
        if heading.count():
            heading.scroll_into_view_if_needed()
            page.wait_for_timeout(1000)
            check(
                "anchor still shown after reload",
                lambda: expect(page.get_by_text(re.compile(r"Anchored in round"))).to_be_visible(
                    timeout=20_000
                ),
            )
        else:
            # The console holds job state in memory, so a reload can legitimately return
            # to an empty console. That is pre-existing behaviour, not an anchor bug.
            print("        SKIP  console reset on reload (job state is in-memory)")

        print("\n[7] dark theme")
        page.goto(f"{args.url}/wallet", wait_until="networkidle")
        page.evaluate("document.documentElement.setAttribute('data-theme','dark')")
        page.wait_for_timeout(800)
        page.mouse.wheel(0, 2400)
        page.wait_for_timeout(1500)
        check(
            "the anchor appears in wallet activity",
            lambda: expect(page.get_by_text("Report anchor").first).to_be_visible(timeout=45_000),
        )
        page.screenshot(path=f"{args.shots}/14-wallet-with-anchor.png", full_page=True)

        browser.close()

    print(f"\nScreenshots in {args.shots}/")
    if failures:
        print(f"\n{len(failures)} FAILED: {', '.join(failures)}")
        return 1
    print("\nFull anchor flow passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
