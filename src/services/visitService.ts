import { api } from './api';

export type BackendVisitStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'EXPIRED'
  | 'CANCELLED';

export type BackendIdentificationType =
  | 'NATIONAL_ID'
  | 'PASSPORT'
  | 'DRIVER_LICENSE'
  | 'OTHER';

export interface VisitRead {
  id: string;
  visitor_id: string;
  host_user_id: string;
  checkin_gate_id: string | null;
  checkout_gate_id: string | null;
  status: BackendVisitStatus;
  qr_code_value: string | null;
  expected_start_at: string;
  expected_end_at: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitorCreate {
  full_name: string;
  phone?: string;
  identification_type: BackendIdentificationType;
  identification_number: string;
  organization?: string;
  purpose?: string;
}

export interface VisitCreateBody {
  visitor: VisitorCreate;
  host_user_id: string;
  expected_start_at: string;
  expected_end_at: string;
}

export interface VisitFilters {
  status?: BackendVisitStatus;
  host_user_id?: string;
  visitor_id?: string;
  on_date?: string;
}

export async function listVisitsApi(filters: VisitFilters = {}): Promise<VisitRead[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.host_user_id) params.set('host_user_id', filters.host_user_id);
  if (filters.visitor_id) params.set('visitor_id', filters.visitor_id);
  if (filters.on_date) params.set('on_date', filters.on_date);
  const qs = params.toString();
  return api.get<VisitRead[]>(`/visits${qs ? `?${qs}` : ''}`);
}

export async function createVisitApi(body: VisitCreateBody): Promise<VisitRead> {
  return api.post<VisitRead>('/visits', body);
}

export async function approveVisitApi(visitId: string): Promise<VisitRead> {
  return api.post<VisitRead>(`/visits/${visitId}/approve`);
}

export async function rejectVisitApi(visitId: string): Promise<VisitRead> {
  return api.post<VisitRead>(`/visits/${visitId}/reject`);
}

export async function checkInVisitApi(visitId: string): Promise<VisitRead> {
  return api.post<VisitRead>(`/visits/${visitId}/check-in`, {});
}

export async function checkOutVisitApi(visitId: string): Promise<VisitRead> {
  return api.post<VisitRead>(`/visits/${visitId}/check-out`, {});
}
