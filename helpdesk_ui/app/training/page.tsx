'use client'

import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '@/components/app-layout'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
  Zap,
} from 'lucide-react'
import {
  AiAgentOption,
  assignSkillToAgent,
  createKnowledgeBase,
  createSkill,
  KnowledgeBaseResponse,
  KnowledgeDocumentResponse,
  listAiAgentOptions,
  listKnowledgeBaseDocuments,
  listKnowledgeBases,
  listSkills,
  reindexKnowledgeBase,
  SkillResponse,
  testSkill,
  uploadKnowledgeBaseDocument,
} from '@/lib/api'
import { toast } from 'sonner'

type TabKey = 'kb' | 'skills' 
type KBFilter = 'all' | 'common' | 'agent'

type KnowledgeBaseFormState = {
  name: string
  scope: 'common' | 'agent'
  agent_id: string
}

type SkillFormState = {
  name: string
  endpoint_url: string
  http_method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  auth_type: 'none' | 'api_key' | 'oauth'
  timeout_ms: string
}

const initialKbForm: KnowledgeBaseFormState = {
  name: '',
  scope: 'common',
  agent_id: '',
}

const initialSkillForm: SkillFormState = {
  name: '',
  endpoint_url: '',
  http_method: 'GET',
  auth_type: 'none',
  timeout_ms: '5000',
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

function statusIcon(status: KnowledgeDocumentResponse['status']) {
  switch (status) {
    case 'indexed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'processing':
      return <Clock className="h-4 w-4 animate-spin text-blue-500" />
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function kbStatusIcon(scope: KnowledgeBaseResponse['scope']) {
  return scope === 'agent' ? (
    <ShieldCheck className="h-4 w-4 text-indigo-500" />
  ) : (
    <FileText className="h-4 w-4 text-primary" />
  )
}

export default function TrainingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('kb')
  const [kbFilter, setKbFilter] = useState<KBFilter>('all')

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseResponse[]>([])
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocumentResponse[]>([])
  const [skills, setSkills] = useState<SkillResponse[]>([])
  const [agents, setAgents] = useState<AiAgentOption[]>([])

  const [selectedKbId, setSelectedKbId] = useState<number | null>(null)
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null)

  const [kbForm, setKbForm] = useState<KnowledgeBaseFormState>(initialKbForm)
  const [skillForm, setSkillForm] = useState<SkillFormState>(initialSkillForm)
  const [skillTestPayload, setSkillTestPayload] = useState<string>(
    '{\n  "ticket_id": 1\n}'
  )
  const [assignAgentId, setAssignAgentId] = useState<string>('')
  const [assignSkillId, setAssignSkillId] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [kbSaving, setKbSaving] = useState(false)
  const [skillSaving, setSkillSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [testingSkill, setTestingSkill] = useState(false)
  const [skillTestResult, setSkillTestResult] = useState<unknown>(null)

  const filteredKBs = useMemo(() => {
    return knowledgeBases.filter((kb) => {
      if (kbFilter === 'all') return true
      return kb.scope === kbFilter
    })
  }, [knowledgeBases, kbFilter])

  const selectedKB = useMemo(
    () => knowledgeBases.find((kb) => kb.id === selectedKbId) ?? null,
    [knowledgeBases, selectedKbId]
  )

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.id === selectedSkillId) ?? null,
    [skills, selectedSkillId]
  )

  async function loadKnowledgeBases() {
    const items = await listKnowledgeBases()
    setKnowledgeBases(items)
    setSelectedKbId((current) => current ?? items[0]?.id ?? null)
  }

  async function loadKnowledgeDocuments(kbId: number) {
    const items = await listKnowledgeBaseDocuments(kbId)
    setKnowledgeDocuments(items)
  }

  async function loadSkills() {
    const items = await listSkills()
    setSkills(items)
    setSelectedSkillId((current) => current ?? items[0]?.id ?? null)
    setAssignSkillId((current) => current || (items[0] ? String(items[0].id) : ''))
  }

  async function loadAgents() {
    const items = await listAiAgentOptions()
    setAgents(items)
    setAssignAgentId((current) => current || (items[0] ? String(items[0].id) : ''))
  }

  async function refreshAll() {
    setLoading(true)
    try {
      await Promise.all([loadKnowledgeBases(), loadSkills(), loadAgents()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load training data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshAll()
  }, [])

  useEffect(() => {
    if (selectedKbId == null) {
      setKnowledgeDocuments([])
      return
    }

    void (async () => {
      try {
        await loadKnowledgeDocuments(selectedKbId)
      } catch (err) {
        setKnowledgeDocuments([])
        toast.error(err instanceof Error ? err.message : 'Failed to load documents')
      }
    })()
  }, [selectedKbId])

  async function handleCreateKnowledgeBase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setKbSaving(true)

    try {
      const payload = {
        name: kbForm.name.trim(),
        scope: kbForm.scope,
        agent_id:
          kbForm.scope === 'agent' && kbForm.agent_id.trim()
            ? Number(kbForm.agent_id)
            : null,
      }

      await createKnowledgeBase(payload)
      setKbForm(initialKbForm)
      await loadKnowledgeBases()
      toast.success('Knowledge base created successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create knowledge base')
    } finally {
      setKbSaving(false)
    }
  }

  async function handleUploadDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedKbId || !selectedFile) {
      toast.error('Choose a knowledge base and a file first')
      return
    }

    setUploading(true)

    try {
      await uploadKnowledgeBaseDocument(selectedKbId, selectedFile)
      setSelectedFile(null)
      const input = document.getElementById('kb-upload-file') as HTMLInputElement | null
      if (input) input.value = ''
      await loadKnowledgeDocuments(selectedKbId)
      await loadKnowledgeBases()
      toast.success('Document uploaded successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  async function handleReindex() {
    if (!selectedKbId) return

    setReindexing(true)

    try {
      await reindexKnowledgeBase(selectedKbId)
      await loadKnowledgeDocuments(selectedKbId)
      await loadKnowledgeBases()
      toast.success('Reindex started successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start reindex')
    } finally {
      setReindexing(false)
    }
  }

  async function handleCreateSkill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSkillSaving(true)

    try {
      await createSkill({
        name: skillForm.name.trim(),
        endpoint_url: skillForm.endpoint_url.trim(),
        http_method: skillForm.http_method,
        auth_type: skillForm.auth_type,
        timeout_ms: Number(skillForm.timeout_ms),
      })
      setSkillForm(initialSkillForm)
      await loadSkills()
      toast.success('Skill created successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create skill')
    } finally {
      setSkillSaving(false)
    }
  }

  async function handleAssignSkill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!assignAgentId || !assignSkillId) {
      toast.error('Choose both an agent and a skill')
      return
    }

    setAssigning(true)

    try {
      await assignSkillToAgent(assignAgentId, {
        skill_id: Number(assignSkillId),
      })
      toast.success('Skill assigned to agent successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign skill')
    } finally {
      setAssigning(false)
    }
  }

  async function handleTestSkill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSkillId) {
      toast.error('Select a skill first')
      return
    }

    setTestingSkill(true)
    setSkillTestResult(null)

    try {
      const parsedPayload = JSON.parse(skillTestPayload)
      const result = await testSkill(selectedSkillId, {
        payload: parsedPayload,
      })
      setSkillTestResult(result)
      toast.success('Skill test completed')
    } catch (err) {
      if (err instanceof SyntaxError) {
        toast.error('Skill test payload must be valid JSON')
      } else {
        toast.error(err instanceof Error ? err.message : 'Failed to test skill')
      }
    } finally {
      setTestingSkill(false)
    }
  }

  return (
    <AppLayout orgName="Acme Corp" userName="Alex Johnson" userRole="Admin">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">Training</h1>
          <p className="text-muted-foreground">
            Manage knowledge bases and skills for your AI agents
          </p>
        </div>

        <div className="mb-8 flex gap-0 border-b border-border">
          <button
            onClick={() => setActiveTab('kb')}
            className={`border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'kb'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Knowledge Base
            </div>
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'skills'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Skills
            </div>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>

        {activeTab === 'kb' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Total KBs</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{knowledgeBases.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Common KBs</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {knowledgeBases.filter((kb) => kb.scope === 'common').length}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Agent KBs</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {knowledgeBases.filter((kb) => kb.scope === 'agent').length}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setKbFilter('all')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  kbFilter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setKbFilter('common')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  kbFilter === 'common'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                Common
              </button>
              <button
                onClick={() => setKbFilter('agent')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  kbFilter === 'agent'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                Agent
              </button>

              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <Search className="h-4 w-4" />
                Showing {filteredKBs.length} result{filteredKBs.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <form
                onSubmit={handleCreateKnowledgeBase}
                className="rounded-lg border border-border bg-card p-5 lg:col-span-1"
              >
                <div className="mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Create Knowledge Base</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Name</label>
                    <input
                      value={kbForm.name}
                      onChange={(e) => setKbForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Support Docs"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="kb-scope" className="mb-1 block text-sm font-medium text-foreground">Scope</label>
                    <select
                      id="kb-scope"
                      aria-label="Scope"
                      value={kbForm.scope}
                      onChange={(e) =>
                        setKbForm((prev) => ({
                          ...prev,
                          scope: e.target.value as 'common' | 'agent',
                          agent_id: e.target.value === 'common' ? '' : prev.agent_id,
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="common">common</option>
                      <option value="agent">agent</option>
                    </select>
                  </div>

                  {kbForm.scope === 'agent' && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">Agent ID</label>
                      <input
                        value={kbForm.agent_id}
                        onChange={(e) => setKbForm((prev) => ({ ...prev, agent_id: e.target.value }))}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        placeholder="1"
                        type="number"
                        min="1"
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={kbSaving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {kbSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create KB
                  </button>
                </div>
              </form>

              <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">Knowledge Bases</h2>
                  {selectedKB && (
                    <span className="text-sm text-muted-foreground">
                      Selected: {selectedKB.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredKBs.map((kb) => (
                    <button
                      key={kb.id}
                      onClick={() => setSelectedKbId(kb.id)}
                      className={`rounded-lg border p-4 text-left transition-all ${
                        selectedKbId === kb.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-primary/50'
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {kbStatusIcon(kb.scope)}
                          <h3 className="font-semibold text-foreground truncate">{kb.name}</h3>
                        </div>
                        <span className="rounded-full bg-secondary px-2 py-1 text-xs text-foreground shrink-0">
                          {kb.scope}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {kb.agent_id ? `Agent ID: ${kb.agent_id}` : 'Common knowledge base'}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Created {formatDate(kb.created_at)}
                      </p>
                    </button>
                  ))}

                  {filteredKBs.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                      No knowledge bases found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedKB && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">{selectedKB.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        Scope: {selectedKB.scope}
                        {selectedKB.agent_id ? ` | Agent ID: ${selectedKB.agent_id}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 text-primary" />
                      {knowledgeDocuments.length} documents
                    </div>
                  </div>

                  <div className="space-y-3">
                    {knowledgeDocuments.length > 0 ? (
                      knowledgeDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              {statusIcon(doc.status)}
                              <p className="font-medium text-foreground">{doc.title}</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {doc.type.toUpperCase()} • {doc.status} • {formatDate(doc.created_at)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                        No documents uploaded yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <form onSubmit={handleUploadDocument} className="rounded-lg border border-border bg-card p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-foreground">Upload Document</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">File</label>
                        <input
                          id="kb-upload-file"
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                          title="Select a document to upload"
                          aria-label="Select a document to upload"
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={uploading || !selectedFile}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Upload to KB
                      </button>
                    </div>
                  </form>

                  <div className="rounded-lg border border-border bg-card p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">Reindex</h3>
                      </div>
                      <button
                        onClick={handleReindex}
                        disabled={reindexing}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reindexing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Reindex KB
                      </button>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Reindex will process all documents in this knowledge base and refresh vector data.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Total Skills</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{skills.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Agents Available</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{agents.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm text-muted-foreground">Selected Skill</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {selectedSkill ? selectedSkill.name : 'None'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <form onSubmit={handleCreateSkill} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Create Skill</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="skill_name" className="mb-1 block text-sm font-medium text-foreground">Name</label>
                    <input
                      id="skill_name"
                      value={skillForm.name}
                      onChange={(e) => setSkillForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="Ticket Lookup"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="skill_endpoint_url" className="mb-1 block text-sm font-medium text-foreground">Endpoint URL</label>
                    <input
                      id="skill_endpoint_url"
                      value={skillForm.endpoint_url}
                      onChange={(e) =>
                        setSkillForm((prev) => ({ ...prev, endpoint_url: e.target.value }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      placeholder="http://127.0.0.1:9000/api/tickets"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="http_method" className="mb-1 block text-sm font-medium text-foreground">Method</label>
                      <select
                        id="http_method"
                        aria-label="HTTP Method"
                        value={skillForm.http_method}
                        onChange={(e) =>
                          setSkillForm((prev) => ({
                            ...prev,
                            http_method: e.target.value as SkillFormState['http_method'],
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      >
                        <option>GET</option>
                        <option>POST</option>
                        <option>PUT</option>
                        <option>DELETE</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="auth_type" className="mb-1 block text-sm font-medium text-foreground">Auth Type</label>
                      <select
                        id="auth_type"
                        aria-label="Authentication Type"
                        value={skillForm.auth_type}
                        onChange={(e) =>
                          setSkillForm((prev) => ({
                            ...prev,
                            auth_type: e.target.value as SkillFormState['auth_type'],
                          }))
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      >
                        <option value="none">none</option>
                        <option value="api_key">api_key</option>
                        <option value="oauth">oauth</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="skill_timeout_ms" className="mb-1 block text-sm font-medium text-foreground">Timeout (ms)</label>
                    <input
                      id="skill_timeout_ms"
                      value={skillForm.timeout_ms}
                      onChange={(e) => setSkillForm((prev) => ({ ...prev, timeout_ms: e.target.value }))}
                      type="number"
                      min="100"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={skillSaving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {skillSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create Skill
                  </button>
                </div>
              </form>

              <div className="rounded-lg border border-border bg-card p-5 xl:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold text-foreground">Skills</h2>
                  <span className="text-sm text-muted-foreground">{skills.length} total</span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {skills.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => {
                        setSelectedSkillId(skill.id)
                        setAssignSkillId(String(skill.id))
                        setSkillTestResult(null)
                      }}
                      className={`rounded-lg border p-4 text-left transition-all ${
                        selectedSkillId === skill.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:border-primary/50'
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{skill.name}</h3>
                          <p className="mt-1 text-xs text-muted-foreground truncate">{skill.endpoint_url}</p>
                        </div>
                        <span className="rounded-full bg-secondary px-2 py-1 text-xs text-foreground shrink-0">
                          {skill.http_method}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Auth: {skill.auth_type} • Timeout: {skill.timeout_ms}ms
                      </p>
                    </button>
                  ))}

                  {skills.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground md:col-span-2">
                      No skills found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <form onSubmit={handleAssignSkill} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Assign Skill To Agent</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Agent</label>
                    <select
                      aria-label="Agent"
                      value={assignAgentId}
                      onChange={(e) => setAssignAgentId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      required
                    >
                      <option value="">Select agent</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.id} - {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Skill</label>
                    <select
                      aria-label="Skill to assign"
                      value={assignSkillId}
                      onChange={(e) => setAssignSkillId(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      required
                    >
                      <option value="">Select skill</option>
                      {skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.id} - {skill.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={assigning}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Assign Skill
                  </button>
                </div>
              </form>

              <form onSubmit={handleTestSkill} className="rounded-lg border border-border bg-card p-5 xl:col-span-2">
                <div className="mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Test Skill</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Skill</label>
                    <select
                      aria-label="Skill to test"
                      value={selectedSkillId ?? ''}
                      onChange={(e) => setSelectedSkillId(Number(e.target.value))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                      required
                    >
                      <option value="">Select skill</option>
                      {skills.map((skill) => (
                        <option key={skill.id} value={skill.id}>
                          {skill.id} - {skill.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Payload JSON</label>
                    <textarea
                      value={skillTestPayload}
                      onChange={(e) => setSkillTestPayload(e.target.value)}
                      placeholder="Enter JSON payload to test the skill"
                      title="Skill test payload JSON"
                      className="min-h-[160px] w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={testingSkill}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {testingSkill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Test Skill
                </button>

                {skillTestResult !== null && (
                  <div className="mt-6 rounded-lg border border-border bg-secondary p-4">
                    <h3 className="mb-3 font-semibold text-foreground">Test Result</h3>
                    <pre className="overflow-auto text-xs text-foreground">
                      {JSON.stringify(skillTestResult, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedSkill && (
                  <div className="mt-6 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Selected skill</p>
                    <p className="mt-1">{selectedSkill.name}</p>
                    <p>{selectedSkill.http_method} • {selectedSkill.endpoint_url}</p>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}