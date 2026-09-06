'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'
import {
  ClipboardList,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminListAuditLogs, type AuditLogEntry } from '@/lib/api'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

function actionBadgeClass(action: string) {
  switch (action.toUpperCase()) {
    case 'ROLE_CHANGED':
      return 'bg-primary/15 text-primary border-primary/30'
    case 'STATUS_CHANGED':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
    case 'USER_CREATED':
      return 'bg-green-500/15 text-green-600 border-green-500/30'
    case 'USER_UPDATED':
      return 'bg-blue-500/15 text-blue-500 border-blue-500/30'
    default:
      return 'bg-secondary text-secondary-foreground border-border'
  }
}

function JsonSnippet({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>
  const text = JSON.stringify(value, null, 2)
  return (
    <pre className="text-xs bg-muted/50 rounded px-2 py-1 max-w-[220px] overflow-auto whitespace-pre-wrap break-all leading-relaxed">
      {text}
    </pre>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function AuditLogsPage() {
  const { user } = useAuth()
  const rawRole = (user as { role?: string } | null)?.role || ''
  const isSuperAdmin = rawRole.toLowerCase().replace(/[\s_]+/g, '') === 'superadmin'

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async (offset: number) => {
    setLoading(true)
    try {
      const data = await adminListAuditLogs(offset, PAGE_SIZE)
      setLogs(data.logs)
      setTotal(data.total)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLogs(0) }, [fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1

  const goToPage = (page: number) => {
    const offset = (page - 1) * PAGE_SIZE
    setSkip(offset)
    fetchLogs(offset)
  }


  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
            </div>
            <p className="text-muted-foreground text-sm ml-12">
              Complete history of all privileged actions in the Admin Panel
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">{total} total entr{total !== 1 ? 'ies' : 'y'}</span>
            <Button variant="outline" size="sm" onClick={() => fetchLogs(skip)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading audit logs…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium">No audit log entries yet</p>
              <p className="text-sm mt-1">Actions will appear here as Super Admins manage users</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Action</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Entity</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Changed By</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Previous Value</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">New Value</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">Description</th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground whitespace-nowrap">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr
                      key={log.id}
                      className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                    >
                      {/* Action */}
                      <td className="px-5 py-3.5">
                        <Badge className={`text-xs font-medium border ${actionBadgeClass(log.action)}`}>
                          {log.action}
                        </Badge>
                      </td>

                      {/* Entity */}
                      <td className="px-5 py-3.5">
                        <span className="text-foreground font-medium">
                          {log.entity_name ? log.entity_name : (log.entity_id ? `#${log.entity_id}` : log.entity_type)}
                        </span>
                      </td>

                      {/* Changed by */}
                      <td className="px-5 py-3.5">
                        <span className="text-foreground font-medium">
                          {log.changed_by_user_name ? log.changed_by_user_name : `User #${log.changed_by_user_id}`}
                        </span>
                      </td>

                      {/* Previous value */}
                      <td className="px-5 py-3.5">
                        <JsonSnippet value={log.previous_value} />
                      </td>

                      {/* New value */}
                      <td className="px-5 py-3.5">
                        <JsonSnippet value={log.new_value} />
                      </td>

                      {/* Description */}
                      <td className="px-5 py-3.5 text-muted-foreground max-w-[240px]">
                        <p className="text-xs leading-relaxed">{log.description ?? '—'}</p>
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-3.5 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} &middot; {total} entries
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
    </AppLayout>
  )
}
