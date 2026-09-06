'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { Filter, RefreshCw, X } from 'lucide-react'
import { listTickets, getPublicDepartments, type TicketSummary } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatStatus(value: string) {
  if (value === 'new') return 'New'
  if (value === 'in_progress') return 'In Progress'
  if (value === 'closed') return 'Closed'
  return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function getStatusClasses(status: string) {
  const value = status.toLowerCase()
  if (value === 'new' || value === 'open') return 'bg-green-500/15 text-green-600 dark:text-green-500 border border-green-500/20'
  if (value === 'in_progress' || value === 'waiting') return 'bg-blue-500/15 text-blue-600 dark:text-blue-500 border border-blue-500/20'
  if (value === 'closed' || value === 'resolved') return 'bg-red-500/15 text-red-600 dark:text-red-500 border border-red-500/20'
  return 'bg-secondary text-foreground border border-border'
}

export default function TicketListPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [tickets, setTickets] = React.useState<TicketSummary[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('all')
  const [departments, setDepartments] = React.useState<{id: number, name: string}[]>([])

  const isSuperAdminOrAdmin = user?.role_name?.toLowerCase().includes('admin') || user?.role_id === 1 || user?.role_id === 2

  React.useEffect(() => {
    getPublicDepartments().then(setDepartments).catch(console.error)
  }, [])

  const loadTickets = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await listTickets(departmentFilter !== 'all' ? departmentFilter : undefined)
      setTickets(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [departmentFilter])

  React.useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const filteredTickets = React.useMemo(() => {
    return tickets
      .filter((ticket) => (statusFilter === 'all' ? true : ticket.status === statusFilter))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [tickets, statusFilter])

  const hasActiveFilters = statusFilter !== 'all' || departmentFilter !== 'all'

  const resetFilters = () => {
    setStatusFilter('all')
    setDepartmentFilter('all')
  }

  return (
    <AppLayout orgName="Acme Corp" userName="Alex Johnson" userRole="Admin">
      <div className="flex h-full flex-col bg-background">
        <div className="border-b border-border px-8 py-6">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Inbox</h1>
          <p className="text-muted-foreground">Manage your support tickets and respond to customers</p>
        </div>

        <div className="border-b border-border px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Filter className="h-5 w-5 text-muted-foreground" />

              <div>
                <label htmlFor="statusFilter" className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">Status</label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {isSuperAdminOrAdmin && (
                <div>
                  <label htmlFor="departmentFilter" className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">Department</label>
                  <select
                    id="departmentFilter"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="rounded border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 rounded px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>

            <button
              onClick={loadTickets}
              className="inline-flex items-center gap-2 rounded border border-border px-3 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              Loading tickets...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-500">
              {error}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-10 text-center text-muted-foreground">
              No tickets found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => router.push(`/inbox/detail?ticketId=${ticket.id}`)}
                  className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket #{ticket.id}</p>
                      <h2 className="text-lg font-semibold text-foreground">{ticket.subject}</h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(ticket.status)}`}>
                        {formatStatus(ticket.status)}
                      </span>
                      {ticket.ai_enabled && (
                        <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-500">
                          AI Enabled
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Created: {formatDate(ticket.created_at)}</span>
                    {/* <span>Status: {ticket.status}</span> */}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}