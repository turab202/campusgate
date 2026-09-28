import * as React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border border-[var(--cg-primary)] bg-[var(--cg-primary)] text-white hover:bg-[var(--cg-primary-hover)] focus-visible:ring-[var(--cg-primary)]',
  secondary: 'border border-[var(--cg-border)] bg-[var(--cg-surface)] text-[var(--cg-text)] hover:bg-[var(--cg-surface-muted)] focus-visible:ring-[var(--cg-primary)]',
  danger: 'border border-[var(--cg-danger)] bg-[var(--cg-danger)] text-white hover:bg-[#991b1b] focus-visible:ring-[var(--cg-danger)]',
  ghost: 'border border-transparent bg-transparent text-[var(--cg-text)] hover:bg-[var(--cg-surface-muted)] focus-visible:ring-[var(--cg-primary)]'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-sm'
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className
      ].join(' ')}
      {...props}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
}
