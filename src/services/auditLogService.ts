import { api } from './api';

export interface AuditLogRead {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  entity_type?: string;
  entity_id?: string;
  from_date?: string;
  to_date?: string;
}

export async function listAuditLogsApi(filters: AuditLogFilters = {}): Promise<AuditLogRead[]> {
  const params = new URLSearchParams();
  if (filters.action) params.set('action', filters.action);
  if (filters.entity_type) params.set('entity_type', filters.entity_type);
  if (filters.entity_id) params.set('entity_id', filters.entity_id);
  if (filters.from_date) params.set('from_date', filters.from_date);
  if (filters.to_date) params.set('to_date', filters.to_date);
  const qs = params.toString();
  return api.get<AuditLogRead[]>(`/audit-logs${qs ? `?${qs}` : ''}`);
}
