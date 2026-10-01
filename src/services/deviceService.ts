import { api } from './api';

// ---------------------------------------------------------------------------
// Backend enum mirrors
// ---------------------------------------------------------------------------

/** Backend DeviceType enum values — must match app/models/enums.py exactly. */
export type BackendDeviceType =
  | 'LAPTOP'
  | 'TABLET'
  | 'PHONE'
  | 'CAMERA'
  | 'MONITOR'
  | 'OTHER';

export type BackendDeviceStatus =
  | 'INSIDE_CAMPUS'
  | 'OUTSIDE_CAMPUS'
  | 'LOST'
  | 'REPORTED_LOST';

export type BackendMovementType = 'CHECK_IN' | 'CHECK_OUT';

// ---------------------------------------------------------------------------
// Frontend DeviceType → Backend DeviceType mapping
//
// The frontend uses human-readable strings; the backend uses uppercase enums.
// PROJECTOR and LAB_EQUIPMENT have no backend equivalent → map to OTHER.
// ---------------------------------------------------------------------------

const DEVICE_TYPE_MAP: Record<string, BackendDeviceType> = {
  Laptop: 'LAPTOP',
  Tablet: 'TABLET',
  Phone: 'PHONE',
  Camera: 'CAMERA',
  Monitor: 'MONITOR',
  Projector: 'OTHER',       // no backend enum — mapped to OTHER
  'Lab Equipment': 'OTHER', // no backend enum — mapped to OTHER
  Other: 'OTHER',
};

export function toBackendDeviceType(frontendType: string): BackendDeviceType {
  return DEVICE_TYPE_MAP[frontendType] ?? 'OTHER';
}

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

export interface DeviceRead {
  id: string;
  asset_id: string;
  serial_number: string;
  device_type: BackendDeviceType;
  brand: string | null;
  model: string | null;
  owner_id: string;
  status: BackendDeviceStatus;
  qr_code_value: string;
  registered_at: string;
  created_at: string;
  updated_at: string;
}

export interface MovementDeviceInfo {
  id: string;
  asset_id: string;
  serial_number: string;
  device_type: BackendDeviceType;
  brand: string | null;
  model: string | null;
}

export interface MovementOfficerInfo {
  id: string;
  full_name: string;
  email: string;
}

export interface MovementGateInfo {
  id: string;
  name: string;
  code: string;
}

export interface MovementResponse {
  movement_id: string;
  movement_type: BackendMovementType;
  previous_status: BackendDeviceStatus;
  new_status: BackendDeviceStatus;
  occurred_at: string;
  device: MovementDeviceInfo;
  officer: MovementOfficerInfo;
  gate: MovementGateInfo;
  notes: string | null;
}

export interface IncidentRead {
  id: string;
  device_id: string | null;
  reported_by: string;
  gate_id: string | null;
  incident_type: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Request shapes
// ---------------------------------------------------------------------------

export interface EnrollDeviceRequest {
  serial_number: string;
  device_type: BackendDeviceType;
  brand?: string;
  model?: string;
  owner_id?: string; // UUID — required for GATE_OFFICER/ADMIN
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function enrollDeviceApi(body: EnrollDeviceRequest): Promise<DeviceRead> {
  return api.post<DeviceRead>('/devices', body);
}

export async function getDeviceApi(deviceId: string): Promise<DeviceRead> {
  return api.get<DeviceRead>(`/devices/${deviceId}`);
}

export async function checkOutDeviceApi(
  deviceId: string,
  notes?: string,
): Promise<MovementResponse> {
  return api.post<MovementResponse>(`/devices/${deviceId}/check-out`, { notes: notes ?? null });
}

export async function checkInDeviceApi(
  deviceId: string,
  notes?: string,
): Promise<MovementResponse> {
  return api.post<MovementResponse>(`/devices/${deviceId}/check-in`, { notes: notes ?? null });
}

export async function reportLostApi(
  deviceId: string,
  description?: string,
): Promise<IncidentRead> {
  return api.post<IncidentRead>(`/devices/${deviceId}/report-lost`, {
    description: description ?? 'Device reported as lost by owner',
  });
}

export async function recoverDeviceApi(
  deviceId: string,
  resultingStatus: 'INSIDE_CAMPUS' | 'OUTSIDE_CAMPUS',
  description?: string,
): Promise<DeviceRead> {
  return api.post<DeviceRead>(`/devices/${deviceId}/recover`, {
    resulting_status: resultingStatus,
    description: description ?? null,
  });
}
