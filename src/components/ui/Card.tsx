import * as React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export function Card({ padded = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)]',
        padded ? 'p-5 sm:p-6' : '',
        className
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}
