import { api } from './api';

export type ClearanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ClearancePassState = 'NOT_ISSUED' | 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED' | 'REJECTED' | 'CANCELLED';

export interface ClearanceItem {
  id: string;
  item_name: string;
  quantity: number;
}

export interface BelongingsClearance {
  id: string;
  reference: string;
  student_id: string;
  student_name: string;
  student_campus_id: string | null;
  student_department: string | null;
  dormitory: string;
  room_number: string | null;
  intended_exit_at: string;
  remarks: string | null;
  status: ClearanceStatus;
  created_at: string;
  updated_at: string;
  decided_by_id: string | null;
  proctor_name: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  pass_expires_at: string | null;
  pass_revoked_at: string | null;
  pass_revocation_reason: string | null;
  pass_used_at: string | null;
  exit_officer_id: string | null;
  exit_gate_id: string | null;
  exit_recorded_at: string | null;
  exit_identity_verified: boolean;
  pass_state: ClearancePassState;
  is_pass_valid: boolean;
  pass_token: string | null;
  items: ClearanceItem[];
}

export interface CreateBelongingsClearance {
  submission_key: string;
  dormitory: string;
  room_number?: string | null;
  intended_exit_at: string;
  remarks?: string | null;
  items: Array<{ item_name: string; quantity: number }>;
}

export interface ClearanceLookup {
  token?: string;
  reference?: string;
}

export interface GateClearanceLookup {
  clearance: BelongingsClearance;
  is_valid: boolean;
  validation_message: string;
}

export async function listStudentClearancesApi(): Promise<BelongingsClearance[]> {
  return api.get<BelongingsClearance[]>('/belongings-clearances/student');
}

export async function createBelongingsClearanceApi(
  payload: CreateBelongingsClearance,
): Promise<BelongingsClearance> {
  return api.post<BelongingsClearance>('/belongings-clearances', payload);
}

export async function cancelBelongingsClearanceApi(
  clearanceId: string,
  reason?: string,
): Promise<BelongingsClearance> {
  return api.post<BelongingsClearance>(
    `/belongings-clearances/${encodeURIComponent(clearanceId)}/cancel`,
    reason ? { reason } : {},
  );
}

export async function listProctorClearancesApi(params: {
  search?: string;
  status?: ClearanceStatus;
  on_date?: string;
} = {}): Promise<BelongingsClearance[]> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.on_date) searchParams.set('on_date', params.on_date);
  const query = searchParams.toString();
  return api.get<BelongingsClearance[]>(`/belongings-clearances/proctor${query ? `?${query}` : ''}`);
}

export async function decideBelongingsClearanceApi(
  clearanceId: string,
  decision: 'approve' | 'reject',
  reason?: string,
): Promise<BelongingsClearance> {
  return api.post<BelongingsClearance>(
    `/belongings-clearances/proctor/${encodeURIComponent(clearanceId)}/${decision}`,
    decision === 'reject' ? { reason } : {},
  );
}

export async function listAdminClearancesApi(params: {
  search?: string;
  status?: ClearanceStatus;
} = {}): Promise<BelongingsClearance[]> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  const query = searchParams.toString();
  return api.get<BelongingsClearance[]>(`/belongings-clearances/admin${query ? `?${query}` : ''}`);
}

export async function lookupGateClearanceApi(
  lookup: ClearanceLookup,
): Promise<GateClearanceLookup> {
  return api.post<GateClearanceLookup>('/belongings-clearances/gate/validate', lookup);
}

export async function recordBelongingsExitApi(
  lookup: ClearanceLookup,
): Promise<BelongingsClearance> {
  return api.post<BelongingsClearance>('/belongings-clearances/gate/exit', {
    ...lookup,
    identity_verified: true,
  });
}

export async function reportBelongingsDiscrepancyApi(
  lookup: ClearanceLookup,
  reason: string,
): Promise<BelongingsClearance> {
  return api.post<BelongingsClearance>('/belongings-clearances/gate/discrepancy', {
    ...lookup,
    reason,
  });
}
