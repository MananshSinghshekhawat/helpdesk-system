const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

function getApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_API_BASE_URL environment variable')
  }

  return API_BASE_URL.replace(/\/$/, '')
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}

function getBearerToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem('access_token')
}

async function readErrorMessage(res: Response) {
  const text = await res.text().catch(() => '')
  if (!text) {
    return `API error: ${res.status}`
  }
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed === 'string') return parsed
    if (parsed?.message) return String(parsed.message)
    if (parsed?.detail) {
      if (typeof parsed.detail === 'string') return parsed.detail
      return JSON.stringify(parsed.detail)
    }
  } catch {
    // fallback to raw text
  }
  return text
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getBearerToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(buildUrl(path), {
    ...options,
    headers,
  })
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('access_token')
      window.localStorage.removeItem('user')
      window.location.href = '/login'
      return new Promise(() => {}) as Promise<T>
    }
    throw new Error(await readErrorMessage(res))
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

/* Auth (OTP Login) */

export interface SendOtpPayload {
  email: string
}

export interface SendOtpResponse {
  message: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
  role: string
  role_id: number
  organization_id: number
  department_id: number | null
  department_name: string | null
  permissions?: any[]
}

export interface VerifyOtpPayload {
  email: string
  otp: string
}

export interface VerifyOtpResponse {
  token: string
  user: AuthUser
}

export async function sendOtp(payload: SendOtpPayload): Promise<SendOtpResponse> {
  // Auth endpoints should NOT include Bearer token
  const res = await fetch(buildUrl('/api/v1/auth/send-otp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  return res.json()
}

export async function verifyOtp(payload: VerifyOtpPayload): Promise<VerifyOtpResponse> {
  // Auth endpoints should NOT include Bearer token
  const res = await fetch(buildUrl('/api/v1/auth/verify-otp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }

  return res.json()
}

/*  Analytics */

export interface AIAnalyticsResponse {
  ai_resolution_rate: number
  avg_confidence: number
  human_override_rate: number
}

export async function getAiAnalytics(): Promise<AIAnalyticsResponse> {
  return apiFetch('/api/v1/analytics/ai')
}

/* Tickets */

export interface TicketSummary {
  id: number
  subject: string
  status: string
  ai_enabled: boolean
  created_at: string
  customer?: {
    name: string
    email: string
  }
}

export interface TicketMessage {
  sender_type: 'customer' | 'human' | 'ai' | 'system'
  message_body: string
  created_at: string
  attachments?: { url: string; filename: string }[]
}

export interface TicketDetail {
  ticket: TicketSummary
  messages: TicketMessage[]
}

export interface CreateTicketPayload {
  customer: {
    name: string
    email: string
  }
  subject: string
  message: string
  channel: 'email' | 'web' | 'api'
}

export interface ReplyToTicketPayload {
  message: string
  cc?: string
  bcc?: string
  files?: File[]
}

export type AIAgentType = 'router' | 'delivery' | 'sales' | 'billing' | 'support'

export interface AIDraft {
  draft_id: number
  draft_text: string
  confidence_score: number
}

export async function getPublicDepartments(): Promise<{ id: number; name: string }[]> {
  return apiFetch('/api/v1/tickets/departments/list')
}

export async function transferTicket(ticketId: string | number, departmentId: number): Promise<TicketSummary> {
  return apiFetch(`/api/v1/tickets/${ticketId}/transfer`, {
    method: 'PATCH',
    body: JSON.stringify({ department_id: departmentId }),
  })
}

export async function closeTicket(ticketId: string | number): Promise<TicketSummary> {
  return apiFetch(`/api/v1/tickets/${ticketId}/close`, {
    method: 'PATCH',
  })
}

export async function listTickets(departmentId?: string | number): Promise<TicketSummary[]> {
  const url = departmentId ? `/api/v1/tickets?department_id=${departmentId}` : '/api/v1/tickets'
  return apiFetch(url)
}

export async function getTicket(ticketId: string | number): Promise<TicketDetail> {
  return apiFetch(`/api/v1/tickets/${ticketId}`)
}

export async function createTicket(payload: CreateTicketPayload): Promise<TicketSummary> {
  return apiFetch('/api/v1/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function replyToTicket(
  ticketId: string | number,
  payload: ReplyToTicketPayload
): Promise<TicketMessage> {
  const formData = new FormData()
  formData.append('message', payload.message)
  if (payload.cc) formData.append('cc', payload.cc)
  if (payload.bcc) formData.append('bcc', payload.bcc)
  if (payload.files) {
    payload.files.forEach(f => formData.append('files', f))
  }

  return apiFetch(`/api/v1/tickets/${ticketId}/reply`, {
    method: 'POST',
    body: formData,
  })
}

export async function suggestAiReply(
  ticketId: string | number,
  ai_agent_type: AIAgentType
): Promise<AIDraft> {
  return apiFetch(`/api/v1/tickets/${ticketId}/ai/suggest`, {
    method: 'POST',
    body: JSON.stringify({ ai_agent_type }),
  })
}

export async function autoReplyTicket(
  ticketId: string | number,
  ai_agent_type: AIAgentType
): Promise<AIDraft> {
  return apiFetch(`/api/v1/tickets/${ticketId}/ai/auto-reply`, {
    method: 'POST',
    body: JSON.stringify({ ai_agent_type }),
  })
}

export async function listAiDrafts(ticketId: string | number): Promise<AIDraft[]> {
  return apiFetch(`/api/v1/tickets/${ticketId}/ai/drafts`)
}

export async function sendAiDraft(
  ticketId: string | number,
  draftId: number,
  editedText?: string
): Promise<AIDraft> {
  return apiFetch(`/api/v1/tickets/${ticketId}/ai/drafts/${draftId}/send`, {
    method: 'POST',
    body: JSON.stringify({
      edited_text: editedText ?? null,
    }),
  })
}

/*  AI Agents  */

export type AIAgentRole = 'router' | 'delivery' | 'sales' | 'billing' | 'support'

export interface AIAgentResponse {
  id: number
  name: string
  type: AIAgentRole
  confidence_threshold: number
  is_active: boolean
}

export interface AIAgentUpdatePayload {
  confidence_threshold: number
  is_active: boolean
}

export async function listAiAgents(): Promise<AIAgentResponse[]> {
  return apiFetch('/api/v1/ai-agents')
}

export async function updateAiAgent(
  agentId: string | number,
  payload: AIAgentUpdatePayload
): Promise<AIAgentResponse> {
  return apiFetch(`/api/v1/ai-agents/${agentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/*  Knowledge Bases  */

export interface KnowledgeBaseResponse {
  id: number
  name: string
  scope: 'common' | 'agent'
  agent_id: number | null
  created_at: string
}

export interface KnowledgeBaseCreatePayload {
  name: string
  scope: 'common' | 'agent'
  agent_id?: number | null
}

export interface KnowledgeDocumentResponse {
  id: number
  title: string
  type: 'pdf' | 'doc' | 'text'
  status: 'uploaded' | 'processing' | 'indexed' | 'failed'
  created_at: string
}

export async function listKnowledgeBases(scope?: 'common' | 'agent'): Promise<KnowledgeBaseResponse[]> {
  const params = new URLSearchParams()
  if (scope) params.set('scope', scope)
  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/api/v1/knowledge-bases${query}`)
}

export async function createKnowledgeBase(payload: KnowledgeBaseCreatePayload): Promise<KnowledgeBaseResponse> {
  return apiFetch('/api/v1/knowledge-bases', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listKnowledgeBaseDocuments(
  kbId: string | number
): Promise<KnowledgeDocumentResponse[]> {
  return apiFetch(`/api/v1/knowledge-bases/${kbId}/documents`)
}

export async function uploadKnowledgeBaseDocument(
  kbId: string | number,
  file: File
): Promise<KnowledgeDocumentResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiFetch(`/api/v1/knowledge-bases/${kbId}/documents`, {
    method: 'POST',
    body: formData,
  })
}

export async function reindexKnowledgeBase(
  kbId: string | number
): Promise<{ status: string; documents: number }> {
  return apiFetch(`/api/v1/knowledge-bases/${kbId}/reindex`, {
    method: 'POST',
  })
}

/*Skills */

export interface SkillResponse {
  id: number
  name: string
  endpoint_url: string
  http_method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  auth_type: 'none' | 'api_key' | 'oauth'
  timeout_ms: number
}

export interface SkillCreatePayload {
  name: string
  endpoint_url: string
  http_method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  auth_type: 'none' | 'api_key' | 'oauth'
  timeout_ms: number
}

export interface SkillAssignPayload {
  skill_id: number
}

export interface SkillTestPayload {
  payload: Record<string, unknown>
}

export interface AiAgentOption {
  id: number
  name: string
  type: string
  confidence_threshold: number
  is_active: boolean
}

export async function listSkills(): Promise<SkillResponse[]> {
  return apiFetch('/api/v1/skills')
}

export async function createSkill(payload: SkillCreatePayload): Promise<SkillResponse> {
  return apiFetch('/api/v1/skills', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function assignSkillToAgent(
  agentId: string | number,
  payload: SkillAssignPayload
): Promise<{ status: string; agent_id: number; skill_id: number }> {
  return apiFetch(`/api/v1/ai-agents/${agentId}/skills`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function testSkill(
  skillId: string | number,
  payload: SkillTestPayload
): Promise<{ status_code?: number; success?: boolean; response?: unknown; error?: string | null }> {
  return apiFetch(`/api/v1/skills/${skillId}/test`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listAiAgentOptions(): Promise<AiAgentOption[]> {
  return apiFetch('/api/v1/ai-agents')
}

/* ─────────────────────────────────────────────────────────────────────────
   Admin Panel – User Role Management
   ───────────────────────────────────────────────────────────────────────── */

export interface AdminUserResponse {
  id: number
  name: string | null
  email: string
  mobile: string | null
  department_id: number | null
  department_name: string | null
  role_id: number
  role_name: string | null
  organization_id: number
  user_status: string | null
  date_created: string | null
  date_modified: string | null
  user_created: number | null
  user_modified: number | null
}

export interface AdminUserListResponse {
  total: number
  skip: number
  limit: number
  users: AdminUserResponse[]
}

export interface AdminUserCreatePayload {
  name: string
  email: string
  mobile?: string
  department_id?: number
  role_id: number
  user_status?: string
}

export interface AdminUserUpdatePayload {
  name?: string
  mobile?: string
  department_id?: number
}

export interface AdminUserRoleUpdatePayload {
  role_id: number
}

export interface AdminUserStatusUpdatePayload {
  user_status: 'active' | 'inactive'
}

export interface AdminRoleResponse {
  id: number
  name: string
  permissions_json: unknown | null
  created_at: string | null
}

export interface AuditLogEntry {
  id: number
  action: string
  entity_type: string
  entity_id: number | null
  entity_name: string | null
  changed_by_user_id: number
  changed_by_user_name: string | null
  previous_value: unknown | null
  new_value: unknown | null
  description: string | null
  created_at: string
}

export interface AuditLogListResponse {
  total: number
  skip: number
  limit: number
  logs: AuditLogEntry[]
}

export async function adminListUsers(skip = 0, limit = 50): Promise<AdminUserListResponse> {
  return apiFetch(`/api/v1/admin/users?skip=${skip}&limit=${limit}`)
}

export async function adminGetUser(userId: number): Promise<AdminUserResponse> {
  return apiFetch(`/api/v1/admin/users/${userId}`)
}

export async function adminCreateUser(payload: AdminUserCreatePayload): Promise<AdminUserResponse> {
  return apiFetch('/api/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminUpdateUser(
  userId: number,
  payload: AdminUserUpdatePayload
): Promise<AdminUserResponse> {
  return apiFetch(`/api/v1/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function updateAdminUser(id: number, payload: Partial<Omit<AdminUserResponse, 'id'>>): Promise<AdminUserResponse> {
  return apiFetch<AdminUserResponse>(`/api/v1/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/* Departments */
export interface DepartmentResponse {
  id: number
  name: string
  is_archived: boolean
}

export async function getDepartments(): Promise<DepartmentResponse[]> {
  return apiFetch<DepartmentResponse[]>('/api/v1/admin/departments')
}

export async function adminCreateDepartment(payload: { name: string }): Promise<DepartmentResponse> {
  return apiFetch('/api/v1/admin/departments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminUpdateDepartment(id: number, payload: { name: string }): Promise<DepartmentResponse> {
  return apiFetch(`/api/v1/admin/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function adminArchiveDepartment(id: number): Promise<DepartmentResponse> {
  return apiFetch(`/api/v1/admin/departments/${id}/archive`, {
    method: 'PATCH',
  })
}

/* Mailboxes */
export async function adminUpdateUserRole(
  userId: number,
  payload: AdminUserRoleUpdatePayload
): Promise<AdminUserResponse> {
  return apiFetch(`/api/v1/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function adminUpdateUserStatus(
  userId: number,
  payload: AdminUserStatusUpdatePayload
): Promise<AdminUserResponse> {
  return apiFetch(`/api/v1/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function adminListRoles(): Promise<AdminRoleResponse[]> {
  return apiFetch('/api/v1/admin/roles')
}

export interface AdminRoleCreatePayload {
  name: string
  permissions_json: any
}

export interface AdminRoleUpdatePayload {
  name: string
  permissions_json: any
}

export async function adminCreateRole(payload: AdminRoleCreatePayload): Promise<AdminRoleResponse> {
  return apiFetch('/api/v1/admin/roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminUpdateRole(id: number, payload: AdminRoleUpdatePayload): Promise<AdminRoleResponse> {
  return apiFetch(`/api/v1/admin/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function adminArchiveRole(id: number): Promise<AdminRoleResponse> {
  return apiFetch(`/api/v1/admin/roles/${id}/archive`, {
    method: 'PATCH',
  })
}

export interface AdminPermissionResponse {
  id: number
  module_name: string
}

export interface AdminPermissionCreatePayload {
  module_name: string
}

export async function adminListPermissions(): Promise<AdminPermissionResponse[]> {
  return apiFetch('/api/v1/admin/roles/permissions')
}

export async function adminCreatePermission(payload: AdminPermissionCreatePayload): Promise<AdminPermissionResponse> {
  return apiFetch('/api/v1/admin/roles/permissions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function adminListAuditLogs(skip = 0, limit = 50): Promise<AuditLogListResponse> {
  return apiFetch(`/api/v1/admin/audit-logs?skip=${skip}&limit=${limit}`)
}
