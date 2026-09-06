'use client'

import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Paperclip, X, Trash2, Minus, Maximize2, MoreVertical, Type, Link2, Smile, Image as LucideImage, Lock, PenTool, Send, ChevronDown, Triangle, Download, FileText, ExternalLink, User, Bot, UserCheck } from 'lucide-react'

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false })
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })
import { Theme } from 'emoji-picker-react'
import 'react-quill-new/dist/quill.snow.css'
import { AppLayout } from '@/components/app-layout'
import { AIAssistancePanel } from '@/components/ai-assistance-panel'
import {
  autoReplyTicket,
  closeTicket,
  getPublicDepartments,
  getTicket,
  transferTicket,
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
  if (value === 'new') return 'New'
  if (value === 'in_progress') return 'In Progress'
  if (value === 'closed') return 'Closed'
  return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

const defaultTicketId = '1'

function TicketDetailContent() {
  const router = useRouter()
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

  // Reply Modal State
  const [isReplyModalOpen, setIsReplyModalOpen] = React.useState(false)
  const [cc, setCc] = React.useState('')
  const [bcc, setBcc] = React.useState('')
  const [showCcBcc, setShowCcBcc] = React.useState(false)
  const [isMaximized, setIsMaximized] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [showFormatting, setShowFormatting] = React.useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false)
  const [showLinkPopup, setShowLinkPopup] = React.useState(false)
  const [linkText, setLinkText] = React.useState('')
  const [linkUrl, setLinkUrl] = React.useState('')
  const [savedRange, setSavedRange] = React.useState<any>(null)

  // Attachments panel state
  const [showAttachments, setShowAttachments] = React.useState(false)
  const attachmentsPanelRef = React.useRef<HTMLDivElement>(null)

  const quillRef = React.useRef<any>(null)

  const isOpeningImageRef = React.useRef(false)

  const imageHandler = React.useCallback(() => {
    if (isOpeningImageRef.current) return
    isOpeningImageRef.current = true
    setTimeout(() => {
      isOpeningImageRef.current = false
    }, 500)

    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('multiple', 'true')
    input.click()
    input.onchange = async () => {
      if (input.files) {
        setFiles(prev => [...prev, ...Array.from(input.files!)])
      }
    }
  }, [])

  const quillModules = React.useMemo(() => ({
    toolbar: {
      container: '#custom-toolbar',
      handlers: {
        image: imageHandler
      }
    }
  }), [imageHandler])

  // Patch Quill so the editor always has a selection before toolbar buttons fire.
  // This prevents the "Cannot read properties of null (reading 'index')" error.
  const handleQuillRef = React.useCallback((el: any) => {
    quillRef.current = el
    if (el) {
      const editor = el.getEditor?.()
      if (editor && !editor.__toolbarPatched) {
        const toolbar = editor.getModule('toolbar')
        if (toolbar) {
          const origHandler = toolbar.handler?.bind(toolbar)
          // Override internal handler to ensure focus first
        }
        // Wrap the quill.getFormat to handle null selection gracefully
        const origGetFormat = editor.getFormat.bind(editor)
        editor.getFormat = function (...args: any[]) {
          if (args.length === 0) {
            const sel = editor.getSelection()
            if (!sel) {
              editor.focus()
              const newSel = editor.getSelection()
              if (!newSel) return {}
            }
          }
          try {
            return origGetFormat(...args)
          } catch {
            return {}
          }
        }
        editor.__toolbarPatched = true
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const [departments, setDepartments] = React.useState<{ id: number, name: string }[]>([])
  const [transferDepartmentId, setTransferDepartmentId] = React.useState<string>('')
  const [isTransferring, setIsTransferring] = React.useState(false)
  const [isClosing, setIsClosing] = React.useState(false)

  const handleClose = async () => {
    setIsClosing(true)
    try {
      await closeTicket(ticketId)
      await load()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to close ticket')
    } finally {
      setIsClosing(false)
    }
  }

  const load = React.useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    if (showLoading) setError(null)

    try {
      const [ticketData, draftData, deptsData] = await Promise.all([
        getTicket(ticketId),
        listAiDrafts(ticketId),
        getPublicDepartments()
      ])

      setDetail(ticketData)
      setDrafts(draftData)
      setDepartments(deptsData)

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
      if (showLoading) setLoading(false)
    }
  }, [ticketId])

  React.useEffect(() => {
    load()

    // Auto refresh every 1 seconds without showing loading spinner
    const interval = setInterval(() => {
      load(false)
    }, 1000)

    return () => clearInterval(interval)
  }, [load])

  const handleReply = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    const cleanMsg = replyMessage.replace(/<[^>]*>?/gm, '').trim()
    const hasInlineImage = replyMessage.includes('<img')
    if (!cleanMsg && !hasInlineImage && files.length === 0) return

    try {
      setReplying(true)
      await replyToTicket(ticketId, {
        message: replyMessage.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        files: files.length > 0 ? files : undefined
      })
      setReplyMessage('')
      setCc('')
      setBcc('')
      setFiles([])
      setIsReplyModalOpen(false)
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

      // Convert plain text line breaks to HTML for ReactQuill
      const formattedText = draft.draft_text.replace(/\n/g, '<br/>')
      setReplyMessage(formattedText)

      setIsReplyModalOpen(true)
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

  const handleTransfer = async () => {
    if (!transferDepartmentId) return
    setIsTransferring(true)
    try {
      await transferTicket(ticketId, parseInt(transferDepartmentId))
      router.push('/inbox')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to transfer ticket')
    } finally {
      setIsTransferring(false)
    }
  }

  const ticket = detail?.ticket
  const messages: TicketMessage[] = detail?.messages ?? []

  // Collect all attachments from all messages with sender info
  const allAttachments = React.useMemo(() => {
    const result: { url: string; filename: string; sender_type: string; created_at: string }[] = []
    for (const msg of messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          result.push({ ...att, sender_type: msg.sender_type, created_at: msg.created_at })
        }
      }
    }
    return result
  }, [messages])

  // Close attachments panel on outside click
  React.useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (attachmentsPanelRef.current && !attachmentsPanelRef.current.contains(e.target as Node)) {
        setShowAttachments(false)
      }
    }
    if (showAttachments) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showAttachments])

  return (
    <>
      <AppLayout orgName="Acme Corp" userName="Alex Johnson" userRole="Admin">
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 border-b border-border/50 bg-background/80 px-6 py-4 backdrop-blur-xl transition-all">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">Ticket</span>
                  <h1 className="text-lg font-bold leading-tight text-foreground">#{ticketId}</h1>
                </div>
                <span className="text-muted-foreground">·</span>
                <h2 className="text-sm font-semibold text-foreground">{ticket?.subject ?? 'Loading…'}</h2>
                <div className="flex items-center gap-2 ml-2">
                  <button
                    type="button"
                    disabled={suggesting}
                    onClick={handleSuggest}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-xs font-semibold text-blue-500 transition-all duration-200 hover:bg-blue-500/20 hover:shadow-md hover:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                  >
                    {suggesting ? 'Generating...' : '✨ Generate Suggestion'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReplyModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:shadow-primary/20 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  >
                    Reply
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Attachments Button */}
                <div className="relative" ref={attachmentsPanelRef}>
                  <button
                    type="button"
                    onClick={() => setShowAttachments(v => !v)}
                    className={`relative inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 ${showAttachments
                      ? 'border-primary/40 bg-primary/10 text-primary shadow-md shadow-primary/10'
                      : 'border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/5 shadow-sm'
                      }`}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    Attachments
                    {allAttachments.length > 0 && (
                      <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {allAttachments.length}
                      </span>
                    )}
                  </button>

                  {showAttachments && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/20 backdrop-blur-xl overflow-hidden">
                      {/* Panel Header */}
                      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">All Attachments</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {allAttachments.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAttachments(false)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Attachments List */}
                      <div className="max-h-72 overflow-y-auto">
                        {allAttachments.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <Paperclip className="h-8 w-8 text-muted-foreground/30" />
                            <p className="text-xs text-muted-foreground">No attachments in this ticket</p>
                          </div>
                        ) : (
                          <div className="p-2 flex flex-col gap-1">
                            {allAttachments.map((att, idx) => {
                              const isImage = /\.(jpeg|jpg|gif|png|webp)$/i.test(att.filename)
                              const isPDF = /\.pdf$/i.test(att.filename)
                              return (
                                <div
                                  key={idx}
                                  className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
                                >
                                  {/* File Icon */}
                                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isImage ? 'bg-blue-500/10' : isPDF ? 'bg-red-500/10' : 'bg-muted'
                                    }`}>
                                    <FileText className={`h-4 w-4 ${isImage ? 'text-blue-400' : isPDF ? 'text-red-400' : 'text-muted-foreground'
                                      }`} />
                                  </div>

                                  {/* File Info */}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold text-foreground" title={att.filename}>
                                      {att.filename}
                                    </p>
                                    <div className="mt-0.5 flex items-center gap-1.5">
                                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${att.sender_type === 'customer'
                                        ? 'bg-secondary text-secondary-foreground'
                                        : att.sender_type === 'human'
                                          ? 'bg-blue-500/10 text-blue-400'
                                          : 'bg-emerald-500/10 text-emerald-400'
                                        }`}>
                                        {att.sender_type === 'customer' ? 'Customer' : att.sender_type === 'human' ? 'Agent' : 'AI'}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatDate(att.created_at)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                      title="View"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                    <a
                                      href={att.url}
                                      download={att.filename}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                      title="Download"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">

                  <select
                    value={transferDepartmentId}
                    onChange={(e) => setTransferDepartmentId(e.target.value)}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="" disabled>Transfer to...</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleTransfer}
                    disabled={!transferDepartmentId || isTransferring}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isTransferring ? 'Transferring...' : 'Transfer'}
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={isClosing || ticket?.status === 'closed'}
                    className="inline-flex items-center justify-center rounded-lg bg-zinc-800 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-zinc-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                  >
                    {isClosing ? 'Closing...' : 'Close Ticket'}
                  </button>
                </div>

                <div className="flex items-center gap-3 border-l border-border/50 pl-5">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-500 border border-blue-500/20 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    {ticket ? formatStatus(ticket.status) : 'Loading'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden bg-muted/20">
            <div className="flex-1 overflow-hidden border-r border-border bg-background/50">
              <div className="flex h-full flex-col">


                <div className="flex-1 space-y-6 overflow-y-auto p-6 lg:px-8">
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
                        className={`group rounded-2xl border p-6 transition-all duration-300 hover:shadow-md ${message.sender_type === 'customer'
                          ? 'border-border/60 bg-card shadow-sm hover:border-border'
                          : message.sender_type === 'human'
                            ? 'border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-blue-100/50 shadow-sm dark:border-blue-500/20 dark:from-blue-500/5 dark:to-blue-500/10'
                            : 'border-emerald-200/50 bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 shadow-sm dark:border-emerald-500/20 dark:from-emerald-500/5 dark:to-emerald-500/10'}`
                        }>
                        <div className="mb-4 flex items-center justify-between gap-4 border-b border-border/40 pb-3">
                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${message.sender_type === 'customer'
                                ? 'bg-secondary text-secondary-foreground'
                                : message.sender_type === 'human'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                }`}
                            >
                              {message.sender_type}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground/80">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        {/* Using dangerouslySetInnerHTML because message might be rich text (HTML) */}
                        <div
                          className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words overflow-hidden [&_a]:break-all"
                          dangerouslySetInnerHTML={{ __html: message.message_body }}
                        />
                        {(message as any).attachments && (message as any).attachments.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-4">
                            {(message as any).attachments.map((att: any, i: number) => {
                              const isImage = att.filename.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
                              const isPDF = att.filename.match(/\.pdf$/i) != null;
                              return (
                                <div key={i} className="group relative flex w-52 flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30">
                                  {/* Preview Area */}
                                  <div className="flex h-28 items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10 transition-colors group-hover:from-primary/5 group-hover:to-primary/10">
                                    {isImage ? (
                                      <LucideImage className="h-12 w-12 text-blue-400/70 transition-transform duration-300 group-hover:scale-110" />
                                    ) : isPDF ? (
                                      <FileText className="h-12 w-12 text-red-400/70 transition-transform duration-300 group-hover:scale-110" />
                                    ) : (
                                      <FileText className="h-12 w-12 text-muted-foreground/50 transition-transform duration-300 group-hover:scale-110" />
                                    )}
                                  </div>
                                  {/* Bottom Info Area */}
                                  <div className="flex items-center gap-2 border-t border-border/50 bg-background/50 p-2.5 backdrop-blur-sm">
                                    <span className="truncate text-xs font-semibold text-foreground/90" title={att.filename}>
                                      {att.filename}
                                    </span>
                                  </div>
                                  {/* Hover Overlay Actions */}
                                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100">
                                    <a
                                      href={att.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/40"
                                      title="View in new tab">
                                      <Maximize2 className="h-4 w-4" />
                                    </a>
                                    <a
                                      href={att.url}
                                      download={att.filename}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/40"
                                      title="Download">
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>

      {isReplyModalOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm transition-all ${isMaximized ? 'p-0' : ''}`}>
          <div className={`w-full border border-border/50 bg-card/95 shadow-2xl shadow-primary/5 overflow-hidden flex flex-col transition-all duration-300 ease-out backdrop-blur-xl ${isMaximized ? 'max-w-none h-screen rounded-none' : 'max-w-[800px] h-[600px] rounded-2xl'}`}>
            <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-5 py-3">
              <h2 className="text-sm font-semibold text-foreground tracking-wide">New Message</h2>
              <div className="flex items-center gap-1">
                <button title="Minimize" onClick={() => setIsReplyModalOpen(false)} className="rounded text-muted-foreground hover:bg-muted p-1 transition-colors">
                  <Minus className="h-4 w-4" />
                </button>
                <button title="Full screen" onClick={() => setIsMaximized(!isMaximized)} className="rounded text-muted-foreground hover:bg-muted p-1 transition-colors">
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button title="Save & close" onClick={() => setIsReplyModalOpen(false)} className="rounded text-muted-foreground hover:bg-muted p-1 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleReply} className="flex flex-col overflow-hidden flex-1 relative">
              <div className="flex flex-col p-0 overflow-y-auto flex-1">

                <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-muted-foreground">To</span>
                    <div className="text-sm font-medium text-foreground">
                      {ticket?.customer?.email || "Customer"}
                    </div>
                  </div>
                  {!showCcBcc && (
                    <button type="button" onClick={() => setShowCcBcc(true)} className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
                      Cc Bcc
                    </button>
                  )}
                </div>

                {showCcBcc && (
                  <>
                    <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
                      <span className="text-sm text-muted-foreground w-8">Cc</span>
                      <input
                        type="text"
                        value={cc}
                        onChange={e => setCc(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                        className="flex-1 bg-transparent text-sm text-foreground outline-none"
                        placeholder="email1@example.com, email2@example.com"
                      />
                    </div>
                    <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
                      <span className="text-sm text-muted-foreground w-8">Bcc</span>
                      <input
                        type="text"
                        value={bcc}
                        onChange={e => setBcc(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                        className="flex-1 bg-transparent text-sm text-foreground outline-none"
                        placeholder="email1@example.com, email2@example.com"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2">
                  <input
                    type="text"
                    defaultValue={ticket?.subject ? `Re: ${ticket.subject}` : ""}
                    onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                    className="flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="Subject"
                  />
                </div>

                <div className="flex-1 relative flex flex-col group/editor">
                  <ReactQuill
                    // @ts-expect-error - ReactQuill types do not include ref
                    ref={handleQuillRef}
                    theme="snow"
                    value={replyMessage}
                    onChange={setReplyMessage}
                    className="flex-1 flex flex-col-reverse overflow-y-auto bg-transparent text-foreground [&_.ql-container.ql-snow]:!border-none [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-sm"
                    placeholder=""
                    modules={quillModules}
                  />

                  {files.length > 0 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-2">
                      {files.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 border border-border group">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-foreground truncate max-w-[200px]">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="ml-2 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border bg-card px-4 py-3 flex items-end justify-between">
                <div className="flex items-end gap-4">
                  <div className="flex items-center h-9 shadow-sm rounded-md overflow-hidden">
                    <button
                      type="submit"
                      disabled={replying || (!replyMessage.replace(/<[^>]*>?/gm, '').trim() && !replyMessage.includes('<img') && files.length === 0)}
                      className="h-full px-5 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {replying ? 'Sending...' : 'Send'}
                    </button>
                    <button type="button" className="h-full px-2 bg-blue-600 text-white hover:bg-blue-700 border-l border-blue-700/50 transition-colors">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div id="custom-toolbar" className="ql-toolbar flex flex-col gap-2 !border-none bg-transparent p-0 relative">

                    {/* Formatting Row */}
                    <div className={`flex items-center flex-wrap gap-1 ${showFormatting ? 'flex' : 'hidden'} bg-muted/50 p-1.5 rounded-md`}>
                      <select className="ql-font border-none !bg-transparent h-8" defaultValue="" />
                      <select className="ql-size border-none !bg-transparent h-8" defaultValue="" />
                      <div className="w-px h-4 bg-border mx-1" />
                      <button className="ql-bold !w-8 !h-8 hover:bg-muted rounded-md" title="Bold" />
                      <button className="ql-italic !w-8 !h-8 hover:bg-muted rounded-md" title="Italic" />
                      <button className="ql-underline !w-8 !h-8 hover:bg-muted rounded-md" title="Underline" />
                      <button className="ql-strike !w-8 !h-8 hover:bg-muted rounded-md" title="Strikethrough" />
                      <select className="ql-color border-none !bg-transparent h-8 w-8" />
                      <select className="ql-background border-none !bg-transparent h-8 w-8" />
                      <div className="w-px h-4 bg-border mx-1" />
                      <select className="ql-align border-none !bg-transparent h-8" />
                      <button className="ql-list !w-8 !h-8 hover:bg-muted rounded-md" value="ordered" title="Numbered list" />
                      <button className="ql-list !w-8 !h-8 hover:bg-muted rounded-md" value="bullet" title="Bulleted list" />
                      <button className="ql-blockquote !w-8 !h-8 hover:bg-muted rounded-md" title="Quote" />
                    </div>

                    <div className="flex items-center flex-wrap gap-1 min-h-[36px]">
                      <button type="button" title="Formatting options" onClick={() => setShowFormatting(!showFormatting)} className={`p-1.5 rounded-md transition-colors ${showFormatting ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'hover:bg-muted text-muted-foreground'}`}><Type className="h-4 w-4" /></button>
                      <label title="Attach files" className="cursor-pointer p-1.5 hover:bg-muted text-muted-foreground rounded-md transition-colors flex items-center justify-center">
                        <Paperclip className="h-4 w-4" />
                        <input type="file" multiple className="hidden" onChange={handleFileChange} />
                      </label>

                      <div className="relative flex items-center">
                        <button type="button" title="Insert link" onClick={() => {
                          const quill = quillRef.current?.getEditor();
                          if (quill) {
                            const range = quill.getSelection(true);
                            setSavedRange(range);
                            if (range && range.length > 0 && range.index != null) {
                              setLinkText(quill.getText(range.index, range.length));
                            } else {
                              setLinkText('');
                            }
                            setLinkUrl('');
                            setShowLinkPopup(!showLinkPopup);
                            setShowEmojiPicker(false);
                          }
                        }} className="p-1.5 hover:bg-muted text-muted-foreground rounded-md transition-colors"><Link2 className="h-4 w-4" /></button>

                        {showLinkPopup && (
                          <div className="absolute bottom-full left-0 mb-2 w-72 rounded-md border bg-card p-3 shadow-lg z-50 flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-muted-foreground">Text to display</label>
                              <input type="text" value={linkText} onChange={e => setLinkText(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-xs text-muted-foreground">Link URL</label>
                              <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div className="flex justify-end gap-2 mt-1">
                              <div role="button" tabIndex={0} onClick={() => setShowLinkPopup(false)} className="px-3 py-1.5 text-xs hover:bg-muted rounded-md text-foreground transition-colors cursor-pointer text-center">Cancel</div>
                              <div role="button" tabIndex={0} onClick={() => {
                                const quill = quillRef.current?.getEditor();
                                if (quill) {
                                  let insertIndex = quill.getLength() - 1;
                                  if (savedRange && savedRange.index != null) {
                                    if (savedRange.length > 0) {
                                      quill.deleteText(savedRange.index, savedRange.length);
                                    }
                                    insertIndex = savedRange.index;
                                  }
                                  quill.insertText(insertIndex, linkText || linkUrl, 'link', linkUrl);
                                  quill.setSelection(insertIndex + (linkText || linkUrl).length, 0);
                                }
                                setShowLinkPopup(false);
                              }} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer text-center">Apply</div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="relative flex items-center">
                        <button type="button" title="Insert emoji" onClick={() => {
                          setShowEmojiPicker(!showEmojiPicker);
                          setShowLinkPopup(false);
                        }} className="p-1.5 hover:bg-muted text-muted-foreground rounded-md transition-colors"><Smile className="h-4 w-4" /></button>

                        {showEmojiPicker && (
                          <div className="absolute bottom-full left-0 mb-2 z-50 shadow-xl border rounded-lg bg-card overflow-hidden emoji-picker-wrapper">
                            <style>{`
                               .emoji-picker-wrapper button {
                                 height: unset !important;
                                 width: unset !important;
                                 padding: unset !important;
                                 float: unset !important;
                                 background: unset !important;
                                 border: unset !important;
                               }
                             `}</style>
                            <EmojiPicker onEmojiClick={(emojiData) => {
                              const quill = quillRef.current?.getEditor();
                              if (quill) {
                                const range = quill.getSelection(true) || { index: quill.getLength() - 1, length: 0 };
                                const targetIndex = range.index != null ? range.index : quill.getLength() - 1;
                                quill.insertText(targetIndex, emojiData.emoji);
                                quill.setSelection(targetIndex + emojiData.emoji.length, 0);
                              } else {
                                setReplyMessage(prev => prev + emojiData.emoji);
                              }
                              setShowEmojiPicker(false);
                            }} theme={Theme.AUTO} />
                          </div>
                        )}
                      </div>

                      <button type="button" title="Insert files using Drive" className="p-1.5 hover:bg-muted text-muted-foreground rounded-md transition-colors"><Triangle className="h-4 w-4" /></button>
                      <button className="ql-image !w-8 !h-8 hover:bg-muted rounded-md flex items-center justify-center p-1.5 text-muted-foreground transition-colors" title="Insert photo" />
                      <button type="button" title="Toggle confidential mode" className="p-1.5 hover:bg-muted text-muted-foreground rounded-md transition-colors"><Lock className="h-4 w-4" /></button>
                      <button type="button" title="Insert signature" className="p-1.5 hover:bg-muted text-muted-foreground rounded-md transition-colors"><PenTool className="h-4 w-4" /></button>
                      <button type="button" title="More options" className="p-1.5 hover:bg-muted text-muted-foreground rounded-md transition-colors ml-1"><MoreVertical className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>

                <button type="button" title="Discard draft" onClick={() => setIsReplyModalOpen(false)} className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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