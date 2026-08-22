#!/usr/bin/env python3
"""Generates the Algorand TestNet demo faucet account and writes it into .env.

This is the *only* Algorand key this deployment holds. Each user's own account is
generated in their browser and never reaches the server (see frontend-react/src/lib/
algorand.ts), so there is nothing else here to create.

The faucet exists purely to remove a step from the live demo: every public TestNet
dispenser now sits behind a login or a captcha, so without it a new visitor has to leave
the site and come back before they can sign anything. With it, signing in ends with a
funded, ready-to-sign account.

Safe to re-run - refuses to overwrite an existing faucet unless --force is passed, which
matters because overwriting it strands whatever ALGO the old one still holds.
"""
import re
import shutil
import sys
from pathlib import Path

from algosdk import account, mnemonic

ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / ".env"
EXAMPLE_PATH = ROOT / ".env.example"
FORCE = "--force" in sys.argv

DISPENSER = "https://lora.algokit.io/testnet/fund"


def set_env_var(text: str, key: str, value: str) -> str:
    pattern = re.compile(rf"^{key}=.*$", re.MULTILINE)
    if pattern.search(text):
        return pattern.sub(f"{key}={value}", text)
    return text + f"\n{key}={value}"


def main() -> None:
    if not ENV_PATH.exists():
        shutil.copyfile(EXAMPLE_PATH, ENV_PATH)

    env_text = ENV_PATH.read_text()

    existing = re.search(r'^ALGORAND_FAUCET_MNEMONIC="?([a-z ]{50,})"?$', env_text, re.MULTILINE)
    if existing and not FORCE:
        print("A demo faucet is already configured in .env (ALGORAND_FAUCET_MNEMONIC is set).")
        try:
            addr = account.address_from_private_key(mnemonic.to_private_key(existing.group(1).strip()))
            print("Existing faucet address:", addr)
            print(f"\nTop it up at {DISPENSER}")
        except Exception:
            print("(its mnemonic does not parse - re-run with --force to replace it)")
        print("\nRe-run with --force to generate a brand new one.")
        print("Note: the current faucet's remaining ALGO is not recoverable afterwards.")
        return

    private_key, address = account.generate_account()
    phrase = mnemonic.from_private_key(private_key)

    env_text = set_env_var(env_text, "ALGORAND_FAUCET_MNEMONIC", f'"{phrase}"')
    ENV_PATH.write_text(env_text)

    print("Generated the Algorand TestNet demo faucet and wrote it to .env\n")
    print("FAUCET (funds each new user's browser-held wallet):")
    print("  address:  ", address)
    print("  mnemonic:  saved to .env - keep that file out of git")
    print("\nNEXT STEP (manual, required - the faucet starts empty):")
    print(f"  1. Open {DISPENSER}")
    print("  2. Sign in (the dispenser requires it), paste the address above")
    print("  3. Dispense the maximum it allows - 10 ALGO serves ~20 demo users at 0.5 each")
    print("\nCheck it landed with:")
    print("  curl -s localhost:4000/api/algorand/status")
    print("\nThis is TestNet ALGO. It has no value and never touches mainnet.")


if __name__ == "__main__":
    main()
