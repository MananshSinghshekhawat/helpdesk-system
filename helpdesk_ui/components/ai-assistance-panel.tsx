'use client'

import React from 'react'
import { AlertCircle, Bot, Send } from 'lucide-react'
import type { AIDraft, AIAgentType } from '@/lib/api'

interface AIAssistancePanelProps {
  aiAgentType: AIAgentType
  onAiAgentTypeChange: (value: AIAgentType) => void
  suggesting: boolean
  autoReplying: boolean
  sendingDraft: boolean
  ticketAiEnabled: boolean
  drafts: AIDraft[]
  selectedDraftId: number | null
  draftText: string
  onSelectDraft: (draft: AIDraft) => void
  onDraftTextChange: (value: string) => void
  onSuggest: () => void
  onAutoReply: () => void
  onSendDraft: () => void
}

export function AIAssistancePanel({
  aiAgentType,
  onAiAgentTypeChange,
  suggesting,
  autoReplying,
  sendingDraft,
  ticketAiEnabled,
  drafts,
  selectedDraftId,
  draftText,
  onSelectDraft,
  onDraftTextChange,
  onSuggest,
  onAutoReply,
  onSendDraft,
}: AIAssistancePanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-secondary/50 px-6 py-4">
        <div className="mb-2 flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">AI Assistance</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate drafts, review suggestions, and send replies from the ticket view.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent Type</span>
          <select
            value={aiAgentType}
            onChange={(e) => onAiAgentTypeChange(e.target.value as AIAgentType)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="support">Support</option>
            <option value="billing">Billing</option>
            <option value="sales">Sales</option>
            <option value="delivery">Delivery</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSuggest}
            disabled={suggesting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {suggesting ? 'Generating...' : 'Generate Suggestion'}
          </button>

          <button
            type="button"
            onClick={onAutoReply}
            disabled={autoReplying || !ticketAiEnabled}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-secondary disabled:opacity-60"
          >
            {autoReplying ? 'Auto Replying...' : 'Auto Reply'}
          </button>
        </div>

        {!ticketAiEnabled && (
          <p className="text-xs text-muted-foreground">
            Auto reply is disabled for this ticket because the backend creates tickets with ai_enabled = false.
          </p>
        )}

        <div className="border-t border-border pt-4">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Drafts</h3>

          {drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AI drafts yet</p>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <button
                  key={draft.draft_id}
                  type="button"
                  onClick={() => onSelectDraft(draft)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedDraftId === draft.draft_id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:bg-secondary/50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-muted-foreground">Draft #{draft.draft_id}</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Confidence: {draft.confidence_score.toFixed(2)}%
                    </span>
                  </div>
                  <p className="line-clamp-4 text-sm text-foreground">{draft.draft_text}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Edit Selected Draft
            </span>
            <textarea
              value={draftText}
              onChange={(e) => onDraftTextChange(e.target.value)}
              className="min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
              placeholder="Generate a draft first, then edit it here..."
            />
          </label>

          <button
            type="button"
            onClick={onSendDraft}
            disabled={sendingDraft || selectedDraftId === null || !draftText.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sendingDraft ? 'Sending...' : 'Send Selected Draft'}
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/30 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-500" />
          <p className="text-xs text-muted-foreground">
            Review the draft before sending. Auto reply should only be used when you are sure the AI response is safe.
          </p>
        </div>
      </div>
    </div>
  )
}