/**
 * The signed-in user's own Algorand TestNet account.
 *
 * This is the half of the system the user holds the keys to. The research pipeline's
 * x402 micropayments are signed by a wallet the *deployment* owns (one shared buyer
 * account on Base Sepolia, server-side); everything in this file belongs to whoever is
 * sitting at the browser.
 *
 * **The key never leaves this device.** It is generated here with algosdk, kept in
 * localStorage, and used here to sign. It is never sent to the orchestrator, never
 * written to Firestore, and never recoverable by us - which is also why the UI has to be
 * honest that clearing site data destroys it (see WalletContext's export affordance).
 *
 * The orchestrator's role is deliberately small: it reads public chain state and, on a
 * brand-new account, sends the first 0.5 TestNet ALGO from a demo faucet. It cannot sign
 * for the user and holds nothing of theirs.
 */
import algosdk from 'algosdk';
import { API_BASE_URL } from '../api/client';

const ALGOD_URL = 'https://testnet-api.algonode.cloud';
const EXPLORER_BASE = 'https://lora.algokit.io/testnet';

/** Prefix on the anchor transaction's note. Versioned so a later format change stays
 *  distinguishable on-chain; the backend verifier splits on ':' and reads the last field. */
const NOTE_PREFIX = 'autoresearch:v1:';

export interface AlgoWallet {
  address: string;
  /** 25-word recovery phrase. The only copy - see the file header. */
  mnemonic: string;
}

export interface AlgoAccountInfo {
  address: string;
  balanceAlgo: number;
  funded: boolean;
  explorerUrl: string;
}

export interface AnchorResult {
  txId: string;
  confirmedRound: number;
  explorerUrl: string;
  reportHash: string;
}

let client: algosdk.Algodv2 | null = null;
const algod = () => (client ??= new algosdk.Algodv2('', ALGOD_URL, ''));

export const explorerTxUrl = (txId: string) => `${EXPLORER_BASE}/transaction/${txId}`;
export const explorerAccountUrl = (address: string) => `${EXPLORER_BASE}/account/${address}`;

/** Shortened address for display: Algorand addresses are 58 characters and never fit. */
export const shortAddress = (a: string, n = 6) =>
  a && a.length > n * 2 ? `${a.slice(0, n)}…${a.slice(-n)}` : a || '—';

/* ------------------------------------------------------------------ storage */

/* Keyed per identity so two accounts on one browser don't share a wallet, and so
   signing out doesn't strand you on someone else's key. A signed-out visitor gets the
   'device' scope, which is what keeps the whole Algorand demo working even if Firebase
   auth is unavailable - the wallet, the funding and the anchoring are all independent
   of being signed in. */
const storageKey = (scope: string) => `autoresearch.algo.wallet.${scope}`;

export const walletScope = (uid?: string | null) => uid || 'device';

export function loadWallet(scope: string): AlgoWallet | null {
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AlgoWallet;
    if (!parsed?.address || !parsed?.mnemonic) return null;
    // Re-derive rather than trusting the stored address: a corrupted or hand-edited
    // entry would otherwise show an address we cannot actually sign for.
    const derived = algosdk.mnemonicToSecretKey(parsed.mnemonic);
    if (String(derived.addr) !== parsed.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createWallet(scope: string): AlgoWallet {
  const acct = algosdk.generateAccount();
  const wallet: AlgoWallet = {
    address: String(acct.addr),
    mnemonic: algosdk.secretKeyToMnemonic(acct.sk),
  };
  localStorage.setItem(storageKey(scope), JSON.stringify(wallet));
  return wallet;
}

/** Adopts an existing device wallet when a user signs in for the first time, so the
 *  account they were just funded on carries over instead of being replaced by an empty
 *  one. Only ever copies *into* an empty scope - it never overwrites a real wallet. */
export function adoptWallet(fromScope: string, toScope: string): AlgoWallet | null {
  if (fromScope === toScope) return loadWallet(toScope);
  if (loadWallet(toScope)) return loadWallet(toScope);
  const source = loadWallet(fromScope);
  if (!source) return null;
  localStorage.setItem(storageKey(toScope), JSON.stringify(source));
  return source;
}

/* -------------------------------------------------------------------- chain */

export async function getAccountInfo(address: string): Promise<AlgoAccountInfo> {
  try {
    const info = await algod().accountInformation(address).do();
    const micro = Number(info.amount ?? 0);
    return {
      address,
      balanceAlgo: micro / 1e6,
      funded: micro > 0,
      explorerUrl: explorerAccountUrl(address),
    };
  } catch (err) {
    // An address that has never received anything is a 404 on Algorand, not a zero
    // balance - reporting that as an error would make every new wallet look broken.
    if (String(err).includes('404') || /no accounts found/i.test(String(err))) {
      return { address, balanceAlgo: 0, funded: false, explorerUrl: explorerAccountUrl(address) };
    }
    throw err;
  }
}

export interface FundResult {
  funded: boolean;
  reason: string | null;
  balanceAlgo: number;
  txId: string | null;
  explorerUrl: string | null;
}

/** Ask the orchestrator's demo faucet for this wallet's first TestNet ALGO.
 *
 *  Every public dispenser now sits behind a login or a captcha, which in a live demo
 *  would mean a minute of dead air between signing in and being able to sign anything.
 *  Returns `funded: false` with a reason when no transfer was needed (already funded, or
 *  asked again too soon) - both are fine, not failures.
 */
export async function requestFunding(address: string): Promise<FundResult> {
  const res = await fetch(`${API_BASE_URL}/api/algorand/fund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.detail || 'Funding request failed');
  return {
    funded: !!body.funded,
    reason: body.reason ?? null,
    balanceAlgo: Number(body.balance_algo ?? 0),
    txId: body.tx_id ?? null,
    explorerUrl: body.explorer_url ?? null,
  };
}

export interface FaucetStatus {
  configured: boolean;
  address: string | null;
  balanceAlgo: number;
  canFund: boolean;
  fundAmountAlgo: number;
}

export async function getFaucetStatus(): Promise<FaucetStatus> {
  const res = await fetch(`${API_BASE_URL}/api/algorand/status`);
  if (!res.ok) throw new Error('Faucet status unavailable');
  const b = await res.json();
  return {
    configured: !!b.configured,
    address: b.address ?? null,
    balanceAlgo: Number(b.balance_algo ?? 0),
    canFund: !!b.can_fund,
    fundAmountAlgo: Number(b.fund_amount_algo ?? 0.5),
  };
}

/* ------------------------------------------------------------------ anchoring */

/**
 * Write a report's SHA-256 into an Algorand transaction the user signs themselves.
 *
 * A zero-amount payment to their own address: nothing moves except the 0.001 ALGO fee,
 * and the note field carries the hash. That makes the report tamper-evident by anyone -
 * refetch it, recompute the hash, and compare against what is on-chain (the orchestrator
 * exposes /api/algorand/verify-anchor to do exactly that).
 *
 * Distinct from the Base Sepolia provenance receipt the orchestrator already writes: that
 * one is signed by the deployment's wallet and proves *the service* published this
 * report. This one is signed by the reader's own key and proves *they* saw it, at a time
 * the chain records. Two different claims, which is why both exist.
 */
export async function anchorReport(wallet: AlgoWallet, reportHash: string): Promise<AnchorResult> {
  const hash = (reportHash || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new Error('That does not look like a SHA-256 report hash.');
  }

  const { sk, addr } = algosdk.mnemonicToSecretKey(wallet.mnemonic);
  const suggestedParams = await algod().getTransactionParams().do();

  const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: addr,
    receiver: addr,
    amount: 0,
    note: new TextEncoder().encode(NOTE_PREFIX + hash),
    suggestedParams,
  });

  const sent = await algod().sendRawTransaction(txn.signTxn(sk)).do();
  const txId = (sent as { txid?: string; txId?: string }).txid ?? (sent as { txId?: string }).txId!;

  const confirmed = await algosdk.waitForConfirmation(algod(), txId, 8);
  // algosdk v3 types this as `confirmedRound: bigint`, but the field arrives as
  // `confirmed-round` over the wire on some node versions. Read both, and go via
  // `unknown` because the SDK's response type has no index signature.
  const raw = confirmed as unknown as Record<string, unknown>;
  const round = Number(raw['confirmed-round'] ?? raw.confirmedRound ?? 0);

  return { txId, confirmedRound: round, explorerUrl: explorerTxUrl(txId), reportHash: hash };
}

export interface VerifyResult {
  verified: boolean;
  txId: string;
  confirmedRound: number | null;
  onChainHash: string | null;
  expectedHash: string;
  sender: string | null;
  explorerUrl: string | null;
  detail: string | null;
}

/** Independent re-read of an anchor straight off the chain. The point of anchoring is
 *  that it is checkable, so the check is offered in the UI rather than left as an
 *  exercise with a block explorer. */
export async function verifyAnchor(txId: string, reportHash: string): Promise<VerifyResult> {
  const res = await fetch(`${API_BASE_URL}/api/algorand/verify-anchor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx_id: txId, report_hash: reportHash }),
  });
  const b = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(b?.detail || 'Verification failed');
  return {
    verified: !!b.verified,
    txId: b.tx_id,
    confirmedRound: b.confirmed_round ?? null,
    onChainHash: b.on_chain_hash ?? null,
    expectedHash: b.expected_hash,
    sender: b.sender ?? null,
    explorerUrl: b.explorer_url ?? null,
    detail: b.detail ?? null,
  };
}

/* ------------------------------------------------------------------- history */

const INDEXER_URL = 'https://testnet-idx.algonode.cloud';

export interface AlgoTx {
  id: string;
  round: number;
  /** UNIX seconds, from the block the transaction landed in. */
  timestamp: number;
  amountAlgo: number;
  feeAlgo: number;
  note: string | null;
  /** The report hash, when this transaction is one of our anchors. */
  anchoredHash: string | null;
  incoming: boolean;
  explorerUrl: string;
}

/**
 * The account's recent activity, read from the public indexer.
 *
 * A separate service from the algod node used everywhere else in this file: algod only
 * knows the current state and the transactions still in its pool, so historical lookups
 * have to go to an indexer. Failures return an empty list rather than throwing - history
 * is context, and a wallet with an unreachable indexer is still perfectly able to sign.
 */
export async function getRecentTransactions(address: string, limit = 8): Promise<AlgoTx[]> {
  try {
    const res = await fetch(
      `${INDEXER_URL}/v2/accounts/${address}/transactions?limit=${limit}`,
    );
    if (!res.ok) return [];
    const body = await res.json();

    return (body.transactions ?? []).map((t: Record<string, unknown>) => {
      const payment = (t['payment-transaction'] ?? {}) as Record<string, unknown>;
      let note: string | null = null;
      if (typeof t.note === 'string' && t.note) {
        try {
          note = new TextDecoder().decode(
            Uint8Array.from(atob(t.note), (c) => c.charCodeAt(0)),
          );
        } catch {
          note = null;
        }
      }
      const anchored = note?.startsWith(NOTE_PREFIX) ? note.slice(NOTE_PREFIX.length) : null;

      return {
        id: String(t.id),
        round: Number(t['confirmed-round'] ?? 0),
        timestamp: Number(t['round-time'] ?? 0),
        amountAlgo: Number(payment.amount ?? 0) / 1e6,
        feeAlgo: Number(t.fee ?? 0) / 1e6,
        note,
        anchoredHash: anchored,
        incoming: String(t.sender) !== address,
        explorerUrl: explorerTxUrl(String(t.id)),
      } as AlgoTx;
    });
  } catch {
    return [];
  }
}

/** SHA-256 over the exact bytes given, hex-encoded. Used when a report predates the
 *  orchestrator's own hash (older jobs) so anchoring still has something to commit to. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
