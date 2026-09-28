import * as React from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800'
};

export function Alert({ variant = 'info', className = '', children, ...props }: AlertProps) {
  return (
    <div className={['rounded-lg border px-3.5 py-3 text-sm', variantClasses[variant], className].join(' ')} {...props}>
      {children}
    </div>
  );
}
