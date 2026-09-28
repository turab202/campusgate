import * as React from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, description, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-xl rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] shadow-[var(--cg-shadow-card)]">
        {(title || description) && (
          <div className="border-b border-[var(--cg-border)] px-5 py-4">
            {title ? <h3 className="text-lg font-semibold text-[var(--cg-text)]">{title}</h3> : null}
            {description ? <p className="mt-1 text-sm text-[var(--cg-text-muted)]">{description}</p> : null}
          </div>
        )}
        <div className="p-5">{children}</div>
        {onClose ? (
          <div className="border-t border-[var(--cg-border)] px-5 py-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-[var(--cg-border)] px-3 py-2 text-sm font-medium text-[var(--cg-text)] hover:bg-[var(--cg-surface-muted)]">
              Close
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
