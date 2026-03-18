import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export interface Client {
  id: string;
  code: string;
  name: string;
  business_context?: string;
  critical_services?: string;
  sla_tier?: string;
  primary_contact?: string;
  escalation_path?: string;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  record_id: string;
  name: string;
  environment_id: string;
  product_type: string;
  vendor?: string;
  lifecycle_state: string;
  health_status: string;
  technical_owner?: string;
  last_validated?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Runbook {
  id: string;
  product_id: string;
  title: string;
  trigger?: string;
  pre_checks?: string;
  steps?: string;
  validation?: string;
  rollback?: string;
  escalation?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChangeRequest {
  id: string;
  record_id: string;
  product_id: string;
  title: string;
  description?: string;
  rationale?: string;
  impact?: string;
  implementation_plan?: string;
  validation_plan?: string;
  rollback_plan?: string;
  itil_category?: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ExceptionRecord {
  id: string;
  record_id: string;
  product_id: string;
  title: string;
  reason?: string;
  risk_introduced?: string;
  compensating_controls?: string;
  cobit_control?: string;
  expiry_date?: string;
  status: string;
  is_expired: boolean;
  days_until_expiry?: number | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceRecord {
  id: string;
  product_id: string;
  title: string;
  artifact_type: string;
  storage_path?: string;
  file_name?: string;
  mime_type?: string;
  cobit_control?: string;
  itil_process?: string;
  related_change_id?: string;
  captured_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
  detail?: string | null;
  created_at: string;
}

export const clientsApi = {
  list: () => api.get<Client[]>("/clients/"),
  get: (id: string) => api.get<Client>(`/clients/${id}`),
  create: (data: Omit<Client, "id" | "created_at" | "updated_at">) => api.post<Client>("/clients/", data),
  update: (id: string, data: Partial<Client>) => api.patch<Client>(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

export const environmentsApi = {
  list: (client_id?: string) => api.get<Environment[]>("/environments/", { params: { client_id } }),
  get: (id: string) => api.get<Environment>(`/environments/${id}`),
  create: (data: Omit<Environment, "id" | "created_at" | "updated_at">) => api.post<Environment>("/environments/", data),
  update: (id: string, data: Partial<Environment>) => api.patch<Environment>(`/environments/${id}`, data),
  delete: (id: string) => api.delete(`/environments/${id}`),
};

export const productsApi = {
  list: (environment_id?: string) => api.get<Product[]>("/products/", { params: { environment_id } }),
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: Omit<Product, "id" | "created_at" | "updated_at">) => api.post<Product>("/products/", data),
  update: (id: string, data: Partial<Product>) => api.patch<Product>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  transition: (id: string, target_state: string, reason?: string) =>
    api.post<Product>(`/products/${id}/transition`, { target_state, reason }),
  nextId: (environment_id: string) =>
    api.get<{ record_id: string }>("/products/next-id", { params: { environment_id } }),
};

export const runbooksApi = {
  list: (product_id?: string) => api.get<Runbook[]>("/runbooks/", { params: { product_id } }),
  get: (id: string) => api.get<Runbook>(`/runbooks/${id}`),
  create: (data: Omit<Runbook, "id" | "created_at" | "updated_at">) => api.post<Runbook>("/runbooks/", data),
  update: (id: string, data: Partial<Runbook>) => api.patch<Runbook>(`/runbooks/${id}`, data),
  delete: (id: string) => api.delete(`/runbooks/${id}`),
};

export const changesApi = {
  list: (product_id?: string) => api.get<ChangeRequest[]>("/changes/", { params: { product_id } }),
  get: (id: string) => api.get<ChangeRequest>(`/changes/${id}`),
  create: (data: Omit<ChangeRequest, "id" | "created_at" | "updated_at" | "approved_by" | "approved_at">) =>
    api.post<ChangeRequest>("/changes/", data),
  update: (id: string, data: Partial<ChangeRequest>) => api.patch<ChangeRequest>(`/changes/${id}`, data),
  delete: (id: string) => api.delete(`/changes/${id}`),
  submit: (id: string) => api.post<ChangeRequest>(`/changes/${id}/submit`),
  approve: (id: string, comment?: string) => api.post<ChangeRequest>(`/changes/${id}/approve`, { comment }),
  reject: (id: string, comment?: string) => api.post<ChangeRequest>(`/changes/${id}/reject`, { comment }),
  nextId: (client_id: string) =>
    api.get<{ record_id: string }>("/changes/next-id", { params: { client_id } }),
};

export const exceptionsApi = {
  list: (product_id?: string) => api.get<ExceptionRecord[]>("/exceptions/", { params: { product_id } }),
  get: (id: string) => api.get<ExceptionRecord>(`/exceptions/${id}`),
  create: (data: Omit<ExceptionRecord, "id" | "created_at" | "updated_at" | "is_expired" | "days_until_expiry">) =>
    api.post<ExceptionRecord>("/exceptions/", data),
  update: (id: string, data: Partial<ExceptionRecord>) => api.patch<ExceptionRecord>(`/exceptions/${id}`, data),
  delete: (id: string) => api.delete(`/exceptions/${id}`),
  nextId: (client_id: string) =>
    api.get<{ record_id: string }>("/exceptions/next-id", { params: { client_id } }),
};

export const evidenceApi = {
  list: (product_id?: string) => api.get<EvidenceRecord[]>("/evidence/", { params: { product_id } }),
  get: (id: string) => api.get<EvidenceRecord>(`/evidence/${id}`),
  upload: (formData: FormData) =>
    api.post<EvidenceRecord>("/evidence/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  downloadUrl: (id: string) =>
    api.get<{ url: string; file_name: string; expires_in_seconds: number }>(`/evidence/${id}/download-url`),
  delete: (id: string) => api.delete(`/evidence/${id}`),
};

export const auditApi = {
  list: (params?: {
    entity_type?: string;
    entity_id?: string;
    actor?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }) => api.get<AuditLog[]>("/audit/", { params }),
};
