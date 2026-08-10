import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';

/* A Firebase *web* config is not a secret. It identifies the project and ships inside the
   JS bundle no matter where it is written down - Google documents it as public. What
   actually protects the data is Firestore Security Rules (see firestore.rules) plus the
   authorised-domains list in the Firebase console, and neither of those is helped by
   hiding these strings.

   Env vars are still read first so a second project (staging, a teammate's own) can be
   swapped in without touching code; the literals are the fallback so a fresh clone runs
   with no .env at all. */
const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? 'AIzaSyByh0L91c6YOHqcMZEFEtGAj0VKwjU6IYE',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? 'brainwave-auth-5688e.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? 'brainwave-auth-5688e',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? 'brainwave-auth-5688e.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '390198716534',
  appId: env.VITE_FIREBASE_APP_ID ?? '1:390198716534:web:44d2c211f2924541e5d757',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-H93TES5JCH',
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);

/* Firestore is deliberately *not* initialised here. This module is loaded on every page
   so the nav can tell whether anyone is signed in, and importing `firebase/firestore`
   here would drag ~300kB of it into that first load for visitors who never sign in.
   userStore.ts owns the Firestore handle instead, and is itself imported dynamically. */

export const googleProvider = new GoogleAuthProvider();
// Always show the chooser. Without it a returning user is silently signed into whichever
// Google account the browser last used, which is baffling on a shared machine.
googleProvider.setCustomParameters({ prompt: 'select_account' });

/* Analytics needs a browser with cookies and a measurementId, and throws rather than
   degrades where those are missing (some privacy modes, an ad blocker). It is telemetry,
   not a feature: imported dynamically so it stays out of the critical bundle, and its
   failure is swallowed because nothing else depends on it. */
void import('firebase/analytics')
  .then(async ({ getAnalytics, isSupported }) => {
    if (await isSupported()) getAnalytics(app);
  })
  .catch(() => {
    /* analytics unavailable - not a problem worth surfacing */
  });
