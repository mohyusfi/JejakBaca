import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingElement?: ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  helperText,
  error,
  leadingIcon,
  trailingElement,
  id,
  className,
  containerClassName,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[var(--color-ink)]"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span
            className="pointer-events-none absolute left-3 flex items-center text-[var(--color-ink-subtle)]"
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cn(
            'min-h-[44px] sm:min-h-[40px] w-full rounded-[var(--radius-control)] border bg-[var(--color-surface)] px-3 py-2 text-base sm:text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] transition-colors duration-150',
            'focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20',
            'disabled:cursor-not-allowed disabled:bg-[var(--color-surface-subtle)] disabled:text-[var(--color-ink-subtle)]',
            error
              ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20'
              : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]',
            leadingIcon ? 'pl-9' : undefined,
            trailingElement ? 'pr-9' : undefined,
            className,
          )}
          {...props}
        />
        {trailingElement && (
          <span className="absolute right-2 flex items-center">{trailingElement}</span>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs font-medium text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-xs text-[var(--color-ink-muted)]">
          {helperText}
        </p>
      )}
    </div>
  );
}

export interface SearchInputProps extends Omit<InputProps, 'leadingIcon' | 'type'> {
  onClear?: () => void;
}

export function SearchInput({
  value,
  onClear,
  placeholder = 'Cari judul, penulis, atau ISBN...',
  ...props
}: SearchInputProps) {
  const hasValue = typeof value === 'string' ? value.length > 0 : Boolean(value);

  return (
    <Input
      type="search"
      value={value}
      placeholder={placeholder}
      leadingIcon={<Search className="h-4 w-4" />}
      trailingElement={
        hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Hapus kata kunci pencarian"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[var(--color-ink-subtle)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-ink)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : undefined
      }
      {...props}
    />
  );
}
