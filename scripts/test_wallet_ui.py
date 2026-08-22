"""Browser end-to-end test for the Algorand wallet flow.

Drives a real Chrome against the running frontend and asserts what a judge will actually
see: that a first-time visitor's wallet is created, funded from the demo faucet, and shown
as ready - without any dispenser, captcha or sign-in step. Then it opens the wallet page
and checks the address, balance and recovery phrase render, and that the phrase is hidden
until explicitly revealed.

Signed-out on purpose. The wallet is device-scoped when nobody is signed in, so this
covers the path that must keep working even if Firebase auth is unavailable - which is
also the path a judge hits before touching the sign-in button.

Needs both servers up:
    ./run_all.sh                       (orchestrator on :4000)
    cd frontend-react && npm run dev   (vite on :5173)

Run:
    python scripts/test_wallet_ui.py [--headed] [--url http://localhost:5173]
"""
import argparse
import re
import sys

from playwright.sync_api import expect, sync_playwright

SHOT_DIR = "/tmp/autoresearch-shots"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:5173")
    ap.add_argument("--headed", action="store_true")
    ap.add_argument("--shots", default=SHOT_DIR)
    args = ap.parse_args()

    failures: list[str] = []

    def check(name: str, fn):
        try:
            fn()
            print(f"  PASS  {name}")
        except Exception as err:
            first = str(err).strip().splitlines()[0][:160]
            print(f"  FAIL  {name}\n        {first}")
            failures.append(name)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=not args.headed)
        # A fresh context every run: the wallet lives in localStorage, so reusing one
        # would test the "already provisioned" path and never exercise creation+funding.
        ctx = browser.new_context(viewport={"width": 1440, "height": 960})
        page = ctx.new_page()

        console_errors: list[str] = []
        page.on(
            "console",
            lambda m: console_errors.append(m.text) if m.type == "error" else None,
        )

        print("\n[1] first visit - wallet provisions with no user action")
        page.goto(args.url, wait_until="networkidle")

        pill = page.get_by_title(re.compile("Algorand TestNet"))
        check("wallet pill appears in nav", lambda: expect(pill).to_be_visible(timeout=15_000))

        # The whole point of the faucet: this resolves to a balance on its own.
        check(
            "wallet reaches a funded balance unaided",
            lambda: expect(pill).to_have_text(re.compile(r"\d+\.\d+\s*ALGO"), timeout=90_000),
        )
        balance_text = pill.inner_text().strip()
        print(f"        nav shows: {balance_text}")
        page.screenshot(path=f"{args.shots}/01-home-wallet-pill.png")

        check(
            "balance is non-zero (faucet actually paid)",
            lambda: (lambda v: (_ for _ in ()).throw(AssertionError(f"balance was {v}")))(balance_text)
            if float(re.search(r"([\d.]+)", balance_text).group(1)) <= 0
            else None,
        )

        print("\n[2] wallet page")
        page.goto(f"{args.url}/wallet", wait_until="networkidle")
        page.wait_for_timeout(1200)

        check(
            "page heading renders",
            lambda: expect(page.get_by_role("heading", name="Your wallet")).to_be_visible(timeout=10_000),
        )
        check(
            "'Ready to sign' status shown",
            lambda: expect(page.get_by_text("Ready to sign")).to_be_visible(timeout=30_000),
        )

        # A 58-character Algorand address, rendered in full.
        addr_el = page.locator("div.mono.break-all").first
        check("full address rendered", lambda: expect(addr_el).to_be_visible(timeout=10_000))
        address = addr_el.inner_text().strip()
        print(f"        address: {address}")
        check(
            "address is a valid 58-char Algorand address",
            lambda: None
            if re.fullmatch(r"[A-Z2-7]{58}", address)
            else (_ for _ in ()).throw(AssertionError(f"bad address: {address!r}")),
        )

        # Everything below the fold is wrapped in <Reveal>, which animates in on
        # whileInView - a full-page screenshot alone leaves those sections at opacity 0,
        # so scroll the page past them before capturing or asserting on them.
        page.mouse.wheel(0, 2400)
        page.wait_for_timeout(1200)
        page.screenshot(path=f"{args.shots}/02-wallet-page.png", full_page=True)

        print("\n[2b] on-chain activity")
        check(
            "activity section renders",
            lambda: expect(page.get_by_role("heading", name="On-chain activity")).to_be_visible(
                timeout=10_000
            ),
        )
        # The indexer trails the node, so the faucet transfer may legitimately not be
        # visible yet; the assertion is that the section resolves to real content or an
        # honest empty state, never a stuck spinner.
        check(
            "activity resolved (row or empty state, not stuck loading)",
            lambda: expect(
                page.get_by_text("Faucet top-up").or_(page.get_by_text("Nothing yet")).first
            ).to_be_visible(timeout=30_000),
        )
        page.mouse.wheel(0, -2400)
        page.wait_for_timeout(600)

        print("\n[3] recovery phrase stays hidden until asked for")
        phrase = page.locator("div.mono.select-none")
        check("phrase is blurred before reveal", lambda: expect(phrase).to_be_visible(timeout=5_000))
        check(
            "placeholder shown, not the real phrase",
            lambda: None
            if "word word word" in phrase.inner_text()
            else (_ for _ in ()).throw(AssertionError("real phrase visible before reveal")),
        )

        page.get_by_role("button", name="Reveal").click()
        page.wait_for_timeout(500)
        revealed = page.locator("div.mono").filter(has_text=re.compile(r"(\w+\s+){20,}")).first
        check(
            "revealed phrase is 25 words",
            lambda: None
            if len(revealed.inner_text().split()) == 25
            else (_ for _ in ()).throw(
                AssertionError(f"got {len(revealed.inner_text().split())} words")
            ),
        )
        page.screenshot(path=f"{args.shots}/03-wallet-revealed.png", full_page=True)

        print("\n[4] dark theme")
        page.evaluate("document.documentElement.setAttribute('data-theme','dark')")
        page.wait_for_timeout(700)
        page.mouse.wheel(0, 2400)
        page.wait_for_timeout(900)
        page.screenshot(path=f"{args.shots}/04-wallet-dark.png", full_page=True)
        bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
        print(f"        dark body background: {bg}")
        check(
            "dark theme paints a dark body",
            lambda: None
            if sum(int(n) for n in re.findall(r"\d+", bg)[:3]) < 120
            else (_ for _ in ()).throw(AssertionError(f"body not dark: {bg}")),
        )

        print("\n[5] wallet survives a reload (same address, no re-funding)")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(2500)
        addr_after = page.locator("div.mono.break-all").first.inner_text().strip()
        check(
            "same address after reload",
            lambda: None
            if addr_after == address
            else (_ for _ in ()).throw(AssertionError(f"{address} -> {addr_after}")),
        )

        real_errors = [
            e
            for e in console_errors
            # Firebase is expected to complain when its project isn't reachable or rules
            # aren't deployed; that is orthogonal to the wallet and must not fail this run.
            if not re.search(r"firebase|firestore|auth/|permission-denied|net::ERR", e, re.I)
        ]
        check(
            "no unrelated console errors",
            lambda: None
            if not real_errors
            else (_ for _ in ()).throw(AssertionError(f"{len(real_errors)}: {real_errors[:3]}")),
        )

        browser.close()

    print(f"\nScreenshots in {args.shots}/")
    if failures:
        print(f"\n{len(failures)} FAILED: {', '.join(failures)}")
        return 1
    print("\nAll wallet UI checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
