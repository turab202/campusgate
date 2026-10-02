import { api } from './api';
import { BackendDeviceStatus, BackendDeviceType, BackendMovementType } from './deviceService';

export interface DeviceMovementRead {
  id: string;
  device_id: string;
  officer_id: string;
  gate_id: string;
  movement_type: BackendMovementType;
  occurred_at: string;
  notes: string | null;
  created_at: string;
}

export interface MovementFilters {
  device_id?: string;
  gate_id?: string;
  officer_id?: string;
  movement_type?: BackendMovementType;
  from_date?: string;
  to_date?: string;
}

export async function getDeviceMovementsApi(deviceId: string): Promise<DeviceMovementRead[]> {
  return api.get<DeviceMovementRead[]>(`/devices/${deviceId}/movements`);
}

export async function listMovementsApi(filters: MovementFilters = {}): Promise<DeviceMovementRead[]> {
  const params = new URLSearchParams();
  if (filters.device_id) params.set('device_id', filters.device_id);
  if (filters.gate_id) params.set('gate_id', filters.gate_id);
  if (filters.officer_id) params.set('officer_id', filters.officer_id);
  if (filters.movement_type) params.set('movement_type', filters.movement_type);
  if (filters.from_date) params.set('from_date', filters.from_date);
  if (filters.to_date) params.set('to_date', filters.to_date);
  const qs = params.toString();
  return api.get<DeviceMovementRead[]>(`/movements${qs ? `?${qs}` : ''}`);
}

// Re-export types used by consumers
export type { BackendDeviceType, BackendDeviceStatus, BackendMovementType };
