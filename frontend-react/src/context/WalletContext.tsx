/**
 * Owns the user's Algorand account for the whole app: creating it, getting it its first
 * TestNet ALGO, and keeping its balance fresh.
 *
 * Two properties drove the design, both of them demo-critical:
 *
 *  1. **It never blocks on Firebase.** A signed-out visitor gets a device-scoped wallet
 *     and every capability a signed-in one has - funding, signing, anchoring. Auth
 *     upgrades the experience (the wallet follows the account across devices' worth of
 *     sessions, and the address is recorded on the profile) but is never a prerequisite,
 *     so a misconfigured Firebase project cannot take the Algorand demo down with it.
 *
 *  2. **Provisioning is automatic and visible.** Signing in should end with a funded,
 *     ready-to-sign account without the user touching a dispenser. `phase` exists so the
 *     UI can narrate that ("creating… → funding… → ready") rather than showing a spinner
 *     over a blank card.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import type { AlgoWallet } from '../lib/algorand';

/* algosdk is ~200kB and this provider mounts on every route, including the marketing
   pages. Loading it statically would put all of it in the entry bundle for the sake of a
   feature nothing above the fold uses, so it is pulled in when provisioning actually
   runs - after first paint, in its own chunk. Same reasoning as AuthContext's deferred
   Firestore import; the type import above is erased at compile time and costs nothing. */
const loadAlgo = () => import('../lib/algorand');

/** Which identity a wallet belongs to. Inlined rather than imported so the effect below
 *  can run without pulling in the algosdk chunk just to read a uid. */
const walletScope = (uid?: string | null) => uid || 'device';

/** Where provisioning has got to. `error` never means "unusable": the wallet still
 *  exists and can sign as soon as it has a balance - only the automatic top-up failed. */
export type WalletPhase = 'idle' | 'creating' | 'funding' | 'ready' | 'error';

interface WalletValue {
  wallet: AlgoWallet | null;
  address: string | null;
  balanceAlgo: number;
  phase: WalletPhase;
  /** Set when auto-funding failed. The wallet is still usable; this explains the gap. */
  error: string | null;
  /** True while a manual refresh or top-up is in flight, for button spinners. */
  busy: boolean;
  refresh: () => Promise<void>;
  fund: () => Promise<void>;
  /** Whether this wallet is tied to a signed-in account or to this browser only. */
  scope: 'account' | 'device';
}

const WalletContext = createContext<WalletValue | null>(null);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();

  const [wallet, setWallet] = useState<AlgoWallet | null>(null);
  const [balanceAlgo, setBalanceAlgo] = useState(0);
  const [phase, setPhase] = useState<WalletPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Which identity the mounted wallet belongs to, so the effect below can tell a real
  // identity change (sign in/out) from a re-render.
  const activeScope = useRef<string | null>(null);
  // Guards against a second provisioning run for the same wallet - React 18 mounts
  // effects twice in StrictMode, and two concurrent funding calls would race.
  const provisioned = useRef<Set<string>>(new Set());

  const readBalance = useCallback(async (address: string) => {
    try {
      const { getAccountInfo } = await loadAlgo();
      const info = await getAccountInfo(address);
      setBalanceAlgo(info.balanceAlgo);
      return info.balanceAlgo;
    } catch {
      // A node blip must not flip a working wallet into an error state - the last known
      // balance stays on screen rather than dropping to a misleading zero.
      return null;
    }
  }, []);

  /** Create-if-missing, then top up if empty. Idempotent per scope. */
  const provision = useCallback(
    async (scope: string) => {
      if (provisioned.current.has(scope)) return;
      provisioned.current.add(scope);

      setError(null);
      const { loadWallet, adoptWallet, createWallet, requestFunding } = await loadAlgo();

      // On first sign-in, carry over the wallet this browser was already using so the
      // ALGO it was just funded with isn't stranded on an account we then abandon.
      let w = loadWallet(scope) ?? (scope !== 'device' ? adoptWallet('device', scope) : null);

      if (!w) {
        setPhase('creating');
        w = createWallet(scope);
      }
      setWallet(w);

      const balance = await readBalance(w.address);

      if (balance !== null && balance > 0) {
        setPhase('ready');
      } else {
        setPhase('funding');
        try {
          const result = await requestFunding(w.address);
          setBalanceAlgo(result.balanceAlgo);
          setPhase('ready');
        } catch (err) {
          // Faucet empty, orchestrator down, or no faucet configured. The wallet is fine;
          // the UI offers the public dispenser as the manual path.
          setError(err instanceof Error ? err.message : 'Could not reach the demo faucet.');
          setPhase('error');
        }
      }

      // Best-effort, deliberately not awaited and never able to fail the flow: the
      // wallet's real home is localStorage. This write only makes the address visible on
      // the profile, and Firestore may not even be provisioned.
      const uid = scope !== 'device' ? scope : null;
      if (uid && w) {
        const address = w.address;
        void import('../lib/userStore')
          .then((store) =>
            store.linkWallet(uid, { algorandAddress: address, network: 'testnet', funded: true }),
          )
          .catch((e) => console.warn('[wallet] address not recorded on profile', e));
      }
    },
    [readBalance],
  );

  useEffect(() => {
    // Waiting for auth to resolve avoids provisioning a device wallet for a split second
    // and then immediately switching to the account one on a page refresh while signed in.
    if (authLoading) return;

    const scope = walletScope(user?.uid);
    if (activeScope.current === scope) return;
    activeScope.current = scope;

    setWallet(null);
    setBalanceAlgo(0);
    setPhase('idle');
    void provision(scope);
  }, [user, authLoading, provision]);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    setBusy(true);
    try {
      await readBalance(wallet.address);
    } finally {
      setBusy(false);
    }
  }, [wallet, readBalance]);

  const fund = useCallback(async () => {
    if (!wallet) return;
    setBusy(true);
    setError(null);
    try {
      const { requestFunding } = await loadAlgo();
      const result = await requestFunding(wallet.address);
      setBalanceAlgo(result.balanceAlgo);
      setPhase('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Funding failed.');
    } finally {
      setBusy(false);
    }
  }, [wallet]);

  const value = useMemo<WalletValue>(
    () => ({
      wallet,
      address: wallet?.address ?? null,
      balanceAlgo,
      phase,
      error,
      busy,
      refresh,
      fund,
      scope: user ? 'account' : 'device',
    }),
    [wallet, balanceAlgo, phase, error, busy, refresh, fund, user],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export function useWallet(): WalletValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
