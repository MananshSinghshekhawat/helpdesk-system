'use client'

import React from 'react'
import { Power, ChevronRight } from 'lucide-react'
import type { AIAgentResponse } from '@/lib/api'

interface AIAgentListProps {
  agents: AIAgentResponse[]
  loading?: boolean
  error?: string | null
  onSelectAgent: (agent: AIAgentResponse) => void
  selectedAgentId?: number | string
}

export function AIAgentList({ agents, loading, error, onSelectAgent, selectedAgentId }: AIAgentListProps) {
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'active' | 'inactive'>('all')

  const filtered = React.useMemo(() => {
    if (statusFilter === 'all') return agents
    return agents.filter((a) => (statusFilter === 'active' ? a.is_active === true : a.is_active === false))
  }, [agents, statusFilter])

  if (loading) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Loading agents...</div>
  }

  if (error) {
    return <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-500">{error}</div>
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
        >
          All
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === 'active' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
        >
          Active
        </button>
        <button
          onClick={() => setStatusFilter('inactive')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === 'inactive' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
        >
          Inactive
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((agent) => (
          <button
            key={agent.id}
            onClick={() => onSelectAgent(agent)}
            className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
              String(selectedAgentId) === String(agent.id) ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary/50 hover:bg-secondary/30'
            }`}
          >
            <div className="flex-1 text-left space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-foreground">{agent.name}</h3>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${agent.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {agent.is_active ? 'active' : 'inactive'}
                </span>
                {/* show auto-reply if confidence or type indicates; placeholder */}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{agent.type}</span>
                <span>Confidence: {Math.round(agent.confidence_threshold)}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Power className={`w-4 h-4 ${agent.is_active ? 'text-green-500' : 'text-gray-500'}`} />
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}