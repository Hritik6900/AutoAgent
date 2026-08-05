import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/* The shadcn original is written against --primary / --input / --ring / --background.
   This project already ships a full two-theme token system (--color-ink*, --color-paper*,
   --color-line*, --tone-*), so the variants are mapped onto those instead of adding a
   second, competing set of theme variables. Same API, same variant names - a component
   pasted from the registry keeps working, it just inherits this app's palette. */
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-ink)] text-[var(--color-paper)] hover:bg-[var(--color-ink-hover)]',
        destructive:
          'bg-[var(--tone-danger-text)] text-white hover:opacity-90',
        outline:
          'border border-[var(--color-line)] bg-[var(--card-bg)] text-[var(--color-ink-2)] hover:border-[var(--color-line-2)] hover:text-[var(--color-ink)]',
        secondary:
          'bg-[var(--color-paper-3)] text-[var(--color-ink)] hover:bg-[var(--color-line)]',
        ghost:
          'text-[var(--color-ink-3)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]',
        link: 'text-[var(--color-brand)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
