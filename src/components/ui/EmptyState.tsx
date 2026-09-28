import * as React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--cg-border)] bg-[var(--cg-surface)] p-8 text-center">
      <h3 className="text-base font-semibold text-[var(--cg-text)]">{title}</h3>
      {description ? <p className="mt-2 text-sm text-[var(--cg-text-muted)]">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
