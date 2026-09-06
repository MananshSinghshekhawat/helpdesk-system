'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/app-layout'
import { AIAssistancePanel } from '@/components/ai-assistance-panel'
import {
  autoReplyTicket,
  getTicket,
  listAiDrafts,
  replyToTicket,
  sendAiDraft,
  suggestAiReply,
  type AIDraft,
  type AIAgentType,
  type TicketDetail,
  type TicketMessage,
} from '@/lib/api'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ')
}

const defaultTicketId = '1'

function TicketDetailContent() {
  const searchParams = useSearchParams()
  const ticketId = searchParams.get('ticketId') ?? defaultTicketId

  const [detail, setDetail] = React.useState<TicketDetail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [replyMessage, setReplyMessage] = React.useState('')
  const [aiAgentType, setAiAgentType] =
    React.useState<AIAgentType>('support')
  const [drafts, setDrafts] = React.useState<AIDraft[]>([])
  const [selectedDraftId, setSelectedDraftId] =
    React.useState<number | null>(null)
  const [draftText, setDraftText] = React.useState('')
  const [replying, setReplying] = React.useState(false)
  const [suggesting, setSuggesting] = React.useState(false)
  const [sendingDraft, setSendingDraft] = React.useState(false)
  const [autoReplying, setAutoReplying] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [ticketData, draftData] = await Promise.all([
        getTicket(ticketId),
        listAiDrafts(ticketId),
      ])

      setDetail(ticketData)
      setDrafts(draftData)

      if (draftData.length > 0) {
        setSelectedDraftId(draftData[0].draft_id)
        setDraftText(draftData[0].draft_text)
      } else {
        setSelectedDraftId(null)
        setDraftText('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  React.useEffect(() => {
    load()
  }, [load])

  const handleReply = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    if (!replyMessage.trim()) return

    try {
      setReplying(true)
      await replyToTicket(ticketId, {
        message: replyMessage.trim(),
      })
      setReplyMessage('')
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reply')
    } finally {
      setReplying(false)
    }
  }

  const handleSuggest = async () => {
    try {
      setSuggesting(true)
      const draft = await suggestAiReply(ticketId, aiAgentType)

      setDrafts((prev) => [draft, ...prev])
      setSelectedDraftId(draft.draft_id)
      setDraftText(draft.draft_text)
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : 'Failed to generate AI suggestion'
      )
    } finally {
      setSuggesting(false)
    }
  }

  const handleAutoReply = async () => {
    try {
      setAutoReplying(true)
      await autoReplyTicket(ticketId, aiAgentType)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to auto reply')
    } finally {
      setAutoReplying(false)
    }
  }

  const handleSendDraft = async () => {
    if (selectedDraftId === null || !draftText.trim()) return

    try {
      setSendingDraft(true)
      await sendAiDraft(ticketId, selectedDraftId, draftText.trim())
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send draft')
    } finally {
      setSendingDraft(false)
    }
  }

  const ticket = detail?.ticket
  const messages: TicketMessage[] = detail?.messages ?? []

  return (
    <AppLayout orgName="Acme Corp" userName="Alex Johnson" userRole="Admin">
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-card px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-xs text-muted-foreground">Ticket</span>
                <h1 className="text-lg font-bold leading-tight text-foreground">#{ticketId}</h1>
              </div>
              <span className="text-muted-foreground">·</span>
              <h2 className="text-sm font-semibold text-foreground">{ticket?.subject ?? 'Loading…'}</h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                {ticket ? formatStatus(ticket.status) : 'Loading'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden border-r border-border bg-background">
            <div className="flex h-full flex-col">
              <div className="border-b border-border px-6 py-4">
                <h3 className="text-lg font-semibold text-foreground">Conversation</h3>
                <p className="text-sm text-muted-foreground">Loaded from GET /api/v1/tickets/{'{ticket_id}'}</p>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-6">
                {loading ? (
                  <div className="text-sm text-muted-foreground">Loading ticket...</div>
                ) : error ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                    {error}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                    No messages yet
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={`${message.created_at}-${index}`}
                      className={`rounded-xl border p-5 shadow-md ${
                        message.sender_type === 'customer'
                          ? 'border-zinc-600 bg-zinc-800'
                          : message.sender_type === 'human'
                            ? 'border-blue-500/50 bg-blue-900/40'
                            : 'border-green-500/50 bg-green-900/40'
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-4 border-b border-white/10 pb-2.5">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
                            message.sender_type === 'customer'
                              ? 'bg-zinc-600 text-zinc-100'
                              : message.sender_type === 'human'
                                ? 'bg-blue-500/40 text-blue-200'
                                : 'bg-green-500/40 text-green-200'
                          }`}
                        >
                          {message.sender_type}
                        </span>
                        <span className="text-xs font-medium text-zinc-400">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
                        {message.message_body}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border p-6">
                <form className="space-y-3" onSubmit={handleReply}>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">Reply</span>
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="min-h-28 w-full rounded-md border border-border bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Type your reply..."
                    />
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={replying}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {replying ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="w-105 overflow-y-auto bg-card">
            <div className="border-b border-border p-6">
              <h3 className="mb-6 text-lg font-semibold text-foreground">Ticket Information</h3>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">CREATED</p>
                  <p className="text-foreground">{ticket?.created_at ? formatDate(ticket.created_at) : '—'}</p>
                </div>

                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">AI ENABLED</p>
                  <p className="text-foreground">{ticket?.ai_enabled ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>

            <AIAssistancePanel
              aiAgentType={aiAgentType}
              onAiAgentTypeChange={setAiAgentType}
              suggesting={suggesting}
              autoReplying={autoReplying}
              sendingDraft={sendingDraft}
              ticketAiEnabled={Boolean(ticket?.ai_enabled)}
              drafts={drafts}
              selectedDraftId={selectedDraftId}
              draftText={draftText}
              onSelectDraft={(draft) => {
                setSelectedDraftId(draft.draft_id)
                setDraftText(draft.draft_text)
              }}
              onDraftTextChange={setDraftText}
              onSuggest={handleSuggest}
              onAutoReply={handleAutoReply}
              onSendDraft={handleSendDraft}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function TicketDetailPage() {
  return (
    <Suspense
      fallback={
        <AppLayout
          orgName="Acme Corp"
          userName="Alex Johnson"
          userRole="Admin"
        >
          <div className="flex h-screen items-center justify-center">
            Loading ticket...
          </div>
        </AppLayout>
      }
    >
      <TicketDetailContent />
    </Suspense>
  )
}