# CampusGate presentation and end-to-end test guide

Use this guide to prepare a clear, repeatable demonstration of the real CampusGate workflows. The application uses a Next.js frontend, a FastAPI backend, PostgreSQL persistence, and backend-enforced roles.

## Important: use a safe test environment

Prefer a staging deployment with a separate database. These workflows create persistent users, devices, movements, visitor requests, incidents, gate assignments, and audit records. The application does not provide a general delete/cleanup flow for those records.

- Do not rehearse by creating test records in a live university database.
- Use synthetic names, reserved test email addresses, and clearly identifiable serials, for example `DEMO-CG-<your-initials>-01`.
- Do not use real visitor identity numbers or phone numbers.
- Register student/staff test users through the registration page. Public registration does not create administrator or gate-officer accounts; have an authorized operator provision those accounts in the test environment.
- Do not publish credentials, session cookies, QR values, real personal data, or screenshots containing them.
- Do not run the checked-in `backend/seed_test_users.py` against production. Use your organization's approved account provisioning process and unique test credentials.
- Record the test entities you create and use a staging database reset or an authorized database cleanup process after the demonstration.

## 1. Confirm the deployment is ready

Open the frontend and confirm the sign-in page loads. Then check:

- Frontend: `https://campusgate-omega.vercel.app/`
- Frontend-to-backend proxy: `https://campusgate-omega.vercel.app/api/v1/health`
- Backend health: `https://campusgate-api-f27v.onrender.com/api/v1/health`
- Backend database: `https://campusgate-api-f27v.onrender.com/api/v1/health/db`

The health responses should report a healthy service and a connected database. In production, `/docs` and `/openapi.json` are intentionally disabled; a 404 at those URLs is expected, not a failed health check.

For a local code check, run from the repository root:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

For backend tests, start the test PostgreSQL service first, then run from the repository root:

```powershell
.\backend\.venv\Scripts\python.exe -m pytest -q backend\tests
```

Tests that require PostgreSQL may be skipped when it is unavailable. A green test command with skipped database tests is not equivalent to a full backend integration run.

## 2. Prepare test identities and operating context

Prepare these accounts in staging:

1. **Student**: create through `/register`; note the synthetic campus ID.
2. **Staff**: optional; create through `/register` to demonstrate the shared host portal.
3. **Administrator**: provision through an authorized test-environment process.
4. **Gate officer**: provision through an authorized test-environment process.

Use separate browser profiles or sign out completely when switching roles. The session is stored in an HttpOnly cookie, so a successful sign-in should lead to the dashboard appropriate to that account's role.

### Administrator: add a gate and assign the officer

1. Sign in as the administrator and open **Gates**.
2. Create a uniquely named test gate with a unique code.
3. Create a shift assignment for the test officer at that gate. Set the start time to now or earlier and the end time to a future time (or leave it open-ended if that is appropriate for your test environment).
4. Confirm the assignment appears in the gate/assignment view.
5. Sign in as the gate officer. The officer workspace should show the active gate and an **Active** assignment indicator.

Gate assignments are the source of truth for officer operations. If the officer has no active assignment, device movement, visitor check-in, and gate-associated incident reporting should not proceed.

## 3. Device enrollment, movement, and history

### Gate officer: enroll a device

1. Open **Enroll Device**.
2. Search for the test student by campus ID or name, then select the exact matching account.
3. Enter a test device type, brand/model, and a unique synthetic serial number.
4. Review the owner and device details before confirming.
5. Confirm the success view displays a generated Asset ID and QR pass.

The backend creates a unique asset ID and QR value and starts the device in `INSIDE_CAMPUS`.

### Student: verify the registered device

1. Sign in as that student and open **My Devices**.
2. Confirm the new device, Asset ID, serial number, and `INSIDE_CAMPUS` status are visible.
3. Open the device QR and close it.
4. Open **History** from the device card. Before any movement, the history should be empty or show no movement yet.

### Gate officer: check out, then check in

1. Open **Scan Device**. Use the manual serial/asset lookup if the camera is unavailable; camera scanning requires browser permission and a secure HTTPS origin.
2. Search for the test device and verify its owner, asset ID, serial, and current status before acting.
3. Choose **Verify and Check Out**. A success message should identify the gate; the device becomes `OUTSIDE_CAMPUS`.
4. Search for it again. The available action should now be check-in, not a second check-out.
5. Choose **Verify and Check In**. The device returns to `INSIDE_CAMPUS`.
6. As the student, refresh the dashboard and open the device history. Verify the check-out and check-in entries, timestamps, and gate IDs.
7. As an officer or administrator, open **Transactions** or the relevant dashboard and verify the movements are recorded.

The normal lifecycle is `INSIDE_CAMPUS → OUTSIDE_CAMPUS → INSIDE_CAMPUS`. Attempting an invalid repeat transition should return a clear error and should not create an extra movement.

### Optional: lost-device report and recovery

Use a separate test device, or do this only after finishing the normal movement demonstration.

1. As the owner, choose **Report Lost** and confirm the dialog.
2. Verify the owner dashboard shows a lost/reported-lost state, and the administrator sees an open lost-device incident.
3. As the officer, look up the device. It should be clearly marked as lost and must not allow check-in or check-out.
4. As the administrator, use **Clear Lost** only after verifying the recovery. Confirm the device returns to the selected resulting status and the related lost incident is resolved.
5. Check the administrator audit log for the report/recovery actions.

## 4. Visitor pass lifecycle

### Student or staff host: submit a request

1. Open **Visitors** and choose **Request pass**.
2. Enter synthetic visitor details and a purpose.
3. Choose an arrival time and a later departure time.
4. Submit. The request should appear as `PENDING`; the host sees only their own requests.
5. Try an end time before the start time. The form should explain the validation and must not submit.

### Administrator: review

1. Open **Visitor Requests** and filter to `PENDING`.
2. Review the host, visitor identity fields, purpose, and requested time window.
3. Approve the request. It should become `APPROVED` and have a QR pass.
4. If you also need to demonstrate rejection, create a second synthetic request and reject that one. It should become `REJECTED` and must not be check-in eligible.

### Host and gate officer: use the pass

1. Sign back in as the host and open the approved request. Choose **Show visitor pass**.
2. At the officer workspace, open **Visitors** and enter or scan the exact pass code.
3. Check in the approved request. It should become `CHECKED_IN` and record its gate and time.
4. Check out the same visitor. It should become `CHECKED_OUT` with a check-out time.
5. Refresh the host and officer views; confirm the status and timestamps are consistent.
6. As a negative check, attempt to check in a rejected request or use an incorrect QR value. The action should fail without changing the visit.

## 5. Incident reporting and administrative review

1. As the gate officer, open **Incidents** and create a test incident. Enter a concise description; optionally associate the test device.
2. Confirm the new incident starts as `OPEN` and is associated with the officer's active gate.
3. As the administrator, locate it in **Incidents**.
4. Advance the status through `INVESTIGATING`, `RESOLVED`, and `CLOSED`, checking after each action that the displayed state updates.
5. Open **Audit Logs** and verify the creation and status changes are recorded.
6. As a student, verify that student-facing incident queries do not expose other users' reports.

## 6. Administrator overview and access control

With test data present:

- **Gate Telemetry** should show the registered gate and summary counts.
- **Device Registry** should support searching and filtering by device status.
- **Visitor Requests** should support filtering/reviewing visitor requests.
- **Incidents** should show incident status and allow administrator status changes.
- **Audit Logs** should show security-relevant actions.
- The administrator should be able to search for an officer when assigning a shift.

Sign in as each role and test both allowed actions and denials:

- Student/staff: own devices, own movements, own visitor requests; cannot review all visits or administer gates.
- Gate officer: gate device operations, visitor check-in/out, incident creation; cannot approve visits or advance incident statuses.
- Administrator: gate/shift setup, visitor approval/rejection, incident review, lost-device recovery, and audit review.
- Unauthenticated: protected API calls should be rejected. After signing out, refresh a protected page and verify the user returns to the sign-in flow.

Expect authorization to be enforced by the backend, not just by hidden buttons. A `401` for a signed-out request or `403` for a role that lacks permission is the expected result.

## 7. Usability and presentation pass

Test at desktop width and a narrow mobile viewport:

- Student bottom navigation displays text labels, has a clear selected state, and remains reachable without covering the page content.
- Administrator sections can be scanned and reached on small screens; pending visitor/open incident badges should appear when such records exist.
- Officer task navigation reflows to a compact grid on smaller screens.
- Use keyboard Tab/Shift+Tab to reach navigation, forms, and actions; focus should be visible. Press Enter/Space to activate controls.
- Confirm loading, empty, success, and error states are understandable. Use a synthetic duplicate campus ID/email to verify registration gives a helpful duplicate error.
- Check that long names, campus IDs, serial numbers, and incident descriptions do not break the layout.
- Do not use real visitor data in screen recordings. Hide or crop emails, phone numbers, identity numbers, QR codes, and session/account details.

## 8. Suggested presentation flow

Keep the story focused on accountability and traceability:

1. **Problem**: paper-based gate records make ownership and movement history difficult to verify.
2. **Identity and roles**: show that a student, gate officer, and administrator each see the tools they need.
3. **Register once**: the officer links a device to its verified owner and gets a unique asset/QR identity.
4. **Verify movement**: demonstrate checkout and return, then show the same events in the owner's timeline and the administrator's records.
5. **Handle exceptions**: show a lost-device report/recovery or a visitor request/approval/check-in lifecycle.
6. **Close the loop**: show incident status management and audit history; explain that backend authorization and recorded events protect the workflow.

**Short narration:** “CampusGate connects the person, asset, gate, and officer in one traceable workflow. A device is enrolled once, each gate movement updates its state and creates a history record, and exceptional cases such as lost devices, visitors, and incidents follow role-based review.”

## What each record means

| Record | Why it exists |
| --- | --- |
| User and role | Establishes identity and which operations the backend permits. |
| Gate assignment | Connects an officer to an active station and shift. |
| Device and Asset ID | Links a physical device and serial number to its owner. |
| Device movement | Records a check-in/check-out, officer, gate, time, and resulting state. |
| Visitor request and QR | Captures a host's request and the approval used for visitor entry. |
| Incident | Tracks an exception from reporting through administrative resolution. |
| Audit log | Provides a reviewable record of security-relevant actions. |

## If a step fails

1. Check the frontend proxy health, backend health, and database health first.
2. Sign out and back in if the session expired or the account's role was changed.
3. For gate operations, verify the officer has an active assignment covering the current time.
4. For a device action, confirm its latest state; check-out requires `INSIDE_CAMPUS`, and check-in requires `OUTSIDE_CAMPUS`.
5. For a visitor check-in, confirm the request is approved and use its current exact QR value.
6. Read the visible API error and preserve its status/message when reporting a bug; never include credentials, bearer tokens, cookies, or real identity data.
