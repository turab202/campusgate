import * as React from 'react';

interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function FormField({ label, helperText, error, children, className = '', ...props }: FormFieldProps) {
  return (
    <div className={['space-y-2', className].join(' ')} {...props}>
      {label ? (
        <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
          {label}
        </label>
      ) : null}
      {children}
      {helperText ? <p className="text-xs leading-5 text-[var(--cg-text-muted)]">{helperText}</p> : null}
      {error ? <p className="text-xs text-[var(--cg-danger)]">{error}</p> : null}
    </div>
  );
}
