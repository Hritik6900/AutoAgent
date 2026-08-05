import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AgentProvider } from './context/AgentContext';
import { SiteLayout } from './site/SiteLayout';
import { Home } from './site/pages/Home';
import { HowItWorks } from './site/pages/HowItWorks';
import { Features } from './site/pages/Features';
import { Developers } from './site/pages/Developers';
import { About } from './site/pages/About';
import { NotFound } from './site/pages/NotFound';

// The console pulls in the markdown renderer and the whole mission-control tree, none
// of which a visitor landing on the marketing pages needs. Split it into its own chunk.
const ConsolePage = lazy(() =>
  import('./pages/ConsolePage').then((m) => ({ default: m.ConsolePage })),
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
    <AgentProvider>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/features" element={<Features />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          path="/console"
          element={
            <Suspense fallback={<ConsoleFallback />}>
              <ConsolePage />
            </Suspense>
          }
        />
      </Routes>
    </AgentProvider>
  );
}

export default App;
