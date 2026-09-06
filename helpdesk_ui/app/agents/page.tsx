'use client'

import React from 'react'
import { AppLayout } from '@/components/app-layout'
import { AIAgentList } from '@/components/ai-agent-list'
import { AIAgentDetail } from '@/components/ai-agent-detail'
import { listAiAgents } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function AgentsPage() {
  const [agents, setAgents] = React.useState<Awaited<ReturnType<typeof listAiAgents>>>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = React.useState<Awaited<ReturnType<typeof listAiAgents>>[number] | null>(null)
  const [showCreateModal, setShowCreateModal] = React.useState(false)

  const loadAgents = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAiAgents()
      setAgents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadAgents()
  }, [loadAgents])

  return (
    <AppLayout orgName="Acme Corp" userName="Alex Johnson" userRole="Admin">
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">AI Agents Management</h1>
            <p className="text-muted-foreground">Configure and manage your AI support agents</p>
          </div>
          <div>
            <Button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Agent
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AIAgentList
              agents={agents}
              loading={loading}
              error={error}
              onSelectAgent={(agent) => setSelectedAgent(agent)}
              selectedAgentId={selectedAgent?.id}
            />
          </div>

          <div className="hidden lg:block">
            {selectedAgent ? (
              <AIAgentDetail
                agent={selectedAgent}
                onClose={() => setSelectedAgent(null)}
                onSaved={(updated) => {
                  // update local list with new values
                  setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
                  setSelectedAgent(updated)
                }}
              />
            ) : (
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <p className="text-muted-foreground">Select an agent to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Create modal: kept local (no API call) */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
                <h2 className="text-xl font-semibold text-foreground">Create New Agent</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-secondary rounded-md">
                  <span className="sr-only">Close</span>
                </button>
              </div>

              <div className="p-6 space-y-8">
                <p className="text-sm text-muted-foreground">Create agent UI is local in this example. Implement POST /api/v1/ai-agents when ready.</p>
                <div className="flex gap-3 pt-4 border-t border-border">
                  <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-border rounded-lg text-foreground">Cancel</button>
                  <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg">Create Agent</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}