import { AmbientBackdrop } from '../site/components/AmbientBackdrop';
import { Header } from '../components/Header';
import { HeroConsole } from '../components/HeroConsole';
import { LiveMissionControl } from '../components/LiveMissionControl';
import { FinalReport } from '../components/FinalReport';

/** The working tool. Shares the site's light chrome and card system; the genuinely
 *  machine-facing surfaces (the agent's reasoning stream) stay as dark cockpit panels,
 *  the same treatment the marketing pages give live data. */
export const ConsolePage = () => (
  /* No background on this wrapper: `body` already paints --color-paper, and a background
     here would be a non-positioned block descendant, which paints *over* the fixed
     -z-10 layers (AmbientBackdrop) and hides them entirely.
     SiteLayout leaves it off for the same reason. */
  <div className="flex min-h-screen flex-col">
    <AmbientBackdrop />
    <Header />
    <main className="flex-1">
      <HeroConsole />
      <LiveMissionControl />
      <FinalReport />
    </main>
  </div>
);
