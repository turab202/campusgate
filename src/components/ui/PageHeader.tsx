import * as React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--cg-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]">{eyebrow}</p> : null}
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--cg-text)]">{title}</h1>
        {description ? <p className="text-sm leading-6 text-[var(--cg-text-muted)]">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
