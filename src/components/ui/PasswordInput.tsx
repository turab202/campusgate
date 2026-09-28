import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function PasswordInput({
  label,
  helperText,
  error,
  className = '',
  id,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);
  const fieldId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      {label ? (
        <label htmlFor={fieldId} className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          id={fieldId}
          type={showPassword ? 'text' : 'password'}
          className={[
            'h-12 w-full rounded-lg border bg-[var(--cg-surface)] px-3.5 pr-11 text-sm text-[var(--cg-text)] outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--cg-primary)]/10',
            error ? 'border-[var(--cg-danger)] focus:border-[var(--cg-danger)]' : 'border-[var(--cg-border)] focus:border-[var(--cg-primary)]',
            className
          ].join(' ')}
          {...props}
        />
        <button
          type="button"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-3 flex items-center text-[var(--cg-text-muted)] transition-colors hover:text-[var(--cg-text)]"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      {helperText ? <p className="text-xs leading-5 text-[var(--cg-text-muted)]">{helperText}</p> : null}
      {error ? <p className="text-xs text-[var(--cg-danger)]">{error}</p> : null}
    </div>
  );
}
