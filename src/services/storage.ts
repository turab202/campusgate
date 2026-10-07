import {
  AuditLog,
  Device,
  Gate,
  GateOfficer,
  GateShift,
  MovementTransaction,
  SecurityIncident,
  Student,
  VisitorPass
} from '../types';

const STORAGE_KEYS = {
  DEVICES: 'campusgate_devices_v3',
  MOVEMENTS: 'campusgate_movements_v3',
  GATES: 'campusgate_gates_v3',
  OFFICERS: 'campusgate_officers_v3',
  SHIFTS: 'campusgate_shifts_v3',
  STUDENTS: 'campusgate_students_v3',
  VISITORS: 'campusgate_visitors_v3',
  INCIDENTS: 'campusgate_incidents_v3',
  AUDIT: 'campusgate_audit_v3'
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const item = storage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

// In-memory runtime with storage sync
class CampusGateStore {
  private devices: Device[] = loadFromStorage(STORAGE_KEYS.DEVICES, [] as Device[]);
  private movements: MovementTransaction[] = loadFromStorage(STORAGE_KEYS.MOVEMENTS, [] as MovementTransaction[]);
  private gates: Gate[] = loadFromStorage(STORAGE_KEYS.GATES, [] as Gate[]);
  private officers: GateOfficer[] = loadFromStorage(STORAGE_KEYS.OFFICERS, [] as GateOfficer[]);
  private shifts: GateShift[] = loadFromStorage(STORAGE_KEYS.SHIFTS, [] as GateShift[]);
  private students: Student[] = loadFromStorage(STORAGE_KEYS.STUDENTS, [] as Student[]);
  private visitors: VisitorPass[] = loadFromStorage(STORAGE_KEYS.VISITORS, [] as VisitorPass[]);
  private incidents: SecurityIncident[] = loadFromStorage(STORAGE_KEYS.INCIDENTS, [] as SecurityIncident[]);
  private auditLogs: AuditLog[] = loadFromStorage(STORAGE_KEYS.AUDIT, [] as AuditLog[]);

  // Listeners for reactive updates
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public resetAll(): void {
    this.devices = [];
    this.movements = [];
    this.gates = [];
    this.officers = [];
    this.shifts = [];
    this.students = [];
    this.visitors = [];
    this.incidents = [];
    this.auditLogs = [];

    const storage = getStorage();
    Object.values(STORAGE_KEYS).forEach((k) => storage?.removeItem(k));
    this.notify();
  }

  // --- Devices ---
  public getDevices(): Device[] {
    return [...this.devices];
  }

  public getDeviceById(id: string): Device | undefined {
    return this.devices.find((d) => d.id === id);
  }

  public getDeviceByAssetId(assetId: string): Device | undefined {
    const clean = assetId.trim().toUpperCase();
    return this.devices.find((d) => d.assetId.toUpperCase() === clean || d.qrPayload.toUpperCase() === clean);
  }

  public getDeviceBySerial(serial: string): Device | undefined {
    const clean = serial.trim().toUpperCase();
    return this.devices.find((d) => d.serialNumber.toUpperCase() === clean);
  }

  public searchDevice(query: string): Device | undefined {
    const q = query.trim().toUpperCase();
    if (!q) return undefined;
    return this.devices.find(
      (d) =>
        d.assetId.toUpperCase() === q ||
        d.serialNumber.toUpperCase() === q ||
        d.ownerStudentId.toUpperCase() === q ||
        d.ownerName.toUpperCase().includes(q)
    );
  }

  public enrollDevice(params: {
    student: Student;
    deviceType: Device['deviceType'];
    brand: string;
    model: string;
    serialNumber: string;
    notes?: string;
    gateId: string;
    officerBadge: string;
    officerName: string;
  }): { device: Device; error?: string } {
    const existing = this.getDeviceBySerial(params.serialNumber);
    if (existing) {
      return {
        device: existing,
        error: `Serial number ${params.serialNumber} is already enrolled to ${existing.ownerName} (${existing.assetId}). Rule 1: A device can only be enrolled once.`
      };
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const assetId = `CG-DEV-00${randomSuffix}`;
    const gate = this.gates.find((g) => g.id === params.gateId) || this.gates[0];

    const now = new Date();
    const timeString = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newDevice: Device = {
      id: `dev-${Date.now()}`,
      assetId,
      serialNumber: params.serialNumber.trim().toUpperCase(),
      brand: params.brand.trim(),
      model: params.model.trim(),
      deviceType: params.deviceType,
      ownerId: params.student.id,
      ownerName: params.student.name,
      ownerStudentId: params.student.studentId,
      ownerDepartment: params.student.department,
      status: 'INSIDE_CAMPUS',
      enrollmentDate: timeString,
      enrolledByOfficerBadge: params.officerBadge,
      enrolledAtGateId: params.gateId,
      qrPayload: assetId,
      notes: params.notes || 'Enrolled at gate terminal',
      lastMovement: {
        id: `mov-init-${Date.now()}`,
        type: 'CHECK_IN',
        gateId: gate.id,
        gateName: gate.name,
        officerBadge: params.officerBadge,
        officerName: params.officerName,
        timestamp: timeString
      }
    };

    this.devices.unshift(newDevice);
    saveToStorage(STORAGE_KEYS.DEVICES, this.devices);

    // Initial enrollment movement transaction
    const initialMov: MovementTransaction = {
      id: `mov-${Date.now()}`,
      deviceId: newDevice.id,
      deviceAssetId: newDevice.assetId,
      deviceModel: `${newDevice.brand} ${newDevice.model}`,
      deviceSerial: newDevice.serialNumber,
      deviceType: newDevice.deviceType,
      ownerStudentId: newDevice.ownerStudentId,
      ownerName: newDevice.ownerName,
      type: 'CHECK_IN',
      gateId: gate.id,
      gateName: gate.name,
      gateNameAmharic: gate.nameAmharic,
      officerBadge: params.officerBadge,
      officerName: params.officerName,
      timestamp: timeString,
      previousStatus: 'INSIDE_CAMPUS',
      newStatus: 'INSIDE_CAMPUS',
      verifiedMethod: 'QR_SCAN',
      crossGateNote: `Initial Enrollment at ${gate.name}`
    };

    this.movements.unshift(initialMov);
    saveToStorage(STORAGE_KEYS.MOVEMENTS, this.movements);

    // Gate stats bump
    gate.todayStats.checkIns += 1;
    saveToStorage(STORAGE_KEYS.GATES, this.gates);

    // Audit log
    this.addAuditLog({
      actorBadgeOrEmail: `${params.officerBadge} (${params.officerName})`,
      actorRole: 'OFFICER',
      action: 'DEVICE_ENROLLED',
      resourceType: 'DEVICE',
      resourceId: `${newDevice.assetId} (${newDevice.brand} ${newDevice.model})`,
      gateId: gate.id,
      gateName: gate.name,
      details: `Enrolled new personal device for student ${params.student.name} (${params.student.studentId}). Serial: ${newDevice.serialNumber}. Status set to INSIDE CAMPUS.`,
      result: 'SUCCESS'
    });

    this.notify();
    return { device: newDevice };
  }

  // --- Movements & Cross-Gate Check-In / Out ---
  public checkOutDevice(params: {
    deviceId: string;
    gateId: string;
    officerBadge: string;
    officerName: string;
    verifiedMethod?: MovementTransaction['verifiedMethod'];
  }): { success: boolean; message: string; movement?: MovementTransaction } {
    const dev = this.devices.find((d) => d.id === params.deviceId);
    if (!dev) return { success: false, message: 'Device not found' };

    if (dev.status === 'OUTSIDE_CAMPUS') {
      return {
        success: false,
        message: 'RULE 2: A device cannot be checked out if it is already OUTSIDE CAMPUS.'
      };
    }

    if (dev.status === 'LOST') {
      return {
        success: false,
        message: 'RULE 10: Device is flagged as LOST. Security warning active. Cannot check out.'
      };
    }

    const gate = this.gates.find((g) => g.id === params.gateId) || this.gates[0];
    const now = new Date();
    const timeString = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const prevStatus = dev.status;
    dev.status = 'OUTSIDE_CAMPUS';
    dev.lastMovement = {
      id: `mov-${Date.now()}`,
      type: 'CHECK_OUT',
      gateId: gate.id,
      gateName: gate.name,
      officerBadge: params.officerBadge,
      officerName: params.officerName,
      timestamp: timeString
    };

    saveToStorage(STORAGE_KEYS.DEVICES, this.devices);

    const movement: MovementTransaction = {
      id: `mov-${Date.now()}`,
      deviceId: dev.id,
      deviceAssetId: dev.assetId,
      deviceModel: `${dev.brand} ${dev.model}`,
      deviceSerial: dev.serialNumber,
      deviceType: dev.deviceType,
      ownerStudentId: dev.ownerStudentId,
      ownerName: dev.ownerName,
      type: 'CHECK_OUT',
      gateId: gate.id,
      gateName: gate.name,
      gateNameAmharic: gate.nameAmharic,
      officerBadge: params.officerBadge,
      officerName: params.officerName,
      timestamp: timeString,
      previousStatus: prevStatus,
      newStatus: 'OUTSIDE_CAMPUS',
      verifiedMethod: params.verifiedMethod || 'QR_SCAN'
    };

    this.movements.unshift(movement);
    saveToStorage(STORAGE_KEYS.MOVEMENTS, this.movements);

    gate.todayStats.checkOuts += 1;
    saveToStorage(STORAGE_KEYS.GATES, this.gates);

    this.addAuditLog({
      actorBadgeOrEmail: `${params.officerBadge} (${params.officerName})`,
      actorRole: 'OFFICER',
      action: 'CHECK_OUT',
      resourceType: 'DEVICE',
      resourceId: `${dev.assetId} (${dev.brand} ${dev.model})`,
      gateId: gate.id,
      gateName: gate.name,
      details: `Checked out device for ${dev.ownerName}. Serial: ${dev.serialNumber}. Status updated to OUTSIDE CAMPUS.`,
      result: 'SUCCESS'
    });

    this.notify();
    return { success: true, message: 'Check-out successfully completed.', movement };
  }

  public checkInDevice(params: {
    deviceId: string;
    gateId: string;
    officerBadge: string;
    officerName: string;
    verifiedMethod?: MovementTransaction['verifiedMethod'];
  }): { success: boolean; message: string; movement?: MovementTransaction; crossGate?: boolean } {
    const dev = this.devices.find((d) => d.id === params.deviceId);
    if (!dev) return { success: false, message: 'Device not found' };

    if (dev.status === 'INSIDE_CAMPUS') {
      return {
        success: false,
        message: 'RULE 3: A device cannot be checked in if it is already INSIDE CAMPUS.'
      };
    }

    if (dev.status === 'LOST') {
      return {
        success: false,
        message: 'RULE 10: Device is flagged as LOST. Security warning active. Clearance required.'
      };
    }

    const gate = this.gates.find((g) => g.id === params.gateId) || this.gates[0];
    const prevGateId = dev.lastMovement?.gateId;
    const prevGateName = dev.lastMovement?.gateName || 'Previous Gate';
    const isCrossGate = prevGateId && prevGateId !== gate.id;

    const now = new Date();
    const timeString = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const prevStatus = dev.status;
    dev.status = 'INSIDE_CAMPUS';

    const crossGateNote = isCrossGate
      ? `Cross-Gate Entry: Exited via ${prevGateName}, returned through ${gate.name}`
      : undefined;

    dev.lastMovement = {
      id: `mov-${Date.now()}`,
      type: 'CHECK_IN',
      gateId: gate.id,
      gateName: gate.name,
      officerBadge: params.officerBadge,
      officerName: params.officerName,
      timestamp: timeString
    };

    saveToStorage(STORAGE_KEYS.DEVICES, this.devices);

    const movement: MovementTransaction = {
      id: `mov-${Date.now()}`,
      deviceId: dev.id,
      deviceAssetId: dev.assetId,
      deviceModel: `${dev.brand} ${dev.model}`,
      deviceSerial: dev.serialNumber,
      deviceType: dev.deviceType,
      ownerStudentId: dev.ownerStudentId,
      ownerName: dev.ownerName,
      type: 'CHECK_IN',
      gateId: gate.id,
      gateName: gate.name,
      gateNameAmharic: gate.nameAmharic,
      officerBadge: params.officerBadge,
      officerName: params.officerName,
      timestamp: timeString,
      previousStatus: prevStatus,
      newStatus: 'INSIDE_CAMPUS',
      verifiedMethod: params.verifiedMethod || 'QR_SCAN',
      crossGateNote
    };

    this.movements.unshift(movement);
    saveToStorage(STORAGE_KEYS.MOVEMENTS, this.movements);

    gate.todayStats.checkIns += 1;
    saveToStorage(STORAGE_KEYS.GATES, this.gates);

    this.addAuditLog({
      actorBadgeOrEmail: `${params.officerBadge} (${params.officerName})`,
      actorRole: 'OFFICER',
      action: 'CHECK_IN',
      resourceType: 'DEVICE',
      resourceId: `${dev.assetId} (${dev.brand} ${dev.model})`,
      gateId: gate.id,
      gateName: gate.name,
      details: isCrossGate
        ? `CROSS-GATE CHECK IN: Device previously exited from ${prevGateName}. Successfully re-entered campus through ${gate.name}. Verified by ${params.officerName}.`
        : `Device checked in by ${params.officerName} at ${gate.name}. Serial: ${dev.serialNumber}. Status set to INSIDE CAMPUS.`,
      result: 'SUCCESS'
    });

    this.notify();
    return {
      success: true,
      message: isCrossGate
        ? `Cross-gate return verified! Previous exit was from ${prevGateName}. Device is now INSIDE CAMPUS.`
        : 'Check-in verified successfully. Device is now INSIDE CAMPUS.',
      movement,
      crossGate: !!isCrossGate
    };
  }

  public reportLostDevice(deviceId: string, studentName: string): { success: boolean; message: string } {
    const dev = this.devices.find((d) => d.id === deviceId);
    if (!dev) return { success: false, message: 'Device not found' };

    dev.status = 'LOST';
    dev.lostReportDetails = {
      reportedAt: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      reportedBy: studentName,
      lastKnownGate: dev.lastMovement?.gateName || 'Unknown Gate',
      notes: 'Reported lost through student portal. Gate officers will receive warning on scan.'
    };

    saveToStorage(STORAGE_KEYS.DEVICES, this.devices);

    // Create incident
    this.createIncident({
      type: 'LOST_DEVICE',
      title: `Lost Device Alert: ${dev.brand} ${dev.model} (${dev.assetId})`,
      description: `Owner ${dev.ownerName} reported device lost. Serial: ${dev.serialNumber}. All gates are on security alert.`,
      gateId: dev.lastMovement?.gateId || 'gate-1',
      gateName: dev.lastMovement?.gateName || 'Gate 1',
      officerBadge: 'SYSTEM-ALERT',
      deviceAssetId: dev.assetId,
      deviceSerial: dev.serialNumber,
      studentId: dev.ownerStudentId,
      studentName: dev.ownerName,
      severity: 'HIGH'
    });

    this.addAuditLog({
      actorBadgeOrEmail: dev.ownerStudentId,
      actorRole: 'STUDENT',
      action: 'LOST_REPORTED',
      resourceType: 'DEVICE',
      resourceId: `${dev.assetId} (${dev.brand} ${dev.model})`,
      gateId: dev.lastMovement?.gateId || 'gate-1',
      gateName: dev.lastMovement?.gateName || 'Gate 1',
      details: `Student ${studentName} flagged personal device as LOST. Immediate alert disseminated across all campus gates.`,
      result: 'WARNING'
    });

    this.notify();
    return { success: true, message: 'Device status updated to LOST across all gate terminals.' };
  }

  public resolveLostDevice(deviceId: string, adminName: string): { success: boolean; message: string } {
    const dev = this.devices.find((d) => d.id === deviceId);
    if (!dev) return { success: false, message: 'Device not found' };

    dev.status = 'INSIDE_CAMPUS';
    delete dev.lostReportDetails;
    saveToStorage(STORAGE_KEYS.DEVICES, this.devices);

    this.addAuditLog({
      actorBadgeOrEmail: adminName,
      actorRole: 'ADMIN',
      action: 'CHECK_IN',
      resourceType: 'DEVICE',
      resourceId: `${dev.assetId} (${dev.brand} ${dev.model})`,
      gateId: 'ADMIN-SECURITY-OFFICE',
      gateName: 'Campus Security HQ',
      details: `Lost status cleared by administrator ${adminName} after ownership verification.`,
      result: 'SUCCESS'
    });

    this.notify();
    return { success: true, message: 'Lost flag cleared. Device restored to INSIDE CAMPUS.' };
  }

  // --- Movements & History ---
  public getMovements(): MovementTransaction[] {
    return [...this.movements];
  }

  public getMovementsForDevice(deviceId: string): MovementTransaction[] {
    return this.movements.filter((m) => m.deviceId === deviceId);
  }

  // --- Gates & Shifts ---
  public getGates(): Gate[] {
    return this.gates.map((g) => {
      if (g.id === 'gate-1') return { ...g, name: 'Gate 1', nameAmharic: 'በር 1' };
      if (g.id === 'gate-2') return { ...g, name: 'Gate 2', nameAmharic: 'በር 2' };
      if (g.id === 'gate-3') return { ...g, name: 'Gate 3', nameAmharic: 'በር 3' };
      return g;
    });
  }

  public getShifts(): GateShift[] {
    return [...this.shifts];
  }

  public getOfficers(): GateOfficer[] {
    return [...this.officers];
  }

  public getStudents(): Student[] {
    return [...this.students];
  }

  public assignOfficerShift(officerId: string, gateId: string, shiftName: string): void {
    const officer = this.officers.find((o) => o.id === officerId);
    const gate = this.gates.find((g) => g.id === gateId);
    if (!officer || !gate) return;

    officer.assignedGateId = gateId;
    officer.currentShift = shiftName;
    gate.currentAssignedOfficer = {
      officerId: officer.id,
      officerBadge: officer.officerBadgeId,
      officerName: officer.name,
      shift: shiftName
    };

    saveToStorage(STORAGE_KEYS.OFFICERS, this.officers);
    saveToStorage(STORAGE_KEYS.GATES, this.gates);

    this.addAuditLog({
      actorBadgeOrEmail: 'ADMIN-DISPATCH',
      actorRole: 'ADMIN',
      action: 'SHIFT_ASSIGNED',
      resourceType: 'SHIFT',
      resourceId: `${gate.name} - ${shiftName}`,
      gateId: gate.id,
      gateName: gate.name,
      details: `Officer ${officer.name} (${officer.officerBadgeId}) assigned to ${gate.name} on ${shiftName}.`,
      result: 'SUCCESS'
    });

    this.notify();
  }

  // --- Visitors ---
  public getVisitors(): VisitorPass[] {
    return [...this.visitors];
  }

  public createVisitorPass(params: Omit<VisitorPass, 'id' | 'passNumber' | 'status' | 'qrPayload'>): VisitorPass {
    const passNumber = `VP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPass: VisitorPass = {
      ...params,
      id: `vis-${Date.now()}`,
      passNumber,
      status: 'EXPECTED',
      qrPayload: passNumber
    };

    this.visitors.unshift(newPass);
    saveToStorage(STORAGE_KEYS.VISITORS, this.visitors);
    this.notify();
    return newPass;
  }

  public checkInVisitor(passId: string, gateId: string, officerBadge: string): { success: boolean; message: string } {
    const vis = this.visitors.find((v) => v.id === passId || v.passNumber === passId);
    if (!vis) return { success: false, message: 'Visitor pass not found' };

    const gate = this.gates.find((g) => g.id === gateId) || this.gates[0];
    const now = new Date();
    const timeString = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    vis.status = 'INSIDE';
    vis.checkInTime = timeString;
    vis.gateId = gate.id;
    vis.gateName = gate.name;
    vis.officerBadge = officerBadge;

    gate.todayStats.visitors += 1;

    saveToStorage(STORAGE_KEYS.VISITORS, this.visitors);
    saveToStorage(STORAGE_KEYS.GATES, this.gates);

    this.addAuditLog({
      actorBadgeOrEmail: officerBadge,
      actorRole: 'OFFICER',
      action: 'VISITOR_CHECK_IN',
      resourceType: 'VISITOR',
      resourceId: `${vis.passNumber} (${vis.visitorName})`,
      gateId: gate.id,
      gateName: gate.name,
      details: `Visitor ${vis.visitorName} verified and admitted. Host: ${vis.hostStudentOrStaff}.`,
      result: 'SUCCESS'
    });

    this.notify();
    return { success: true, message: `Visitor ${vis.visitorName} checked in successfully.` };
  }

  public checkOutVisitor(passId: string, gateId: string, officerBadge: string): { success: boolean; message: string } {
    const vis = this.visitors.find((v) => v.id === passId || v.passNumber === passId);
    if (!vis) return { success: false, message: 'Visitor pass not found' };

    const gate = this.gates.find((g) => g.id === gateId) || this.gates[0];
    const now = new Date();
    const timeString = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    vis.status = 'CHECKED_OUT';
    vis.checkOutTime = timeString;

    saveToStorage(STORAGE_KEYS.VISITORS, this.visitors);

    this.addAuditLog({
      actorBadgeOrEmail: officerBadge,
      actorRole: 'OFFICER',
      action: 'VISITOR_CHECK_OUT',
      resourceType: 'VISITOR',
      resourceId: `${vis.passNumber} (${vis.visitorName})`,
      gateId: gate.id,
      gateName: gate.name,
      details: `Visitor ${vis.visitorName} departed campus through ${gate.name}.`,
      result: 'SUCCESS'
    });

    this.notify();
    return { success: true, message: `Visitor ${vis.visitorName} checked out.` };
  }

  // --- Incidents ---
  public getIncidents(): SecurityIncident[] {
    return [...this.incidents];
  }

  public createIncident(params: Omit<SecurityIncident, 'id' | 'incidentNumber' | 'status' | 'timestamp'>): SecurityIncident {
    const num = `INC-2026-0${this.incidents.length + 20}`;
    const newInc: SecurityIncident = {
      ...params,
      id: `inc-${Date.now()}`,
      incidentNumber: num,
      status: 'OPEN',
      timestamp: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    };

    this.incidents.unshift(newInc);
    saveToStorage(STORAGE_KEYS.INCIDENTS, this.incidents);

    const gate = this.gates.find((g) => g.id === params.gateId);
    if (gate) {
      gate.todayStats.incidents += 1;
      saveToStorage(STORAGE_KEYS.GATES, this.gates);
    }

    this.addAuditLog({
      actorBadgeOrEmail: params.officerBadge,
      actorRole: 'OFFICER',
      action: 'INCIDENT_CREATED',
      resourceType: 'INCIDENT',
      resourceId: `${newInc.incidentNumber} (${newInc.type})`,
      gateId: params.gateId,
      gateName: params.gateName,
      details: `Security Incident logged: ${newInc.title}. Severity: ${newInc.severity}.`,
      result: 'WARNING'
    });

    this.notify();
    return newInc;
  }

  public updateIncidentStatus(id: string, status: SecurityIncident['status'], notes?: string): void {
    const inc = this.incidents.find((i) => i.id === id);
    if (!inc) return;
    inc.status = status;
    if (notes) inc.resolutionNotes = notes;
    saveToStorage(STORAGE_KEYS.INCIDENTS, this.incidents);
    this.notify();
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const now = new Date();
    const timeString = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: timeString,
      ...entry
    };

    this.auditLogs.unshift(log);
    saveToStorage(STORAGE_KEYS.AUDIT, this.auditLogs);
  }
}

export const campusStore = new CampusGateStore();
