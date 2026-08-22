import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AgentProvider } from './context/AgentContext';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { SiteLayout } from './site/SiteLayout';
import { Home } from './site/pages/Home';
import { HowItWorks } from './site/pages/HowItWorks';
import { Features } from './site/pages/Features';
import { Mcp } from './site/pages/Mcp';
import { Developers } from './site/pages/Developers';
import { About } from './site/pages/About';
import { SignIn } from './site/pages/SignIn';
import { NotFound } from './site/pages/NotFound';
import { RequireAuth } from './site/components/RequireAuth';

// The console pulls in the markdown renderer and the whole mission-control tree, none
// of which a visitor landing on the marketing pages needs. Split it into its own chunk.
const ConsolePage = lazy(() =>
  import('./pages/ConsolePage').then((m) => ({ default: m.ConsolePage })),
);

// Reads and writes Firestore, so it pulls in that whole SDK. Only a signed-in user ever
// opens it - keep it out of everyone else's first load.
const Account = lazy(() =>
  import('./site/pages/Account').then((m) => ({ default: m.Account })),
);

// Pulls in algosdk to render key material and sign, which nobody reading the marketing
// pages needs in their first load.
const WalletPage = lazy(() =>
  import('./site/pages/Wallet').then((m) => ({ default: m.WalletPage })),
);

const ConsoleFallback = () => (
  <div className="console-root flex min-h-screen items-center justify-center bg-[var(--color-obs-bg)]">
    <div className="flex items-center gap-2.5 text-[13px] text-[var(--color-obs-text-muted)]">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-obs-green-primary)]" />
      Booting console…
    </div>
  </div>
);

function App() {
  return (
    // Auth wraps everything, including the console: signing in is optional, but the
    // console still needs to know who you are to save a finished report to your account.
    <AuthProvider>
      {/* Inside auth (it keys the wallet to the signed-in uid) but outside everything
          else, so the account is provisioned once on load rather than when some
          particular page mounts - by the time anyone opens /wallet or finishes a
          report, it is already funded and ready to sign. */}
      <WalletProvider>
        <AgentProvider>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/features" element={<Features />} />
              <Route path="/mcp" element={<Mcp />} />
              <Route path="/developers" element={<Developers />} />
              <Route path="/about" element={<About />} />
              <Route path="/signin" element={<SignIn />} />
              <Route
                path="/account"
                element={
                  <Suspense fallback={<div className="min-h-[60vh]" />}>
                    <Account />
                  </Suspense>
                }
              />
              <Route
                path="/wallet"
                element={
                  <Suspense fallback={<div className="min-h-[60vh]" />}>
                    <WalletPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
            {/* Signed-in only. The console spends real testnet USDC from the deployment's
                wallet and signs with the visitor's own Algorand key, so it is the one
                route that should know who is driving. Anyone signed out is sent to
                /signin and returned straight here afterwards. */}
            <Route
              path="/console"
              element={
                <RequireAuth>
                  <Suspense fallback={<ConsoleFallback />}>
                    <ConsolePage />
                  </Suspense>
                </RequireAuth>
              }
            />
          </Routes>
        </AgentProvider>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
