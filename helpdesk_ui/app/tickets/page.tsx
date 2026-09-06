'use client'

import React from 'react'
import { AppLayout } from '@/components/app-layout'
import { createTicket, type CreateTicketPayload } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

type TicketFormState = {
  subject: string
  customerName: string
  customerEmail: string
  priority: 'low' | 'medium' | 'high'
  assignee: string
  tags: string
  message: string
}

const initialFormState: TicketFormState = {
  subject: '',
  customerName: '',
  customerEmail: '',
  priority: 'medium',
  assignee: '',
  tags: '',
  message: '',
}

export default function TicketsPage() {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [form, setForm] = React.useState<TicketFormState>(initialFormState)

  const resetForm = () => setForm(initialFormState)

  const openCreateModal = () => {
    setIsCreateOpen(true)
  }

  const closeCreateModal = () => {
    if (isSubmitting) return
    setIsCreateOpen(false)
    resetForm()
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.subject.trim() || !form.customerName.trim() || !form.message.trim()) {
      toast.error('Please fill subject, customer name, and message')
      return
    }

    try {
      setIsSubmitting(true)

      const payload = {
        subject: form.subject.trim(),
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim() || undefined,
        priority: form.priority,
        assignee: form.assignee.trim() || undefined,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        message: form.message.trim(),
      }

      const serverPayload: CreateTicketPayload = {
        customer: {
          name: payload.customerName,
          email: payload.customerEmail ?? '',
        },
        subject: payload.subject,
        message: payload.message,
        channel: 'web',
      }

      const res = await createTicket(serverPayload)

      toast.success(`Ticket created: ${res.id}`)
      setIsCreateOpen(false)
      resetForm()
    } catch (err) {
      console.error('Failed to create ticket', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout orgName="Acme Corp" userName="Alex Johnson" userRole="Admin">
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">All Tickets</h1>
            <p className="text-muted-foreground">View and manage all support tickets</p>
          </div>
          <Button onClick={openCreateModal}>Create New Ticket</Button>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Support Tickets</h2>
            <p className="text-sm text-muted-foreground">Complete list of all customer support requests</p>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">Ticket list view will be implemented here</p>
          </div>
        </div>

        {isCreateOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={closeCreateModal}
          >
            <Card className="w-full max-w-2xl border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <CardHeader>
                <CardTitle>Create New Ticket</CardTitle>
                <CardDescription>Fill in the details below and submit to create a ticket.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Subject</span>
                      <input
                        value={form.subject}
                        onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Payment integration failing"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Priority</span>
                      <select
                        value={form.priority}
                        onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value as TicketFormState['priority'] }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Customer Name</span>
                      <input
                        value={form.customerName}
                        onChange={(event) => setForm((prev) => ({ ...prev, customerName: event.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                        placeholder="John Doe"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Customer Email</span>
                      <input
                        type="email"
                        value={form.customerEmail}
                        onChange={(event) => setForm((prev) => ({ ...prev, customerEmail: event.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                        placeholder="john@example.com"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Assignee</span>
                      <input
                        value={form.assignee}
                        onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Sarah Chen"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-medium text-foreground">Tags</span>
                      <input
                        value={form.tags}
                        onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                        placeholder="payment, integration"
                      />
                    </label>
                  </div>

                  <label className="space-y-2 block">
                    <span className="text-sm font-medium text-foreground">Message</span>
                    <textarea
                      value={form.message}
                      onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                      className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Describe the issue in detail..."
                    />
                  </label>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={closeCreateModal} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Ticket'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
