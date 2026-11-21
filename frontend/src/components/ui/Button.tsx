import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ButtonVariant =
  | 'circulation'
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'ghost-on-blue';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  circulation:
    'bg-[var(--color-danger)] text-white border border-transparent hover:bg-[var(--color-danger-hover)] active:bg-[#990000] disabled:bg-[#f3b3b3] disabled:text-white',
  primary:
    'bg-[var(--color-primary)] text-white border border-transparent hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:bg-[#99cce9] disabled:text-white',
  secondary:
    'bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-[var(--color-surface-subtle)] hover:border-[var(--color-border-strong)] disabled:text-[var(--color-ink-subtle)] disabled:bg-[var(--color-surface-subtle)]',
  ghost:
    'bg-transparent text-[var(--color-ink)] border border-transparent hover:bg-[var(--color-surface-subtle)] disabled:text-[var(--color-ink-subtle)]',
  'ghost-on-blue':
    'bg-white/10 text-white border border-white/25 hover:bg-white/20 active:bg-white/25 disabled:opacity-60',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] sm:min-h-[34px] px-3 py-1.5 text-xs font-semibold gap-1.5',
  md: 'min-h-[44px] sm:min-h-[40px] px-4 py-2 text-sm font-semibold gap-2',
  lg: 'min-h-[44px] px-5 py-2.5 text-sm font-semibold gap-2',
};

export function Button({
  ref,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--radius-control)] transition-colors duration-150 select-none whitespace-nowrap',
        'disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className="shrink-0" aria-hidden="true">{rightIcon}</span>
      )}
    </button>
  );
}
