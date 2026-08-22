import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { app } from './firebase';

/* The Firestore handle lives here rather than in firebase.ts so that `firebase/firestore`
   is only ever pulled in by this module - which is imported dynamically, and so only by
   users who actually sign in. */
export const db = getFirestore(app);

/**
 * Firestore shapes.
 *
 * Firestore is schemaless, so adding a field later is free - the cost is on *read*, where
 * every document written before that field existed comes back without it. So the whole
 * default shape is written once at signup and every optional field has a defined default,
 * which keeps callers from having to guard each access forever.
 *
 * Layout:
 *
 *   users/{uid}                       profile, preferences, plan, usage rollups
 *   users/{uid}/jobs/{jobId}          saved research jobs, with their report and receipts
 *   users/{uid}/factChecks/{autoId}   single-claim checks from the console or extension
 *
 * The subcollections are not decoration: the orchestrator keeps job state in memory and
 * loses it on restart (only the payment ledger is durable). Anything saved here is the
 * only copy of a finished report that survives.
 */

export type Provider = 'password' | 'google.com';

export interface UserProfile {
  fullName: string;
  organization: string;
  role: string;
  bio: string;
  country: string;
  timezone: string;
  website: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultBudgetUsdc: number;
  defaultReportTier: 'auto' | 'premium' | 'cheap';
  /** Whether finished jobs are written to users/{uid}/jobs at all. */
  autoSaveJobs: boolean;
  emailNotifications: boolean;
}

export interface UserAutoResearch {
  orchestratorUrl: string;
  /** Only the displayable prefix, never the key itself - see saveApiKeyPrefix(). */
  apiKeyPrefix: string;
  mcpEnabled: boolean;
  extensionInstalled: boolean;
}

/** The user's own Algorand TestNet account.
 *
 *  Only the public address is ever stored. The key that controls it is generated in the
 *  browser and stays in localStorage (see `lib/algorand.ts`) - writing it here would hand
 *  custody to whoever can read the database, which is exactly what the non-custodial
 *  design exists to avoid. This record is a convenience so the address is recognisable
 *  across sessions, not a backup: clearing site data loses the account. */
export interface UserWallet {
  algorandAddress: string;
  network: string;
  /** Whether the demo faucet has topped this account up at least once. */
  funded: boolean;
  linkedAt: Timestamp | null;
}

export interface UserUsage {
  jobCount: number;
  factCheckCount: number;
  totalSpentUsdc: number;
  lastActiveAt: Timestamp | null;
}

export interface UserPlan {
  tier: 'free' | 'pro' | 'team';
  dailyCapUsdc: number;
  maxJobBudgetUsdc: number;
}

export interface UserDoc {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
  providers: Provider[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastLoginAt: Timestamp | null;
  onboarded: boolean;
  disabled: boolean;
  profile: UserProfile;
  preferences: UserPreferences;
  autoresearch: UserAutoResearch;
  /** Optional: absent on documents created before wallets existed, so every read of this
   *  field has to tolerate undefined rather than assume the shape. */
  wallet?: UserWallet;
  usage: UserUsage;
  plan: UserPlan;
}

export interface SavedSettlement {
  taskType: string;
  amountUsdc: number;
  tier: string | null;
  txHash: string | null;
  explorerUrl: string | null;
}

export interface SavedJob {
  jobId: string;
  query: string;
  status: string;
  source: 'console' | 'mcp' | 'extension';
  budgetCapUsdc: number;
  totalSpentUsdc: number;
  reportMarkdown: string;
  trustScore: number | null;
  weakClaimsCount: number | null;
  citationCount: number;
  citations: Array<{
    claim: string;
    sourceService: string;
    sourceUrl: string | null;
    costUsdc: number | null;
    txHash: string | null;
    reviewConfidence: string | null;
  }>;
  settlements: SavedSettlement[];
  provenance: { reportHash: string | null; txHash: string | null; explorerUrl: string | null };
  createdAt: Timestamp | null;
}

export interface SavedFactCheck {
  claim: string;
  verdict: string;
  confidence: number | null;
  explanation: string | null;
  evidenceUrl: string | null;
  method: string | null;
  costUsdc: number;
  txHash: string | null;
  explorerUrl: string | null;
  pageUrl: string | null;
  source: 'console' | 'extension';
  createdAt: Timestamp | null;
}

/* ------------------------------------------------------------------ defaults */

const defaultProfile = (displayName: string): UserProfile => ({
  fullName: displayName,
  organization: '',
  role: '',
  bio: '',
  country: '',
  // Best-effort guess from the browser; the user can correct it on the account page.
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  website: '',
});

const defaultPreferences = (): UserPreferences => ({
  theme: 'system',
  defaultBudgetUsdc: 0.05,
  defaultReportTier: 'auto',
  autoSaveJobs: true,
  emailNotifications: false,
});

const defaultAutoResearch = (): UserAutoResearch => ({
  orchestratorUrl: 'http://localhost:4000',
  apiKeyPrefix: '',
  mcpEnabled: false,
  extensionInstalled: false,
});

const defaultUsage = (): UserUsage => ({
  jobCount: 0,
  factCheckCount: 0,
  totalSpentUsdc: 0,
  lastActiveAt: null,
});

/* Mirrors the orchestrator's anonymous defaults (see shared/api_keys.py). These are a
   display copy for the account page - the real limits are enforced server-side and this
   document cannot raise them. */
const defaultPlan = (): UserPlan => ({
  tier: 'free',
  dailyCapUsdc: 1.0,
  maxJobBudgetUsdc: 0.3,
});

/* ------------------------------------------------------------------ paths */

export const userRef = (uid: string) => doc(db, 'users', uid);
export const jobsRef = (uid: string) => collection(db, 'users', uid, 'jobs');
export const factChecksRef = (uid: string) => collection(db, 'users', uid, 'factChecks');

/* ------------------------------------------------------------------ operations */

/**
 * The Firestore SDK treats an unreachable backend as "offline" and retries forever rather
 * than rejecting - correct for a flaky phone network, wrong for a UI that has to tell the
 * user something. Most often here it means Cloud Firestore was never enabled for the
 * project, in which case waiting is pointless: nothing will ever arrive.
 *
 * Reads are wrapped so a caller always gets an answer. Writes are not: a queued write
 * really will land when the connection returns, and rejecting it would throw away work
 * the user did.
 */
const READ_TIMEOUT_MS = 8000;

class FirestoreUnreachable extends Error {
  constructor() {
    super(
      'Cloud Firestore did not respond. If this is a new Firebase project, create the ' +
        'Firestore database in the console and deploy firestore.rules.',
    );
    this.name = 'FirestoreUnreachable';
  }
}

function withTimeout<T>(p: Promise<T>, ms = READ_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new FirestoreUnreachable()), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Creates the profile on first sign-in, or refreshes the auth-derived fields on every
 * later one. Deliberately does *not* overwrite `profile` or `preferences` on return
 * visits: those belong to the user, and Google would otherwise reset their display name
 * to whatever their Google account says on every login.
 */
export async function ensureUserDoc(user: User): Promise<UserDoc> {
  const ref = userRef(user.uid);
  const snap = await withTimeout(getDoc(ref));

  const providers = user.providerData.map((p) => p.providerId as Provider);
  const identity = {
    uid: user.uid,
    email: user.email ?? '',
    emailVerified: user.emailVerified,
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    providers,
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    const fresh = {
      ...identity,
      createdAt: serverTimestamp(),
      onboarded: false,
      disabled: false,
      profile: defaultProfile(user.displayName ?? ''),
      preferences: defaultPreferences(),
      autoresearch: defaultAutoResearch(),
      usage: defaultUsage(),
      plan: defaultPlan(),
    };
    await setDoc(ref, fresh);
    return (await getDoc(ref)).data() as UserDoc;
  }

  await updateDoc(ref, identity);
  return { ...(snap.data() as UserDoc), ...identity } as UserDoc;
}

export function watchUserDoc(uid: string, onChange: (doc: UserDoc | null) => void): Unsubscribe {
  return onSnapshot(
    userRef(uid),
    (snap) => onChange(snap.exists() ? (snap.data() as UserDoc) : null),
    () => onChange(null),
  );
}

export async function updateProfile(uid: string, patch: Partial<UserProfile>): Promise<void> {
  const flat: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(patch)) flat[`profile.${k}`] = v;
  await updateDoc(userRef(uid), flat);
}

export async function updatePreferences(uid: string, patch: Partial<UserPreferences>): Promise<void> {
  const flat: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(patch)) flat[`preferences.${k}`] = v;
  await updateDoc(userRef(uid), flat);
}

export async function updateAutoResearch(uid: string, patch: Partial<UserAutoResearch>): Promise<void> {
  const flat: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [k, v] of Object.entries(patch)) flat[`autoresearch.${k}`] = v;
  await updateDoc(userRef(uid), flat);
}

/** Record the *public* address of the user's browser-held Algorand account.
 *
 *  Never called with a key or mnemonic - see UserWallet. Callers treat a rejection here
 *  as cosmetic: the wallet lives in localStorage and works whether or not this write
 *  lands, so a locked-down or undeployed Firestore must not break signing.
 */
export async function linkWallet(uid: string, wallet: {
  algorandAddress: string;
  network: string;
  funded: boolean;
}): Promise<void> {
  await updateDoc(userRef(uid), {
    'wallet.algorandAddress': wallet.algorandAddress,
    'wallet.network': wallet.network,
    'wallet.funded': wallet.funded,
    'wallet.linkedAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function markOnboarded(uid: string): Promise<void> {
  await updateDoc(userRef(uid), { onboarded: true, updatedAt: serverTimestamp() });
}

/**
 * Records only the *prefix* of an AutoResearch key.
 *
 * The key itself is a spending credential - anyone holding it can bill the orchestrator's
 * wallet - and this database is written from the browser, so a copy here would be one XSS
 * away from being exfiltrated. The prefix is enough to show which key is in use and to
 * revoke it from the CLI; the key itself stays in localStorage on the machine that uses it.
 */
export async function saveApiKeyPrefix(uid: string, rawKey: string): Promise<void> {
  const prefix = rawKey.trim().slice(0, 14);
  await updateAutoResearch(uid, { apiKeyPrefix: prefix });
}

export async function saveJob(uid: string, job: Omit<SavedJob, 'createdAt'>): Promise<void> {
  await setDoc(doc(jobsRef(uid), job.jobId), { ...job, createdAt: serverTimestamp() });
  await updateDoc(userRef(uid), {
    'usage.jobCount': increment(1),
    'usage.totalSpentUsdc': increment(job.totalSpentUsdc),
    'usage.lastActiveAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function saveFactCheck(uid: string, fc: Omit<SavedFactCheck, 'createdAt'>): Promise<void> {
  await setDoc(doc(factChecksRef(uid)), { ...fc, createdAt: serverTimestamp() });
  await updateDoc(userRef(uid), {
    'usage.factCheckCount': increment(1),
    'usage.totalSpentUsdc': increment(fc.costUsdc),
    'usage.lastActiveAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listJobs(uid: string, max = 20): Promise<SavedJob[]> {
  const snap = await withTimeout(
    getDocs(query(jobsRef(uid), orderBy('createdAt', 'desc'), fsLimit(max))),
  );
  return snap.docs.map((d) => d.data() as SavedJob);
}

export async function listFactChecks(uid: string, max = 20): Promise<SavedFactCheck[]> {
  const snap = await withTimeout(
    getDocs(query(factChecksRef(uid), orderBy('createdAt', 'desc'), fsLimit(max))),
  );
  return snap.docs.map((d) => d.data() as SavedFactCheck);
}
