# CampusGate

CampusGate is a university gate and device security platform that replaces the manual gate-book process with a digital, auditable workflow.

The current implementation is a real full-stack application with:

- a Next.js + React frontend
- a FastAPI + SQLAlchemy backend
- PostgreSQL persistence with Alembic migrations
- role-based access control for students, gate officers, and administrators

This repository is not a mock demo-only project. It uses the actual backend APIs and database models for device movement, gate assignment, visitor management, lost-device handling, incidents, and audit logging.

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

There is no temporary device exit approval workflow in the current product direction. The real movement lifecycle remains authoritative and separate from any future administrative processes.

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

## Real system components

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind-based design system
- Role-aware dashboards for students, officers, and admins

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
   ├── lost device workflow
   ├── visitors / visits
   ├── incidents
   └── audit logs
         ↓
PostgreSQL database
```

## Main features implemented

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

- Students and staff submit visitor requests for their own accounts.
- Administrators approve or reject pending requests; approval generates a visitor QR pass.
- Gate officers verify the approved QR value at their assigned gate before check-in, then record check-out.
- Hosts can review their requests and show approved visitor passes from the student portal.
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

### Student / staff

- View their own devices
- View their own device movement history
- Use student-facing device actions
- Update their sign-in email and password from the Account section after confirming their current password

### Gate officer

- Verify devices at gates
- Perform check-in/check-out actions
- View gate-related movement data
- Handle visitor and incident workflows as allowed by backend permissions

### Administrator

- Manage devices, gates, gate assignments, incidents, visitors, and audit logs
- Create and update administrator and gate officer accounts, reset passwords, and deactivate/reactivate accounts
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
```

If you connect to a managed PostgreSQL service instead of the Docker local database, replace the URL with the correct connection string.

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
```

From the backend directory:

```bash
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m alembic check
```

## Current repository status

This codebase currently focuses on the real device gate workflow and related operational systems:

- device registration and ownership
- gate officer check-in/check-out
- active gate assignment
- lost-device reporting and recovery
- visitor lifecycle management
- incident tracking
- audit and operational telemetry

It intentionally does not include a separate temporary exit request feature.

## Notes

- Backend authorization is the security boundary; frontend hiding is not a substitute for real RBAC.
- Gate assignments remain authoritative for active gate detection.
- Device movement status changes happen through the real check-in/check-out flow.
- The system is meant to support an operational gate-book replacement rather than a separate approval workflow.

## Project goals

CampusGate is intended to provide an enterprise-style digital gate process that:

- reduces manual paper records
- improves accountability across gates
- supports real device lifecycle tracking
- maintains a clear audit trail
- keeps gate operations fast and verifiable

> The goal is operational integrity and traceability, not feature sprawl.
