export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface)] p-8">
      <div className="flex items-center gap-3 text-sm text-[var(--cg-text-muted)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cg-border)] border-t-[var(--cg-primary)]" />
        <span>{label}</span>
      </div>
    </div>
  );
}
