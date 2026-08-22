"""Algorand TestNet support: the demo faucet and read-only chain queries.

Two deliberate boundaries hold this module together:

  * **The user's wallet never exists here.** Each signed-in user's Algorand keypair is
    generated in their browser and never leaves it (see `frontend-react/src/lib/algorand.ts`),
    so this file has no user key handling, no signing on anyone's behalf, and no
    custody. Every function below either reads public chain state or spends the one
    faucet account this deployment owns.

  * **It is entirely separate from x402.** The USDC micropayments that pay the research
    microservices run on Base Sepolia through `shared/x402_client.py` and are untouched
    by anything here - x402's EIP-3009 authorization is EVM-specific and has no Algorand
    equivalent. Algorand carries the *other* half of the story: the user's own funded
    identity, and the report-integrity anchor they sign themselves.

The faucet exists because the public TestNet dispensers all sit behind a login or a
captcha now, which would mean a minute of dead air in the middle of a live demo. Funding
one account up front and forwarding small amounts from it means a new signer is ready to
transact the moment they sign in.
"""
import os
import threading
import time

from algosdk import account, encoding, mnemonic
from algosdk.transaction import PaymentTxn
from algosdk.v2client import algod

# AlgoNode's public TestNet endpoint: no API key, no signup, generous rate limits. The
# empty token is correct here - the API is genuinely open, not misconfigured.
ALGOD_URL = os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")
ALGO_NETWORK = os.getenv("ALGO_NETWORK", "testnet")

# Lora is the Algorand Foundation's own explorer and renders a transaction's note field
# directly, which is the whole point of the provenance anchor - a judge can read the
# report hash out of the transaction without a decoder.
EXPLORER_BASE = os.getenv("ALGO_EXPLORER_BASE", "https://lora.algokit.io/testnet")

FAUCET_MNEMONIC = os.getenv("ALGORAND_FAUCET_MNEMONIC", "").strip()

# What a newly signed-in user is topped up to. An Algorand account must hold 0.1 ALGO to
# exist at all, and a note-carrying transaction costs 0.001, so 0.5 leaves room for
# hundreds of anchors while letting one 10 ALGO faucet serve ~20 demo users.
FUND_AMOUNT_ALGO = float(os.getenv("ALGO_FUND_AMOUNT", "0.5"))

# Above this, an account is considered already funded and `fund_account` becomes a no-op.
# Without it, a refresh loop or an over-eager client could drain the faucet in seconds.
FUND_THRESHOLD_ALGO = float(os.getenv("ALGO_FUND_THRESHOLD", "0.25"))

MICRO = 1_000_000

# One top-up per address per window. The threshold check above already blocks the common
# case; this covers the one it cannot - an address that keeps spending back down below
# the threshold between requests.
_FUND_COOLDOWN_SECONDS = 300
_last_funded: dict[str, float] = {}
_fund_lock = threading.Lock()


class AlgorandError(RuntimeError):
    """Raised for conditions the caller should surface to a user verbatim (faucet empty,
    faucet not configured, bad address) rather than log as an internal fault."""


_client: algod.AlgodClient | None = None


def get_client() -> algod.AlgodClient:
    global _client
    if _client is None:
        _client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_URL)
    return _client


# The public AlgoNode endpoint occasionally drops a TLS handshake or times out under
# load. py-algorand-sdk builds its requests on urllib with no timeout and no retry, so a
# single blip would surface to the user as "funding failed" on an otherwise healthy
# system - the same class of shared-infrastructure flakiness the x402 client already
# retries past (see _is_transient in orchestrator/orchestrate.py).
#
# Only network-shaped failures are retried. A 400 from the node is a real rejection
# (overspend, malformed transaction) and must surface immediately rather than being
# attempted three times.
_TRANSIENT_MARKERS = (
    "handshake",
    "timed out",
    "timeout",
    "connection reset",
    "connection refused",
    "temporary failure",
    "eof occurred",
    "bad gateway",
    "service unavailable",
    "502",
    "503",
    "504",
)


def _is_transient_net(err: Exception) -> bool:
    return any(m in str(err).lower() for m in _TRANSIENT_MARKERS)


def _retry(fn, *args, attempts: int = 3, base_delay: float = 0.6, **kwargs):
    last: Exception | None = None
    for i in range(attempts):
        try:
            return fn(*args, **kwargs)
        except AlgorandError:
            raise
        except Exception as err:
            last = err
            if not _is_transient_net(err) or i == attempts - 1:
                raise
            time.sleep(base_delay * (2**i))
    raise last  # unreachable, but keeps the type checker honest


def is_valid_address(address: str) -> bool:
    try:
        return bool(address) and encoding.is_valid_address(address)
    except Exception:
        return False


def explorer_tx_url(txid: str) -> str:
    return f"{EXPLORER_BASE}/transaction/{txid}"


def explorer_address_url(address: str) -> str:
    return f"{EXPLORER_BASE}/account/{address}"


def faucet_address() -> str | None:
    """The funding account's address, or None if this deployment has no faucet configured.

    Deliberately does not raise: the frontend calls this through /api/algorand/status to
    decide whether to offer auto-funding or fall back to linking the public dispenser, and
    a deployment without a faucet is a supported configuration, not an error.
    """
    if not FAUCET_MNEMONIC:
        return None
    try:
        return account.address_from_private_key(mnemonic.to_private_key(FAUCET_MNEMONIC))
    except Exception:
        return None


def _faucet_key() -> tuple[str, str]:
    if not FAUCET_MNEMONIC:
        raise AlgorandError(
            "No demo faucet is configured on this deployment. "
            "Fund your wallet directly at https://lora.algokit.io/testnet/fund"
        )
    try:
        sk = mnemonic.to_private_key(FAUCET_MNEMONIC)
    except Exception as err:
        raise AlgorandError(f"ALGORAND_FAUCET_MNEMONIC is malformed: {err}") from err
    return sk, account.address_from_private_key(sk)


def get_balance_micro(address: str) -> int:
    """Spendable + locked microAlgos held by `address`. Returns 0 for an address that has
    never been funded, since Algorand reports those as 404 rather than as a zero balance."""
    if not is_valid_address(address):
        raise AlgorandError("That is not a valid Algorand address.")
    try:
        info = _retry(get_client().account_info, address)
        return int(info.get("amount", 0))
    except Exception as err:
        if "no accounts found" in str(err).lower() or "404" in str(err):
            return 0
        raise


def account_snapshot(address: str) -> dict:
    micro = get_balance_micro(address)
    return {
        "address": address,
        "balance_algo": micro / MICRO,
        "balance_micro": micro,
        "funded": micro > 0,
        "network": ALGO_NETWORK,
        "explorer_url": explorer_address_url(address),
    }


def faucet_status() -> dict:
    addr = faucet_address()
    if not addr:
        return {"configured": False, "address": None, "balance_algo": 0.0, "can_fund": False,
                "fund_amount_algo": FUND_AMOUNT_ALGO, "network": ALGO_NETWORK}
    try:
        balance = get_balance_micro(addr) / MICRO
    except Exception:
        balance = 0.0
    return {
        "configured": True,
        "address": addr,
        "balance_algo": balance,
        # Needs the payout plus its fee plus the faucet's own 0.1 minimum balance.
        "can_fund": balance >= FUND_AMOUNT_ALGO + 0.101,
        "fund_amount_algo": FUND_AMOUNT_ALGO,
        "network": ALGO_NETWORK,
    }


def fund_account(address: str, amount_algo: float | None = None) -> dict:
    """Top a user's wallet up from the demo faucet.

    Returns `{"funded": False, "reason": ...}` rather than raising when the top-up is
    simply unnecessary (already has enough) or too soon (cooldown) - both are normal
    states the UI reports as "your wallet is ready", not as failures. Genuine problems
    (no faucet, faucet empty, bad address) raise AlgorandError.
    """
    if not is_valid_address(address):
        raise AlgorandError("That is not a valid Algorand address.")

    amount_algo = FUND_AMOUNT_ALGO if amount_algo is None else float(amount_algo)
    if amount_algo <= 0 or amount_algo > 2:
        raise AlgorandError("Requested top-up must be between 0 and 2 ALGO.")

    current_micro = get_balance_micro(address)
    if current_micro >= FUND_THRESHOLD_ALGO * MICRO:
        return {
            "funded": False,
            "reason": "already_funded",
            "balance_algo": current_micro / MICRO,
            "tx_id": None,
            "explorer_url": None,
        }

    # Held across the send so two concurrent requests for the same address cannot both
    # pass the cooldown check. The window is short and the call is a few hundred ms.
    with _fund_lock:
        last = _last_funded.get(address, 0.0)
        if time.time() - last < _FUND_COOLDOWN_SECONDS:
            return {
                "funded": False,
                "reason": "cooldown",
                "balance_algo": current_micro / MICRO,
                "tx_id": None,
                "explorer_url": None,
            }

        sk, sender = _faucet_key()
        client = get_client()

        faucet_micro = get_balance_micro(sender)
        needed = int(amount_algo * MICRO) + 1000 + int(0.1 * MICRO)
        if faucet_micro < needed:
            raise AlgorandError(
                f"The demo faucet is out of TestNet ALGO (holds {faucet_micro / MICRO:.3f}). "
                f"Top it up at https://lora.algokit.io/testnet/fund - address {sender}"
            )

        params = _retry(client.suggested_params)
        txn = PaymentTxn(
            sender=sender,
            sp=params,
            receiver=address,
            amt=int(amount_algo * MICRO),
            note=b"AutoResearch demo faucet",
        )
        signed = txn.sign(sk)
        # Retrying a *send* is safe here in a way it usually isn't: the transaction is
        # already signed, so every attempt carries the identical transaction id, and
        # Algorand rejects a duplicate rather than paying twice.
        txid = _retry(client.send_transaction, signed)
        _last_funded[address] = time.time()

    _wait_for_confirmation(client, txid)

    return {
        "funded": True,
        "reason": None,
        "amount_algo": amount_algo,
        "balance_algo": get_balance_micro(address) / MICRO,
        "tx_id": txid,
        "explorer_url": explorer_tx_url(txid),
    }


def _wait_for_confirmation(client: algod.AlgodClient, txid: str, timeout_rounds: int = 8) -> dict:
    """Blocks until the transaction is in a block. Algorand finalises in ~3s, so this
    normally returns on the first or second poll; the round cap stops a stalled network
    from hanging the request thread indefinitely."""
    start = _retry(client.status).get("last-round", 0)
    current = start
    while current < start + timeout_rounds:
        try:
            info = _retry(client.pending_transaction_info, txid)
            if info.get("confirmed-round", 0) > 0:
                return info
            if info.get("pool-error"):
                raise AlgorandError(f"Transaction rejected: {info['pool-error']}")
        except AlgorandError:
            raise
        except Exception:
            pass  # not yet propagated to the node we asked
        current += 1
        client.status_after_block(current)
    raise AlgorandError(f"Transaction {txid} was not confirmed within {timeout_rounds} rounds.")


def get_transaction(txid: str) -> dict | None:
    """Confirmed-round + note for an anchor transaction, or None while it is still
    pending. Used by the verification endpoint to prove an anchor really landed."""
    try:
        info = _retry(get_client().pending_transaction_info, txid)
    except Exception:
        return None
    if not info or not info.get("confirmed-round"):
        return None
    txn = (info.get("txn") or {}).get("txn") or {}
    return {
        "tx_id": txid,
        "confirmed_round": info["confirmed-round"],
        "sender": txn.get("snd"),
        "note_b64": txn.get("note"),
        "explorer_url": explorer_tx_url(txid),
    }
