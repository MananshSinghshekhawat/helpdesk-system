'use client'

import React from 'react'
import { X } from 'lucide-react'
import type { AIAgentResponse, AIAgentUpdatePayload } from '@/lib/api'
import { updateAiAgent } from '@/lib/api'
import { toast } from 'sonner'

interface AIAgentDetailProps {
  agent: AIAgentResponse
  onClose: () => void
  onSaved?: (updated: AIAgentResponse) => void
}

export function AIAgentDetail({ agent, onClose, onSaved }: AIAgentDetailProps) {
  const [confidence, setConfidence] = React.useState<number>(agent.confidence_threshold)
  const [isActive, setIsActive] = React.useState<boolean>(agent.is_active)
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: AIAgentUpdatePayload = {
        confidence_threshold: Number(confidence),
        is_active: Boolean(isActive),
      }
      const updated = await updateAiAgent(agent.id, payload)
      toast.success('Agent updated')
      if (onSaved) onSaved(updated)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update agent')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4 sticky top-8">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-foreground mb-1">{agent.name}</h3>
          <p className="text-sm text-muted-foreground">{agent.type}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-md" aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status:</span>
          <span className={agent.is_active ? 'text-green-400' : 'text-gray-400'}>{agent.is_active ? 'active' : 'inactive'}</span>
        </div>

        <div>
          <label htmlFor="confidence-threshold" className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Confidence Threshold:</span>
            <span className="text-foreground">{Math.round(confidence)}%</span>
          </label>
          <input
            id="confidence-threshold"
            type="range"
            min={0}
            max={100}
            step={1}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
            title="Confidence Threshold"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Mode:</span>
          <span className="text-foreground">{/* mode not editable here in this UI */ '—'}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Enabled:</span>
            <label htmlFor="agent-enabled" id="agent-enabled-label" className="relative inline-flex items-center cursor-pointer">
              <input
                id="agent-enabled"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only"
                aria-labelledby="agent-enabled-label"
                title="Enabled"
              />
            <div className={`w-11 h-6 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-500'}`}>
              <div className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-border rounded-lg text-foreground hover:bg-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}