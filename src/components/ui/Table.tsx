import * as React from 'react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {}

export function Table({ className = '', children, ...props }: TableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)]">
      <table className={['w-full border-collapse text-left', className].join(' ')} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-[var(--cg-surface-muted)]">{children}</thead>;
}

export function TableRow({ children, className = '' }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={['border-t border-[var(--cg-border)]', className].join(' ')}>{children}</tr>;
}

export function TableCell({ children, className = '' }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={['px-4 py-3 text-sm text-[var(--cg-text)]', className].join(' ')}>{children}</td>;
}

export function TableHeaderCell({ children, className = '' }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={['px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]', className].join(' ')}>
      {children}
    </th>
  );
}
