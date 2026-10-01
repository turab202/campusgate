export type { Language } from '../i18n/translations';

export type UserRole = 'STUDENT' | 'OFFICER' | 'ADMIN';

export type DeviceStatus = 'INSIDE_CAMPUS' | 'OUTSIDE_CAMPUS' | 'LOST' | 'REPORTED_LOST' | 'MAINTENANCE';

export type DeviceType = 'Laptop' | 'Tablet' | 'Phone' | 'Camera' | 'Monitor' | 'Projector' | 'Lab Equipment' | 'Other';

export interface User {
  id: string;
  name: string;
  nameAmharic?: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
}

export interface Student extends User {
  role: 'STUDENT';
  studentId: string; // e.g. ASTU-2024-01234
  department: string;
  departmentAmharic?: string;
  batchYear: number;
  status: 'ACTIVE' | 'GRADUATED' | 'SUSPENDED';
}

export interface GateOfficer extends User {
  role: 'OFFICER';
  officerBadgeId: string; // e.g. GO-023
  assignedGateId: string; // e.g. gate-1
  currentShift: string;   // e.g. 08:00 — 16:00
  phone: string;
  stationStatus: 'ON_DUTY' | 'OFF_DUTY' | 'BREAK';
}

export interface Device {
  id: string;
  assetId: string;        // e.g. CG-DEV-004821
  serialNumber: string;   // Unique manufacturer serial, e.g. PF123456
  brand: string;          // e.g. Lenovo, Apple, Dell, HP
  model: string;          // e.g. ThinkPad T14
  deviceType: DeviceType;
  ownerId: string;        // student or staff id
  ownerName: string;
  ownerStudentId: string;
  ownerDepartment?: string;
  status: DeviceStatus;
  enrollmentDate: string;
  enrolledByOfficerBadge: string;
  enrolledAtGateId: string;
  qrPayload: string;      // CG-DEV-004821
  notes?: string;
  lastMovement?: {
    id: string;
    type: 'CHECK_IN' | 'CHECK_OUT';
    gateId: string;
    gateName: string;
    officerBadge: string;
    officerName: string;
    timestamp: string;
  };
  lostReportDetails?: {
    reportedAt: string;
    reportedBy: string;
    lastKnownGate: string;
    notes: string;
  };
}

export interface Gate {
  id: string;
  code: string;         // e.g. GATE-1
  name: string;         // e.g. Gate 1 (Main Entrance)
  nameAmharic: string;  // e.g. በር 1 (ዋና መግቢያ)
  locationDescription: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'CLOSED';
  currentAssignedOfficer?: {
    officerId: string;
    officerBadge: string;
    officerName: string;
    shift: string;
  };
  todayStats: {
    checkIns: number;
    checkOuts: number;
    visitors: number;
    incidents: number;
  };
}

export interface GateShift {
  id: string;
  gateId: string;
  gateName: string;
  shiftName: string;      // e.g. Morning Shift
  shiftNameAmharic: string;
  timeRange: string;      // e.g. 08:00 — 16:00
  assignedOfficerBadge: string;
  assignedOfficerName: string;
  date: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
}

export interface MovementTransaction {
  id: string;
  deviceId: string;
  deviceAssetId: string;
  deviceModel: string;
  deviceSerial: string;
  deviceType: DeviceType;
  ownerStudentId: string;
  ownerName: string;
  type: 'CHECK_IN' | 'CHECK_OUT';
  gateId: string;
  gateName: string;
  gateNameAmharic?: string;
  officerBadge: string;
  officerName: string;
  timestamp: string;
  previousStatus: DeviceStatus;
  newStatus: DeviceStatus;
  verifiedMethod: 'QR_SCAN' | 'SERIAL_SEARCH' | 'STUDENT_ID';
  crossGateNote?: string; // e.g. "Exited Gate 1, Returned through Gate 3"
}

export interface VisitorPass {
  id: string;
  passNumber: string;      // e.g. VP-2026-8812
  visitorName: string;
  visitorPhone: string;
  idNumber: string;        // National ID or Passport
  purpose: string;
  hostStudentOrStaff: string;
  hostDepartment: string;
  expectedArrival: string;
  expectedDeparture: string;
  status: 'EXPECTED' | 'INSIDE' | 'CHECKED_OUT' | 'EXPIRED' | 'DENIED';
  checkInTime?: string;
  checkOutTime?: string;
  gateId?: string;
  gateName?: string;
  officerBadge?: string;
  qrPayload: string;
}

export interface ExitRequest {
  id: string;
  requestNumber: string;  // e.g. EXT-2026-0042
  deviceId?: string;
  deviceDescription: string;
  serialNumber?: string;
  applicantName: string;
  applicantId: string;
  department: string;
  destination: string;    // e.g. INSA / Tech Expo / Off-campus Lab
  reason: string;
  expectedReturnDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'COMPLETED';
  submittedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  rejectionReason?: string;
}

export interface SecurityIncident {
  id: string;
  incidentNumber: string; // e.g. INC-2026-019
  type: 'DEVICE_MISMATCH' | 'UNKNOWN_DEVICE' | 'LOST_DEVICE' | 'UNAUTHORIZED_EXIT' | 'IDENTITY_MISMATCH' | 'VISITOR_ISSUE' | 'QR_PROBLEM' | 'OTHER';
  title: string;
  description: string;
  gateId: string;
  gateName: string;
  officerBadge: string;
  deviceAssetId?: string;
  deviceSerial?: string;
  studentId?: string;
  studentName?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  timestamp: string;
  resolutionNotes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorBadgeOrEmail: string;
  actorRole: UserRole;
  action: 'DEVICE_ENROLLED' | 'CHECK_IN' | 'CHECK_OUT' | 'LOST_REPORTED' | 'INCIDENT_CREATED' | 'VISITOR_CHECK_IN' | 'VISITOR_CHECK_OUT' | 'EXIT_REQUEST_APPROVED' | 'SHIFT_ASSIGNED';
  resourceType: 'DEVICE' | 'GATE' | 'VISITOR' | 'INCIDENT' | 'REQUEST' | 'SHIFT';
  resourceId: string;
  gateId: string;
  gateName: string;
  details: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  timestamp: string;
  read: boolean;
  link?: string;
}
