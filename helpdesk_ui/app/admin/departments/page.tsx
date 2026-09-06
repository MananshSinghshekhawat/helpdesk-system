'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Archive } from 'lucide-react'
import { getDepartments, adminCreateDepartment, adminUpdateDepartment, adminArchiveDepartment, DepartmentResponse } from '@/lib/api'
import { toast } from 'sonner'
import { AppLayout } from '@/components/app-layout'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    setIsLoading(true)
    try {
      const data = await getDepartments()
      const sortedData = [...data].sort((a, b) => a.id - b.id)
      setDepartments(sortedData)
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch departments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (dept?: DepartmentResponse) => {
    if (dept) {
      setEditingId(dept.id)
      setName(dept.name)
    } else {
      setEditingId(null)
      setName('')
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Department name is required')
      return
    }

    try {
      if (editingId) {
        await adminUpdateDepartment(editingId, { name: name.trim() })
        toast.success('Department updated successfully')
      } else {
        await adminCreateDepartment({ name: name.trim() })
        toast.success('Department created successfully')
      }
      setIsModalOpen(false)
      fetchDepartments()
    } catch (error: any) {
      toast.error(error.message || 'Operation failed')
    }
  }

  const handleArchive = async (id: number) => {
    if (!confirm('Are you sure you want to archive this department?')) return
    
    try {
      await adminArchiveDepartment(id)
      toast.success('Department archived successfully')
      fetchDepartments()
    } catch (error: any) {
      toast.error(error.message || 'Archive failed')
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Department
          </button>
        </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading departments...</div>
        ) : departments.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No departments found.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary text-muted-foreground font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">S.No.</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {departments.map((dept, index) => (
                <tr key={dept.id} className="hover:bg-secondary/50">
                  <td className="px-6 py-4">{index + 1}</td>
                  <td className="px-6 py-4 font-medium">{dept.name}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleOpenModal(dept)}
                        className="text-muted-foreground hover:text-blue-500 transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(dept.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors"
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4 text-foreground">
              {editingId ? 'Edit Department' : 'Create Department'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Department Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-border bg-background text-foreground rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. IT Support"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-foreground hover:bg-secondary rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Save
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
