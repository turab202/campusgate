import { api } from './api';

export type BackendIncidentType =
  | 'LOST_DEVICE'
  | 'OWNER_MISMATCH'
  | 'UNAUTHORIZED_EXIT'
  | 'OTHER';

export type BackendIncidentStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'CLOSED';

export interface IncidentRead {
  id: string;
  device_id: string | null;
  reported_by: string;
  gate_id: string | null;
  incident_type: BackendIncidentType;
  description: string;
  status: BackendIncidentStatus;
  created_at: string;
  updated_at: string;
}

export interface IncidentCreateBody {
  incident_type: BackendIncidentType;
  description: string;
  device_id?: string;
  gate_id?: string;
}

export interface IncidentPatchBody {
  status: BackendIncidentStatus;
  description?: string;
}

export interface IncidentFilters {
  incident_type?: BackendIncidentType;
  status?: BackendIncidentStatus;
  device_id?: string;
}

export async function listIncidentsApi(filters: IncidentFilters = {}): Promise<IncidentRead[]> {
  const params = new URLSearchParams();
  if (filters.incident_type) params.set('incident_type', filters.incident_type);
  if (filters.status) params.set('status', filters.status);
  if (filters.device_id) params.set('device_id', filters.device_id);
  const qs = params.toString();
  return api.get<IncidentRead[]>(`/incidents${qs ? `?${qs}` : ''}`);
}

export async function createIncidentApi(body: IncidentCreateBody): Promise<IncidentRead> {
  return api.post<IncidentRead>('/incidents', body);
}

export async function patchIncidentApi(id: string, body: IncidentPatchBody): Promise<IncidentRead> {
  return api.patch<IncidentRead>(`/incidents/${id}`, body);
}
