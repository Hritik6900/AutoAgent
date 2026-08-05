import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const NotFound = () => (
  <section className="relative flex min-h-[70vh] items-center overflow-hidden pt-32">
    <div className="site-container relative text-center">
      <div className="mono text-[13px] font-semibold text-[var(--color-ink-4)]">404</div>
      <h1 className="mt-4 font-display text-[40px] font-extrabold tracking-tight sm:text-[52px]">
        Nothing to pay for here
      </h1>
      <p className="lede mx-auto mt-5 max-w-[440px]">
        That page does not exist. The agent checked, found no invoice, and moved on.
      </p>
      <Link to="/" className="btn-primary mt-8 px-7 py-3.5">
        <ArrowLeft className="h-4 w-4" />
        Back home
      </Link>
    </div>
  </section>
);
