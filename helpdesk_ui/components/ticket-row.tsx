'use client'

import React from 'react'
import { Bot, Clock3, Ticket } from 'lucide-react'

interface TicketRowProps {
  id: string | number
  subject: string
  status: string
  ai_enabled: boolean
  created_at: string
  customerName?: string
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'new':
      return 'bg-slate-500/20 text-slate-300'
    case 'assigned':
      return 'bg-blue-500/20 text-blue-500'
    case 'in_progress':
      return 'bg-amber-500/20 text-amber-500'
    case 'waiting':
      return 'bg-violet-500/20 text-violet-400'
    case 'escalated':
      return 'bg-red-500/20 text-red-500'
    case 'resolved':
      return 'bg-emerald-500/20 text-emerald-500'
    case 'closed':
      return 'bg-green-500/20 text-green-500'
    default:
      return 'bg-gray-500/20 text-gray-500'
  }
}

const getRelativeTime = (date: Date) => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

const getFullDateTime = (date: Date) => {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function TicketRow({ id, subject, status, ai_enabled, created_at, customerName }: TicketRowProps) {
  const createdAt = new Date(created_at)
  const relativeTime = getRelativeTime(createdAt)
  const fullDateTime = getFullDateTime(createdAt)

  return (
    <div className="group cursor-pointer border-b border-border px-6 py-4 transition-colors hover:bg-secondary/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="mb-2 truncate text-base font-semibold text-foreground">{subject}</h3>

          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-xs text-muted-foreground">Ticket #{id}</span>
              {customerName && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{customerName}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block rounded px-2 py-1 text-xs font-medium ${getStatusColor(status)}`}>
              {status.replace(/_/g, ' ')}
            </span>

            {ai_enabled ? (
              <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-400">
                <Bot className="h-3 w-3" />
                AI Enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-400">
                <Bot className="h-3 w-3" />
                Manual Only
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <span className="whitespace-nowrap text-xs text-muted-foreground" title={fullDateTime}>
            {relativeTime}
          </span>
          <div className="mt-2 flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            <span>{fullDateTime}</span>
          </div>
        </div>
      </div>
    </div>
  )
}