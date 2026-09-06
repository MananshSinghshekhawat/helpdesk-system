'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import {
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Pencil,
  Shield,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminUpdateUserRole,
  adminUpdateUserStatus,
  adminListRoles,
  getDepartments,
  type DepartmentResponse,
  type AdminUserResponse,
  type AdminRoleResponse,
} from '@/lib/api'
import * as yup from 'yup'

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

const userSchema = yup.object().shape({
  name: yup.string().trim().required('Name is required').test('no-empty-spaces', 'Name cannot be empty', val => val ? val.trim().length > 0 : false),
  email: yup.string().trim().required('Email is required').matches(emailRegex, 'Invalid email format (e.g. user@example.com)'),
  mobile: yup.string().trim().required('Mobile is required').matches(/^[0-9]{10}$/, 'Mobile must be exactly 10 digits'),
  department: yup.string().trim(),
  role_id: yup.string().required('Role is required'),
  user_status: yup.string().required('Status is required'),
})

const editUserSchema = yup.object().shape({
  name: yup.string().trim().required('Name is required').test('no-empty-spaces', 'Name cannot be empty', val => val ? val.trim().length > 0 : false),
  email: yup.string().trim().required('Email is required').matches(emailRegex, 'Invalid email format (e.g. user@example.com)'),
  mobile: yup.string().trim().required('Mobile is required').matches(/^[0-9]{10}$/, 'Mobile must be exactly 10 digits'),
  department: yup.string().trim(),
})

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(value: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

function roleBadgeClass(roleName: string | null) {
  const normalized = (roleName || '').toLowerCase().replace(/[\s_]+/g, '')
  switch (normalized) {
    case 'superadmin':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    case 'admin':
      return 'bg-blue-500/15 text-blue-500 border-blue-500/30'
    default:
      return 'bg-secondary text-secondary-foreground border-border'
  }
}

function statusBadgeClass(status: string | null) {
  return status === 'active'
    ? 'bg-green-500/15 text-green-600 border-green-500/30'
    : 'bg-red-500/15 text-red-500 border-red-500/30'
}

// ─── Modal helpers ───────────────────────────────────────────────────────────

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}
function Field({ label, error, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input
        className={`h-10 px-3 rounded-md border ${error ? 'border-red-500' : 'border-input'} bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
}
function SelectField({ label, error, children, ...props }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <select
        className={`h-10 px-3 rounded-md border ${error ? 'border-red-500' : 'border-input'} bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

export default function AdminUsersPage() {
  const { user } = useAuth()
  const rawRole = (user as { role?: string } | null)?.role || ''
  const isSuperAdmin = rawRole.toLowerCase().replace(/[\s_]+/g, '') === 'superadmin'

  // ── state ──
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [roles, setRoles] = useState<AdminRoleResponse[]>([])
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // modals
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<AdminUserResponse | null>(null)
  const [roleUser, setRoleUser] = useState<AdminUserResponse | null>(null)
  const [statusUser, setStatusUser] = useState<AdminUserResponse | null>(null)

  // form state
  const [form, setForm] = useState({ name: '', email: '', mobile: '', department_id: '', role_id: '', user_status: 'active' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [editForm, setEditForm] = useState({ name: '', email: '', mobile: '', department_id: '' })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [newRoleId, setNewRoleId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── fetch ──
  const fetchData = useCallback(async (offset = 0) => {
    setLoading(true)
    try {
      const [usersData, rolesData, deptsData] = await Promise.all([
        adminListUsers(offset, PAGE_SIZE),
        adminListRoles(),
        getDepartments(),
      ])
      setUsers(usersData.users)
      setTotal(usersData.total)
      setRoles(rolesData)
      setDepartments(deptsData)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(0) }, [fetchData])

  // ── pagination ──
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1

  const goToPage = (page: number) => {
    const offset = (page - 1) * PAGE_SIZE
    setSkip(offset)
    fetchData(offset)
  }

  // ── filtered list ──
  const filteredUsers = users
    .filter((u) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        u.email.toLowerCase().includes(q) ||
        (u.name ?? '').toLowerCase().includes(q) ||
        (u.role_name ?? '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  // ── create user ──
  const handleFieldChange = async (field: keyof typeof form, value: string) => {
    const updatedForm = { ...form, [field]: value }
    setForm(updatedForm)
    try {
      await userSchema.validateAt(field, updatedForm)
      setErrors((prev) => ({ ...prev, [field]: '' }))
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        setErrors((prev) => ({ ...prev, [field]: err.message }))
      }
    }
  }

  const handleCreate = async () => {
    try {
      await userSchema.validate(form, { abortEarly: false })
      setErrors({})
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const validationErrors: Record<string, string> = {}
        err.inner.forEach((e) => {
          if (e.path) validationErrors[e.path] = e.message
        })
        setErrors(validationErrors)
        return
      }
    }
    setSubmitting(true)
    try {
      await adminCreateUser({
        name: form.name,
        email: form.email,
        mobile: form.mobile || undefined,
        department_id: form.department_id ? Number(form.department_id) : undefined,
        role_id: Number(form.role_id),
        user_status: form.user_status,
      })
      toast.success('User created successfully')
      setShowCreate(false)
      setForm({ name: '', email: '', mobile: '', department_id: '', role_id: '', user_status: 'active' })
      fetchData(skip)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (u: AdminUserResponse) => {
    setEditUser(u)
    setEditForm({ name: u.name ?? '', email: u.email ?? '', mobile: u.mobile ?? '', department_id: u.department_id ? String(u.department_id) : '' })
    setEditErrors({})
  }

  const handleEditFieldChange = async (field: keyof typeof editForm, value: string) => {
    const updatedForm = { ...editForm, [field]: value }
    setEditForm(updatedForm)
    try {
      await editUserSchema.validateAt(field, updatedForm)
      setEditErrors((prev) => ({ ...prev, [field]: '' }))
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        setEditErrors((prev) => ({ ...prev, [field]: err.message }))
      }
    }
  }

  const handleEdit = async () => {
    if (!editUser) return
    try {
      await editUserSchema.validate(editForm, { abortEarly: false })
      setEditErrors({})
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const validationErrors: Record<string, string> = {}
        err.inner.forEach((e) => {
          if (e.path) validationErrors[e.path] = e.message
        })
        setEditErrors(validationErrors)
        return
      }
    }
    setSubmitting(true)
    try {
      await adminUpdateUser(editUser.id, {
        name: editForm.name,
        mobile: editForm.mobile,
        department_id: editForm.department_id ? Number(editForm.department_id) : undefined
      })
      toast.success('User updated successfully')
      setEditUser(null)
      fetchData(skip)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  // ── change role ──
  const openRoleChange = (u: AdminUserResponse) => {
    setRoleUser(u)
    setNewRoleId(String(u.role_id))
  }

  const handleRoleChange = async () => {
    if (!roleUser || !newRoleId) return
    setSubmitting(true)
    try {
      await adminUpdateUserRole(roleUser.id, { role_id: Number(newRoleId) })
      toast.success('Role updated successfully')
      setRoleUser(null)
      fetchData(skip)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change role')
    } finally {
      setSubmitting(false)
    }
  }

  // ── toggle status ──
  const handleToggleStatus = async (u: AdminUserResponse) => {
    const newStatus = u.user_status === 'active' ? 'inactive' : 'active'
    try {
      await adminUpdateUserStatus(u.id, { user_status: newStatus })
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
      fetchData(skip)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  // ── render ──
  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            </div>
            <p className="text-muted-foreground text-sm ml-12">
              Manage users, roles, and access within your organisation
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchData(skip)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {isSuperAdmin && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                New User
              </Button>
            )}
          </div>
        </div>

        {/* Search + stats bar */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              className="h-9 w-full pl-9 pr-4 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search by name, email or role…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-sm text-muted-foreground shrink-0">
            {total} total user{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading users…</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium">No users found</p>
              {search && <p className="text-sm mt-1">Try a different search term</p>}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                  >
                    {/* User */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {skip + i + 1}.
                        </span>
                        <p className="font-medium text-foreground leading-tight">{u.name ?? '—'}</p>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5 text-muted-foreground">{u.email}</td>

                    {/* Department */}
                    <td className="px-5 py-3.5 text-muted-foreground">{u.department_name ?? '—'}</td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <Badge
                        className={`text-xs font-medium border ${roleBadgeClass(u.role_name)}`}
                      >
                        {u.role_name ?? `role #${u.role_id}`}
                      </Badge>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <Badge className={`text-xs font-medium border ${statusBadgeClass(u.user_status)}`}>
                        {u.user_status === 'active' ? (
                          <><Check className="w-3 h-3 mr-1" />Active</>
                        ) : (
                          <><X className="w-3 h-3 mr-1" />Inactive</>
                        )}
                      </Badge>
                    </td>

                    {/* Created */}
                    <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                      {formatDate(u.date_created)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit details */}
                        <button
                          title="Edit details"
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Change role (Super Admin only) */}
                        {isSuperAdmin && (
                          <button
                            title="Change role"
                            onClick={() => openRoleChange(u)}
                            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}

                        {/* Toggle status */}
                        <button
                          title={u.user_status === 'active' ? 'Deactivate' : 'Activate'}
                          onClick={() => setStatusUser(u)}
                          className={`p-1.5 rounded-md hover:bg-secondary transition-colors ${u.user_status === 'active'
                            ? 'text-muted-foreground hover:text-red-500'
                            : 'text-muted-foreground hover:text-green-600'
                            }`}
                        >
                          {u.user_status === 'active' ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create User Modal ── */}
      {showCreate && (
        <Modal title="Create New User" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Full Name *"
                placeholder="Jane Doe"
                value={form.name}
                error={errors.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
              <Field
                label="Email *"
                type="email"
                placeholder="jane@example.com"
                value={form.email}
                error={errors.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Mobile"
                type="tel"
                maxLength={10}
                placeholder="1234567890"
                value={form.mobile}
                error={errors.mobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '')
                  handleFieldChange('mobile', val)
                }}
              />
              <SelectField
                label="Department"
                value={form.department_id}
                error={errors.department_id}
                onChange={(e) => handleFieldChange('department_id', e.target.value)}
              >
                <option value="">Select a department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </SelectField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Role *"
                value={form.role_id}
                error={errors.role_id}
                onChange={(e) => handleFieldChange('role_id', e.target.value)}
              >
                <option value="">Select a role…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </SelectField>
              <SelectField
                label="Status"
                value={form.user_status}
                error={errors.user_status}
                onChange={(e) => handleFieldChange('user_status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectField>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <Modal title="Edit User Details" onClose={() => setEditUser(null)}>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground mb-1">
              Editing: <span className="font-medium text-foreground">{editUser.email}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Full Name *"
                value={editForm.name}
                error={editErrors.name}
                onChange={(e) => handleEditFieldChange('name', e.target.value)}
              />
              <Field
                label="Email *"
                type="email"
                value={editForm.email}
                error={editErrors.email}
                onChange={(e) => handleEditFieldChange('email', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Mobile *"
                type="tel"
                maxLength={10}
                value={editForm.mobile}
                error={editErrors.mobile}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '')
                  handleEditFieldChange('mobile', val)
                }}
              />
              <SelectField
                label="Department"
                value={editForm.department_id}
                error={editErrors.department_id}
                onChange={(e) => handleEditFieldChange('department_id', e.target.value)}
              >
                <option value="">Select a department…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </SelectField>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditUser(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Change Role Modal ── */}
      {roleUser && (
        <Modal title="Change User Role" onClose={() => setRoleUser(null)}>
          <div className="space-y-5">
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              Changing role for: <span className="font-medium text-foreground">{roleUser.email}</span>
            </div>
            <SelectField
              label="New Role"
              value={newRoleId}
              onChange={(e) => setNewRoleId(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </SelectField>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setRoleUser(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleRoleChange} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Assign Role
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Confirm Status Change Modal ── */}
      {statusUser && (
        <Modal title="Confirm Status Change" onClose={() => setStatusUser(null)}>
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Are you sure you want to {statusUser.user_status === 'active' ? 'deactivate' : 'activate'} <span className="font-semibold">{statusUser.name || statusUser.email}</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setStatusUser(null)} disabled={submitting}>
                NO
              </Button>
              <Button 
                onClick={async () => {
                  setSubmitting(true)
                  await handleToggleStatus(statusUser)
                  setSubmitting(false)
                  setStatusUser(null)
                }} 
                disabled={submitting}
                className={statusUser.user_status === 'active' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                YES
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppLayout>
  )
}
