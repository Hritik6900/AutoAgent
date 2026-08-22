/**
 * The nav's live wallet indicator.
 *
 * It is present for signed-out visitors too, because the wallet genuinely is: the account
 * is generated and funded per browser, and signing in only re-keys it to the user. Hiding
 * it behind auth would misrepresent what the feature needs.
 *
 * It narrates provisioning rather than hiding it. "Creating…" then "Funding…" then a
 * balance is the clearest possible statement of what just happened on the user's behalf —
 * an account appeared and was given TestNet ALGO, without them touching a dispenser.
 */
import { Link } from 'react-router-dom';
import { Loader2, Wallet } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { cn } from '../../utils/cn';

export const WalletPill = ({ className }: { className?: string }) => {
  const { phase, balanceAlgo, address } = useWallet();

  const pending = phase === 'idle' || phase === 'creating' || phase === 'funding';
  const label =
    phase === 'creating'
      ? 'Creating…'
      : phase === 'funding'
        ? 'Funding…'
        : phase === 'idle'
          ? 'Wallet…'
          : `${balanceAlgo.toFixed(2)} ALGO`;

  return (
    <Link
      to="/wallet"
      title={address ? `Algorand TestNet · ${address}` : 'Algorand TestNet wallet'}
      className={cn(
        'group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-semibold transition-all duration-200',
        phase === 'error'
          ? 'border-[var(--tone-warn-border)] bg-[var(--tone-warn-bg)] text-[var(--tone-warn-text)]'
          : 'border-[var(--color-line)] bg-[var(--color-paper-2)] text-[var(--color-ink-2)] hover:border-[var(--color-line-2)] hover:text-[var(--color-ink)]',
        className,
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--tone-amber-text)]" />
      ) : (
        <Wallet className="h-3.5 w-3.5 text-[var(--tone-amber-text)]" />
      )}
      <span className={cn(!pending && 'mono')}>{label}</span>
    </Link>
  );
};
