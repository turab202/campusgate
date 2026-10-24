# CampusGate

## Project owner

- Name: Zahra Mustefa
- Role: Full project developer and owner

CampusGate is a university gate and device security platform that replaces the manual gate-book process with a digital, auditable workflow.

The current implementation is a real full-stack application with:

- a Next.js + React frontend
- a FastAPI + SQLAlchemy backend
- PostgreSQL persistence with Alembic migrations
- role-based access control for students, gate officers, proctors, and administrators

This repository is not a mock demo-only project. It uses the actual backend APIs and database models for device movement, gate assignment, visitor management, lost-device handling, Student Belongings Exit Clearance, incidents, and audit logging.

## Product focus

The system is designed around the real university gate process:

1. A device is registered once by a gate officer.
2. The system creates a unique Asset ID and QR record.
3. The officer verifies the device at the gate.
4. The device is checked out when leaving campus.
5. The device status becomes OUTSIDE_CAMPUS.
6. The device is checked in later when returning.
7. The device status becomes INSIDE_CAMPUS.
8. Each movement is recorded with officer, gate, device, and timestamp.

Device movement remains its own check-in/check-out lifecycle. Student Belongings Exit Clearance is a separate, implemented approval workflow for taking declared personal belongings out of campus; it does not authorize device movement or change entry screening.

## Core workflow

```text
REGISTER DEVICE
     ↓
VERIFY AT GATE
     ↓
CHECK OUT
     ↓
OUTSIDE_CAMPUS
     ↓
CHECK IN
     ↓
INSIDE_CAMPUS
```

Student belongings exit clearance follows a separate approval path:

```text
STUDENT SUBMITS DECLARED BELONGINGS
              ↓
DEPARTMENT PROCTOR APPROVES OR REJECTS
              ↓
SIGNED, TIME-LIMITED QR PASS
              ↓
GATE OFFICER VERIFIES IDENTITY AND ITEMS
              ↓
SINGLE-USE, AUDIT-RECORDED EXIT
```

## Real system components

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind-based design system
- Role-aware dashboards for students, officers, proctors, and admins

### Backend

- FastAPI
- Pydantic v2
- SQLAlchemy 2
- Alembic migrations
- PostgreSQL

### Architecture

```text
Frontend (Next.js)
   └── calls REST APIs
         ↓
Backend (FastAPI)
   ├── auth / RBAC
   ├── devices
   ├── gate assignments
   ├── movements
   ├── belongings clearance / Proctor review
   ├── lost device workflow
   ├── visitors / visits
   ├── incidents
   └── audit logs
         ↓
PostgreSQL database
```

## Main features implemented

### Student Belongings Exit Clearance — standout feature

Paper-based exit clearance can require a student to visit a Proctor's office, fill out a paper form listing clothes, shoes, and other belongings, then carry the permit to a campus gate. CampusGate digitizes this process while retaining a human review and an in-person gate check.

```text
STUDENT                 PROCTOR                         GATE OFFICER
Submit exit request  →  Review within department  →  Scan QR or look up reference
Declare items           Approve or reject             Confirm identity and compare items
Receive approved pass                                  Record exit or flag discrepancy
```

- Students submit the exit request online with residence, intended exit time, remarks, and item names and quantities. The authenticated account supplies the student's identity and department.
- Admins create and manage Proctor accounts, assign each Proctor a department, and can deactivate accounts. Proctors may access and decide only requests matching their assigned department.
- A Proctor approves or rejects a pending request; rejection requires a reason. Approval issues a signed QR pass. Students can cancel pending requests and review decisions and pass state.
- At their assigned gate, Gate Officers scan the QR pass or manually look up its request reference. They review the approved declaration, explicitly confirm that they checked the student's identity and compared the belongings, then record the exit. A discrepancy can instead revoke the pass and create an incident.
- The approved QR token is signed and validated by the backend. Passes expire at the intended exit time plus `CLEARANCE_PASS_VALIDITY_HOURS` (default 24 hours). A configured `CLEARANCE_TOKEN_SECRET` should remain stable across backend instances; otherwise the signing key is derived from `JWT_SECRET_KEY`.
- Exit recording locks the clearance row and is single-use. The system records the officer, assigned gate, exit time, and identity-verification confirmation. Creation, decisions, validation failures, exit attempts, successful exits, and discrepancies are audit logged.
- This is an exit-only belongings workflow. Normal campus entry screening is unchanged: students do not register clothes or belongings when entering. Device check-in/check-out remains separate and unchanged.

### Device lifecycle

- Device enrollment by authorized users
- QR and asset ID lookup
- Search by serial number and owner information
- Check-out and check-in workflows
- Device status tracking: INSIDE_CAMPUS, OUTSIDE_CAMPUS, LOST, REPORTED_LOST
- Movement history tied to gate and officer

### Gate operations

- Gate officer assignment by active shift
- Officer dashboard showing the current active gate
- Device verification before movement actions
- Real gate-based movement actions without manual gate selection during check-in/check-out

### Lost device workflow

- Report lost for a registered device
- Device moves to REPORTED_LOST
- Lost-device incident is created in the real workflow
- Administrative recovery is supported through the configured device lifecycle

### Visitor management

- Existing student/staff visitor APIs and records remain available; the Student Portal no longer exposes a Visitor Requests workflow.
- Administrators approve or reject pending requests; approval generates a visitor QR pass.
- Gate officers verify the approved QR value at their assigned gate before check-in, then record check-out.
- Existing host-scoped request and pass APIs remain available to authorized clients.
- Requests, approvals, and gate movements are audit logged; hosts can only view their own requests.

### Incident management

- Gate officers create incidents associated with their active gate and, when applicable, a registered device.
- Administrators review incidents and advance them through OPEN, INVESTIGATING, RESOLVED, and CLOSED.
- Incident creation and status changes are audit logged.

### Audit logs

- Security-relevant system actions are recorded
- Admin dashboard can expose the audit trail through real API data

## Roles and permissions

The project uses backend authorization as the source of truth.

### Student

- View their own devices
- View their own device movement history
- Use student-facing device actions
- Update their sign-in email and password from the Account section after confirming their current password
- Submit and review their belongings exit requests, and cancel requests while pending
- View the declared items and decision, and display an approved digital QR pass

### Staff

- Use the shared student-facing device portal and view devices associated with their account
- Student Belongings Exit Clearance request endpoints are restricted to the `STUDENT` role

### Gate officer

- Verify devices at gates
- Perform check-in/check-out actions
- View gate-related movement data
- Handle visitor and incident workflows as allowed by backend permissions
- Validate signed belongings clearance passes or look up a request reference at the assigned gate
- Compare declared items and verify student identity before recording a single-use exit; flag discrepancies when needed

### Proctor

- Admin-created, department-assigned role; public self-registration cannot grant `PROCTOR`
- Sign in to the dedicated Proctor Portal
- Search and review requests for students in the assigned department; approve or reject pending requests
- View processed requests and decision details for that department
- Proctors cannot manage accounts, gate assignments, devices, or administrative records

### Administrator

- Manage devices, gates, gate assignments, incidents, visitors, and audit logs
- Create and update administrator, gate officer, and proctor accounts, reset passwords, and deactivate/reactivate accounts
- Assign each Proctor to a department and review belongings clearance records in a read-only oversight view
- Review security and operational telemetry

Privileged account deactivation preserves audit history. The last active administrator and the current administrator's own account cannot be deactivated or demoted.

## Local development setup

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop or Docker Engine (for PostgreSQL if using the included compose file)

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Start PostgreSQL

The repository includes a local container definition for Postgres.

```bash
docker compose up -d postgres
```

If you are using a different database, update the backend `DATABASE_URL` environment variable to match it.

### 3. Configure backend environment

Create a `.env` file in the `backend` folder with values like:

```env
APP_NAME=CampusGate API
APP_VERSION=1.0.0
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:3000"]
DATABASE_URL=postgresql+psycopg://campusgate:campusgate_dev_password@localhost:5433/campusgate
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
CLEARANCE_PASS_VALIDITY_HOURS=24
# Optional; in production prefer a separate persistent random secret of at least 32 bytes.
CLEARANCE_TOKEN_SECRET=replace-with-a-separate-random-secret
```

The access token and its HttpOnly browser cookie expire after this interval. The default is 60 minutes; there is no automatic token refresh, so users must sign in again when it expires. The frontend returns to the sign-in page and explains this when an API request receives an expired-session response. Increase this value in the backend deployment environment only if a longer session is appropriate for your device-security policy.

If you connect to a managed PostgreSQL service instead of the Docker local database, replace the URL with the correct connection string.

`CLEARANCE_PASS_VALIDITY_HOURS` controls pass expiry from the requested exit time and defaults to 24. Set a positive value appropriate for university policy. `CLEARANCE_TOKEN_SECRET` is optional; when omitted the backend derives the QR-token signing key from `JWT_SECRET_KEY`. Keep a separately configured value stable across backend instances so issued passes remain verifiable.

For production, set `ENVIRONMENT=production` and use a unique randomly generated `JWT_SECRET_KEY`. The default CORS origin is `https://campusgate-omega.vercel.app`; set `CORS_ORIGINS` to a JSON array of exact HTTPS origins if you use another frontend domain. API documentation endpoints are disabled in production.

Configure the frontend deployment with `BACKEND_API_URL` set to the backend origin, for example `https://campusgate-api-f27v.onrender.com` (no trailing slash). Browser API calls go through the same-origin Next.js proxy, which stores the backend JWT in an HttpOnly cookie instead of exposing it to client JavaScript. Existing browser sessions must sign in again after this change.

### Create the first production Admin and Gate Officer (Render without shell)

Public registration is limited to Student and Staff. To create the initial privileged accounts on a Render deployment without shell access:

1. Deploy the backend changes from this repository.
2. In Render, open the backend service's Environment settings and temporarily add `BOOTSTRAP_SECRET`. Generate a unique value locally with `python -c "import secrets; print(secrets.token_urlsafe(48))"` and set it as the variable. Keep it private; it must be at least 32 bytes.
3. After Render redeploys, run `python backend/bootstrap_render_users.py` from your computer. Enter the backend service's HTTPS origin (not the Vercel frontend URL), the secret, the two account names/emails, and separate passwords of at least 16 characters when prompted. Passwords and the secret are not echoed or saved by the helper.
4. After the helper confirms creation, remove `BOOTSTRAP_SECRET` from Render and redeploy immediately. The API also closes bootstrap permanently once any Admin or Gate Officer exists.
5. Sign in at the frontend using each account's email and password.

The bootstrap API creates both accounts atomically and refuses existing privileged users or duplicate emails. The local helper requires HTTPS and does not follow redirects. Do not put the bootstrap secret or passwords in source control, chat, or a URL.

### 4. Create and activate a Python virtual environment

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

On macOS/Linux:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
```

### 5. Install backend Python dependencies

```bash
pip install -r requirements.txt
```

### 6. Run database migrations

```bash
alembic upgrade head
```

### 7. Start backend

```bash
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- http://localhost:8000
- http://localhost:8000/docs

### 8. Start frontend

Open a new terminal and run:

```bash
npm run dev
```

Frontend runs on:

- http://localhost:3000

## Common verification commands

From the repository root:

```bash
npx tsc --noEmit
npm run build
npm run lint
```

From the backend directory:

```bash
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m alembic check
```

The belongings-clearance API tests use an isolated in-memory SQLite database. Existing PostgreSQL-dependent integration/model tests skip if local PostgreSQL is unavailable. The frontend has no separate unit-test script; lint, TypeScript checking, and the production build are its automated checks.

## Current repository status

This codebase supports real device and belongings-exit gate workflows and related operational systems:

- Student Belongings Exit Clearance: online student request, department Proctor decision, signed QR pass, and audited Gate Officer exit
- device registration and ownership
- gate officer check-in/check-out
- active gate assignment
- lost-device reporting and recovery
- visitor lifecycle management
- incident tracking
- audit and operational telemetry

Belongings clearance is the implemented exit approval for declared personal items. It does not restore the removed Temporary Exit Request feature or alter device movement and campus-entry workflows.

## Notes

- Backend authorization is the security boundary; frontend hiding is not a substitute for real RBAC.
- Gate assignments remain authoritative for active gate detection.
- Device movement status changes happen through the real device check-in/check-out flow. Belongings clearance is a separate exit-only approval workflow and does not affect device status or campus entry.
- Visitor APIs remain available to authorized staff even though the student-facing Visitor Requests section is no longer in the Student Portal.

## Safe deployment of belongings clearance

The feature adds incremental Alembic revision `9c48b2a7d301`. It adds the `PROCTOR` PostgreSQL enum value and creates clearance and item tables without dropping or recreating existing production tables.

1. Back up the Neon database and apply the migration to staging first.
2. Run `alembic upgrade head` from the backend release environment using the same `DATABASE_URL` as the API. Do not downgrade production after clearance requests are created; downgrade removes the new tables and their records.
3. Configure `CLEARANCE_PASS_VALIDITY_HOURS` and, preferably, a persistent random `CLEARANCE_TOKEN_SECRET` of at least 32 bytes on every backend instance. Keep database credentials, JWT secrets, and pass-signing secrets out of source control.
4. Deploy the backend and frontend with the existing Render/Vercel environment-variable setup. `BACKEND_API_URL` must point to the FastAPI service; the Next.js same-origin API proxy and HttpOnly session cookie remain in use. No separate deployment manifest or new package dependency is required.
5. Verify health, login, and protected operations before enabling the workflow for users. Local validation is not a substitute for deployed end-to-end verification.

### Production end-to-end checklist

- Admin creates a department-assigned Proctor; the account can sign in, while a deactivated proctor is denied API access.
- A student creates a request with multiple items; student identity comes from auth and another student cannot read the request.
- A proctor in the assigned department approves the request and the student sees the QR pass; an out-of-department proctor cannot read or decide it.
- Rejection reason and pending cancellation are visible; approved requests cannot be cancelled or altered.
- A Gate Officer scans the pass or looks up its reference at their assigned gate; lookup alone does not mark it used.
- After identity and belongings checks, one exit action records the officer, assigned gate, timestamp, and audit event. A second use is refused.
- Expired, revoked, rejected, forged, or already-used passes are refused. A discrepancy creates an incident and does not record a successful exit.
- Campus entry and existing device check-in/check-out workflows continue unchanged.

## Project goals

CampusGate is intended to provide an enterprise-style digital gate process that:

- reduces manual paper records
- improves accountability across gates
- supports real device lifecycle tracking
- maintains a clear audit trail
- keeps gate operations fast and verifiable

> The goal is operational integrity and traceability, not feature sprawl.
