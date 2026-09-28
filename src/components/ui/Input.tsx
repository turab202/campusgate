import * as React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Input({
  label,
  helperText,
  error,
  className = '',
  id,
  ...props
}: InputProps) {
  const fieldId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={fieldId} className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
          {label}
        </label>
      ) : null}
      <input
        id={fieldId}
        className={[
          'h-12 w-full rounded-lg border bg-[var(--cg-surface)] px-3.5 text-sm text-[var(--cg-text)] outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--cg-primary)]/10',
          error ? 'border-[var(--cg-danger)] focus:border-[var(--cg-danger)]' : 'border-[var(--cg-border)] focus:border-[var(--cg-primary)]',
          className
        ].join(' ')}
        {...props}
      />
      {helperText ? <p className="text-xs leading-5 text-[var(--cg-text-muted)]">{helperText}</p> : null}
      {error ? <p className="text-xs text-[var(--cg-danger)]">{error}</p> : null}
    </div>
  );
}
