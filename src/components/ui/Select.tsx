import * as React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Select({ label, helperText, error, className = '', id, children, ...props }: SelectProps) {
  const fieldId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={fieldId} className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
          {label}
        </label>
      ) : null}
      <select
        id={fieldId}
        className={[
          'w-full rounded-lg border bg-[var(--cg-surface)] px-3.5 py-2.5 text-sm text-[var(--cg-text)] outline-none transition-colors',
          error ? 'border-[var(--cg-danger)] focus:border-[var(--cg-danger)]' : 'border-[var(--cg-border)] focus:border-[var(--cg-primary)]',
          className
        ].join(' ')}
        {...props}
      >
        {children}
      </select>
      {helperText ? <p className="text-xs leading-5 text-[var(--cg-text-muted)]">{helperText}</p> : null}
      {error ? <p className="text-xs text-[var(--cg-danger)]">{error}</p> : null}
    </div>
  );
}
