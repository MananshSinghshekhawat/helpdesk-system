'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Archive } from 'lucide-react'
import { 
  adminListRoles, adminCreateRole, adminUpdateRole, adminArchiveRole, AdminRoleResponse,
  adminListPermissions, adminCreatePermission, AdminPermissionResponse
} from '@/lib/api'
import { toast } from 'sonner'
import { AppLayout } from '@/components/app-layout'

export default function RolesPage() {
  const [roles, setRoles] = useState<AdminRoleResponse[]>([])
  const [permissions, setPermissions] = useState<AdminPermissionResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [roleName, setRoleName] = useState('')
  const [rolePermissions, setRolePermissions] = useState<{module: string, status: boolean}[]>([])

  const [isPermModalOpen, setIsPermModalOpen] = useState(false)
  const [newPermName, setNewPermName] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [rolesData, permsData] = await Promise.all([
        adminListRoles(),
        adminListPermissions()
      ])
      setRoles(rolesData)
      setPermissions(permsData)
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenRoleModal = (role?: AdminRoleResponse) => {
    if (role) {
      setEditingId(role.id)
      setRoleName(role.name)
      // Safely parse permissions
      let parsedPerms: {module: string, status: boolean}[] = []
      if (Array.isArray(role.permissions_json)) {
        parsedPerms = role.permissions_json
      } else if (typeof role.permissions_json === 'string') {
        try {
          parsedPerms = JSON.parse(role.permissions_json)
        } catch { /* ignore */ }
      }
      
      // Ensure all available permissions are in the state, default to false if not found
      const currentPerms = permissions.map(p => {
        const existing = parsedPerms.find(ep => ep.module === p.module_name)
        return {
          module: p.module_name,
          status: existing ? existing.status : false
        }
      })
      setRolePermissions(currentPerms)
    } else {
      setEditingId(null)
      setRoleName('')
      setRolePermissions(permissions.map(p => ({ module: p.module_name, status: false })))
    }
    setIsRoleModalOpen(true)
  }

  const handleTogglePermission = (moduleName: string, status: boolean) => {
    setRolePermissions(prev => 
      prev.map(p => p.module === moduleName ? { ...p, status } : p)
    )
  }

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleName.trim()) {
      toast.error('Role name is required')
      return
    }

    try {
      const payload = {
        name: roleName.trim(),
        permissions_json: rolePermissions
      }

      if (editingId) {
        await adminUpdateRole(editingId, payload)
        toast.success('Role updated successfully')
      } else {
        await adminCreateRole(payload)
        toast.success('Role created successfully')
      }
      setIsRoleModalOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Operation failed')
    }
  }

  const handleArchiveRole = async (id: number) => {
    if (!confirm('Are you sure you want to archive this role?')) return
    
    try {
      await adminArchiveRole(id)
      toast.success('Role archived successfully')
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Archive failed')
    }
  }

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPermName.trim()) {
      toast.error('Permission name is required')
      return
    }

    try {
      await adminCreatePermission({ module_name: newPermName.trim() })
      toast.success('Permission added successfully')
      setNewPermName('')
      setIsPermModalOpen(false)
      // Refresh to get the new permission
      await fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add permission')
    }
  }

  // Update rolePermissions state when permissions change while modal is open
  useEffect(() => {
    if (isRoleModalOpen && !isLoading) {
      setRolePermissions(prev => {
        const updated = [...prev]
        permissions.forEach(p => {
          if (!updated.find(up => up.module === p.module_name)) {
            updated.push({ module: p.module_name, status: false })
          }
        })
        return updated
      })
    }
  }, [permissions, isRoleModalOpen, isLoading])


  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
        <button
          onClick={() => handleOpenRoleModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Role
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading roles...</div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No roles found.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">S.No.</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Permissions Configured</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {roles.map((role, index) => {
                let permsCount = 0
                if (Array.isArray(role.permissions_json)) {
                  permsCount = role.permissions_json.filter(p => p.status).length
                }
                return (
                  <tr key={role.id} className="hover:bg-secondary/50">
                    <td className="px-6 py-4">{index + 1}</td>
                    <td className="px-6 py-4 font-medium">{role.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-500/10 text-blue-500 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {permsCount} active
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleOpenRoleModal(role)}
                          className="text-muted-foreground hover:text-blue-500 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleArchiveRole(role.id)}
                          className="text-muted-foreground hover:text-red-500 transition-colors"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {isRoleModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-foreground">
                {editingId ? 'Edit Role' : 'Create Role'}
              </h2>
              <button 
                type="button"
                onClick={() => setIsPermModalOpen(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add New Permission Type
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full border border-border bg-background text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Content Manager"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-3">
                    Permissions
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rolePermissions.map((perm) => (
                      <label key={perm.module} className="flex items-center space-x-3 bg-secondary p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/80 transition-colors">
                        <input
                          type="checkbox"
                          checked={perm.status}
                          onChange={(e) => handleTogglePermission(perm.module, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm font-medium text-foreground">{perm.module}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end gap-3 bg-card rounded-b-lg">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 text-foreground hover:bg-secondary bg-secondary/50 rounded-md transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleSubmit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors font-medium"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Permission Modal */}
      {isPermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4 text-foreground">Add New Permission Type</h3>
            <form onSubmit={handleAddPermission}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Module Name
                </label>
                <input
                  type="text"
                  value={newPermName}
                  onChange={(e) => setNewPermName(e.target.value)}
                  className="w-full border border-border bg-background text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
                  placeholder="e.g. view_reports"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPermModalOpen(false)}
                  className="px-4 py-2 text-foreground hover:bg-secondary rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Save Permission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </AppLayout>
  )
}
