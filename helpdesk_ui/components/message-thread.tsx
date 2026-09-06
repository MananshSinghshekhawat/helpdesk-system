'use client'

import React from 'react'
import { Lock, User, Zap } from 'lucide-react'

interface Message {
  id: string
  sender_type?: 'customer' | 'human' | 'ai' | 'system'
  sender?: 'customer' | 'human' | 'ai'
  senderName?: string
  message_body?: string
  content?: string
  created_at?: string
  timestamp?: Date
  isInternal?: boolean
}

interface MessageThreadProps {
  messages: Message[]
  onReply?: (content: string) => void
}

export function MessageThread({ messages, onReply }: MessageThreadProps) {
  const [replyText, setReplyText] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)

  const normalizedMessages = messages.map((message, index) => {
    const sender = message.sender ?? message.sender_type ?? 'customer'
    const senderName =
      message.senderName ?? (sender === 'customer' ? 'Customer' : sender === 'human' ? 'Agent' : 'AI')
    const content = message.content ?? message.message_body ?? ''
    const timestamp = message.timestamp ?? (message.created_at ? new Date(message.created_at) : new Date())

    return {
      id: message.id || `${sender}-${index}`,
      sender,
      senderName,
      content,
      timestamp,
      isInternal: message.isInternal || message.sender_type === 'system',
    }
  })

  const getSenderBadge = (sender: string, isInternal: boolean) => {
    if (isInternal) {
      return (
        <span className="inline-flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/20 px-2 py-1 text-xs font-medium text-yellow-500">
          <Lock className="h-3 w-3" />
          Internal Note
        </span>
      )
    }

    switch (sender) {
      case 'customer':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-2 py-1 text-xs font-medium text-blue-500">
            <User className="h-3 w-3" />
            Customer
          </span>
        )
      case 'human':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-green-500/20 px-2 py-1 text-xs font-medium text-green-500">
            <User className="h-3 w-3" />
            Human
          </span>
        )
      case 'ai':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-500">
            <Zap className="h-3 w-3" />
            AI Agent
          </span>
        )
      default:
        return null
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto border-b border-border p-6">
        {normalizedMessages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${
              message.isInternal
                ? 'border-l-2 border-yellow-500/30 bg-yellow-500/5 pl-4'
                : message.sender === 'ai'
                  ? 'border-l-2 border-purple-500/30 bg-purple-500/5 pl-4'
                  : ''
            }`}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
              {message.senderName.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium text-foreground">{message.senderName}</span>
                {getSenderBadge(message.sender, message.isInternal || false)}
              </div>
              <p className="mb-2 break-words text-sm text-foreground">{message.content}</p>
              <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-6">
        <div className="space-y-3">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply here..."
            className="w-full resize-none rounded-lg border border-border bg-input px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            rows={4}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setReplyText('')}
              className="rounded-lg border border-border px-4 py-2 text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!replyText.trim() || !onReply) return
                try {
                  setIsSending(true)
                  await onReply(replyText.trim())
                  setReplyText('')
                } catch (err) {
                  console.error('Failed to send reply', err)
                } finally {
                  setIsSending(false)
                }
              }}
              disabled={isSending || !replyText.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSending ? 'Sending…' : 'Send Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}