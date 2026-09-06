'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { TicketOverview } from '@/components/ticket-overview'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  RefreshCw,
  Ticket,
} from 'lucide-react'
import { getTicket, listTickets, getPublicDepartments, transferTicket, type TicketDetail, type TicketSummary } from '@/lib/api'

type StatusGroup = 'open' | 'in-progress' | 'closed' | 'other'

function normalizeStatus(status: string): StatusGroup {
  const value = status.toLowerCase().replace(/_/g, '-')
  if (value === 'new' || value === 'open' || value === 'assigned') return 'open'
  if (value === 'in-progress' || value === 'in_progress' || value === 'waiting') return 'in-progress'
  if (value === 'resolved' || value === 'closed') return 'closed'
  return 'other'
}

function getStatusClasses(status: string) {
  switch (normalizeStatus(status)) {
    case 'open':
      return 'bg-green-500/20 text-green-500 border-green-500/20'
    case 'in-progress':
      return 'bg-blue-500/20 text-blue-500 border-blue-500/20'
    case 'closed':
      return 'bg-red-500/20 text-red-500 border-red-500/20'
    default:
      return 'bg-secondary text-foreground border-border'
  }
}

function formatStatusLabel(status: string) {
  if (status.toLowerCase() === 'in_progress' || status.toLowerCase() === 'in-progress') return 'In Progress'
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, ' ')
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatMessageDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function InboxPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketSummary[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [selectedTicketDetail, setSelectedTicketDetail] = useState<TicketDetail | null>(null)

  const [loadingTickets, setLoadingTickets] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [departments, setDepartments] = useState<{ id: number, name: string }[]>([])
  const [transferDepartmentId, setTransferDepartmentId] = useState<string>('')
  const [isTransferring, setIsTransferring] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/auth/login')
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return
    void loadTickets()
    void loadDepartments()
  }, [isAuthenticated])

  async function loadDepartments() {
    try {
      const data = await getPublicDepartments()
      setDepartments(data)
    } catch (err) {
      console.error('Failed to load departments', err)
    }
  }

  async function loadTickets(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoadingTickets(true)
    }

    setError(null)

    try {
      const items = await listTickets()
      const sorted = [...items].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      )
      setTickets(sorted)

      if (!selectedTicketId && sorted.length > 0) {
        setSelectedTicketId(sorted[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoadingTickets(false)
      setRefreshing(false)
    }
  }

  async function loadTicketDetail(ticketId: number) {
    setLoadingDetail(true)
    setError(null)

    try {
      const detail = await getTicket(ticketId)
      setSelectedTicketDetail(detail)
    } catch (err) {
      setSelectedTicketDetail(null)
      setError(err instanceof Error ? err.message : 'Failed to load ticket detail')
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => {
    void loadTickets()
    void loadDepartments()
  }, [])

  useEffect(() => {
    if (selectedTicketId == null) {
      setSelectedTicketDetail(null)
      return
    }
    setTransferDepartmentId('')
    void loadTicketDetail(selectedTicketId)
  }, [selectedTicketId])

  async function handleTransfer() {
    if (!selectedTicketId || !transferDepartmentId) return
    setIsTransferring(true)
    setError(null)
    try {
      await transferTicket(selectedTicketId, parseInt(transferDepartmentId))
      setSelectedTicketId(null)
      await loadTickets(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer ticket')
    } finally {
      setIsTransferring(false)
    }
  }
  const selectedTicket = selectedTicketDetail?.ticket ?? null

  return (
    <AppLayout orgName="Acme Corp" userName="Alex Johnson" userRole="Admin">
      <div className="p-4 ">
        <div className="flex items-start justify-between gap-4">
          <div>
            {/* <h1 className="mb-2 text-3xl font-bold text-foreground">Inbox</h1>
            <p className="text-muted-foreground">Manage your support tickets and respond to customers</p> */}
          </div>
        </div>
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <TicketOverview tickets={tickets} />
        <div className="flex flex-col gap-6">
          <div className="flex h-[800px] flex-col overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex-shrink-0 border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Ticket Overview</h2>
              {/* <p className="text-sm text-muted-foreground">Latest support requests from your customers</p> */}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingTickets ? (
                <div className="flex h-full items-center justify-center py-16 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex h-full items-center justify-center px-6 py-16 text-center text-sm text-muted-foreground">
                  No tickets found.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => router.push('/inbox/detail?ticketId=' + ticket.id)}
                      className={`w-full p-4 text-left transition-colors hover:bg-secondary/50 ${selectedTicketId === ticket.id ? 'bg-secondary/50' : ''
                        }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 overflow-hidden">
                          <div className="mb-1.5 flex items-center gap-3">
                            <span className="font-mono text-sm text-muted-foreground">#{ticket.id}</span>
                            {ticket.ai_enabled && (
                              <span className="inline-flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
                                <MessageSquare className="h-3 w-3" />
                                AI enabled
                              </span>
                            )}
                          </div>

                          <h3 className="mb-1 truncate font-medium text-foreground">{ticket.subject}</h3>
                          <p className="text-xs text-muted-foreground">
                            Created: {formatDate(ticket.created_at)}
                          </p>
                        </div>
                        <div className="mt-1 flex-shrink-0">
                          <span
                            className={`inline-block rounded border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${getStatusClasses(
                              ticket.status
                            )}`}
                          >
                            {formatStatusLabel(ticket.status)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}