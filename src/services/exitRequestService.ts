import { api } from './api';

export type TemporaryExitRequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'COMPLETED';

export interface ExitRequestRead {
  id: string;
  request_number: string;
  device_id: string | null;
  device_description: string;
  serial_number: string | null;
  applicant_id: string;
  applicant_name: string;
  department: string | null;
  destination: string;
  reason: string;
  expected_return_date: string;
  status: TemporaryExitRequestStatus;
  submitted_date: string;
  reviewed_by: string | null;
  reviewed_by_id: string | null;
  reviewed_date: string | null;
  rejection_reason: string | null;
}

export interface CreateExitRequestPayload {
  device_id?: string;
  device_description: string;
  serial_number?: string | null;
  destination: string;
  reason: string;
  expected_return_date: string;
}

export interface RejectExitRequestPayload {
  rejection_reason: string;
}

export async function listExitRequestsApi(): Promise<ExitRequestRead[]> {
  return api.get<ExitRequestRead[]>('/exit-requests');
}

export async function createExitRequestApi(payload: CreateExitRequestPayload): Promise<ExitRequestRead> {
  return api.post<ExitRequestRead>('/exit-requests', payload);
}

export async function approveExitRequestApi(requestId: string): Promise<ExitRequestRead> {
  return api.patch<ExitRequestRead>(`/exit-requests/${requestId}/approve`);
}

export async function rejectExitRequestApi(requestId: string, body: RejectExitRequestPayload): Promise<ExitRequestRead> {
  return api.patch<ExitRequestRead>(`/exit-requests/${requestId}/reject`, body);
}
