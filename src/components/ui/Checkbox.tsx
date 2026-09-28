import * as React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--cg-text)]">
      <input
        type="checkbox"
        className={['h-4 w-4 rounded border-[var(--cg-border)] text-[var(--cg-primary)] accent-[var(--cg-primary)] focus:ring-[var(--cg-primary)]', className].join(' ')}
        {...props}
      />
      {label ? <span>{label}</span> : null}
    </label>
  );
}
