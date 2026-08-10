import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile as fbUpdateAuthProfile,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import type { UserDoc } from '../lib/userStore';

/* Firestore is ~300kB and only a signed-in user ever touches it, so it is imported at the
   moment of sign-in rather than at module load. A visitor reading the marketing pages -
   which is most of them - never pays for it. The type import above is erased at compile
   time and costs nothing. */
const loadStore = () => import('../lib/userStore');

interface AuthValue {
  /** The Firebase auth user, or null when signed out. */
  user: User | null;
  /** The Firestore profile. Null while loading, or if the profile read failed. */
  profile: UserDoc | null;
  /** True until the first auth state resolves - not the same as "signed out". */
  loading: boolean;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Firebase error codes are not sentences. Map the ones a user can actually hit; anything
 *  unmapped falls through to the raw message rather than a vague "something went wrong",
 *  which would hide real bugs during development. */
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account exists for that email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account already exists for that email. Try signing in.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/popup-closed-by-user': 'The Google sign-in window was closed before finishing.',
  'auth/cancelled-popup-request': 'Another sign-in window is already open.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and try again.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network error reaching Firebase. Check your connection.',
  'auth/operation-not-allowed':
    'That sign-in method is not enabled for this Firebase project.',
  'auth/unauthorized-domain':
    'This domain is not in the Firebase authorised-domains list. Add it under Authentication → Settings.',
};

export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  const msg = (err as { message?: string })?.message;
  return msg || 'Sign-in failed.';
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const unwatchProfile = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      unwatchProfile.current?.();
      unwatchProfile.current = null;

      if (!u) {
        setProfile(null);
        return;
      }

      /* Sign-in must not fail because Firestore did. A missing profile means the account
         page shows less, while a thrown error here would leave the user unable to get
         past the login screen at all - much worse, and the most likely cause is simply
         that firestore.rules hasn't been deployed yet. */
      try {
        const store = await loadStore();
        await store.ensureUserDoc(u);
        unwatchProfile.current = store.watchUserDoc(u.uid, setProfile);
      } catch (err) {
        console.warn('[auth] profile unavailable (are firestore.rules deployed?)', err);
        setProfile(null);
      }
    });

    return () => {
      unsub();
      unwatchProfile.current?.();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      profile,
      loading,

      async signUpWithEmail(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const name = displayName.trim();
        if (name) await fbUpdateAuthProfile(cred.user, { displayName: name });

        /* Firestore is deliberately not awaited. The account already exists at this
           point - the user is signed in - so letting a slow or blocked database write
           hold the button on a spinner would strand them on a login screen they have
           already passed. (Exactly that happened when the Firestore database had not
           been provisioned yet: auth succeeded, the write never resolved.)

           The auth listener creates the profile too, so this is not the only chance;
           it re-asserts the name afterwards in case the listener won the race and
           created the document before displayName was set. */
        void loadStore()
          .then(async (store) => {
            await store.ensureUserDoc(cred.user);
            if (name) await store.updateProfile(cred.user.uid, { fullName: name });
          })
          .catch((err) => console.warn('[auth] profile write failed after signup', err));
      },

      async signInWithEmail(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },

      async signInWithGoogle() {
        await signInWithPopup(auth, googleProvider);
      },

      async resetPassword(email) {
        await sendPasswordResetEmail(auth, email);
      },

      async signOut() {
        await fbSignOut(auth);
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
