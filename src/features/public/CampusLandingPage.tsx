import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  ClipboardCheck,
  FileClock,
  Fingerprint,
  Laptop,
  MapPinned,
  QrCode,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';

const workflowSteps = [
  {
    number: '01',
    title: 'Register once',
    description:
      'A Gate Officer records a device and links its unique asset record to its owner.',
    icon: Laptop,
  },
  {
    number: '02',
    title: 'Verify at the gate',
    description:
      'QR or asset ID lookup helps officers identify a device before recording a movement.',
    icon: ScanLine,
  },
  {
    number: '03',
    title: 'Keep a movement history',
    description:
      'Check-in and check-out events are recorded with the assigned gate, officer, and time.',
    icon: FileClock,
  },
  {
    number: '04',
    title: 'Respond with context',
    description:
      'Lost-device reports, incidents, and belongings clearances follow role-based workflows.',
    icon: ShieldAlert,
  },
];

const capabilities = [
  {
    title: 'Device records',
    description: 'Register assets, associate owners, and track current campus status.',
    icon: Laptop,
  },
  {
    title: 'QR identification',
    description: 'Look up registered devices at the gate by QR code or asset ID.',
    icon: QrCode,
  },
  {
    title: 'Gate coordination',
    description: 'Connect officer assignments and recorded activity to the active gate.',
    icon: MapPinned,
  },
  {
    title: 'Movement history',
    description: 'Review device check-in and check-out events in a traceable timeline.',
    icon: FileClock,
  },
  {
    title: 'Incidents and recovery',
    description: 'Report lost devices, record security incidents, and manage recovery.',
    icon: ShieldAlert,
  },
  {
    title: 'Belongings clearance',
    description: 'A dedicated Student → Proctor → Gate Officer workflow for approved belongings exits.',
    icon: ClipboardCheck,
  },
  {
    title: 'Audit and oversight',
    description: 'Keep operational actions attributable to authenticated campus roles.',
    icon: Fingerprint,
  },
  {
    title: 'Role-based workspaces',
    description: 'Give students, Gate Officers, Proctors, and Admins focused tools.',
    icon: UsersRound,
  },
];

const roles = [
  {
    name: 'Students',
    description:
      'View registered devices and movement history, report a lost device, and submit belongings exit-clearance requests.',
    icon: UserRound,
  },
  {
    name: 'Gate Officers',
    description:
      'Register and verify devices, record gate movements, review visitors, scan clearance passes, and log incidents.',
    icon: ScanLine,
  },
  {
    name: 'Proctors',
    description:
      'Review and decide student belongings exit-clearance requests across departments.',
    icon: ClipboardCheck,
  },
  {
    name: 'Admins',
    description:
      'Manage accounts and gate operations, review incidents and audit activity, and oversee clearances.',
    icon: ShieldCheck,
  },
];

const technologies = [
  'Next.js',
  'React',
  'TypeScript',
  'Tailwind CSS',
  'FastAPI',
  'SQLAlchemy',
  'PostgreSQL',
  'Alembic',
];

function Wordmark() {
  return (
    <Link href="/" aria-label="CampusGate home" className="inline-flex min-w-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--cg-primary)] text-white shadow-[var(--cg-shadow-xs)]">
        <ShieldCheck aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-4 tracking-tight text-[var(--cg-text)]">
          CampusGate
        </span>
        <span className="mt-0.5 hidden text-[9px] font-semibold uppercase leading-3 tracking-[0.1em] text-[var(--cg-text-muted)] sm:block">
          University Access &amp; Security Management
        </span>
      </span>
    </Link>
  );
}

export function CampusLandingPage() {
  return (
    <div className="overflow-hidden bg-[var(--cg-surface)] text-[var(--cg-text)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[var(--cg-primary)] focus:shadow-[var(--cg-shadow-card)]"
      >
        Skip to content
      </a>
      <header className="border-b border-[var(--cg-border)] bg-[var(--cg-surface)]">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:gap-5 sm:px-6 lg:px-8">
          <Wordmark />
          <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
            <a className="text-sm font-medium text-[var(--cg-text-muted)] transition-colors hover:text-[var(--cg-primary)]" href="#platform">Platform</a>
            <a className="text-sm font-medium text-[var(--cg-text-muted)] transition-colors hover:text-[var(--cg-primary)]" href="#how-it-works">How it works</a>
            <a className="text-sm font-medium text-[var(--cg-text-muted)] transition-colors hover:text-[var(--cg-primary)]" href="#belongings-clearance">Belongings clearance</a>
            <a className="text-sm font-medium text-[var(--cg-text-muted)] transition-colors hover:text-[var(--cg-primary)]" href="#roles">User roles</a>
          </nav>
          <Link
            href="/login"
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--cg-primary)] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--cg-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cg-primary)] sm:h-10 sm:px-4 sm:text-sm"
          >
            Sign in <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main id="main-content">
        <section className="relative border-b border-[var(--cg-border)] bg-[var(--cg-surface-muted)]">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.92fr] lg:gap-16 lg:py-24">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-[var(--cg-border)] bg-white px-3 py-1.5 text-xs font-semibold tracking-[0.02em] text-[var(--cg-primary)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--cg-success)]" />
                University access and security operations
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-[-0.055em] text-[var(--cg-text)] sm:text-5xl lg:text-[3.65rem]">
                Campus operations,
                <span className="block text-[var(--cg-primary)]">accounted for.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[var(--cg-text-muted)] sm:text-lg sm:leading-8">
                CampusGate brings device records, gate movements, and security workflows
                into one clear, auditable system built for university communities.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#platform"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--cg-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--cg-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cg-primary)]"
                >
                  Explore features <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </a>
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--cg-border-strong)] bg-white px-5 text-sm font-semibold text-[var(--cg-text)] transition-colors hover:border-[var(--cg-primary)] hover:text-[var(--cg-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cg-primary)]"
                >
                  Sign in to CampusGate <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--cg-border)] pt-5 text-xs font-medium text-[var(--cg-text-muted)]">
                <span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-[var(--cg-primary)]" /> Role-based access</span>
                <span className="inline-flex items-center gap-2"><FileClock aria-hidden="true" className="h-4 w-4 text-[var(--cg-primary)]" /> Traceable records</span>
                <span className="inline-flex items-center gap-2"><MapPinned aria-hidden="true" className="h-4 w-4 text-[var(--cg-primary)]" /> Gate-connected workflows</span>
              </div>
            </div>

            <div role="img" aria-label="CampusGate interface preview showing device registration, gate verification, and movement history" className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-4 rounded-[2rem] border border-[var(--cg-border)] bg-white/60" />
              <div className="relative overflow-hidden rounded-2xl border border-[var(--cg-border)] bg-white shadow-[var(--cg-shadow-card)]">
                <div className="flex items-center justify-between border-b border-[var(--cg-border)] px-5 py-4 sm:px-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--cg-primary-light)] text-[var(--cg-primary)]"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-semibold text-[var(--cg-text)]">CampusGate</p>
                      <p className="text-xs text-[var(--cg-text-muted)]">Operations overview</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[var(--cg-border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-muted)]">Interface preview</span>
                </div>
                <div className="grid sm:grid-cols-[138px_1fr]">
                  <div className="hidden border-r border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4 sm:block">
                    <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--cg-text-subtle)]">Workspace</p>
                    <div className="space-y-1 text-xs">
                      <div className="rounded-md bg-white px-2.5 py-2 font-semibold text-[var(--cg-primary)] shadow-[var(--cg-shadow-xs)]">Overview</div>
                      <div className="px-2.5 py-2 text-[var(--cg-text-muted)]">Device records</div>
                      <div className="px-2.5 py-2 text-[var(--cg-text-muted)]">Gate activity</div>
                      <div className="px-2.5 py-2 text-[var(--cg-text-muted)]">Security incidents</div>
                    </div>
                    <div className="mt-8 rounded-lg border border-[var(--cg-border)] bg-white p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--cg-text-subtle)]">Access</p>
                      <p className="mt-1 text-xs font-semibold text-[var(--cg-text)]">Role-based</p>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-[var(--cg-text-muted)]">Campus security</p>
                        <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--cg-text)]">A connected record</h2>
                      </div>
                      <span className="mb-0.5 inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--cg-text-muted)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--cg-success)]" /> Workflow</span>
                    </div>
                    <div className="mt-4 rounded-xl border border-[var(--cg-border)] p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--cg-surface-muted)] text-[var(--cg-primary)]"><Laptop aria-hidden="true" className="h-4 w-4" /></span>
                          <div>
                            <p className="text-xs font-semibold text-[var(--cg-text)]">Registered device</p>
                            <p className="mt-0.5 text-[10px] text-[var(--cg-text-muted)]">Owner-linked asset record</p>
                          </div>
                        </div>
                        <QrCode aria-hidden="true" className="h-5 w-5 text-[var(--cg-primary)]" />
                      </div>
                      <div className="my-3.5 ml-[17px] h-5 border-l border-dashed border-[var(--cg-border-strong)]" />
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--cg-info-bg)] text-[var(--cg-info)]"><ScanLine aria-hidden="true" className="h-4 w-4" /></span>
                        <div>
                          <p className="text-xs font-semibold text-[var(--cg-text)]">Gate verification</p>
                          <p className="mt-0.5 text-[10px] text-[var(--cg-text-muted)]">QR or asset ID lookup</p>
                        </div>
                      </div>
                      <div className="my-3.5 ml-[17px] h-5 border-l border-dashed border-[var(--cg-border-strong)]" />
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--cg-success-bg)] text-[var(--cg-success)]"><FileClock aria-hidden="true" className="h-4 w-4" /></span>
                        <div>
                          <p className="text-xs font-semibold text-[var(--cg-text)]">Movement history</p>
                          <p className="mt-0.5 text-[10px] text-[var(--cg-text-muted)]">Gate, officer, and recorded time</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--cg-surface-muted)] px-3.5 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-[var(--cg-text-muted)]"><Fingerprint aria-hidden="true" className="h-4 w-4 text-[var(--cg-primary)]" /> Actions remain attributable</div>
                      <ArrowRight aria-hidden="true" className="h-4 w-4 text-[var(--cg-text-subtle)]" />
                    </div>
                  </div>
                </div>
              </div>
              <p className="relative mt-3 text-center text-[11px] text-[var(--cg-text-muted)]">A visual preview of connected CampusGate workflows</p>
            </div>
          </div>
        </section>

        <section
          id="belongings-clearance"
          aria-labelledby="clearance-title"
          className="scroll-mt-8 border-b border-[var(--cg-border)] bg-[var(--cg-primary-light)]"
        >
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[var(--cg-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--cg-primary)]">
                <ClipboardCheck aria-hidden="true" className="h-3.5 w-3.5" />
                A standout CampusGate workflow
              </p>
              <h2 id="clearance-title" className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">
                Belongings exit clearance, without the paper trail.
              </h2>
              <p className="mt-4 text-sm leading-7 text-[var(--cg-text-muted)] sm:text-base">
                In a paper-based process, a student may need to visit the Proctor&apos;s office,
                fill out a form listing clothes, shoes, and other belongings, then carry the
                paper permit to the gate. CampusGate brings that exit-clearance process online.
              </p>
              <div className="mt-6 rounded-xl border border-[var(--cg-border)] bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--cg-success-bg)] text-[var(--cg-success)]">
                    <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--cg-text)]">Exit clearance only</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--cg-text-muted)]">
                      This workflow is for approved belongings leaving campus. Normal campus
                      entry screening is unchanged; students do not register clothes when entering.
                    </p>
                  </div>
                </div>
              </div>
              <ul className="mt-5 grid gap-2 text-sm text-[var(--cg-text-muted)] sm:grid-cols-2">
                {['Less paper handling', 'Submit without an office visit', 'Traceable decisions and exits', 'Clear accountability at the gate'].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--cg-primary)]" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[var(--cg-border)] bg-white p-5 shadow-[var(--cg-shadow-sm)] sm:p-7">
              <div className="flex flex-col justify-between gap-2 border-b border-[var(--cg-border)] pb-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.13em] text-[var(--cg-primary)]">Digital workflow</p>
                  <h3 className="mt-1 text-lg font-semibold tracking-[-0.025em] text-[var(--cg-text)]">Student to Proctor to Gate</h3>
                </div>
                <span className="text-xs text-[var(--cg-text-muted)]">One request. A recorded exit.</span>
              </div>
              <ol className="mt-5 space-y-3">
                {[
                  {
                    number: '01',
                    title: 'Student submits online',
                    description: 'Declare clothes, shoes, and other belongings with the planned exit details.',
                    icon: UserRound,
                  },
                  {
                    number: '02',
                    title: 'Proctor reviews the request',
                    description: 'A Proctor approves or rejects the request with a recorded decision.',
                    icon: ClipboardCheck,
                  },
                  {
                    number: '03',
                    title: 'Gate Officer verifies and records',
                    description: 'Scan the digital QR pass, confirm the student and declared belongings, then record the exit.',
                    icon: ScanLine,
                  },
                ].map(({ number, title, description, icon: Icon }, index) => (
                  <li key={number} className="relative flex gap-4 rounded-xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-4">
                    {index < 2 && <span aria-hidden="true" className="absolute left-[2.1rem] top-[3.65rem] h-3 border-l border-dashed border-[var(--cg-border-strong)]" />}
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--cg-border)] bg-white text-[var(--cg-primary)]">
                      <Icon aria-hidden="true" className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-[10px] font-semibold tracking-[0.1em] text-[var(--cg-text-subtle)]">{number}</span>
                        <h4 className="text-sm font-semibold text-[var(--cg-text)]">{title}</h4>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[var(--cg-text-muted)] sm:text-sm">{description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-col gap-3 rounded-xl bg-[var(--cg-primary)] p-4 text-white sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><QrCode aria-hidden="true" className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-semibold">Signed, time-limited QR pass</p>
                    <p className="mt-0.5 text-xs text-blue-100">Validated online. A recorded exit cannot be reused.</p>
                  </div>
                </div>
                <Link href="/login" className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:self-auto">
                  Sign in <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="problem-title" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cg-primary)]">The problem</p>
            <h2 id="problem-title" className="mt-4 max-w-lg text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">
              Campus security records should not be scattered across paper registers.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Manual registers', 'Paper records make device entry and exit slower to review and harder to keep consistent.'],
              ['Fragmented gate logs', 'Separate records across gates make it difficult to follow an asset’s movement end to end.'],
              ['Limited incident context', 'Lost-device reports and security incidents need a shared, attributable record.'],
            ].map(([title, description]) => (
              <article key={title} className="rounded-xl border border-[var(--cg-border)] bg-white p-5">
                <span className="mb-5 block h-1 w-8 rounded-full bg-[var(--cg-primary)]" />
                <h3 className="text-sm font-semibold text-[var(--cg-text)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--cg-text-muted)]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--cg-border)] bg-[var(--cg-surface-muted)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 sm:py-14 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:gap-16">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--cg-border)] bg-white text-[var(--cg-primary)]"><ShieldCheck aria-hidden="true" className="h-6 w-6" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cg-primary)]">Project motivation</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">From manual process to shared system.</h2>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-[var(--cg-text-muted)] sm:text-base">
              CampusGate was initiated to replace inefficient paper-based gate processes with a
              centralized digital system. By bringing device records and operational actions
              together, it aims to improve record accuracy, strengthen accountability, and make
              day-to-day gate operations easier to manage.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cg-primary)]">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">A clear path from registration to resolution.</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--cg-text-muted)] sm:text-base">Each step builds a usable record, so campus teams can act with the right context.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map(({ number, title, description, icon: Icon }) => (
              <article key={number} className="rounded-xl border border-[var(--cg-border)] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.12em] text-[var(--cg-text-subtle)]">{number}</span>
                  <Icon aria-hidden="true" className="h-5 w-5 text-[var(--cg-primary)]" />
                </div>
                <h3 className="mt-7 text-base font-semibold text-[var(--cg-text)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--cg-text-muted)]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="platform" className="scroll-mt-8 border-y border-[var(--cg-border)] bg-[var(--cg-surface-muted)]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cg-primary)]">Key features</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">The essential operations, in one place.</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[var(--cg-text-muted)]">Practical tools for everyday access, asset control, and security coordination.</p>
            </div>
            <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map(({ title, description, icon: Icon }) => (
                <article key={title} className="rounded-xl border border-[var(--cg-border)] bg-white p-5 transition-shadow hover:shadow-[var(--cg-shadow-sm)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--cg-primary-light)] text-[var(--cg-primary)]"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                  <h3 className="mt-4 text-sm font-semibold text-[var(--cg-text)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--cg-text-muted)]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="scroll-mt-8 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cg-primary)]">User roles</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">The right tools for every responsibility.</h2>
          </div>
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roles.map(({ name, description, icon: Icon }) => (
              <article key={name} className="rounded-xl border border-[var(--cg-border)] bg-white p-5">
                <Icon aria-hidden="true" className="h-5 w-5 text-[var(--cg-primary)]" />
                <h3 className="mt-5 text-base font-semibold text-[var(--cg-text)]">{name}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--cg-text-muted)]">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--cg-border)] bg-[var(--cg-primary)] text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">Operational value</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">More clarity for campus teams.</h2>
            </div>
            <ul className="grid gap-x-6 gap-y-3 text-sm font-medium text-blue-50 sm:grid-cols-2">
              {['Centralized operational records', 'Traceable device movement', 'Less reliance on paper registers', 'Clearer accountability by role', 'Consistent workflows across gates', 'More organized incident response'].map((benefit) => (
                <li key={benefit} className="flex items-center gap-2.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" />{benefit}</li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="technology-title" className="mx-auto max-w-7xl space-y-6 px-5 py-14 sm:px-8 sm:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cg-primary)]">Technology</p>
            <h2 id="technology-title" className="mt-3 text-2xl font-semibold tracking-[-0.04em]">Built on a modern full-stack foundation.</h2>
          </div>
          <ul aria-label="Technologies used" className="flex w-full flex-nowrap gap-2 overflow-x-auto pb-2">
            {technologies.map((technology) => (
              <li key={technology} className="shrink-0 rounded-lg border border-[var(--cg-border)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--cg-text-muted)]">{technology}</li>
            ))}
          </ul>
        </section>

        <section className="px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl border border-[var(--cg-border)] bg-[var(--cg-surface-muted)] p-6 sm:p-9 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cg-primary)]">CampusGate</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Bring campus operations into focus.</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--cg-text-muted)]">Sign in to access your role-based workspace or explore the project on GitHub.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/login" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--cg-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--cg-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cg-primary)]">
                Sign in <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <a href="https://github.com/turab202/campusgate" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--cg-border-strong)] bg-white px-5 text-sm font-semibold text-[var(--cg-text)] transition-colors hover:border-[var(--cg-primary)] hover:text-[var(--cg-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cg-primary)]">
                View project on GitHub <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--cg-border)] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="hidden h-5 border-l border-[var(--cg-border)] sm:block" />
            <p className="hidden text-xs text-[var(--cg-text-muted)] sm:block">University access, assets, and security operations</p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--cg-text-muted)]">
            <Link href="/login" className="transition-colors hover:text-[var(--cg-primary)]">Sign in</Link>
            <a href="#platform" className="transition-colors hover:text-[var(--cg-primary)]">Features</a>
            <a href="https://github.com/turab202/campusgate" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 transition-colors hover:text-[var(--cg-primary)]">GitHub <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
