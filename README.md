# CampusGate

**University Access, Asset & Security Management Platform**

CampusGate is a centralized university security and access management platform designed to digitize campus gate operations, device registration, movement tracking, visitor management, and security incidents.

It replaces fragmented manual records with a shared system that allows authorized gate officers and administrators to securely verify people and devices across all campus gates.

## The Problem

University gates often rely on handwritten records when students or staff bring laptops, computers, cameras, and other valuable devices onto campus.

This creates several problems:

* Device information is recorded manually in physical books.
* Different gates may not have immediate access to the same records.
* Returning through a different gate can make verification difficult.
* Device movement history is difficult to audit.
* Lost devices may not be immediately visible to gate officers.
* Visitor and temporary device access can be difficult to track.
* Security incidents require manual investigation and documentation.

## The Solution

CampusGate provides one centralized system shared across all university gates.

A device is registered **once** during its first verified entry. The system generates a unique Asset ID and QR code.

After registration:

```text
ENROLL ONCE
     ↓
DEVICE INSIDE CAMPUS
     ↓
CHECK OUT WHEN LEAVING
     ↓
DEVICE OUTSIDE CAMPUS
     ↓
CHECK IN WHEN RETURNING
     ↓
DEVICE INSIDE CAMPUS
```

The device can be checked in or out through **any authorized campus gate** because every gate uses the same central database.

## Core Features

### Device Management

* One-time device enrollment
* Laptop, tablet, phone, camera, monitor, and other device types
* Unique Asset ID
* Unique serial number
* QR code generation
* Device ownership information
* Device status tracking
* Device photos
* Complete movement history

### QR Verification

Gate officers can quickly identify a registered device by scanning its QR code.

The QR code contains only a unique asset identifier and does not expose sensitive personal information.

Officers can also search using:

* Asset ID
* Serial number
* Student/Staff ID

### Gate Check-In / Check-Out

Every device movement records:

* Device
* Owner
* Gate
* Gate officer
* Action
* Date and time

The system prevents invalid transactions such as checking out a device that is already outside campus or checking in a device that is already inside.

### Cross-Gate Verification

Because all gates share the same central system, device history is available regardless of which gate was previously used.

Example:

```text
10:32 AM
Gate 1
CHECK OUT
       ↓
Device status: OUTSIDE CAMPUS
       ↓
12:41 PM
Gate 3
CHECK IN
       ↓
Device status: INSIDE CAMPUS
```

The Gate 3 officer can immediately see the previous Gate 1 transaction.

### Lost Device Reporting

Students and staff can report a registered device as lost.

When a device is reported lost:

* Its status changes to `LOST`.
* The report is recorded with the time and owner.
* The last known movement is preserved.
* Every gate can see the security warning.
* Officers cannot process the device through normal check-in/check-out.
* An incident can be created for investigation.
* Administrators can resolve or update the incident after verification.

The system distinguishes **LOST** from **STOLEN** so that a lost report does not automatically make an unsupported accusation.

### Visitor Management

* Visitor registration
* Visitor requests
* QR visitor passes
* Visitor check-in
* Visitor check-out
* Visit history
* Expired pass handling

### Temporary Device Exit Authorization

Some university-owned equipment may need to temporarily leave campus.

CampusGate supports controlled authorization requests for devices such as:

* Projectors
* Cameras
* Laboratory equipment
* University laptops
* Other institutional assets

Requests can be reviewed and authorized before the device is checked out.

### Incident Management

Security officers can create incidents for situations such as:

* Lost device
* Owner mismatch
* Unknown device
* Suspicious device movement
* Unauthorized exit attempt
* Other security events

Administrators can investigate, update, assign, and resolve incidents.

### Audit Logs

Important security actions are recorded for accountability.

Examples include:

* Device registration
* Check-in
* Check-out
* Lost-device reports
* Visitor activity
* Authorization decisions
* Incident creation
* Administrative changes

Each event can include the responsible user, gate, action, timestamp, and related entity.

## User Roles

CampusGate uses three primary roles:

### Student / Staff

Can:

* View registered devices
* View device QR codes
* View movement history
* Report a device as lost
* Request temporary device authorization
* Submit visitor requests where applicable

### Gate Officer

Can:

* Verify student/staff identity
* Register new devices
* Scan QR codes
* Search devices
* Verify physical devices
* Check devices in and out
* Process visitors
* Create security incidents
* View relevant device history

The officer's active gate is determined through their assigned shift rather than requiring them to manually select a gate for every transaction.

### Administrator

Can:

* Manage users
* Manage gate officers
* Manage gates
* Manage officer shifts
* Manage devices
* Manage visitor records
* Review device requests
* Manage incidents
* View audit logs
* Generate reports
* View analytics
* Manage system settings

## Localization

CampusGate supports:

* **Amharic**
* **English**

The gate officer experience is designed with an **Amharic-first interface** so that essential security operations remain understandable and fast.

All user-facing text is designed to come from localization dictionaries rather than being hardcoded throughout the application.

## Technology Stack

### Frontend

* Next.js
* TypeScript
* React
* Tailwind CSS

### Backend

* Node.js
* Express
* TypeScript

### Database

* PostgreSQL
* Prisma ORM

### Security & Validation

* Role-Based Access Control
* Authentication
* Zod validation
* Secure API design
* Audit logging

## Architecture

The project is designed around a clear separation between the frontend, backend, and database.

```text
┌──────────────────────────────┐
│          Frontend            │
│       Next.js + React        │
└──────────────┬───────────────┘
               │
               │ REST API
               ↓
┌──────────────────────────────┐
│           Backend            │
│    Node.js + Express + TS    │
│                              │
│ Auth / Services / Validation │
│ Business Rules / Audit Logs  │
└──────────────┬───────────────┘
               │
               │ Prisma
               ↓
┌──────────────────────────────┐
│          PostgreSQL          │
│                              │
│ Users / Devices / Gates      │
│ Shifts / Transactions        │
│ Visitors / Incidents / Logs  │
└──────────────────────────────┘
```

## Key Business Rules

1. A device is enrolled only once.
2. Every device has a unique serial number.
3. Every registered device receives a unique Asset ID.
4. QR codes identify devices quickly.
5. A device cannot be checked out while already outside campus.
6. A device cannot be checked in while already inside campus.
7. Every movement transaction belongs to a gate.
8. Every movement transaction belongs to a gate officer.
9. The active gate is determined by the officer's shift assignment.
10. All campus gates use the same central system.
11. Lost devices trigger a security warning.
12. Lost devices cannot be processed through normal movement operations until appropriately resolved.
13. Owner mismatches can trigger an incident.
14. Important security operations create audit records.
15. Students and staff cannot directly modify security transaction records.

## Project Status

CampusGate is being developed as a full-stack university security and asset management system.

The project focuses on demonstrating real-world software engineering concepts including:

* Role-based access control
* Centralized data management
* Transactional business rules
* Security workflows
* QR-based verification
* Auditability
* Incident management
* Localization
* Responsive interfaces
* API architecture
* Database design

## Project Goal

The goal of CampusGate is to demonstrate how a real university gate operation can move from fragmented manual records to a centralized, auditable, and secure digital platform.

> **Register once. Verify anywhere. Track every movement.**
