export const campusDesignTokens = {
  colors: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F5F9',
    primary: '#1E3A5F',
    primaryHover: '#17324F',
    text: '#0F172A',
    textMuted: '#64748B',
    border: '#E2E8F0',
    success: '#15803D',
    warning: '#B45309',
    danger: '#B91C1C',
    info: '#0369A1'
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem'
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem'
  },
  shadow: {
    soft: '0 10px 30px rgba(15, 23, 42, 0.06)',
    card: '0 12px 30px rgba(15, 23, 42, 0.08)'
  }
} as const;

export const typography = {
  pageTitle: 'text-3xl font-semibold tracking-[-0.04em] text-[var(--cg-text)] sm:text-4xl',
  sectionTitle: 'text-xl font-semibold tracking-[-0.02em] text-[var(--cg-text)]',
  cardTitle: 'text-base font-semibold tracking-[-0.01em] text-[var(--cg-text)]',
  body: 'text-sm leading-6 text-[var(--cg-text)]',
  bodyMuted: 'text-sm leading-6 text-[var(--cg-text-muted)]',
  label: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-muted)]',
  helperText: 'text-xs leading-5 text-[var(--cg-text-muted)]',
  tableText: 'text-sm text-[var(--cg-text)]',
  buttonText: 'text-sm font-semibold tracking-[0.01em]',
  statusText: 'text-[11px] font-semibold uppercase tracking-[0.12em]'
} as const;

export const layout = {
  pagePadding: 'px-4 sm:px-6 lg:px-8',
  sectionSpacing: 'space-y-6',
  formSpacing: 'space-y-4',
  cardPadding: 'p-5 sm:p-6',
  tablePadding: 'px-4 py-3',
  navSpacing: 'gap-3'
} as const;
