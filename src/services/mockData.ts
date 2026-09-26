import { Device, Gate, GateOfficer, GateShift, MovementTransaction, SecurityIncident, Student, VisitorPass, ExitRequest, AuditLog } from '../types';

export const initialStudents: Student[] = [
  {
    id: 'stud-1',
    name: 'Zahra Mustefa',
    nameAmharic: 'ዛህራ ሙስጠፋ',
    email: 'zahra.mustefa@astu.edu.et',
    studentId: 'ASTU-2024-01234',
    department: 'Software Engineering',
    departmentAmharic: 'ሶፍትዌር ምህንድስና',
    batchYear: 2024,
    role: 'STUDENT',
    status: 'ACTIVE',
    phone: '+251 91 123 4567',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stud-2',
    name: 'Abebe Kebede',
    nameAmharic: 'አበበ ከበደ',
    email: 'abebe.kebede@astu.edu.et',
    studentId: 'ASTU-2023-04812',
    department: 'Electrical & Computer Engineering',
    departmentAmharic: 'ኤሌክትሪካል እና ኮምፒውተር ምህንድስና',
    batchYear: 2023,
    role: 'STUDENT',
    status: 'ACTIVE',
    phone: '+251 92 234 5678',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stud-3',
    name: 'Hana Tesfaye',
    nameAmharic: 'ሃና ተስፋዬ',
    email: 'hana.tesfaye@astu.edu.et',
    studentId: 'ASTU-2022-09121',
    department: 'Computer Science',
    departmentAmharic: 'ኮምፒውተር ሳይንስ',
    batchYear: 2022,
    role: 'STUDENT',
    status: 'ACTIVE',
    phone: '+251 93 345 6789',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stud-4',
    name: 'Mohammed Ahmed',
    nameAmharic: 'መሀመድ አህመድ',
    email: 'mohammed.ahmed@astu.edu.et',
    studentId: 'ASTU-2024-02381',
    department: 'Information Systems',
    departmentAmharic: 'ኢንፎርሜሽን ሲስተምስ',
    batchYear: 2024,
    role: 'STUDENT',
    status: 'ACTIVE',
    phone: '+251 94 456 7890',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stud-5',
    name: 'Meron Getachew',
    nameAmharic: 'ሜሮን ጌታቸው',
    email: 'meron.getachew@astu.edu.et',
    studentId: 'ASTU-2023-07441',
    department: 'Mechanical Engineering',
    departmentAmharic: 'ሜካኒካል ምህንድስና',
    batchYear: 2023,
    role: 'STUDENT',
    status: 'ACTIVE',
    phone: '+251 95 567 8901',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stud-6',
    name: 'Sara Ali',
    nameAmharic: 'ሳራ አሊ',
    email: 'sara.ali@astu.edu.et',
    studentId: 'ASTU-2024-05510',
    department: 'Architecture & Planning',
    departmentAmharic: 'አርክቴክቸር እና ፕላኒንግ',
    batchYear: 2024,
    role: 'STUDENT',
    status: 'ACTIVE',
    phone: '+251 96 678 9012',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  }
];

export const initialGates: Gate[] = [
  {
    id: 'gate-1',
    code: 'GATE-01',
    name: 'Gate 1',
    nameAmharic: 'በር 1',
    locationDescription: 'Main Ring Road, Boulevard Entrance & Vehicle Gate',
    status: 'ACTIVE',
    currentAssignedOfficer: {
      officerId: 'off-1',
      officerBadge: 'GO-023',
      officerName: 'Almaz Bekele',
      shift: '08:00 — 16:00'
    },
    todayStats: {
      checkIns: 142,
      checkOuts: 98,
      visitors: 24,
      incidents: 1
    }
  },
  {
    id: 'gate-2',
    code: 'GATE-02',
    name: 'Gate 2',
    nameAmharic: 'በር 2',
    locationDescription: 'North Campus, Library & Science Complex Pedestrian Access',
    status: 'ACTIVE',
    currentAssignedOfficer: {
      officerId: 'off-3',
      officerBadge: 'GO-011',
      officerName: 'Yared Lemma',
      shift: '08:00 — 16:00'
    },
    todayStats: {
      checkIns: 88,
      checkOuts: 64,
      visitors: 9,
      incidents: 0
    }
  },
  {
    id: 'gate-3',
    code: 'GATE-03',
    name: 'Gate 3',
    nameAmharic: 'በር 3',
    locationDescription: 'South Perimeter, Student Dormitories & Engineering Workshops',
    status: 'ACTIVE',
    currentAssignedOfficer: {
      officerId: 'off-2',
      officerBadge: 'GO-017',
      officerName: 'Tsegaye Haile',
      shift: '08:00 — 16:00'
    },
    todayStats: {
      checkIns: 124,
      checkOuts: 87,
      visitors: 19,
      incidents: 2
    }
  }
];

export const initialOfficers: GateOfficer[] = [
  {
    id: 'off-1',
    name: 'Almaz Bekele',
    nameAmharic: 'አልማዝ በቀለ',
    email: 'almaz.b@astu.security.et',
    role: 'OFFICER',
    officerBadgeId: 'GO-023',
    assignedGateId: 'gate-1',
    currentShift: '08:00 — 16:00',
    phone: '+251 91 888 1234',
    stationStatus: 'ON_DUTY',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'off-2',
    name: 'Tsegaye Haile',
    nameAmharic: 'ፀጋዬ ኃይሌ',
    email: 'tsegaye.h@astu.security.et',
    role: 'OFFICER',
    officerBadgeId: 'GO-017',
    assignedGateId: 'gate-3',
    currentShift: '08:00 — 16:00',
    phone: '+251 92 777 5678',
    stationStatus: 'ON_DUTY',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'off-3',
    name: 'Yared Lemma',
    nameAmharic: 'ያሬድ ለማ',
    email: 'yared.l@astu.security.et',
    role: 'OFFICER',
    officerBadgeId: 'GO-011',
    assignedGateId: 'gate-2',
    currentShift: '08:00 — 16:00',
    phone: '+251 93 666 9911',
    stationStatus: 'ON_DUTY',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'off-4',
    name: 'Aster Mengistu',
    nameAmharic: 'አስቴር መንግስቱ',
    email: 'aster.m@astu.security.et',
    role: 'OFFICER',
    officerBadgeId: 'GO-031',
    assignedGateId: 'gate-1',
    currentShift: '16:00 — 00:00',
    phone: '+251 94 555 4321',
    stationStatus: 'OFF_DUTY',
    avatarUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80'
  }
];

export const initialShifts: GateShift[] = [
  {
    id: 'shift-1',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    shiftName: 'Morning Duty',
    shiftNameAmharic: 'የጠዋት ፈረቃ',
    timeRange: '08:00 — 16:00',
    assignedOfficerBadge: 'GO-023',
    assignedOfficerName: 'Almaz Bekele',
    date: 'Today',
    status: 'ACTIVE'
  },
  {
    id: 'shift-2',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    shiftName: 'Evening Duty',
    shiftNameAmharic: 'የከሰዓት ፈረቃ',
    timeRange: '16:00 — 00:00',
    assignedOfficerBadge: 'GO-031',
    assignedOfficerName: 'Aster Mengistu',
    date: 'Today',
    status: 'SCHEDULED'
  },
  {
    id: 'shift-3',
    gateId: 'gate-3',
    gateName: 'Gate 3',
    shiftName: 'Morning Duty',
    shiftNameAmharic: 'የጠዋት ፈረቃ',
    timeRange: '08:00 — 16:00',
    assignedOfficerBadge: 'GO-017',
    assignedOfficerName: 'Tsegaye Haile',
    date: 'Today',
    status: 'ACTIVE'
  },
  {
    id: 'shift-4',
    gateId: 'gate-2',
    gateName: 'Gate 2',
    shiftName: 'Morning Duty',
    shiftNameAmharic: 'የጠዋት ፈረቃ',
    timeRange: '08:00 — 16:00',
    assignedOfficerBadge: 'GO-011',
    assignedOfficerName: 'Yared Lemma',
    date: 'Today',
    status: 'ACTIVE'
  }
];

export const initialDevices: Device[] = [
  {
    id: 'dev-1',
    assetId: 'CG-DEV-004821',
    serialNumber: 'PF123456',
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 3',
    deviceType: 'Laptop',
    ownerId: 'stud-1',
    ownerName: 'Zahra Mustefa',
    ownerStudentId: 'ASTU-2024-01234',
    ownerDepartment: 'Software Engineering',
    status: 'INSIDE_CAMPUS',
    enrollmentDate: '2026-09-12 09:18 AM',
    enrolledByOfficerBadge: 'GO-017',
    enrolledAtGateId: 'gate-3',
    qrPayload: 'CG-DEV-004821',
    notes: 'Matte black finish, university Wi-Fi sticker on chassis',
    lastMovement: {
      id: 'mov-101',
      type: 'CHECK_IN',
      gateId: 'gate-3',
      gateName: 'Gate 3',
      officerBadge: 'GO-017',
      officerName: 'Tsegaye Haile',
      timestamp: 'Today, 10:42 AM'
    }
  },
  {
    id: 'dev-2',
    assetId: 'CG-DEV-003190',
    serialNumber: 'C02K901XYZ',
    brand: 'Apple',
    model: 'MacBook Pro 14 M3',
    deviceType: 'Laptop',
    ownerId: 'stud-2',
    ownerName: 'Abebe Kebede',
    ownerStudentId: 'ASTU-2023-04812',
    ownerDepartment: 'Electrical & Computer Engineering',
    status: 'OUTSIDE_CAMPUS',
    enrollmentDate: '2026-08-20 11:30 AM',
    enrolledByOfficerBadge: 'GO-023',
    enrolledAtGateId: 'gate-1',
    qrPayload: 'CG-DEV-003190',
    notes: 'Space Gray, tiny scratch on bottom corner',
    lastMovement: {
      id: 'mov-102',
      type: 'CHECK_OUT',
      gateId: 'gate-1',
      gateName: 'Gate 1',
      officerBadge: 'GO-023',
      officerName: 'Almaz Bekele',
      timestamp: 'Yesterday, 4:32 PM'
    }
  },
  {
    id: 'dev-3',
    assetId: 'CG-DEV-005112',
    serialNumber: '8J2M144K90',
    brand: 'Dell',
    model: 'XPS 13 Plus 9320',
    deviceType: 'Laptop',
    ownerId: 'stud-3',
    ownerName: 'Hana Tesfaye',
    ownerStudentId: 'ASTU-2022-09121',
    ownerDepartment: 'Computer Science',
    status: 'LOST',
    enrollmentDate: '2026-07-15 02:45 PM',
    enrolledByOfficerBadge: 'GO-011',
    enrolledAtGateId: 'gate-2',
    qrPayload: 'CG-DEV-005112',
    notes: 'Platinum silver, reported misplaced at Central Library',
    lostReportDetails: {
      reportedAt: '2026-09-25 18:20 PM',
      reportedBy: 'Hana Tesfaye',
      lastKnownGate: 'Gate 2',
      notes: 'Reported lost after studying in Computer Science lab 3B.'
    },
    lastMovement: {
      id: 'mov-103',
      type: 'CHECK_IN',
      gateId: 'gate-2',
      gateName: 'Gate 2',
      officerBadge: 'GO-011',
      officerName: 'Yared Lemma',
      timestamp: '2026-09-25, 01:15 PM'
    }
  },
  {
    id: 'dev-4',
    assetId: 'CG-DEV-002844',
    serialNumber: 'DMPL9094AK',
    brand: 'Apple',
    model: 'iPad Pro 12.9 M2',
    deviceType: 'Tablet',
    ownerId: 'stud-4',
    ownerName: 'Mohammed Ahmed',
    ownerStudentId: 'ASTU-2024-02381',
    ownerDepartment: 'Information Systems',
    status: 'OUTSIDE_CAMPUS',
    enrollmentDate: '2026-08-01 10:10 AM',
    enrolledByOfficerBadge: 'GO-023',
    enrolledAtGateId: 'gate-1',
    qrPayload: 'CG-DEV-002844',
    notes: 'Magic Keyboard attached, space gray',
    lastMovement: {
      id: 'mov-104',
      type: 'CHECK_OUT',
      gateId: 'gate-1',
      gateName: 'Gate 1',
      officerBadge: 'GO-023',
      officerName: 'Almaz Bekele',
      timestamp: 'Today, 08:45 AM'
    }
  },
  {
    id: 'dev-5',
    assetId: 'CG-DEV-004101',
    serialNumber: '5CD9280J9X',
    brand: 'HP',
    model: 'EliteBook 840 G8',
    deviceType: 'Laptop',
    ownerId: 'stud-5',
    ownerName: 'Meron Getachew',
    ownerStudentId: 'ASTU-2023-07441',
    ownerDepartment: 'Mechanical Engineering',
    status: 'INSIDE_CAMPUS',
    enrollmentDate: '2026-06-10 03:00 PM',
    enrolledByOfficerBadge: 'GO-017',
    enrolledAtGateId: 'gate-3',
    qrPayload: 'CG-DEV-004101',
    notes: 'Silver, CAD software certification label',
    lastMovement: {
      id: 'mov-105',
      type: 'CHECK_IN',
      gateId: 'gate-1',
      gateName: 'Gate 1',
      officerBadge: 'GO-023',
      officerName: 'Almaz Bekele',
      timestamp: 'Today, 09:12 AM'
    }
  },
  {
    id: 'dev-6',
    assetId: 'CG-DEV-001099',
    serialNumber: 'EP-88210-LAB',
    brand: 'Epson',
    model: 'PowerLite EB-2250U 3LCD',
    deviceType: 'Projector',
    ownerId: 'stud-6',
    ownerName: 'Sara Ali',
    ownerStudentId: 'ASTU-2024-05510',
    ownerDepartment: 'Architecture & Planning',
    status: 'INSIDE_CAMPUS',
    enrollmentDate: '2026-05-18 10:00 AM',
    enrolledByOfficerBadge: 'GO-023',
    enrolledAtGateId: 'gate-1',
    qrPayload: 'CG-DEV-001099',
    notes: 'University Projector assigned for Architecture Defense and INSA exhibition',
    lastMovement: {
      id: 'mov-106',
      type: 'CHECK_IN',
      gateId: 'gate-3',
      gateName: 'Gate 3',
      officerBadge: 'GO-017',
      officerName: 'Tsegaye Haile',
      timestamp: 'Yesterday, 06:10 PM'
    }
  }
];

export const initialMovements: MovementTransaction[] = [
  {
    id: 'mov-201',
    deviceId: 'dev-1',
    deviceAssetId: 'CG-DEV-004821',
    deviceModel: 'Lenovo ThinkPad T14',
    deviceSerial: 'PF123456',
    deviceType: 'Laptop',
    ownerStudentId: 'ASTU-2024-01234',
    ownerName: 'Zahra Mustefa',
    type: 'CHECK_IN',
    gateId: 'gate-3',
    gateName: 'Gate 3',
    gateNameAmharic: 'በር 3',
    officerBadge: 'GO-017',
    officerName: 'Tsegaye Haile',
    timestamp: 'Today, 10:42 AM',
    previousStatus: 'OUTSIDE_CAMPUS',
    newStatus: 'INSIDE_CAMPUS',
    verifiedMethod: 'QR_SCAN',
    crossGateNote: 'Cross-Gate Entry: Exited via Gate 1 at 4:21 PM yesterday, returned via Gate 3.'
  },
  {
    id: 'mov-202',
    deviceId: 'dev-1',
    deviceAssetId: 'CG-DEV-004821',
    deviceModel: 'Lenovo ThinkPad T14',
    deviceSerial: 'PF123456',
    deviceType: 'Laptop',
    ownerStudentId: 'ASTU-2024-01234',
    ownerName: 'Zahra Mustefa',
    type: 'CHECK_OUT',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    gateNameAmharic: 'በር 1',
    officerBadge: 'GO-023',
    officerName: 'Almaz Bekele',
    timestamp: 'Yesterday, 4:21 PM',
    previousStatus: 'INSIDE_CAMPUS',
    newStatus: 'OUTSIDE_CAMPUS',
    verifiedMethod: 'QR_SCAN'
  },
  {
    id: 'mov-203',
    deviceId: 'dev-2',
    deviceAssetId: 'CG-DEV-003190',
    deviceModel: 'MacBook Pro 14 M3',
    deviceSerial: 'C02K901XYZ',
    deviceType: 'Laptop',
    ownerStudentId: 'ASTU-2023-04812',
    ownerName: 'Abebe Kebede',
    type: 'CHECK_OUT',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    gateNameAmharic: 'በር 1',
    officerBadge: 'GO-023',
    officerName: 'Almaz Bekele',
    timestamp: 'Yesterday, 4:32 PM',
    previousStatus: 'INSIDE_CAMPUS',
    newStatus: 'OUTSIDE_CAMPUS',
    verifiedMethod: 'QR_SCAN'
  },
  {
    id: 'mov-204',
    deviceId: 'dev-4',
    deviceAssetId: 'CG-DEV-002844',
    deviceModel: 'iPad Pro 12.9',
    deviceSerial: 'DMPL9094AK',
    deviceType: 'Tablet',
    ownerStudentId: 'ASTU-2024-02381',
    ownerName: 'Mohammed Ahmed',
    type: 'CHECK_OUT',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    gateNameAmharic: 'በር 1',
    officerBadge: 'GO-023',
    officerName: 'Almaz Bekele',
    timestamp: 'Today, 08:45 AM',
    previousStatus: 'INSIDE_CAMPUS',
    newStatus: 'OUTSIDE_CAMPUS',
    verifiedMethod: 'QR_SCAN'
  },
  {
    id: 'mov-205',
    deviceId: 'dev-5',
    deviceAssetId: 'CG-DEV-004101',
    deviceModel: 'HP EliteBook 840 G8',
    deviceSerial: '5CD9280J9X',
    deviceType: 'Laptop',
    ownerStudentId: 'ASTU-2023-07441',
    ownerName: 'Meron Getachew',
    type: 'CHECK_IN',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    gateNameAmharic: 'በር 1',
    officerBadge: 'GO-023',
    officerName: 'Almaz Bekele',
    timestamp: 'Today, 09:12 AM',
    previousStatus: 'OUTSIDE_CAMPUS',
    newStatus: 'INSIDE_CAMPUS',
    verifiedMethod: 'SERIAL_SEARCH',
    crossGateNote: 'Cross-Gate Entry: Exited via Gate 3 on Sept 25, entered via Gate 1.'
  }
];

export const initialVisitors: VisitorPass[] = [
  {
    id: 'vis-1',
    passNumber: 'VP-2026-8812',
    visitorName: 'Dawit Mengesha',
    visitorPhone: '+251 91 222 3344',
    idNumber: 'ETH-ID-9920194',
    purpose: 'Senior Project Defense External Evaluator',
    hostStudentOrStaff: 'Dr. Girma Hailu (Dept Head)',
    hostDepartment: 'Electrical & Computer Engineering',
    expectedArrival: 'Today, 09:30 AM',
    expectedDeparture: 'Today, 05:00 PM',
    status: 'INSIDE',
    checkInTime: 'Today, 09:40 AM',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    officerBadge: 'GO-023',
    qrPayload: 'VP-2026-8812'
  },
  {
    id: 'vis-2',
    passNumber: 'VP-2026-8815',
    visitorName: 'Selamawit Kebede',
    visitorPhone: '+251 92 333 4455',
    idNumber: 'ETH-ID-7721094',
    purpose: 'Visiting Student Sibling / Campus Tour',
    hostStudentOrStaff: 'Zahra Mustefa (ASTU-2024-01234)',
    hostDepartment: 'Software Engineering',
    expectedArrival: 'Today, 11:00 AM',
    expectedDeparture: 'Today, 04:00 PM',
    status: 'EXPECTED',
    qrPayload: 'VP-2026-8815'
  },
  {
    id: 'vis-3',
    passNumber: 'VP-2026-8809',
    visitorName: 'Yonas Berhanu (IT Tech Vendor)',
    visitorPhone: '+251 93 444 5566',
    idNumber: 'ETH-ID-4410291',
    purpose: 'Fiber Optic Network Cable Maintenance',
    hostStudentOrStaff: 'ICT Directorate',
    hostDepartment: 'Infrastructure Operations',
    expectedArrival: 'Today, 08:00 AM',
    expectedDeparture: 'Today, 12:00 PM',
    status: 'CHECKED_OUT',
    checkInTime: 'Today, 08:15 AM',
    checkOutTime: 'Today, 11:50 AM',
    gateId: 'gate-3',
    gateName: 'Gate 3',
    officerBadge: 'GO-017',
    qrPayload: 'VP-2026-8809'
  }
];

export const initialIncidents: SecurityIncident[] = [
  {
    id: 'inc-1',
    incidentNumber: 'INC-2026-019',
    type: 'LOST_DEVICE',
    title: 'Reported Lost Dell XPS 13 Flagged on Registry',
    description: 'Student Hana Tesfaye flagged Dell XPS 13 (Asset: CG-DEV-005112, Serial: 8J2M144K90) as misplaced in campus library.',
    gateId: 'gate-2',
    gateName: 'Gate 2',
    officerBadge: 'GO-011',
    deviceAssetId: 'CG-DEV-005112',
    deviceSerial: '8J2M144K90',
    studentId: 'ASTU-2022-09121',
    studentName: 'Hana Tesfaye',
    severity: 'HIGH',
    status: 'OPEN',
    timestamp: '2026-09-25 18:30 PM'
  },
  {
    id: 'inc-2',
    incidentNumber: 'INC-2026-018',
    type: 'DEVICE_MISMATCH',
    title: 'Serial Number Discrepancy on Laptop Base',
    description: 'Student presented a laptop whose chassis sticker matched, but BIOS internal serial diverged from enrolled system record.',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    officerBadge: 'GO-023',
    studentId: 'ASTU-2024-09918',
    studentName: 'Binyam Alemu',
    severity: 'MEDIUM',
    status: 'UNDER_REVIEW',
    timestamp: 'Yesterday, 14:10 PM',
    resolutionNotes: 'Dispatched to Campus IT Helpdesk for physical hardware inspection.'
  }
];

export const initialExitRequests: ExitRequest[] = [
  {
    id: 'ext-1',
    requestNumber: 'EXT-2026-0042',
    deviceId: 'dev-6',
    deviceDescription: 'Epson PowerLite EB-2250U 3LCD Projector',
    serialNumber: 'EP-88210-LAB',
    applicantName: 'Sara Ali',
    applicantId: 'ASTU-2024-05510',
    department: 'Architecture & Planning',
    destination: 'INSA (Information Network Security Administration) HQ, Addis Ababa',
    reason: 'Graduation Exhibition & Collaborative Smart Campus Defense Presentation',
    expectedReturnDate: '2026-09-29',
    status: 'APPROVED',
    submittedDate: '2026-09-24',
    reviewedBy: 'Col. Kassahun (Chief of Security)',
    reviewedDate: '2026-09-25'
  },
  {
    id: 'ext-2',
    requestNumber: 'EXT-2026-0045',
    deviceDescription: 'Dual Spectrum Digital Oscilloscope Tektronix TBS1052B',
    serialNumber: 'C019842-TEK',
    applicantName: 'Abebe Kebede',
    applicantId: 'ASTU-2023-04812',
    department: 'Electrical & Computer Engineering',
    destination: 'Ethiopian Electric Power Substation Lab',
    reason: 'Field Sensor Calibration for Capstone Thesis',
    expectedReturnDate: '2026-10-02',
    status: 'PENDING',
    submittedDate: 'Today, 08:30 AM'
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'aud-1',
    timestamp: 'Today, 10:42:14 AM',
    actorBadgeOrEmail: 'GO-017 (Tsegaye Haile)',
    actorRole: 'OFFICER',
    action: 'CHECK_IN',
    resourceType: 'DEVICE',
    resourceId: 'CG-DEV-004821 (Lenovo ThinkPad T14)',
    gateId: 'gate-3',
    gateName: 'Gate 3',
    details: 'Verified entry after prior exit from Gate 1. Physical serial verified PF123456.',
    result: 'SUCCESS'
  },
  {
    id: 'aud-2',
    timestamp: 'Today, 09:40:02 AM',
    actorBadgeOrEmail: 'GO-023 (Almaz Bekele)',
    actorRole: 'OFFICER',
    action: 'VISITOR_CHECK_IN',
    resourceType: 'VISITOR',
    resourceId: 'VP-2026-8812 (Dawit Mengesha)',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    details: 'National ID verified; visiting Dr. Girma Hailu for Senior Project Defense.',
    result: 'SUCCESS'
  },
  {
    id: 'aud-3',
    timestamp: 'Today, 09:12:30 AM',
    actorBadgeOrEmail: 'GO-023 (Almaz Bekele)',
    actorRole: 'OFFICER',
    action: 'CHECK_IN',
    resourceType: 'DEVICE',
    resourceId: 'CG-DEV-004101 (HP EliteBook 840)',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    details: 'Verified entry through serial lookup 5CD9280J9X.',
    result: 'SUCCESS'
  },
  {
    id: 'aud-4',
    timestamp: 'Today, 08:45:10 AM',
    actorBadgeOrEmail: 'GO-023 (Almaz Bekele)',
    actorRole: 'OFFICER',
    action: 'CHECK_OUT',
    resourceType: 'DEVICE',
    resourceId: 'CG-DEV-002844 (iPad Pro 12.9)',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    details: 'Student Mohammed Ahmed checked out with tablet.',
    result: 'SUCCESS'
  },
  {
    id: 'aud-5',
    timestamp: 'Yesterday, 18:20:44 PM',
    actorBadgeOrEmail: 'ASTU-2022-09121 (Hana Tesfaye)',
    actorRole: 'STUDENT',
    action: 'LOST_REPORTED',
    resourceType: 'DEVICE',
    resourceId: 'CG-DEV-005112 (Dell XPS 13)',
    gateId: 'gate-2',
    gateName: 'Gate 2',
    details: 'Device reported lost by owner. Security alert broadcast to all gates.',
    result: 'WARNING'
  },
  {
    id: 'aud-6',
    timestamp: 'Yesterday, 16:32:08 PM',
    actorBadgeOrEmail: 'GO-023 (Almaz Bekele)',
    actorRole: 'OFFICER',
    action: 'CHECK_OUT',
    resourceType: 'DEVICE',
    resourceId: 'CG-DEV-003190 (MacBook Pro 14)',
    gateId: 'gate-1',
    gateName: 'Gate 1',
    details: 'Student Abebe Kebede checked out for study off campus.',
    result: 'SUCCESS'
  }
];
