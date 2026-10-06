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

- Visitor and visit records
- Pending, approved, checked-in, checked-out, rejected, and expiry flows
- Gate officer and admin handling through the existing API layer

### Incident management

- Incident lifecycle tracking
- Device and owner details visible in the UI
- Status visibility and administrative handling

### Audit logs

- Security-relevant system actions are recorded
- Admin dashboard can expose the audit trail through real API data

## Roles and permissions

The project uses backend authorization as the source of truth.

### Student / staff

- View their own devices
- View their own device movement history
- Use student-facing device actions

### Gate officer

- Verify devices at gates
- Perform check-in/check-out actions
- View gate-related movement data
- Handle visitor and incident workflows as allowed by backend permissions

### Administrator

- Manage devices, gates, gate assignments, incidents, visitors, and audit logs
- Review security and operational telemetry

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
DATABASE_URL=postgresql+psycopg://campusgate:campusgate_dev_password@localhost:5433/campusgate
JWT_SECRET_KEY=replace-with-a-long-random-secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
```

If you connect to a managed PostgreSQL service instead of the Docker local database, replace the URL with the correct connection string.

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

