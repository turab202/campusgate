import { api } from './api';

export interface GateRead {
  id: string;
  name: string;
  code: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GateCreate {
  name: string;
  code: string;
  location?: string;
}

export interface GateAssignmentRead {
  id: string;
  officer_id: string;
  gate_id: string;
  start_time: string;
  end_time: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GateAssignmentCreate {
  officer_id: string;
  gate_id: string;
  start_time: string;
  end_time?: string;
}

export interface AssignmentFilters {
  officer_id?: string;
  gate_id?: string;
  active_only?: boolean;
}

export async function listGatesApi(): Promise<GateRead[]> {
  return api.get<GateRead[]>('/gates');
}

export async function createGateApi(body: GateCreate): Promise<GateRead> {
  return api.post<GateRead>('/gates', body);
}

export async function listAssignmentsApi(filters: AssignmentFilters = {}): Promise<GateAssignmentRead[]> {
  const params = new URLSearchParams();
  if (filters.officer_id) params.set('officer_id', filters.officer_id);
  if (filters.gate_id) params.set('gate_id', filters.gate_id);
  if (filters.active_only) params.set('active_only', 'true');
  const qs = params.toString();
  return api.get<GateAssignmentRead[]>(`/gate-assignments${qs ? `?${qs}` : ''}`);
}

export async function createAssignmentApi(body: GateAssignmentCreate): Promise<GateAssignmentRead> {
  return api.post<GateAssignmentRead>('/gate-assignments', body);
}
