import React, { useState, useEffect } from 'react'
import { Activity, Award, BookOpenCheck, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, Landmark, LayoutDashboard, Lightbulb, ListTodo, Search, ShieldCheck, TriangleAlert, Users, WalletCards } from 'lucide-react'

interface Task {
  id: string
  name: string
  description: string
  deadline: string
  difficulty?: number
  estimatedDays?: number
  amount?: number
  assignee?: string
  project?: 'government' | 'internal' | 'operations'
  budgetCategory?: BudgetCategory
  cashAmount?: number
  inKindAmount?: number
  approvalStage?: 'draft' | 'requested' | 'approved' | 'paid' | 'rejected'
  approvalMemo?: string
  rejectionReason?: string
  approvedBy?: string
  approvedAt?: string
  approvalHistory?: ApprovalHistory[]
  createdAt: string
  status: 'pending' | 'in-progress' | 'review' | 'blocked' | 'completed'
  attachments?: Attachment[]
}

type BudgetCategory = 'labor' | 'materials' | 'activity' | 'international' | 'outsourcing' | 'incentive' | 'indirect'

interface ApprovalHistory {
  id: string
  stage: NonNullable<Task['approvalStage']>
  memo?: string
  actor: string
  createdAt: string
}

interface Attachment {
  id: string
  name: string
  url: string
  type: 'image' | 'video'
  mimeType: string
  size: number
  uploadedAt: string
  tag?: AttachmentTag
  note?: string
  history?: EvidenceHistory[]
}

type AttachmentTag = 'quote' | 'receipt' | 'inspection' | 'meeting' | 'siteVideo' | 'deliverable' | 'other'

interface EvidenceHistory {
  id: string
  action: 'uploaded' | 'tagged' | 'noted' | 'downloaded' | 'deleted'
  actor: string
  createdAt: string
  memo?: string
}

interface PersonalEntry {
  id: string
  person: string
  type: 'leave' | 'schedule' | 'trip' | 'performance'
  title?: string
  startDate: string
  endDate: string
  note?: string
  subtype?: string
  approvalStatus?: 'draft' | 'requested' | 'approved' | 'rejected'
  startTime?: string
  endTime?: string
  location?: string
  substitute?: string
  amount?: number
  quantity?: number
  unit?: string
  visibility?: 'summary' | 'team' | 'admin'
  evidence?: string
}

interface AppInstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3002' : '/api')

const PROJECT_TYPES = [
  { id: 'government', label: '정부사업' },
  { id: 'internal', label: '내부전략' },
  { id: 'operations', label: '운영/지속' },
] as const

const PERSONAL_TYPES = {
  leave: { label: '연차/휴가', subtypes: [['annual','연차'],['half-am','오전 반차'],['half-pm','오후 반차'],['sick','병가'],['special','특별휴가']] },
  schedule: { label: '개인 일정', subtypes: [['meeting','회의'],['training','교육'],['focus','집중업무'],['external','외부 일정'],['other','기타']] },
  trip: { label: '출장', subtypes: [['domestic','국내 출장'],['overseas','해외 출장'],['day','당일 출장'],['site','현장 방문']] },
  performance: { label: '개인 실적', subtypes: [['sales','매출/수주'],['report','보고서/문서'],['delivery','납품/완료'],['patent','특허/논문'],['improvement','개선 성과'],['other','기타']] },
} as const

const APPROVAL_LABELS = { draft: '임시저장', requested: '승인대기', approved: '승인', rejected: '반려' } as const

const BUDGET_CATEGORIES: Array<{ id: BudgetCategory; label: string; description: string; tone: string }> = [
  { id: 'labor', label: '인건비', description: '참여연구원 급여·4대보험·퇴직급여 충당', tone: 'bg-teal-50 text-teal-800' },
  { id: 'materials', label: '재료비', description: '시약·재료·부품·소모성 연구재료', tone: 'bg-sky-50 text-sky-800' },
  { id: 'activity', label: '연구활동비', description: '회의·자문·시험분석·문헌·출장성 활동', tone: 'bg-violet-50 text-violet-800' },
  { id: 'international', label: '국제활동비', description: '국제공동연구·해외협력·국외 출장', tone: 'bg-indigo-50 text-indigo-800' },
  { id: 'outsourcing', label: '외주용역비', description: '시험·제작·검증·전문기관 용역', tone: 'bg-amber-50 text-amber-800' },
  { id: 'incentive', label: '성과금', description: '성과 보상·인센티브·기여 보상', tone: 'bg-rose-50 text-rose-800' },
  { id: 'indirect', label: '간접비', description: '기관 공통지원·관리운영성 간접비', tone: 'bg-slate-100 text-slate-700' },
]

const BUDGET_APPROVAL_LABELS = { draft: '작성', requested: '결재요청', approved: '승인', paid: '집행완료', rejected: '반려' } as const
const APPROVAL_STAGE_ORDER: Array<NonNullable<Task['approvalStage']>> = ['draft', 'requested', 'approved', 'paid', 'rejected']

const ATTACHMENT_TAGS: Array<{ id: AttachmentTag; label: string }> = [
  { id: 'quote', label: '견적서' },
  { id: 'receipt', label: '영수증' },
  { id: 'inspection', label: '검수사진' },
  { id: 'meeting', label: '회의사진' },
  { id: 'siteVideo', label: '현장영상' },
  { id: 'deliverable', label: '결과물' },
  { id: 'other', label: '기타' },
]

export default function GovProjectDashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [team, setTeam] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'priority' | 'table' | 'calendar' | 'timeline' | 'people' | 'management'>('priority')
  const [selectedAssignee, setSelectedAssignee] = useState<string>('전체')
  const [selectedProject, setSelectedProject] = useState<string>('전체')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [newTeamMember, setNewTeamMember] = useState('')
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [difficulty, setDifficulty] = useState<number>(2)
  const [estimatedDays, setEstimatedDays] = useState<number>(3)
  const [amount, setAmount] = useState<number>(0)
  const [assignee, setAssignee] = useState<string>('정구상')
  const [project, setProject] = useState<'government' | 'internal' | 'operations'>('government')
  const [budgetCategory, setBudgetCategory] = useState<BudgetCategory>('labor')
  const [cashAmount, setCashAmount] = useState<number>(0)
  const [inKindAmount, setInKindAmount] = useState<number>(0)
  const [approvalStage, setApprovalStage] = useState<Task['approvalStage']>('requested')
  const [editingBudgetTaskId, setEditingBudgetTaskId] = useState<string | null>(null)
  const [budgetDraft, setBudgetDraft] = useState<{
    budgetCategory: BudgetCategory
    cashAmount: number
    inKindAmount: number
    amount: number
    approvalStage: NonNullable<Task['approvalStage']>
  }>({ budgetCategory: 'labor', cashAmount: 0, inKindAmount: 0, amount: 0, approvalStage: 'requested' })
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({})
  const [approvalFilter, setApprovalFilter] = useState<'all' | NonNullable<Task['approvalStage']>>('all')
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | AttachmentTag | 'missing'>('all')
  const [evidenceSearch, setEvidenceSearch] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('cjf-admin-token') || '')
  const [showLogin, setShowLogin] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [personalEntries, setPersonalEntries] = useState<PersonalEntry[]>([])
  const [personalPerson, setPersonalPerson] = useState('정구상')
  const [personalType, setPersonalType] = useState<PersonalEntry['type']>('leave')
  const [personalTitle, setPersonalTitle] = useState('')
  const [personalStart, setPersonalStart] = useState('')
  const [personalEnd, setPersonalEnd] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [personalSubtype, setPersonalSubtype] = useState('annual')
  const [personalApproval, setPersonalApproval] = useState<NonNullable<PersonalEntry['approvalStatus']>>('requested')
  const [personalStartTime, setPersonalStartTime] = useState('09:00')
  const [personalEndTime, setPersonalEndTime] = useState('18:00')
  const [personalLocation, setPersonalLocation] = useState('')
  const [personalSubstitute, setPersonalSubstitute] = useState('')
  const [personalAmount, setPersonalAmount] = useState(0)
  const [personalQuantity, setPersonalQuantity] = useState(0)
  const [personalUnit, setPersonalUnit] = useState('건')
  const [personalVisibility, setPersonalVisibility] = useState<NonNullable<PersonalEntry['visibility']>>('summary')
  const [personalEvidence, setPersonalEvidence] = useState('')
  const [personalFilterType, setPersonalFilterType] = useState<'all' | PersonalEntry['type']>('all')
  const [personalFilterStatus, setPersonalFilterStatus] = useState<'all' | NonNullable<PersonalEntry['approvalStatus']>>('all')
  const [installPrompt, setInstallPrompt] = useState<AppInstallPrompt | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isStandalone, setIsStandalone] = useState(window.matchMedia('(display-mode: standalone)').matches)
  const [showInstallGuide, setShowInstallGuide] = useState(false)

  const request = async (path: string, options?: RequestInit) => {
    const headers = new Headers(options?.headers)
    if (adminToken) headers.set('Authorization', `Bearer ${adminToken}`)
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
    if (!res.ok) throw new Error(`요청 실패 (${res.status})`)
    return res
  }

  const mediaUrl = (url: string) => url.startsWith('http') || url.startsWith('data:') ? url : `${API_BASE}${url}`

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

  const handleAttachmentFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files).filter(file => file.type.startsWith('image/') || file.type.startsWith('video/'))
    if (!selectedFiles.length) {
      setError('이미지 또는 동영상 파일만 첨부할 수 있습니다.')
      return
    }

    setUploadingAttachment(true)
    setError('')
    try {
      const uploaded: Attachment[] = []
      for (const file of selectedFiles) {
        if (file.size > 30 * 1024 * 1024) throw new Error(`${file.name} 파일이 30MB를 초과합니다.`)
        const data = await readFileAsDataUrl(file)
        const res = await request('/uploads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, mimeType: file.type, data }),
        })
        uploaded.push(await res.json())
      }
      setAttachments(prev => [...prev, ...uploaded])
      setNotice(`첨부파일 ${uploaded.length}개가 안전하게 저장되었습니다.`)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '첨부파일을 업로드하지 못했습니다.')
    } finally {
      setUploadingAttachment(false)
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(attachment => attachment.id !== id))
  }

  const updatePendingAttachment = (id: string, patch: Partial<Pick<Attachment, 'tag' | 'note'>>) => {
    setAttachments(prev => prev.map(attachment => attachment.id === id ? { ...attachment, ...patch } : attachment))
  }

  const updateTaskAttachment = async (task: Task, attachmentId: string, patch: Partial<Pick<Attachment, 'tag' | 'note'>>) => {
    try {
      const res = await request(`/tasks/${task.id}/attachments/${attachmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const updated = await res.json()
      setTasks(prev => prev.map(item => item.id === task.id ? updated : item))
      setNotice('첨부파일 정보가 업데이트되었습니다.')
    } catch {
      setError('첨부파일 정보를 수정하지 못했습니다.')
    }
  }

  const deleteTaskAttachment = async (task: Task, attachmentId: string) => {
    if (!window.confirm('이 첨부파일을 삭제할까요? 저장된 파일과 업무 연결이 함께 정리됩니다.')) return
    try {
      const res = await request(`/tasks/${task.id}/attachments/${attachmentId}`, { method: 'DELETE' })
      const updated = await res.json()
      setTasks(prev => prev.map(item => item.id === task.id ? updated : item))
      setNotice('첨부파일이 삭제되었습니다.')
    } catch {
      setError('첨부파일을 삭제하지 못했습니다.')
    }
  }

  const downloadCsv = (fileName: string, rows: Array<Record<string, string | number>>) => {
    if (!rows.length) {
      setNotice('내보낼 데이터가 없습니다.')
      return
    }
    const headers = Object.keys(rows[0])
    const escapeCell = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = [headers.join(','), ...rows.map(row => headers.map(header => escapeCell(row[header])).join(','))].join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
    setNotice(`${fileName} 파일을 생성했습니다.`)
  }

  const renderTaskAttachments = (taskAttachments?: Attachment[], compact = false, task?: Task) => {
    if (!taskAttachments?.length) return null
    return (
      <div className={`mt-3 grid ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'} gap-2`}>
        {taskAttachments.slice(0, compact ? 3 : 6).map(attachment => (
          <div
            key={attachment.id}
            className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
          >
            <a href={mediaUrl(attachment.url)} target="_blank" rel="noreferrer" className="block">
              <div className="aspect-video bg-slate-900">
                {attachment.type === 'image'
                  ? <img src={mediaUrl(attachment.url)} alt={attachment.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  : <video src={mediaUrl(attachment.url)} className="h-full w-full object-cover" controls={!compact} preload="metadata" />}
              </div>
            </a>
            {!compact && (
              <div className="space-y-2 px-2 py-2 text-[11px] text-slate-500">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-semibold text-slate-700">{attachment.name}</span>
                  <a href={mediaUrl(attachment.url)} download className="shrink-0 font-bold text-teal-700">다운로드</a>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-1 font-semibold text-slate-600">{ATTACHMENT_TAGS.find(tag => tag.id === attachment.tag)?.label || '미분류'}</span>
                  {attachment.note && <span className="truncate text-slate-400">{attachment.note}</span>}
                </div>
                {isAdmin && task && (
                  <div className="space-y-2">
                    <select
                      aria-label={`${attachment.name} 태그`}
                      value={attachment.tag || 'other'}
                      onChange={event => void updateTaskAttachment(task, attachment.id, { tag: event.target.value as AttachmentTag })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                    >
                      {ATTACHMENT_TAGS.map(tag => <option key={tag.id} value={tag.id}>{tag.label}</option>)}
                    </select>
                    <input
                      aria-label={`${attachment.name} 설명 메모`}
                      value={attachment.note || ''}
                      onChange={event => void updateTaskAttachment(task, attachment.id, { note: event.target.value })}
                      placeholder="증빙 설명 메모"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                    />
                    <button type="button" onClick={() => void deleteTaskAttachment(task, attachment.id)} className="w-full rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">첨부 삭제</button>
                  </div>
                )}
              </div>
            )}
            {compact && (
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-500">
                {ATTACHMENT_TAGS.find(tag => tag.id === attachment.tag)?.label || '미분류'}
              </div>
            )}
          </div>
        ))}
        {taskAttachments.length > (compact ? 3 : 6) && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-2 text-xs text-slate-500">+{taskAttachments.length - (compact ? 3 : 6)}개</div>}
      </div>
    )
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }),
      })
      if (!res.ok) throw new Error('login failed')
      const { token } = await res.json()
      localStorage.setItem('cjf-admin-token', token)
      setAdminToken(token)
      setIsAdmin(true)
      setShowLogin(false)
      setAdminPassword('')
      setNotice('관리자 인증에 성공했습니다.')
      const detailRes = await fetch(`${API_BASE}/personal-entries`, { headers: { Authorization: `Bearer ${token}` } })
      if (detailRes.ok) setPersonalEntries(await detailRes.json())
    } catch {
      setError('관리자 비밀번호가 올바르지 않습니다.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleModeToggle = async () => {
    if (!isAdmin) {
      if (!adminToken) { setShowLogin(true); return }
      try {
        const res = await request('/auth/session')
        const session = await res.json()
        if (!session.admin) throw new Error('expired')
        setIsAdmin(true)
        setNotice('관리자 모드로 전환했습니다.')
        const details = await request('/personal-entries')
        setPersonalEntries(await details.json())
      } catch {
        localStorage.removeItem('cjf-admin-token')
        setAdminToken('')
        setShowLogin(true)
      }
      return
    }
    try { await request('/auth/logout', { method: 'POST' }) } catch { /* 이미 만료된 세션 */ }
    localStorage.removeItem('cjf-admin-token')
    setAdminToken('')
    setIsAdmin(false)
    setNotice('관리자 모드에서 로그아웃했습니다.')
    const summary = await fetch(`${API_BASE}/personal-summary`)
    if (summary.ok) setPersonalEntries(await summary.json())
  }

  const loadTasks = async () => {
    setLoading(true)
    try {
      const res = await request('/tasks')
      const data = await res.json()
      setTasks(data)
    } catch (error) {
      console.error('Failed to load tasks:', error)
      setError('업무 데이터를 불러오지 못했습니다. 서버 연결을 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  const loadTeam = async () => {
    try {
      const res = await request('/team')
      const data = await res.json()
      setTeam(data)
    } catch (error) {
      console.error('Failed to load team:', error)
      setError('담당자 정보를 불러오지 못했습니다.')
    }
  }

  const loadPersonalSummary = async () => {
    try {
      const res = await request('/personal-summary')
      setPersonalEntries(await res.json())
    } catch { setError('팀 개인 현황을 불러오지 못했습니다.') }
  }

  useEffect(() => {
    loadTasks()
    loadTeam()
    loadPersonalSummary()
  }, [])

  useEffect(() => {
    const handleInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as AppInstallPrompt) }
    const handleInstalled = () => { setInstallPrompt(null); setIsStandalone(true); setNotice('앱 설치가 완료되었습니다.') }
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('beforeinstallprompt', handleInstall)
    window.addEventListener('appinstalled', handleInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstall)
      window.removeEventListener('appinstalled', handleInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInstallApp = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setNotice('앱 설치를 시작했습니다.')
    setInstallPrompt(null)
  }

  const navigateToView = (nextView: typeof view) => {
    if (nextView === view) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setView(nextView)
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  const handleAddPersonalEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await request('/personal-entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person: personalPerson, type: personalType, title: personalTitle, startDate: personalStart,
          endDate: personalEnd || personalStart, note: personalNote, subtype: personalSubtype,
          approvalStatus: personalApproval, startTime: personalStartTime, endTime: personalEndTime,
          location: personalLocation, substitute: personalSubstitute, amount: personalAmount,
          quantity: personalQuantity, unit: personalUnit, visibility: personalVisibility, evidence: personalEvidence,
        }),
      })
      const created = await res.json()
      setPersonalEntries(prev => [...prev, created])
      setPersonalTitle(''); setPersonalStart(''); setPersonalEnd(''); setPersonalNote(''); setPersonalLocation(''); setPersonalSubstitute(''); setPersonalAmount(0); setPersonalQuantity(0); setPersonalEvidence('')
      setNotice('개인 기록이 등록되었습니다. 일반 사용자에게는 간접 현황만 표시됩니다.')
    } catch { setError('개인 기록을 등록하지 못했습니다.') }
  }

  const handlePersonalTypeChange = (type: PersonalEntry['type']) => {
    setPersonalType(type)
    setPersonalSubtype(PERSONAL_TYPES[type].subtypes[0][0])
  }

  const handlePersonalApproval = async (id: string, approvalStatus: NonNullable<PersonalEntry['approvalStatus']>) => {
    try {
      const res = await request(`/personal-entries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvalStatus }) })
      const updated = await res.json()
      setPersonalEntries(prev => prev.map(entry => entry.id === id ? updated : entry))
      setNotice(`개인 기록을 ${APPROVAL_LABELS[approvalStatus]} 상태로 변경했습니다.`)
    } catch { setError('승인 상태를 변경하지 못했습니다.') }
  }

  const handleDeletePersonalEntry = async (id: string) => {
    if (!window.confirm('이 개인 기록을 삭제할까요?')) return
    try {
      await request(`/personal-entries/${id}`, { method: 'DELETE' })
      setPersonalEntries(prev => prev.filter(entry => entry.id !== id))
    } catch { setError('개인 기록을 삭제하지 못했습니다.') }
  }

  const handleImagePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const pastedFiles: File[] = []
    for (const item of items) {
      if (item.kind === 'file' && (item.type.startsWith('image/') || item.type.startsWith('video/'))) {
        const file = item.getAsFile()
        if (file) pastedFiles.push(file)
      }
    }
    if (pastedFiles.length) void handleAttachmentFiles(pastedFiles)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newTask: Omit<Task, 'id' | 'createdAt'> = {
      name,
      description,
      deadline,
      difficulty,
      estimatedDays,
      amount,
      assignee,
      project,
      budgetCategory,
      cashAmount,
      inKindAmount,
      approvalStage,
      attachments,
      status: 'pending',
    }

    try {
      const res = await request('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })
      const task = await res.json()
      setTasks(prev => [...prev, task])

      setName('')
      setDescription('')
      setDeadline('')
      setDifficulty(2)
      setEstimatedDays(3)
      setAmount(0)
      setAssignee('정구상')
      setProject('government')
      setBudgetCategory('labor')
      setCashAmount(0)
      setInKindAmount(0)
      setApprovalStage('requested')
      setImagePreview(null)
      setAttachments([])
      setNotice('새 업무가 등록되었습니다.')
      setError('')
    } catch (error) {
      console.error('Failed to add task:', error)
      setError('업무를 등록하지 못했습니다. 입력값과 서버 상태를 확인해 주세요.')
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      if (!window.confirm('이 업무를 삭제할까요? 삭제 후 되돌릴 수 없습니다.')) return
      await request(`/tasks/${id}`, { method: 'DELETE' })
      setTasks(prev => prev.filter(t => t.id !== id))
      setNotice('업무가 삭제되었습니다.')
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleStatusChange = async (id: string, status: Task['status']) => {
    try {
      const res = await request(`/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const updated = await res.json()
      setTasks(prev => prev.map(task => (task.id === id ? updated : task)))
      setNotice('업무 상태가 변경되었습니다.')
    } catch {
      setError('업무 상태를 변경하지 못했습니다.')
    }
  }

  const startBudgetEdit = (task: Task) => {
    setEditingBudgetTaskId(task.id)
    setBudgetDraft({
      budgetCategory: task.budgetCategory || 'activity',
      cashAmount: task.cashAmount ?? task.amount ?? 0,
      inKindAmount: task.inKindAmount || 0,
      amount: task.amount || 0,
      approvalStage: task.approvalStage || 'requested',
    })
  }

  const handleBudgetSave = async (id: string) => {
    try {
      const totalAmount = budgetDraft.cashAmount + budgetDraft.inKindAmount
      const res = await request(`/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetCategory: budgetDraft.budgetCategory,
          cashAmount: budgetDraft.cashAmount,
          inKindAmount: budgetDraft.inKindAmount,
          amount: totalAmount || budgetDraft.amount,
          approvalStage: budgetDraft.approvalStage,
        }),
      })
      const updated = await res.json()
      setTasks(prev => prev.map(task => (task.id === id ? updated : task)))
      setEditingBudgetTaskId(null)
      setNotice('예산/결재 정보가 저장되었습니다.')
    } catch {
      setError('예산/결재 정보를 저장하지 못했습니다.')
    }
  }

  const handleApprovalStageChange = async (task: Task, approvalStage: NonNullable<Task['approvalStage']>) => {
    try {
      const memo = (approvalNotes[task.id] || '').trim()
      const historyEntry: ApprovalHistory = {
        id: `${Date.now()}-${approvalStage}`,
        stage: approvalStage,
        memo,
        actor: '관리자',
        createdAt: new Date().toISOString(),
      }
      const res = await request(`/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStage,
          approvalMemo: approvalStage === 'approved' || approvalStage === 'paid' ? memo : task.approvalMemo,
          rejectionReason: approvalStage === 'rejected' ? memo : task.rejectionReason,
          approvedBy: approvalStage === 'approved' || approvalStage === 'paid' ? '관리자' : task.approvedBy,
          approvedAt: approvalStage === 'approved' || approvalStage === 'paid' ? new Date().toISOString() : task.approvedAt,
          approvalHistory: [...(task.approvalHistory || []), historyEntry],
        }),
      })
      const updated = await res.json()
      setTasks(prev => prev.map(item => (item.id === task.id ? updated : item)))
      setApprovalNotes(prev => ({ ...prev, [task.id]: '' }))
      setNotice(`결재 단계가 ${BUDGET_APPROVAL_LABELS[approvalStage]} 상태로 변경되었습니다.`)
    } catch {
      setError('결재 단계를 변경하지 못했습니다.')
    }
  }

  const handleAddTeamMember = async () => {
    if (!newTeamMember.trim()) return

    try {
      const res = await request('/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamMember }),
      })

      if (res.ok) {
        await loadTeam()
        setNewTeamMember('')
        setShowTeamModal(false)
      }
    } catch (error) {
      console.error('Failed to add team member:', error)
    }
  }

  const handleDeleteTeamMember = async (name: string) => {
    try {
      const res = await request(`/team/${encodeURIComponent(name)}`, { method: 'DELETE' })

      if (res.ok) {
        await loadTeam()
      }
    } catch (error) {
      console.error('Failed to delete team member:', error)
    }
  }

  const calculatePriorities = () => {
    const now = new Date()
    const filteredTasks = tasks
      .filter(t => selectedAssignee === '전체' || t.assignee === selectedAssignee)
      .filter(t => selectedProject === '전체' || t.project === selectedProject)

    return filteredTasks
      .map(task => {
        const deadline = new Date(task.deadline)
        const daysUntilDeadline = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        const deadlineScore = Math.max(0, 30 - Math.max(0, daysUntilDeadline) * 2)
        const amountScore =
          filteredTasks.length > 0
            ? ((task.amount || 0) / Math.max(...filteredTasks.map(t => t.amount || 0))) *
              25
            : 0
        const difficultyScore = ((task.difficulty || 1) / 5) * 20

        const totalScore = deadlineScore + amountScore + difficultyScore

        return {
          taskId: task.id,
          task,
          score: totalScore,
          daysLeft: daysUntilDeadline,
          deadline,
          breakdown: {
            deadline: deadlineScore,
            amount: amountScore,
            difficulty: difficultyScore,
          },
        }
      })
      .sort((a, b) => b.score - a.score)
  }

  const priorities = calculatePriorities()
  const visibleTasks = tasks.filter(task => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || `${task.name} ${task.description} ${task.assignee || ''}`.toLowerCase().includes(query)
    const matchesAssignee = selectedAssignee === '전체' || task.assignee === selectedAssignee
    const matchesProject = selectedProject === '전체' || task.project === selectedProject
    return matchesSearch && matchesAssignee && matchesProject
  })
  const completedCount = tasks.filter(task => task.status === 'completed').length
  const urgentCount = tasks.filter(task => new Date(task.deadline).getTime() <= Date.now() + 7 * 86400000 && task.status !== 'completed').length
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const topPriority = priorities[0]
  const todayLabel = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
  const todayKey = new Date().toISOString().slice(0, 10)
  const activePersonalEntries = personalEntries.filter(entry => entry.startDate <= todayKey && entry.endDate >= todayKey)
  const activeLeaveCount = activePersonalEntries.filter(entry => entry.type === 'leave').length
  const activeTripCount = activePersonalEntries.filter(entry => entry.type === 'trip').length
  const activeScheduleCount = activePersonalEntries.filter(entry => entry.type === 'schedule').length
  const pendingApprovalCount = personalEntries.filter(entry => entry.approvalStatus === 'requested').length
  const availablePeopleCount = Math.max(team.length - activeLeaveCount - activeTripCount, 0)
  const blockedCount = tasks.filter(task => task.status === 'blocked').length
  const reviewCount = tasks.filter(task => task.status === 'review').length
  const inProgressCount = tasks.filter(task => task.status === 'in-progress').length
  const operatingSignal =
    blockedCount > 0 ? '차단 업무 먼저 해소' :
    urgentCount > 0 ? '마감 임박 업무 집중' :
    pendingApprovalCount > 0 ? '승인 대기 정리' :
    '운영 흐름 안정'
  const operatingTone =
    blockedCount > 0 || urgentCount > 0 ? '주의' :
    pendingApprovalCount > 0 || activeLeaveCount + activeTripCount > 0 ? '점검' :
    '안정'
  const nextActions = [
    topPriority ? `최우선: ${topPriority.task.name}` : '신규 업무 등록 필요',
    pendingApprovalCount ? `승인 대기 ${pendingApprovalCount}건 확인` : '승인 대기 없음',
    activeLeaveCount + activeTripCount ? `부재/출장 ${activeLeaveCount + activeTripCount}명 업무 대행 확인` : '전체 인력 가용성 양호',
  ]
  const currentYear = currentMonth.getFullYear()
  const currentMonthTasks = tasks
    .filter(task => {
      const date = new Date(task.deadline)
      return date.getFullYear() === currentMonth.getFullYear() && date.getMonth() === currentMonth.getMonth()
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
  const monthlyUrgentCount = currentMonthTasks.filter(task => new Date(task.deadline).getTime() <= Date.now() + 7 * 86400000 && task.status !== 'completed').length
  const monthlyCompletedCount = currentMonthTasks.filter(task => task.status === 'completed').length
  const yearlyMonths = Array.from({ length: 12 }, (_, i) => {
    const monthTasks = tasks.filter(task => {
      const date = new Date(task.deadline)
      return date.getFullYear() === currentYear && date.getMonth() === i
    })
    const urgent = monthTasks.filter(task => new Date(task.deadline).getTime() <= Date.now() + 7 * 86400000 && task.status !== 'completed').length
    const completed = monthTasks.filter(task => task.status === 'completed').length
    const amountTotal = monthTasks.reduce((sum, task) => sum + (task.amount || 0), 0)
    return { month: i, label: `${i + 1}월`, tasks: monthTasks, urgent, completed, amountTotal }
  })
  const busiestMonthCount = Math.max(...yearlyMonths.map(month => month.tasks.length), 1)
  const taskStatusLabels: Record<Task['status'], string> = {
    pending: '대기',
    'in-progress': '진행 중',
    review: '검토/승인',
    blocked: '보류/차단',
    completed: '완료',
  }
  const totalBudgetAmount = tasks.reduce((sum, task) => sum + (task.amount || 0), 0)
  const activeBudgetAmount = tasks.filter(task => task.status !== 'completed').reduce((sum, task) => sum + (task.amount || 0), 0)
  const completedBudgetAmount = tasks.filter(task => task.status === 'completed').reduce((sum, task) => sum + (task.amount || 0), 0)
  const budgetedTasks = tasks.filter(task => (task.amount || 0) > 0 || (task.cashAmount || 0) > 0 || (task.inKindAmount || 0) > 0)
  const totalCashAmount = budgetedTasks.reduce((sum, task) => sum + (task.cashAmount ?? task.amount ?? 0), 0)
  const totalInKindAmount = budgetedTasks.reduce((sum, task) => sum + (task.inKindAmount || 0), 0)
  const nationalRndBudgetTotal = totalCashAmount + totalInKindAmount
  const budgetCategoryRows = BUDGET_CATEGORIES.map(category => {
    const categoryTasks = budgetedTasks.filter(task => (task.budgetCategory || 'activity') === category.id)
    const cash = categoryTasks.reduce((sum, task) => sum + (task.cashAmount ?? task.amount ?? 0), 0)
    const inKind = categoryTasks.reduce((sum, task) => sum + (task.inKindAmount || 0), 0)
    const approved = categoryTasks.filter(task => ['approved', 'paid'].includes(task.approvalStage || '')).reduce((sum, task) => sum + (task.cashAmount ?? task.amount ?? 0) + (task.inKindAmount || 0), 0)
    return { ...category, tasks: categoryTasks, cash, inKind, total: cash + inKind, approved }
  })
  const pendingBudgetApprovals = budgetedTasks.filter(task => (task.approvalStage || 'requested') === 'requested')
  const approvalQueueTasks = budgetedTasks
    .filter(task => ['requested', 'rejected', 'draft'].includes(task.approvalStage || 'requested'))
    .sort((a, b) => {
      const stageWeight = { requested: 0, rejected: 1, draft: 2, approved: 3, paid: 4 } as Record<NonNullable<Task['approvalStage']>, number>
      return (stageWeight[a.approvalStage || 'requested'] - stageWeight[b.approvalStage || 'requested']) || a.deadline.localeCompare(b.deadline)
    })
  const approvalStageCounts = APPROVAL_STAGE_ORDER.reduce((acc, stage) => {
    acc[stage] = budgetedTasks.filter(task => (task.approvalStage || 'requested') === stage).length
    return acc
  }, {} as Record<NonNullable<Task['approvalStage']>, number>)
  const approvalFilteredTasks = budgetedTasks
    .filter(task => approvalFilter === 'all' || (task.approvalStage || 'requested') === approvalFilter)
    .sort((a, b) => {
      const stageWeight = { requested: 0, rejected: 1, draft: 2, approved: 3, paid: 4 } as Record<NonNullable<Task['approvalStage']>, number>
      return (stageWeight[a.approvalStage || 'requested'] - stageWeight[b.approvalStage || 'requested']) || a.deadline.localeCompare(b.deadline)
    })
  const approvalReadyCount = approvalQueueTasks.filter(task => (task.attachments?.length || 0) > 0).length
  const rejectedApprovalCount = approvalStageCounts.rejected || 0
  const evidenceMissingApprovalCount = approvalQueueTasks.filter(task => !(task.attachments?.length)).length
  const approvalBottleneckAmount = approvalQueueTasks.reduce((sum, task) => sum + (task.cashAmount ?? task.amount ?? 0) + (task.inKindAmount || 0), 0)
  const paidBudgetAmount = budgetedTasks.filter(task => (task.approvalStage || '') === 'paid').reduce((sum, task) => sum + (task.cashAmount ?? task.amount ?? 0) + (task.inKindAmount || 0), 0)
  const evidenceReadyCount = budgetedTasks.filter(task => task.attachments?.length).length
  const evidenceItems = tasks.flatMap(task => (task.attachments || []).map(attachment => ({ task, attachment })))
  const missingEvidenceTasks = budgetedTasks.filter(task => !(task.attachments?.length))
  const evidenceKeyword = evidenceSearch.trim().toLowerCase()
  const filteredEvidenceItems = evidenceItems
    .filter(({ task, attachment }) => evidenceFilter === 'all' || evidenceFilter === 'missing' || (attachment.tag || 'other') === evidenceFilter)
    .filter(({ task, attachment }) => {
      if (!evidenceKeyword) return true
      return `${task.name} ${task.description} ${task.assignee || ''} ${attachment.name} ${attachment.note || ''}`.toLowerCase().includes(evidenceKeyword)
    })
    .sort((a, b) => new Date(b.attachment.uploadedAt).getTime() - new Date(a.attachment.uploadedAt).getTime())
  const largeVideoEvidenceCount = evidenceItems.filter(({ attachment }) => attachment.type === 'video' && attachment.size >= 10 * 1024 * 1024).length
  const evidenceSubmissionRows = budgetedTasks.map(task => {
    const taskAttachments = task.attachments || []
    const tags = new Set(taskAttachments.map(attachment => attachment.tag || 'other'))
    const hasRequiredTag = ['quote', 'receipt', 'inspection', 'deliverable'].some(tag => tags.has(tag as AttachmentTag))
    const hasMemo = taskAttachments.some(attachment => (attachment.note || '').trim().length > 0)
    const readyScore = Math.round(((taskAttachments.length ? 35 : 0) + (hasRequiredTag ? 35 : 0) + (hasMemo ? 20 : 0) + (task.approvalStage === 'paid' ? 10 : 0)))
    return { task, taskAttachments, tags, hasRequiredTag, hasMemo, readyScore }
  })
  const evidenceReadyForSubmission = evidenceSubmissionRows.filter(row => row.readyScore >= 70).length
  const evidenceSubmissionRate = evidenceSubmissionRows.length ? Math.round((evidenceReadyForSubmission / evidenceSubmissionRows.length) * 100) : 0
  const evidenceTagReadiness = ATTACHMENT_TAGS.filter(tag => tag.id !== 'other').map(tag => {
    const count = evidenceItems.filter(({ attachment }) => attachment.tag === tag.id).length
    return { ...tag, count, rate: evidenceItems.length ? Math.round((count / evidenceItems.length) * 100) : 0 }
  })
  const evidenceCsvRows = evidenceItems.map(({ task, attachment }) => ({
    업무명: task.name,
    담당자: task.assignee || '미배정',
    결재단계: BUDGET_APPROVAL_LABELS[task.approvalStage || 'requested'],
    태그: ATTACHMENT_TAGS.find(tag => tag.id === (attachment.tag || 'other'))?.label || '기타',
    파일명: attachment.name,
    유형: attachment.type === 'image' ? '이미지' : '동영상',
    용량MB: Math.round(attachment.size / 1024 / 1024 * 10) / 10,
    업로드일: new Date(attachment.uploadedAt).toLocaleString('ko-KR'),
    메모: attachment.note || '',
    URL: mediaUrl(attachment.url),
  }))
  const approvalAuditLogs = tasks.flatMap(task => (task.approvalHistory || []).map(history => ({
    task,
    history,
    amount: (task.cashAmount ?? task.amount ?? 0) + (task.inKindAmount || 0),
  }))).sort((a, b) => new Date(b.history.createdAt).getTime() - new Date(a.history.createdAt).getTime())
  const approvalLogsThisMonth = approvalAuditLogs.filter(log => {
    const date = new Date(log.history.createdAt)
    const now = new Date()
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  })
  const approvalFirstRequestAt = (task: Task) => {
    const requested = (task.approvalHistory || []).find(item => item.stage === 'requested')
    return requested?.createdAt || task.createdAt
  }
  const completedApprovalDurations = budgetedTasks
    .filter(task => ['approved', 'paid'].includes(task.approvalStage || ''))
    .map(task => {
      const end = task.approvedAt || [...(task.approvalHistory || [])].reverse().find(item => ['approved', 'paid'].includes(item.stage))?.createdAt
      if (!end) return 0
      return Math.max(0, new Date(end).getTime() - new Date(approvalFirstRequestAt(task)).getTime()) / 86400000
    })
    .filter(days => days > 0)
  const averageApprovalDays = completedApprovalDurations.length ? Math.round((completedApprovalDurations.reduce((sum, days) => sum + days, 0) / completedApprovalDurations.length) * 10) / 10 : 0
  const approvalActorRows = Array.from(new Set(approvalAuditLogs.map(log => log.history.actor))).map(actor => {
    const actorLogs = approvalAuditLogs.filter(log => log.history.actor === actor)
    return {
      actor,
      count: actorLogs.length,
      approved: actorLogs.filter(log => ['approved', 'paid'].includes(log.history.stage)).length,
      rejected: actorLogs.filter(log => log.history.stage === 'rejected').length,
    }
  }).sort((a, b) => b.count - a.count)
  const rejectionReasonRows = approvalAuditLogs
    .filter(log => log.history.stage === 'rejected')
    .map(log => {
      const memo = log.history.memo || log.task.rejectionReason || '사유 미입력'
      const reasonType = memo.includes('증빙') ? '증빙 부족' : memo.includes('금액') || memo.includes('예산') ? '예산 검토' : memo.includes('마감') || memo.includes('일정') ? '일정 조정' : memo === '사유 미입력' ? '사유 미입력' : '기타 검토'
      return { ...log, reasonType }
    })
  const rejectionReasonSummary = Array.from(new Set(rejectionReasonRows.map(row => row.reasonType))).map(reasonType => ({
    reasonType,
    count: rejectionReasonRows.filter(row => row.reasonType === reasonType).length,
  })).sort((a, b) => b.count - a.count)
  const approvalCsvRows = approvalAuditLogs.map(log => ({
    업무명: log.task.name,
    담당자: log.task.assignee || '미배정',
    단계: BUDGET_APPROVAL_LABELS[log.history.stage],
    처리자: log.history.actor,
    처리일: new Date(log.history.createdAt).toLocaleString('ko-KR'),
    금액만원: log.amount,
    메모: log.history.memo || '',
    반려사유: log.history.stage === 'rejected' ? (log.history.memo || log.task.rejectionReason || '') : '',
  }))
  const aiBudgetAlerts = [
    pendingBudgetApprovals.length ? `결재 대기 예산 ${pendingBudgetApprovals.length}건을 먼저 승인해야 합니다.` : '결재 대기 병목은 낮습니다.',
    evidenceReadyCount < budgetedTasks.length ? `증빙이 없는 예산 항목 ${budgetedTasks.length - evidenceReadyCount}건이 있습니다.` : '모든 예산 항목에 증빙이 연결되어 있습니다.',
    budgetCategoryRows.some(row => row.total > nationalRndBudgetTotal * 0.45 && nationalRndBudgetTotal > 0) ? '특정 세목 편중이 큽니다. 세목 간 집행 균형을 확인하세요.' : '세목 분산은 안정적입니다.',
  ]
  const patentEntries = personalEntries.filter(entry => entry.type === 'performance' && entry.subtype === 'patent')
  const educationEntries = personalEntries.filter(entry => entry.type === 'schedule' && entry.subtype === 'training')
  const supportEntries = personalEntries.filter(entry =>
    entry.type === 'trip' ||
    (entry.type === 'schedule' && ['training', 'external'].includes(entry.subtype || '')) ||
    `${entry.title || ''} ${entry.note || ''}`.includes('지원사업')
  )
  const approvedPerformanceEntries = personalEntries.filter(entry => entry.type === 'performance' && entry.approvalStatus === 'approved')
  const leaveEntries = personalEntries.filter(entry => entry.type === 'leave')
  const managementRows = team.map(person => {
    const personTasks = tasks.filter(task => task.assignee === person)
    const doneTasks = personTasks.filter(task => task.status === 'completed').length
    const personPerformances = approvedPerformanceEntries.filter(entry => entry.person === person)
    const personPatents = patentEntries.filter(entry => entry.person === person)
    const personTrips = personalEntries.filter(entry => entry.person === person && entry.type === 'trip')
    const personLeave = leaveEntries.filter(entry => entry.person === person)
    const executionScore = personTasks.length ? Math.round((doneTasks / personTasks.length) * 40) : 0
    const performanceScore = Math.min(personPerformances.length * 12, 36)
    const patentScore = Math.min(personPatents.length * 12, 12)
    const operationScore = Math.min(personTrips.length * 3, 12)
    const annualScore = Math.min(100, executionScore + performanceScore + patentScore + operationScore)
    return { person, personTasks, doneTasks, personPerformances, personPatents, personTrips, personLeave, annualScore }
  })

  const getPriorityColor = (rank: number) => {
    if (rank === 1) return 'executive-card before:bg-amber-500'
    if (rank <= 3) return 'executive-card before:bg-teal-600'
    if (rank <= 6) return 'executive-card before:bg-slate-500'
    return 'executive-card before:bg-slate-300'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 70) return '매우 시급'
    if (score >= 50) return '시급'
    if (score >= 30) return '중간'
    return '낮음'
  }

  return (
    <>
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
          <form onSubmit={handleAdminLogin} className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 id="admin-login-title" className="text-xl font-bold mb-2">관리자 로그인</h2>
            <p className="text-sm text-gray-600 mb-4">업무와 담당자를 변경하려면 관리자 인증이 필요합니다.</p>
            <label htmlFor="admin-password" className="block text-sm font-medium mb-2">관리자 비밀번호</label>
            <input id="admin-password" type="password" autoFocus value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-4" required />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowLogin(false); setAdminPassword('') }} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg">취소</button>
              <button type="submit" disabled={authLoading} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg disabled:opacity-50">{authLoading ? '확인 중…' : '로그인'}</button>
            </div>
          </form>
        </div>
      )}
      {/* 담당자 관리 모달 */}
      {showTeamModal && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">담당자 관리</h2>

            {/* 담당자 추가 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">새 담당자 추가</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTeamMember}
                  onChange={e => setNewTeamMember(e.target.value)}
                  placeholder="이름 입력"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  onKeyPress={e => {
                    if (e.key === 'Enter') handleAddTeamMember()
                  }}
                />
                <button
                  onClick={handleAddTeamMember}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  추가
                </button>
              </div>
            </div>

            {/* 담당자 목록 */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">담당자 목록</label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {team.map(person => (
                  <div
                    key={person}
                    className="flex items-center justify-between bg-gray-100 px-3 py-2 rounded-lg"
                  >
                    <span className="font-medium">{person}</span>
                    <button
                      onClick={() => handleDeleteTeamMember(person)}
                      className="text-red-600 hover:text-red-800 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 닫기 버튼 */}
            <button
              onClick={() => setShowTeamModal(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <div className="app-shell min-h-screen pb-24 md:pb-0">
      <header className="glass-header text-white sticky top-0 z-30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center shadow-inner"><LayoutDashboard size={22} className="text-teal-300" /></div>
            <div><h1 className="text-xl md:text-2xl font-bold tracking-tight">Conception <span className="text-teal-300">Job Flow</span></h1><p className="text-xs md:text-sm text-slate-400 mt-0.5">Executive Operations Console</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>{isOnline ? '● 온라인' : '● 오프라인'}</span>
          {isStandalone && <span className="text-xs px-2 py-1 rounded-full bg-teal-500/15 text-teal-100">앱 실행</span>}
          <button
            type="button"
            data-testid="mode-toggle"
            onClick={handleModeToggle}
            className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${isAdmin ? 'bg-amber-300 text-slate-900' : 'bg-white/95 text-slate-900'}`}
          >
            <ShieldCheck size={16}/>{isAdmin ? '관리자 로그아웃' : '관리자 로그인'}
          </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800">{error}</div>}
        {notice && <div role="status" className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 flex justify-between"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="알림 닫기">×</button></div>}
        {(view === 'priority' || view === 'table') && <div className="mb-5 relative">
          <label htmlFor="task-search" className="sr-only">업무 검색</label>
          <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input id="task-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="업무명, 설명, 담당자 검색" className="surface-input w-full pl-12 pr-4 py-4 rounded-xl" />
        </div>}
        {/* 프로젝트 필터 */}
        {(view === 'priority' || view === 'table') && <div className="executive-card mb-6 flex gap-5 flex-wrap rounded-xl p-4">
          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] uppercase font-bold text-slate-400 my-auto mr-1">프로젝트</span>
            <button
              onClick={() => setSelectedProject('전체')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedProject === '전체'
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체
            </button>
            {PROJECT_TYPES.map(proj => (
              <button
                key={proj.id}
                onClick={() => setSelectedProject(proj.id)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedProject === proj.id
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {proj.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] uppercase font-bold text-slate-400 my-auto mr-1">담당자</span>
            <button
              onClick={() => setSelectedAssignee('전체')}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedAssignee === '전체'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체
            </button>
            {team.map(person => (
              <button
                key={person}
                onClick={() => setSelectedAssignee(person)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedAssignee === person
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {person}
              </button>
            ))}
            {isAdmin && <button
              onClick={() => setShowTeamModal(true)}
              className="px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold"
            >
              +
            </button>}
          </div>
        </div>}

        {/* 뷰 탭 */}
        <div className="hidden md:flex gap-1 mb-6 rounded-xl bg-slate-900/95 p-1 overflow-x-auto shadow-[0_14px_34px_rgba(15,23,42,0.14)]">
            <button
            onClick={() => navigateToView('priority')}
            className={`px-4 py-2 font-medium whitespace-nowrap rounded-lg ${
              view === 'priority'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2"><Activity size={17}/>우선순위 분석</span>
          </button>
          <button
            onClick={() => navigateToView('table')}
            className={`px-4 py-2 font-medium whitespace-nowrap rounded-lg ${
              view === 'table'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2"><ListTodo size={17}/>업무 목록</span>
          </button>
          <button
            onClick={() => navigateToView('calendar')}
            className={`px-4 py-2 font-medium whitespace-nowrap rounded-lg ${
              view === 'calendar'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2"><CalendarDays size={17}/>달력</span>
          </button>
          <button
            onClick={() => navigateToView('timeline')}
            className={`px-4 py-2 font-medium whitespace-nowrap rounded-lg ${
              view === 'timeline'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2"><LayoutDashboard size={17}/>연간 일정</span>
          </button>
          <button
            onClick={() => navigateToView('people')}
            className={`px-4 py-2 font-medium whitespace-nowrap rounded-lg ${view === 'people' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            <span className="flex items-center gap-2"><Users size={17}/>팀 개인 현황</span>
          </button>
          <button
            onClick={() => navigateToView('management')}
            className={`px-4 py-2 font-medium whitespace-nowrap rounded-lg ${view === 'management' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'}`}
          >
            <span className="flex items-center gap-2"><Landmark size={17}/>운영 관리</span>
          </button>
        </div>

        {/* 콘텐츠 */}
        <div key={view} className="view-panel" aria-live="polite">
        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : view === 'priority' ? (
          // 우선순위 분석 뷰
          <div className="space-y-4">
            <div className="executive-card rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-amber-700">DECISION BOARD</p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">우선순위 분석</h2>
                  <p className="text-sm text-slate-500 mt-2">오늘 먼저 결정해야 할 업무를 마감, 금액, 난이도 기준으로 정렬합니다.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="executive-card-subtle rounded-lg px-4 py-3"><div className="text-xs text-slate-500">최우선 담당</div><div className="font-bold">{topPriority ? topPriority.task.assignee || '미배정' : '-'}</div></div>
                  <div className="executive-card-subtle rounded-lg px-4 py-3"><div className="text-xs text-slate-500">임박</div><div className="font-bold text-amber-700">{urgentCount}건</div></div>
                  <div className="executive-card-subtle rounded-lg px-4 py-3"><div className="text-xs text-slate-500">대상</div><div className="font-bold">{priorities.length}건</div></div>
                </div>
              </div>
            </div>
            {priorities.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
                우선순위를 계산할 업무가 없습니다.
              </div>
            ) : (
              priorities.map((item, idx) => (
                <div key={item.taskId} className={`relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1 p-5 md:p-6 rounded-xl ${getPriorityColor(idx + 1)}`}>
                  <div className="flex gap-4">
                    <div className="w-11 h-11 rounded-lg bg-slate-950 text-white flex items-center justify-center font-bold shrink-0">
                      {String(idx + 1).padStart(2,'0')}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{item.task.name}</h3>
                      <p className="text-sm text-gray-700 mb-2">{item.task.description}</p>
                      <div className="text-xs bg-slate-50 border border-slate-200 p-3 rounded-lg leading-relaxed break-words">
                        <div>
                          마감: {item.deadline.toLocaleDateString('ko-KR')} ({item.daysLeft}일)
                          | 난이도:{' '}
                          {['', '매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움'][
                            item.task.difficulty || 2
                          ]}
                          | 예상 {item.task.estimatedDays}일 | 금액 {item.task.amount || 0}만원
                        </div>
                        <div>
                          마감 긴급도: {item.breakdown.deadline.toFixed(1)}점 | 금액:{' '}
                          {item.breakdown.amount.toFixed(1)}점 | 난이도:{' '}
                          {item.breakdown.difficulty.toFixed(1)}점 | 총점:{' '}
                          <span className="font-bold">{item.score.toFixed(1)}점</span> (
                          {getScoreLabel(item.score)})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : view === 'table' ? (
          // 업무 목록 뷰
          <div className="space-y-5">
          <div className="executive-card rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-teal-700">EXECUTION LEDGER</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">업무 목록</h2>
                <p className="text-sm text-slate-500 mt-2">담당, 상태, 마감일을 기준으로 실행 현황을 관리합니다.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="executive-card-subtle rounded-lg px-4 py-3"><div className="text-xs text-slate-500">진행</div><div className="font-bold text-teal-700">{inProgressCount}건</div></div>
                <div className="executive-card-subtle rounded-lg px-4 py-3"><div className="text-xs text-slate-500">검토</div><div className="font-bold">{reviewCount}건</div></div>
                <div className="executive-card-subtle rounded-lg px-4 py-3"><div className="text-xs text-slate-500">표시</div><div className="font-bold">{visibleTasks.length}건</div></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {isAdmin && <div className="lg:col-span-1">
              <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold mb-4">새 업무 추가</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">업무명</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">설명</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onPaste={handleImagePaste}
                    placeholder="설명 (Ctrl+V로 이미지 붙여넣기)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">💡 Ctrl+V로 이미지 붙여넣기 가능</p>
                </div>
                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-800">첨부 자료실</label>
                      <p className="text-xs text-slate-500 mt-1">이미지와 동영상을 업무별 증빙으로 저장하고, 목록에서 바로 확인합니다. 파일당 최대 30MB.</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-900 text-white">{attachments.length}개</span>
                  </div>
                  <input
                    aria-label="업무 이미지 동영상 첨부"
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={e => {
                      if (e.target.files) void handleAttachmentFiles(e.target.files)
                      e.currentTarget.value = ''
                    }}
                    className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-700"
                  />
                  {uploadingAttachment && <div className="mt-3 text-xs font-semibold text-teal-700">첨부파일을 안전하게 저장하는 중입니다...</div>}
                  {attachments.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {attachments.map(attachment => (
                        <div key={attachment.id} className="group rounded-xl border border-slate-200 bg-white p-2">
                          <div className="aspect-video overflow-hidden rounded-lg bg-slate-900 flex items-center justify-center">
                            {attachment.type === 'image'
                              ? <img src={mediaUrl(attachment.url)} alt={attachment.name} className="h-full w-full object-cover" />
                              : <video src={mediaUrl(attachment.url)} className="h-full w-full object-cover" controls preload="metadata" />}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-xs text-slate-600">{attachment.name}</span>
                            <button type="button" onClick={() => removeAttachment(attachment.id)} className="shrink-0 text-xs font-semibold text-red-600">삭제</button>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-2">
                            <select
                              aria-label={`${attachment.name} 증빙 태그`}
                              value={attachment.tag || 'other'}
                              onChange={event => updatePendingAttachment(attachment.id, { tag: event.target.value as AttachmentTag })}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                            >
                              {ATTACHMENT_TAGS.map(tag => <option key={tag.id} value={tag.id}>{tag.label}</option>)}
                            </select>
                            <input
                              aria-label={`${attachment.name} 증빙 메모`}
                              value={attachment.note || ''}
                              onChange={event => updatePendingAttachment(attachment.id, { note: event.target.value })}
                              placeholder="증빙 설명 메모"
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {imagePreview && (
                  <div className="mb-4">
                    <img src={imagePreview} alt="preview" className="max-h-40 rounded" />
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="text-xs text-red-600 mt-2"
                    >
                      제거
                    </button>
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">마감일</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">프로젝트 유형</label>
                  <select
                    value={project}
                    onChange={e => setProject(e.target.value as 'government' | 'internal' | 'operations')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {PROJECT_TYPES.map(proj => (
                      <option key={proj.id} value={proj.id}>
                        {proj.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">담당자</label>
                  <select
                    value={assignee}
                    onChange={e => setAssignee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {team.map(person => (
                      <option key={person} value={person}>
                        {person}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">난이도</label>
                    <select
                      value={difficulty}
                      onChange={e => setDifficulty(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value={1}>매우 쉬움</option>
                      <option value={2}>쉬움</option>
                      <option value={3}>보통</option>
                      <option value={4}>어려움</option>
                      <option value={5}>매우 어려움</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">예상 기간</label>
                    <input
                      type="number"
                      value={estimatedDays}
                      onChange={e => setEstimatedDays(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">금액 (만원)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-800">국가과제 예산 분류</label>
                      <p className="text-xs text-slate-500 mt-1">RCMS·IRIS에 입력하는 느낌으로 세목, 현금, 현물을 분리 관리합니다.</p>
                    </div>
                    <span className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700">실시간 집계</span>
                  </div>
                  <select
                    aria-label="국가과제 예산 세목"
                    value={budgetCategory}
                    onChange={e => setBudgetCategory(e.target.value as BudgetCategory)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {BUDGET_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">현금 (만원)</label>
                      <input aria-label="현금 예산" type="number" min="0" value={cashAmount} onChange={e => setCashAmount(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">현물 (만원)</label>
                      <input aria-label="현물 예산" type="number" min="0" value={inKindAmount} onChange={e => setInKindAmount(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">결재 단계</label>
                    <select aria-label="예산 결재 단계" value={approvalStage} onChange={e => setApprovalStage(e.target.value as Task['approvalStage'])} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      {Object.entries(BUDGET_APPROVAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  업무 추가
                </button>
              </form>
            </div>}

            <div className={isAdmin ? 'lg:col-span-2 min-w-0' : 'lg:col-span-3 min-w-0'}>
              <div className="md:hidden space-y-3">
                {visibleTasks.map(task => <article key={task.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold text-gray-900 break-words">{task.name}</h3><p className="text-sm text-gray-500 mt-1 line-clamp-2 break-words">{task.description}</p></div><span className="shrink-0 text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-700">{{pending:'대기','in-progress':'진행',review:'검토',blocked:'보류',completed:'완료'}[task.status]}</span></div>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs"><div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400 block">마감</span>{new Date(task.deadline).toLocaleDateString('ko-KR')}</div><div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400 block">담당자</span>{task.assignee || '미배정'}</div><div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400 block">프로젝트</span>{PROJECT_TYPES.find(p => p.id === task.project)?.label || '미분류'}</div><div className="bg-gray-50 rounded-lg p-2"><span className="text-gray-400 block">예상 기간</span>{task.estimatedDays || 0}일</div></div>
                  {task.attachments?.length
                    ? renderTaskAttachments(task.attachments, !isAdmin, task)
                    : <div className="mt-3 rounded-xl border border-dashed border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">증빙 누락 · 사진/동영상 자료를 연결해야 합니다.</div>}
                  {isAdmin && <select aria-label={`${task.name} 모바일 상태`} value={task.status} onChange={e => handleStatusChange(task.id, e.target.value as Task['status'])} className="mt-3 w-full border rounded-xl px-3 py-2 text-sm"><option value="pending">대기</option><option value="in-progress">진행 중</option><option value="review">검토/승인</option><option value="blocked">보류/차단</option><option value="completed">완료</option></select>}
                </article>)}
                {visibleTasks.length === 0 && <div className="bg-white rounded-2xl p-10 text-center text-gray-500">조건에 맞는 업무가 없습니다.</div>}
              </div>
              <div className="hidden md:block bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">업무</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">프로젝트</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">담당자</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">마감일</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">난이도</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">금액</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTasks.map(task => (
                      <tr key={task.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{task.name}</div>
                          <div className="text-xs text-gray-500 truncate">{task.description}</div>
                          {task.attachments?.length
                            ? <div className="mt-2"><span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">첨부 {task.attachments.length}개</span>{renderTaskAttachments(task.attachments, !isAdmin, task)}</div>
                            : <div className="mt-2 inline-flex rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">증빙 누락</div>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            {PROJECT_TYPES.find(p => p.id === task.project)?.label || '미분류'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {task.assignee || '미배정'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(task.deadline).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {['', '쉬움', '쉬움', '보통', '어려움', '매우 어려움'][
                            task.difficulty || 2
                          ]}
                        </td>
                        <td className="px-4 py-3 text-sm min-w-[220px]">
                          {editingBudgetTaskId === task.id ? (
                            <div className="space-y-2">
                              <select aria-label={`${task.name} 예산 세목 수정`} value={budgetDraft.budgetCategory} onChange={e => setBudgetDraft(prev => ({ ...prev, budgetCategory: e.target.value as BudgetCategory }))} className="w-full rounded-lg border px-2 py-1 text-xs">
                                {BUDGET_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
                              </select>
                              <div className="grid grid-cols-2 gap-1">
                                <input aria-label={`${task.name} 현금 수정`} type="number" min="0" value={budgetDraft.cashAmount} onChange={e => setBudgetDraft(prev => ({ ...prev, cashAmount: Number(e.target.value) }))} className="w-full rounded-lg border px-2 py-1 text-xs" />
                                <input aria-label={`${task.name} 현물 수정`} type="number" min="0" value={budgetDraft.inKindAmount} onChange={e => setBudgetDraft(prev => ({ ...prev, inKindAmount: Number(e.target.value) }))} className="w-full rounded-lg border px-2 py-1 text-xs" />
                              </div>
                              <select aria-label={`${task.name} 결재 단계 수정`} value={budgetDraft.approvalStage} onChange={e => setBudgetDraft(prev => ({ ...prev, approvalStage: e.target.value as NonNullable<Task['approvalStage']> }))} className="w-full rounded-lg border px-2 py-1 text-xs">
                                {Object.entries(BUDGET_APPROVAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => handleBudgetSave(task.id)} className="flex-1 rounded-lg bg-teal-700 px-2 py-1 text-xs font-semibold text-white">저장</button>
                                <button type="button" onClick={() => setEditingBudgetTaskId(null)} className="flex-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">취소</button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-slate-900">{(task.cashAmount ?? task.amount ?? 0) + (task.inKindAmount || 0)}만원</div>
                              <div className="mt-1 text-xs text-slate-500">{BUDGET_CATEGORIES.find(category => category.id === (task.budgetCategory || 'activity'))?.label} · 현금 {task.cashAmount ?? task.amount ?? 0} · 현물 {task.inKindAmount || 0}</div>
                              <div className="mt-1 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">{BUDGET_APPROVAL_LABELS[task.approvalStage || 'requested']}</div>
                              {isAdmin && <button type="button" onClick={() => startBudgetEdit(task)} className="ml-2 text-xs font-semibold text-teal-700">수정</button>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isAdmin ? <div className="flex items-center justify-center gap-2">
                          <select aria-label={`${task.name} 상태`} value={task.status} onChange={e => handleStatusChange(task.id, e.target.value as Task['status'])} className="text-xs border rounded px-2 py-1">
                            <option value="pending">대기</option>
                            <option value="in-progress">진행 중</option>
                            <option value="review">검토/승인</option>
                            <option value="blocked">보류/차단</option>
                            <option value="completed">완료</option>
                          </select>
                          <button
                            aria-label={`${task.name} 삭제`}
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                          </div> : <span className="text-xs font-medium text-gray-600">{{pending:'대기','in-progress':'진행 중',review:'검토/승인',blocked:'보류/차단',completed:'완료'}[task.status]}</span>}
                        </td>
                      </tr>
                    ))}
                    {visibleTasks.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-500">조건에 맞는 업무가 없습니다.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          </div>
        ) : view === 'people' ? (
          <div className="space-y-6">
            <div className="executive-card rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-teal-700">PEOPLE CAPACITY</p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">팀 현황</h2>
                  <p className="text-sm text-slate-500 mt-2">가용성, 대행 필요 여부, 담당 업무를 한 화면에서 확인합니다.</p>
                </div>
                <button onClick={() => navigateToView('table')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 text-white px-4 py-2 text-sm font-semibold"><ListTodo size={16}/> 업무 목록</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {([
                ['가용 인력', `${availablePeopleCount}/${team.length || 0}`, Users, 'text-emerald-700', 'bg-emerald-50'],
                ['오늘 일정', activeScheduleCount, CalendarDays, 'text-sky-700', 'bg-sky-50'],
                ['출장/연차', activeTripCount + activeLeaveCount, BriefcaseBusiness, 'text-amber-700', 'bg-amber-50'],
                ['승인 대기', pendingApprovalCount, ShieldCheck, 'text-violet-700', 'bg-violet-50'],
              ] as Array<[string,string | number,React.ComponentType<{size?:number}>,string,string]>).map(([label,value,Icon,color,bg]) => (
                <div key={label} className="executive-card rounded-lg p-4">
                  <div className={`w-9 h-9 rounded-lg ${bg} ${color} flex items-center justify-center`}><Icon size={18}/></div>
                  <div className="text-xs text-slate-500 mt-3">{label}</div>
                  <div className="text-2xl font-bold text-slate-900">{value}</div>
                </div>
              ))}
            </div>
            <div className="executive-card rounded-lg p-4 text-sm text-slate-600">
              공개 화면은 상태와 수치만 제공합니다. 상세 제목, 장소, 메모, 증빙은 관리자 권한에서만 확인합니다.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {team.map(person => {
                const entries = personalEntries.filter(entry => entry.person === person)
                const today = new Date().toISOString().slice(0, 10)
                const active = entries.filter(entry => entry.startDate <= today && entry.endDate >= today)
                const leave = active.some(entry => entry.type === 'leave')
                const trip = active.some(entry => entry.type === 'trip')
                const personTasks = tasks.filter(task => task.assignee === person && task.status !== 'completed')
                const urgentTasks = personTasks.filter(task => new Date(task.deadline).getTime() <= Date.now() + 7 * 86400000)
                const approvedPerformance = entries.filter(entry => entry.type === 'performance' && entry.approvalStatus === 'approved')
                const requestedEntries = entries.filter(entry => entry.approvalStatus === 'requested')
                const currentLabel = leave ? '연차 중' : trip ? '출장 중' : active.some(entry => entry.type === 'schedule') ? '일정 있음' : '업무 가능'
                const statusTone = leave || trip ? 'bg-amber-100 text-amber-800' : active.some(entry => entry.type === 'schedule') ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                return <section key={person} className="executive-card rounded-lg p-5">
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900">{person}</h3>
                      <p className="text-xs text-slate-500 mt-1">진행 업무 {personTasks.length}건 · 마감 임박 {urgentTasks.length}건</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${statusTone}`}>{currentLabel}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {([['leave','연차'],['schedule','일정'],['trip','출장'],['performance','실적']] as const).map(([type,label]) => <div key={type} className="executive-card-subtle rounded-lg py-3"><div className="text-xl font-bold text-slate-900">{entries.filter(entry => entry.type === type).length}</div><div className="text-xs text-slate-500">{label}</div></div>)}
                  </div>
                  <div className="mt-4 rounded-lg bg-slate-50/80 border border-slate-200 p-3 text-xs text-slate-600 space-y-2">
                    <div className="flex justify-between"><span>업무 영향</span><strong className={leave || trip || urgentTasks.length ? 'text-amber-700' : 'text-emerald-700'}>{leave || trip ? '대행 확인' : urgentTasks.length ? '마감 관리' : '안정'}</strong></div>
                    <div className="flex justify-between"><span>승인 대기</span><strong>{requestedEntries.length}건</strong></div>
                    <div className="flex justify-between"><span>승인 실적</span><strong>{approvedPerformance.length}건</strong></div>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="text-xs font-semibold text-slate-500 mb-2">담당 업무</div>
                    <div className="space-y-2">
                      {personTasks.slice(0, 2).map(task => (
                        <div key={task.id} className="rounded-lg border border-slate-100 p-2 text-xs">
                          <div className="font-medium text-slate-800 truncate">{task.name}</div>
                          <div className="text-slate-500 mt-1">{new Date(task.deadline).toLocaleDateString('ko-KR')} · {taskStatusLabels[task.status]}</div>
                        </div>
                      ))}
                      {personTasks.length > 2 && <div className="text-xs text-slate-500">추가 {personTasks.length - 2}건</div>}
                      {personTasks.length === 0 && <div className="text-xs text-slate-400">현재 담당 중인 미완료 업무가 없습니다.</div>}
                    </div>
                  </div>
                </section>
              })}
            </div>
            {isAdmin && <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form onSubmit={handleAddPersonalEntry} className="bg-white rounded-xl shadow p-5 space-y-4">
                <h3 className="font-bold text-lg">개인 기록 등록</h3>
                <div><label className="block text-sm mb-1">구성원</label><select aria-label="개인 기록 구성원" value={personalPerson} onChange={e => setPersonalPerson(e.target.value)} className="w-full border rounded-lg px-3 py-2">{team.map(person => <option key={person}>{person}</option>)}</select></div>
                <div><label className="block text-sm mb-1">대분류</label><select aria-label="개인 기록 구분" value={personalType} onChange={e => handlePersonalTypeChange(e.target.value as PersonalEntry['type'])} className="w-full border rounded-lg px-3 py-2">{Object.entries(PERSONAL_TYPES).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}</select></div>
                <div><label className="block text-sm mb-1">세부 유형</label><select aria-label="개인 기록 세부 유형" value={personalSubtype} onChange={e => setPersonalSubtype(e.target.value)} className="w-full border rounded-lg px-3 py-2">{PERSONAL_TYPES[personalType].subtypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div><label className="block text-sm mb-1">상세 제목</label><input aria-label="개인 기록 제목" value={personalTitle} onChange={e => setPersonalTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2" required /></div>
                <div className="grid grid-cols-2 gap-2"><div><label className="block text-sm mb-1">시작일</label><input aria-label="개인 기록 시작일" type="date" value={personalStart} onChange={e => setPersonalStart(e.target.value)} className="w-full border rounded-lg px-3 py-2" required /></div><div><label className="block text-sm mb-1">종료일</label><input aria-label="개인 기록 종료일" type="date" value={personalEnd} onChange={e => setPersonalEnd(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div></div>
                {(personalType === 'schedule' || personalType === 'trip') && <div className="grid grid-cols-2 gap-2"><div><label className="block text-sm mb-1">시작 시간</label><input aria-label="개인 기록 시작 시간" type="time" value={personalStartTime} onChange={e => setPersonalStartTime(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div><div><label className="block text-sm mb-1">종료 시간</label><input aria-label="개인 기록 종료 시간" type="time" value={personalEndTime} onChange={e => setPersonalEndTime(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div></div>}
                {(personalType === 'trip' || personalType === 'schedule') && <div><label className="block text-sm mb-1">장소/지역</label><input aria-label="개인 기록 장소" value={personalLocation} onChange={e => setPersonalLocation(e.target.value)} className="w-full border rounded-lg px-3 py-2" /></div>}
                {(personalType === 'leave' || personalType === 'trip') && <div><label className="block text-sm mb-1">업무 대행자</label><select aria-label="업무 대행자" value={personalSubstitute} onChange={e => setPersonalSubstitute(e.target.value)} className="w-full border rounded-lg px-3 py-2"><option value="">미지정</option>{team.filter(person => person !== personalPerson).map(person => <option key={person}>{person}</option>)}</select></div>}
                {(personalType === 'trip' || personalType === 'performance') && <div className="grid grid-cols-2 gap-2"><div><label className="block text-sm mb-1">금액 (만원)</label><input aria-label="개인 기록 금액" type="number" min="0" value={personalAmount} onChange={e => setPersonalAmount(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2" /></div><div><label className="block text-sm mb-1">수량/성과</label><div className="flex"><input aria-label="개인 기록 수량" type="number" min="0" value={personalQuantity} onChange={e => setPersonalQuantity(Number(e.target.value))} className="min-w-0 w-full border rounded-l-lg px-3 py-2" /><input aria-label="개인 기록 단위" value={personalUnit} onChange={e => setPersonalUnit(e.target.value)} className="w-16 border border-l-0 rounded-r-lg px-2 py-2" /></div></div></div>}
                {personalType === 'performance' && <div><label className="block text-sm mb-1">증빙/참조 링크</label><input aria-label="개인 기록 증빙" type="url" value={personalEvidence} onChange={e => setPersonalEvidence(e.target.value)} placeholder="https://" className="w-full border rounded-lg px-3 py-2" /></div>}
                <div className="grid grid-cols-2 gap-2"><div><label className="block text-sm mb-1">승인 상태</label><select aria-label="개인 기록 승인 상태" value={personalApproval} onChange={e => setPersonalApproval(e.target.value as NonNullable<PersonalEntry['approvalStatus']>)} className="w-full border rounded-lg px-3 py-2">{Object.entries(APPROVAL_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><label className="block text-sm mb-1">공개 범위</label><select aria-label="개인 기록 공개 범위" value={personalVisibility} onChange={e => setPersonalVisibility(e.target.value as NonNullable<PersonalEntry['visibility']>)} className="w-full border rounded-lg px-3 py-2"><option value="summary">간접 요약</option><option value="team">팀 공개</option><option value="admin">관리자 전용</option></select></div></div>
                <div><label className="block text-sm mb-1">관리자 메모</label><textarea aria-label="개인 기록 메모" value={personalNote} onChange={e => setPersonalNote(e.target.value)} className="w-full border rounded-lg px-3 py-2" rows={2} /></div>
                <button className="w-full bg-violet-600 text-white rounded-lg py-2">개인 기록 저장</button>
              </form>
              <div className="lg:col-span-2 bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b flex flex-wrap gap-3 items-center justify-between">
                  <h3 className="font-bold">개인 기록 상세 관리</h3>
                  <div className="flex gap-2"><select aria-label="개인 기록 유형 필터" value={personalFilterType} onChange={e => setPersonalFilterType(e.target.value as typeof personalFilterType)} className="border rounded-lg px-2 py-1 text-sm"><option value="all">전체 유형</option>{Object.entries(PERSONAL_TYPES).map(([value,config]) => <option key={value} value={value}>{config.label}</option>)}</select><select aria-label="개인 기록 승인 필터" value={personalFilterStatus} onChange={e => setPersonalFilterStatus(e.target.value as typeof personalFilterStatus)} className="border rounded-lg px-2 py-1 text-sm"><option value="all">전체 상태</option>{Object.entries(APPROVAL_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                </div>
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">구성원/유형</th><th className="p-3 text-left">상세</th><th className="p-3 text-left">기간·대행</th><th className="p-3 text-left">금액·성과</th><th className="p-3 text-left">승인</th><th className="p-3">관리</th></tr></thead><tbody>{personalEntries.filter(entry => (personalFilterType === 'all' || entry.type === personalFilterType) && (personalFilterStatus === 'all' || entry.approvalStatus === personalFilterStatus)).map(entry => <tr key={entry.id} className="border-t align-top"><td className="p-3"><div className="font-medium">{entry.person}</div><div className="text-xs text-violet-700">{PERSONAL_TYPES[entry.type].label} · {entry.subtype || '기본'}</div></td><td className="p-3"><div className="font-medium">{entry.title}</div><div className="text-xs text-gray-500 max-w-xs">{entry.location && `장소: ${entry.location} · `}{entry.note}</div></td><td className="p-3 whitespace-nowrap">{entry.startDate} ~ {entry.endDate}<div className="text-xs text-gray-500">{entry.startTime && `${entry.startTime}~${entry.endTime}`} {entry.substitute && `· 대행 ${entry.substitute}`}</div></td><td className="p-3">{entry.amount ? `${entry.amount}만원` : '-'}<div className="text-xs text-gray-500">{entry.quantity ? `${entry.quantity}${entry.unit || '건'}` : ''}</div></td><td className="p-3"><select aria-label={`${entry.person} 승인 상태`} value={entry.approvalStatus || 'requested'} onChange={e => handlePersonalApproval(entry.id, e.target.value as NonNullable<PersonalEntry['approvalStatus']>)} className="border rounded px-2 py-1 text-xs">{Object.entries(APPROVAL_LABELS).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><div className="text-xs text-gray-500 mt-1">{{summary:'간접 요약',team:'팀 공개',admin:'관리자 전용'}[entry.visibility || 'summary']}</div></td><td className="p-3 text-center"><button aria-label={`${entry.person} 개인 기록 삭제`} onClick={() => handleDeletePersonalEntry(entry.id)} className="text-red-600">삭제</button></td></tr>)}{personalEntries.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-gray-500">등록된 개인 기록이 없습니다.</td></tr>}</tbody></table></div>
              </div>
            </div>}
          </div>
        ) : view === 'management' ? (
          <div className="space-y-6">
            <div className="executive-card rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-teal-700">MANAGEMENT CONTROL</p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">운영 관리</h2>
                  <p className="text-sm text-slate-500 mt-2">예산, 특허, 출장·지원사업·교육, 고과와 연차평가를 하나의 관리 체계로 묶었습니다.</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  <div className="executive-card-subtle rounded-lg px-4 py-3"><div className="text-xs text-slate-500">국가과제 총계</div><div className="font-bold">{nationalRndBudgetTotal || totalBudgetAmount}만원</div></div>
                  <div className="executive-card-subtle rounded-lg px-4 py-3"><div className="text-xs text-slate-500">특허/논문</div><div className="font-bold">{patentEntries.length}건</div></div>
                  <div className="executive-card-subtle rounded-lg px-4 py-3"><div className="text-xs text-slate-500">지원/교육</div><div className="font-bold">{supportEntries.length + educationEntries.length}건</div></div>
                  <div className="executive-card-subtle rounded-lg px-4 py-3"><div className="text-xs text-slate-500">평균 고과</div><div className="font-bold">{managementRows.length ? Math.round(managementRows.reduce((sum, row) => sum + row.annualScore, 0) / managementRows.length) : 0}점</div></div>
                </div>
              </div>
            </div>

            <section className="executive-card rounded-xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-amber-700">APPROVAL CONTROL</p>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">결재 관제 패널</h3>
                  <p className="text-sm text-slate-500 mt-2">작성부터 집행완료까지 단계별로 필터링하고, 반려 사유·승인 메모·결재 이력을 한 화면에서 추적합니다.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center min-w-full lg:min-w-[360px]">
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">병목 금액</div><div className="text-xl font-bold text-amber-700">{approvalBottleneckAmount}만원</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">반려</div><div className="text-xl font-bold text-red-700">{rejectedApprovalCount}</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">증빙 누락</div><div className="text-xl font-bold text-red-700">{evidenceMissingApprovalCount}</div></div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => setApprovalFilter('all')} className={`rounded-full px-3 py-2 text-xs font-bold transition ${approvalFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>전체 {budgetedTasks.length}</button>
                {APPROVAL_STAGE_ORDER.map(stage => (
                  <button key={stage} type="button" onClick={() => setApprovalFilter(stage)} className={`rounded-full px-3 py-2 text-xs font-bold transition ${approvalFilter === stage ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {BUDGET_APPROVAL_LABELS[stage]} {approvalStageCounts[stage] || 0}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-3">
                {approvalFilteredTasks.slice(0, 9).map(task => {
                  const taskBudgetTotal = (task.cashAmount ?? task.amount ?? 0) + (task.inKindAmount || 0)
                  const history = task.approvalHistory || []
                  const currentStage = task.approvalStage || 'requested'
                  return (
                    <article key={task.id} className={`rounded-xl border p-4 ${currentStage === 'rejected' ? 'border-red-200 bg-red-50/80' : currentStage === 'paid' ? 'border-teal-200 bg-teal-50/70' : 'border-slate-200 bg-slate-50/80'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 truncate">{task.name}</h4>
                          <p className="text-xs text-slate-500 mt-1">{task.assignee || '미배정'} · {BUDGET_CATEGORIES.find(category => category.id === (task.budgetCategory || 'activity'))?.label}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-amber-700">{BUDGET_APPROVAL_LABELS[currentStage]}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-white p-2"><span className="block text-slate-400">금액</span><strong>{taskBudgetTotal}만원</strong></div>
                        <div className="rounded-lg bg-white p-2"><span className="block text-slate-400">마감</span><strong>{new Date(task.deadline).toLocaleDateString('ko-KR')}</strong></div>
                        <div className={`rounded-lg p-2 ${(task.attachments?.length || 0) > 0 ? 'bg-white' : 'bg-red-100 text-red-700'}`}><span className="block text-slate-400">증빙</span><strong>{task.attachments?.length || 0}개</strong></div>
                      </div>
                      {(task.approvalMemo || task.rejectionReason || task.approvalHistory?.length) && (
                        <div className="mt-3 rounded-lg border border-slate-100 bg-white p-3 text-xs text-slate-600">
                          {task.rejectionReason && <p><strong className="text-red-700">반려 사유</strong> · {task.rejectionReason}</p>}
                          {task.approvalMemo && <p><strong className="text-teal-700">승인 메모</strong> · {task.approvalMemo}</p>}
                          {task.approvalHistory?.length ? (
                            <p className="mt-1 text-slate-400">
                              최근 이력 · {BUDGET_APPROVAL_LABELS[task.approvalHistory[task.approvalHistory.length - 1].stage]} · {new Date(task.approvalHistory[task.approvalHistory.length - 1].createdAt).toLocaleString('ko-KR')}
                            </p>
                          ) : null}
                        </div>
                      )}
                      <div className="mt-3 rounded-lg border border-slate-100 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">결재 이력 상세</span>
                          <span className="text-[11px] text-slate-400">{history.length}건</span>
                        </div>
                        {history.length ? (
                          <ol className="mt-2 space-y-2">
                            {history.slice(-4).reverse().map(item => (
                              <li key={item.id} className="border-l-2 border-slate-200 pl-3 text-xs">
                                <div className="font-bold text-slate-700">{BUDGET_APPROVAL_LABELS[item.stage]} · {item.actor}</div>
                                <div className="text-slate-400">{new Date(item.createdAt).toLocaleString('ko-KR')}</div>
                                {item.memo && <div className="mt-1 text-slate-600">{item.memo}</div>}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="mt-2 text-xs text-slate-400">아직 기록된 결재 이력이 없습니다.</p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="mt-3 space-y-2">
                          <label className="block text-xs font-semibold text-slate-500">
                            승인 메모 / 반려 사유
                            <textarea
                              aria-label={`${task.name} 결재 메모`}
                              value={approvalNotes[task.id] || ''}
                              onChange={event => setApprovalNotes(prev => ({ ...prev, [task.id]: event.target.value }))}
                              placeholder="검토 의견, 승인 조건, 반려 사유를 남기세요."
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                              rows={2}
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => handleApprovalStageChange(task, 'approved')} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white">승인</button>
                            <button type="button" onClick={() => handleApprovalStageChange(task, 'rejected')} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">반려</button>
                            <button type="button" onClick={() => handleApprovalStageChange(task, 'paid')} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">집행완료</button>
                            {currentStage === 'rejected'
                              ? <button type="button" onClick={() => handleApprovalStageChange(task, 'requested')} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">재요청</button>
                              : <button type="button" onClick={() => { navigateToView('table'); startBudgetEdit(task) }} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200">예산수정</button>}
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
                {approvalFilteredTasks.length === 0 && <div className="xl:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">선택한 결재 단계의 항목이 없습니다.</div>}
              </div>
            </section>

            <section className="executive-card rounded-xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-indigo-700">AUDIT & APPROVAL ANALYTICS</p>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">결재 분석 · 감사 로그</h3>
                  <p className="text-sm text-slate-500 mt-2">결재 이력을 감사 대응 가능한 로그로 정리하고, 처리 속도와 반려 유형을 분석합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadCsv(`conception-approval-audit-${todayKey}.csv`, approvalCsvRows)}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm"
                >
                  결재 이력 CSV 내보내기
                </button>
              </div>
              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">전체 로그</div><div className="text-xl font-bold">{approvalAuditLogs.length}</div><div className="text-xs text-slate-400">건</div></div>
                <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">이번 달 처리</div><div className="text-xl font-bold text-indigo-700">{approvalLogsThisMonth.length}</div><div className="text-xs text-slate-400">건</div></div>
                <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">평균 처리</div><div className="text-xl font-bold text-teal-700">{averageApprovalDays}</div><div className="text-xs text-slate-400">일</div></div>
                <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">반려 유형</div><div className="text-xl font-bold text-red-700">{rejectionReasonSummary.length}</div><div className="text-xs text-slate-400">종</div></div>
              </div>
              <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <h4 className="text-sm font-bold text-slate-900">결재자별 처리량</h4>
                  <div className="mt-3 space-y-2">
                    {approvalActorRows.slice(0, 5).map(row => (
                      <div key={row.actor} className="rounded-lg bg-white px-3 py-2 text-xs">
                        <div className="flex items-center justify-between"><strong>{row.actor}</strong><span>{row.count}건</span></div>
                        <div className="mt-1 text-slate-500">승인/집행 {row.approved} · 반려 {row.rejected}</div>
                      </div>
                    ))}
                    {approvalActorRows.length === 0 && <p className="text-xs text-slate-400">아직 결재 처리자가 없습니다.</p>}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <h4 className="text-sm font-bold text-slate-900">반려 사유 유형</h4>
                  <div className="mt-3 space-y-2">
                    {rejectionReasonSummary.slice(0, 5).map(row => (
                      <div key={row.reasonType} className="rounded-lg bg-white px-3 py-2 text-xs">
                        <div className="flex items-center justify-between"><strong>{row.reasonType}</strong><span className="text-red-700">{row.count}건</span></div>
                      </div>
                    ))}
                    {rejectionReasonSummary.length === 0 && <p className="text-xs text-slate-400">반려 이력이 없습니다.</p>}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <h4 className="text-sm font-bold text-slate-900">최근 감사 로그</h4>
                  <div className="mt-3 space-y-2">
                    {approvalAuditLogs.slice(0, 5).map(log => (
                      <div key={`${log.task.id}-${log.history.id}`} className="rounded-lg bg-white px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="truncate">{log.task.name}</strong>
                          <span className="shrink-0 text-slate-500">{BUDGET_APPROVAL_LABELS[log.history.stage]}</span>
                        </div>
                        <div className="mt-1 text-slate-400">{log.history.actor} · {new Date(log.history.createdAt).toLocaleString('ko-KR')}</div>
                        {log.history.memo && <div className="mt-1 text-slate-600">{log.history.memo}</div>}
                      </div>
                    ))}
                    {approvalAuditLogs.length === 0 && <p className="text-xs text-slate-400">아직 결재 감사 로그가 없습니다.</p>}
                  </div>
                </div>
              </div>
            </section>

            <section className="executive-card rounded-xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-teal-700">EVIDENCE LIBRARY</p>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">증빙 자료실</h3>
                  <p className="text-sm text-slate-500 mt-2">전체 업무의 사진·동영상 증빙을 태그, 메모, 담당 업무 기준으로 모아 검토합니다.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center min-w-full lg:min-w-[390px]">
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">전체 증빙</div><div className="text-xl font-bold text-slate-900">{evidenceItems.length}</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">증빙 누락</div><div className="text-xl font-bold text-red-700">{missingEvidenceTasks.length}</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">대용량 영상</div><div className="text-xl font-bold text-amber-700">{largeVideoEvidenceCount}</div></div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-3">
                <input
                  aria-label="증빙 메모 검색"
                  value={evidenceSearch}
                  onChange={event => setEvidenceSearch(event.target.value)}
                  placeholder="업무명, 담당자, 파일명, 증빙 메모로 검색"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                />
                <select
                  aria-label="증빙 태그 필터"
                  value={evidenceFilter}
                  onChange={event => setEvidenceFilter(event.target.value as typeof evidenceFilter)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="all">전체 증빙</option>
                  <option value="missing">증빙 누락 업무</option>
                  {ATTACHMENT_TAGS.filter(tag => tag.id !== 'other').map(tag => <option key={tag.id} value={tag.id}>{tag.label}</option>)}
                  <option value="other">기타/미분류</option>
                </select>
              </div>
              {evidenceFilter === 'missing' ? (
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {missingEvidenceTasks.map(task => (
                    <article key={task.id} className="rounded-xl border border-red-200 bg-red-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate font-bold text-slate-900">{task.name}</h4>
                          <p className="mt-1 text-xs text-slate-500">{task.assignee || '미배정'} · {new Date(task.deadline).toLocaleDateString('ko-KR')}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-bold text-red-700">증빙 누락</span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs text-slate-600">{task.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full bg-white px-2 py-1">{BUDGET_CATEGORIES.find(category => category.id === (task.budgetCategory || 'activity'))?.label}</span>
                        <span className="rounded-full bg-white px-2 py-1">{BUDGET_APPROVAL_LABELS[task.approvalStage || 'requested']}</span>
                      </div>
                    </article>
                  ))}
                  {missingEvidenceTasks.length === 0 && <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">증빙이 누락된 예산 업무가 없습니다.</div>}
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredEvidenceItems.slice(0, 12).map(({ task, attachment }) => {
                    const isLargeVideo = attachment.type === 'video' && attachment.size >= 10 * 1024 * 1024
                    return (
                      <article key={`${task.id}-${attachment.id}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
                        <a href={mediaUrl(attachment.url)} target="_blank" rel="noreferrer" className="block">
                          <div className="aspect-video bg-slate-950">
                            {attachment.type === 'image'
                              ? <img src={mediaUrl(attachment.url)} alt={attachment.name} className="h-full w-full object-cover" />
                              : <video src={mediaUrl(attachment.url)} className="h-full w-full object-cover" controls preload="metadata" />}
                          </div>
                        </a>
                        <div className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-bold text-slate-900">{attachment.name}</h4>
                              <p className="mt-1 truncate text-xs text-slate-500">{task.name} · {task.assignee || '미배정'}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-teal-700">{ATTACHMENT_TAGS.find(tag => tag.id === (attachment.tag || 'other'))?.label}</span>
                          </div>
                          {attachment.note && <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600">{attachment.note}</p>}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span>{new Date(attachment.uploadedAt).toLocaleDateString('ko-KR')} · {Math.round(attachment.size / 1024 / 1024 * 10) / 10}MB</span>
                            {isLargeVideo && <span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800">대용량 동영상</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <a href={mediaUrl(attachment.url)} download className="rounded-lg bg-white px-3 py-2 text-center text-xs font-bold text-teal-700 border border-slate-200">다운로드</a>
                            <button type="button" onClick={() => { navigateToView('table'); startBudgetEdit(task) }} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">업무 보기</button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                  {filteredEvidenceItems.length === 0 && <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">조건에 맞는 증빙 자료가 없습니다.</div>}
                </div>
              )}
            </section>

            <section className="executive-card rounded-xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-rose-700">EVIDENCE SUBMISSION AUDIT</p>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">증빙 제출 · 감사 대응 현황</h3>
                  <p className="text-sm text-slate-500 mt-2">증빙 자료를 제출 가능한 목록으로 정리하고, 업무별 체크리스트와 태그별 제출 준비율을 확인합니다.</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadCsv(`conception-evidence-submission-${todayKey}.csv`, evidenceCsvRows)}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-sm"
                >
                  증빙 목록 CSV 내보내기
                </button>
              </div>
              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">제출 준비율</div><div className="text-xl font-bold text-teal-700">{evidenceSubmissionRate}%</div></div>
                <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">준비 완료</div><div className="text-xl font-bold text-slate-900">{evidenceReadyForSubmission}</div><div className="text-xs text-slate-400">업무</div></div>
                <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">체크 대상</div><div className="text-xl font-bold text-amber-700">{evidenceSubmissionRows.length}</div><div className="text-xs text-slate-400">예산 업무</div></div>
                <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">변경 이력 구조</div><div className="text-xl font-bold text-indigo-700">준비</div><div className="text-xs text-slate-400">history 필드</div></div>
              </div>
              <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <h4 className="text-sm font-bold text-slate-900">태그별 제출 준비율</h4>
                  <div className="mt-3 space-y-3">
                    {evidenceTagReadiness.map(row => (
                      <div key={row.id}>
                        <div className="mb-1 flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">{row.label}</span><span className="text-slate-500">{row.count}개 · {row.rate}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-teal-700 to-rose-500" style={{ width: `${row.rate}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <h4 className="text-sm font-bold text-slate-900">업무별 증빙 체크리스트</h4>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {evidenceSubmissionRows.slice(0, 8).map(row => (
                      <article key={row.task.id} className="rounded-lg bg-white p-3 text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <strong className="block truncate text-sm text-slate-900">{row.task.name}</strong>
                            <span className="text-slate-400">{row.task.assignee || '미배정'} · 증빙 {row.taskAttachments.length}개</span>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-1 font-bold ${row.readyScore >= 70 ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>{row.readyScore}%</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <span className={`rounded-lg px-2 py-1 ${row.taskAttachments.length ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-700'}`}>파일 {row.taskAttachments.length ? '확보' : '누락'}</span>
                          <span className={`rounded-lg px-2 py-1 ${row.hasRequiredTag ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>필수 태그 {row.hasRequiredTag ? '확인' : '필요'}</span>
                          <span className={`rounded-lg px-2 py-1 ${row.hasMemo ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>메모 {row.hasMemo ? '작성' : '필요'}</span>
                          <span className={`rounded-lg px-2 py-1 ${row.task.approvalStage === 'paid' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}>집행 {row.task.approvalStage === 'paid' ? '완료' : '대기'}</span>
                        </div>
                      </article>
                    ))}
                    {evidenceSubmissionRows.length === 0 && <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">체크할 예산 업무가 없습니다.</div>}
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <section className="executive-card rounded-xl p-5 xl:col-span-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-teal-700">RCMS · IRIS STYLE BUDGET CONTROL</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">국가연구개발자금 예산관리</h3>
                    <p className="text-sm text-slate-500 mt-2">인건비, 재료비, 연구활동비, 국제활동비, 외주용역비, 성과금, 간접비를 현금·현물·결재·증빙 기준으로 관리합니다.</p>
                  </div>
                  <WalletCards className="text-teal-700" size={24}/>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">총계</div><div className="text-xl font-bold">{nationalRndBudgetTotal || totalBudgetAmount}</div><div className="text-xs text-slate-400">만원</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">현금</div><div className="text-xl font-bold text-teal-700">{totalCashAmount}</div><div className="text-xs text-slate-400">만원</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">현물</div><div className="text-xl font-bold text-sky-700">{totalInKindAmount}</div><div className="text-xs text-slate-400">만원</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">집행완료</div><div className="text-xl font-bold text-emerald-700">{paidBudgetAmount}</div><div className="text-xs text-slate-400">만원</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">결재대기</div><div className="text-xl font-bold text-amber-700">{pendingBudgetApprovals.length}</div><div className="text-xs text-slate-400">건</div></div>
                </div>
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-7 gap-4">
                  <div className="lg:col-span-4 overflow-hidden rounded-xl border border-slate-200">
                    <div className="grid grid-cols-5 bg-slate-950 px-3 py-2 text-xs font-semibold text-white">
                      <div>세목</div><div className="text-right">현금</div><div className="text-right">현물</div><div className="text-right">총계</div><div className="text-right">승인</div>
                    </div>
                    {budgetCategoryRows.map(row => (
                      <div key={row.id} className="grid grid-cols-5 items-center border-t border-slate-100 px-3 py-3 text-sm">
                        <div className="min-w-0"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${row.tone}`}>{row.label}</span><div className="mt-1 truncate text-[11px] text-slate-500">{row.description}</div></div>
                        <div className="text-right font-semibold text-slate-800">{row.cash}</div>
                        <div className="text-right font-semibold text-sky-700">{row.inKind}</div>
                        <div className="text-right font-bold text-slate-950">{row.total}</div>
                        <div className="text-right text-teal-700">{row.approved}</div>
                      </div>
                    ))}
                  </div>
                  <div className="lg:col-span-3 space-y-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                      <div className="text-xs font-semibold text-amber-700">AI 예산 점검</div>
                      <div className="mt-2 space-y-2">
                        {aiBudgetAlerts.map(alert => <div key={alert} className="rounded-lg bg-white/80 px-3 py-2 text-xs text-slate-700">{alert}</div>)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-center justify-between"><span className="text-xs font-semibold text-slate-500">증빙 연결률</span><strong>{budgetedTasks.length ? Math.round((evidenceReadyCount / budgetedTasks.length) * 100) : 0}%</strong></div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-teal-700 to-amber-500" style={{ width: `${budgetedTasks.length ? Math.round((evidenceReadyCount / budgetedTasks.length) * 100) : 0}%` }} /></div>
                      <p className="mt-2 text-xs text-slate-500">사진·동영상 증빙이 붙은 예산 항목을 자동 집계합니다.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {budgetedTasks.sort((a,b) => ((b.cashAmount ?? b.amount ?? 0) + (b.inKindAmount || 0)) - ((a.cashAmount ?? a.amount ?? 0) + (a.inKindAmount || 0))).slice(0, 5).map(task => (
                    <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <strong className="truncate">{task.name}</strong>
                        <span className="shrink-0 text-slate-700">현금 {task.cashAmount ?? task.amount ?? 0} · 현물 {task.inKindAmount || 0}만원</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span>{BUDGET_CATEGORIES.find(category => category.id === (task.budgetCategory || 'activity'))?.label}</span>
                        <span>· {task.assignee || '미배정'}</span>
                        <span>· {BUDGET_APPROVAL_LABELS[task.approvalStage || 'requested']}</span>
                        <span>· 증빙 {task.attachments?.length || 0}개</span>
                      </div>
                    </div>
                  ))}
                  {budgetedTasks.length === 0 && <div className="text-sm text-slate-400 py-4">등록된 국가과제 예산 항목이 없습니다.</div>}
                </div>
              </section>

              <section className="executive-card rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-teal-700">IP PORTFOLIO</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">특허 관리</h3>
                    <p className="text-sm text-slate-500 mt-2">특허, 논문, 지식재산 성과를 승인 상태와 담당자 기준으로 관리합니다.</p>
                  </div>
                  <Lightbulb className="text-amber-600" size={24}/>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">등록</div><div className="text-xl font-bold">{patentEntries.length}</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">승인</div><div className="text-xl font-bold text-teal-700">{patentEntries.filter(entry => entry.approvalStatus === 'approved').length}</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">대기</div><div className="text-xl font-bold text-amber-700">{patentEntries.filter(entry => entry.approvalStatus === 'requested').length}</div></div>
                </div>
                <div className="mt-5 space-y-2">
                  {patentEntries.slice(0, 4).map(entry => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                      <div className="flex justify-between gap-3 text-sm"><strong className="truncate">{entry.title || '특허/논문 성과'}</strong><span className="shrink-0 text-slate-500">{APPROVAL_LABELS[entry.approvalStatus || 'requested']}</span></div>
                      <div className="text-xs text-slate-500 mt-1">{entry.person} · {entry.startDate} · {entry.quantity ? `${entry.quantity}${entry.unit || '건'}` : '성과 기록'}</div>
                    </div>
                  ))}
                  {patentEntries.length === 0 && <div className="text-sm text-slate-400 py-4">등록된 특허/논문 성과가 없습니다.</div>}
                </div>
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <section className="executive-card rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-teal-700">PROGRAM & TRAINING</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">출장·지원사업·교육</h3>
                    <p className="text-sm text-slate-500 mt-2">외부 일정, 출장, 교육, 지원사업 대응을 운영 리스크와 비용 관점에서 봅니다.</p>
                  </div>
                  <BookOpenCheck className="text-teal-700" size={24}/>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">출장</div><div className="text-xl font-bold">{personalEntries.filter(entry => entry.type === 'trip').length}</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">교육</div><div className="text-xl font-bold">{educationEntries.length}</div></div>
                  <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">외부/지원</div><div className="text-xl font-bold">{supportEntries.length}</div></div>
                </div>
                <div className="mt-5 space-y-2">
                  {[...supportEntries, ...educationEntries].slice(0, 5).map(entry => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                      <div className="flex justify-between gap-3 text-sm"><strong className="truncate">{entry.title || PERSONAL_TYPES[entry.type].label}</strong><span className="shrink-0 text-slate-500">{entry.person}</span></div>
                      <div className="text-xs text-slate-500 mt-1">{entry.startDate} ~ {entry.endDate} {entry.location ? `· ${entry.location}` : ''} {entry.amount ? `· ${entry.amount}만원` : ''}</div>
                    </div>
                  ))}
                  {supportEntries.length + educationEntries.length === 0 && <div className="text-sm text-slate-400 py-4">등록된 출장·지원사업·교육 기록이 없습니다.</div>}
                </div>
              </section>

              <section className="executive-card rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-teal-700">EVALUATION</p>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">고과·연차평가</h3>
                    <p className="text-sm text-slate-500 mt-2">업무 완료, 승인 실적, 특허 성과, 출장 기여를 연차평가 참고 지표로 환산합니다.</p>
                  </div>
                  <Award className="text-amber-600" size={24}/>
                </div>
                <div className="mt-5 space-y-3">
                  {managementRows.map(row => (
                    <div key={row.person} className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div><strong className="text-slate-900">{row.person}</strong><div className="text-xs text-slate-500 mt-1">완료 {row.doneTasks}/{row.personTasks.length} · 실적 {row.personPerformances.length} · 특허 {row.personPatents.length} · 연차 {row.personLeave.length}</div></div>
                        <div className="text-right"><div className="text-2xl font-bold text-slate-950">{row.annualScore}</div><div className="text-xs text-slate-500">평가점</div></div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-teal-700 to-amber-500" style={{ width: `${Math.min(row.annualScore, 100)}%` }} /></div>
                    </div>
                  ))}
                  {managementRows.length === 0 && <div className="text-sm text-slate-400 py-4">평가할 구성원이 없습니다.</div>}
                </div>
              </section>
            </div>
          </div>
        ) : view === 'calendar' ? (
          // 달력 뷰
          <div className="space-y-5">
          <div className="executive-card rounded-xl p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold text-teal-700">MONTHLY DEADLINES</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">
                  {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                </h2>
                <p className="text-sm text-slate-500 mt-2">마감일 기준의 월간 운영 달력입니다.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200" aria-label="이전 달">←</button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm">이번 달</button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200" aria-label="다음 달">→</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5 text-center">
              <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">월간 업무</div><div className="text-xl font-bold">{currentMonthTasks.length}</div></div>
              <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">임박/지연</div><div className="text-xl font-bold text-amber-700">{monthlyUrgentCount}</div></div>
              <div className="executive-card-subtle rounded-lg p-3"><div className="text-xs text-slate-500">완료</div><div className="text-xl font-bold text-teal-700">{monthlyCompletedCount}</div></div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                <div key={day} className="text-center font-bold text-slate-600 py-2 bg-slate-50">
                  {day}
                </div>
              ))}

              {(() => {
                const year = currentMonth.getFullYear()
                const month = currentMonth.getMonth()
                const firstDay = new Date(year, month, 1).getDay()
                const daysInMonth = new Date(year, month + 1, 0).getDate()
                const days = []

                for (let i = 0; i < firstDay; i++) days.push(null)
                for (let i = 1; i <= daysInMonth; i++) days.push(i)

                return days.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="p-1.5 md:p-3 bg-slate-50 min-h-20 md:min-h-32" />

                  const date = new Date(year, month, day)
                  const dateStr = date.toISOString().split('T')[0]
                  const dayTasks = tasks.filter(t => t.deadline === dateStr)

                  return (
                    <div
                      key={day}
                      className={`p-1.5 md:p-3 min-h-20 md:min-h-32 overflow-hidden ${
                        dayTasks.length > 0
                          ? 'bg-sky-50'
                          : 'bg-white'
                      }`}
                    >
                      <div className="font-bold text-gray-900 mb-1 md:mb-2 text-sm md:text-base">{day}</div>
                      <div className="space-y-1 md:space-y-1.5">
                        {dayTasks.slice(0, 2).map(task => (
                          <div
                            key={task.id}
                            className={`text-[10px] md:text-xs px-1 md:px-2 py-0.5 md:py-1 rounded truncate border ${
                              task.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              task.status === 'blocked' ? 'bg-red-100 text-red-800 border-red-200' :
                              task.status === 'review' ? 'bg-violet-100 text-violet-800 border-violet-200' :
                              'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            {task.assignee || '미배정'} · {task.name}
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-[10px] md:text-xs text-gray-600">+{dayTasks.length - 2}개</div>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
          </div>
        ) : view === 'timeline' ? (
          // 연간 일정 뷰
          <div className="executive-card rounded-xl p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-semibold text-teal-700">ANNUAL LOAD</p>
                <h2 className="text-2xl font-bold text-slate-900 mt-1">{currentYear}년 연간 달력</h2>
                <p className="text-sm text-slate-500 mt-2">월별 업무 밀도와 완료율, 금액 규모를 비교합니다.</p>
              </div>
              <div className="text-sm text-slate-500">전체 {tasks.filter(task => new Date(task.deadline).getFullYear() === currentYear).length}건</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {yearlyMonths.map(month => {
                const rate = month.tasks.length ? Math.round((month.completed / month.tasks.length) * 100) : 0
                return (
                  <section key={month.month} className="executive-card rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{month.label}</h3>
                        <p className="text-xs text-slate-500 mt-1">업무 {month.tasks.length}건 · 금액 {month.amountTotal}만원</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${month.urgent ? 'bg-red-100 text-red-700' : month.tasks.length ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>{month.urgent ? `임박 ${month.urgent}` : month.tasks.length ? '예정' : '비어 있음'}</span>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-slate-900 rounded-full" style={{ width: `${Math.max((month.tasks.length / busiestMonthCount) * 100, month.tasks.length ? 8 : 0)}%` }} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>완료율 {rate}%</span>
                      <span>{month.completed}/{month.tasks.length || 0}</span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {month.tasks.slice(0, 2).map(task => (
                        <button key={task.id} onClick={() => navigateToView('table')} className="w-full text-left rounded-lg bg-slate-50 hover:bg-slate-100 p-3">
                          <div className="flex justify-between gap-2 text-sm font-medium text-slate-800"><span className="truncate">{task.name}</span><span className="text-xs text-slate-500 shrink-0">{new Date(task.deadline).getDate()}일</span></div>
                          <div className="text-xs text-slate-500 mt-1">{task.assignee || '미배정'} · {taskStatusLabels[task.status]}</div>
                        </button>
                      ))}
                      {month.tasks.length > 2 && <div className="text-xs text-slate-500 px-1">추가 {month.tasks.length - 2}건은 업무 목록에서 확인</div>}
                      {month.tasks.length === 0 && <div className="text-sm text-slate-400 py-3">등록된 마감 업무가 없습니다.</div>}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        ) : null}
        </div>
      </div>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/96 backdrop-blur border-t border-slate-200 shadow-[0_-12px_34px_rgba(15,23,42,0.12)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2" aria-label="모바일 기본 메뉴">
        <div className="grid grid-cols-6 gap-1 max-w-lg mx-auto">
          {([
            ['priority',Activity,'우선'],['table',ListTodo,'업무'],['calendar',CalendarDays,'달력'],['timeline',LayoutDashboard,'연간'],['people',Users,'팀'],['management',Landmark,'관리'],
          ] as Array<[typeof view,React.ComponentType<{size?:number}>,string]>).map(([target,Icon,label]) => <button key={target} onClick={() => navigateToView(target)} aria-current={view === target ? 'page' : undefined} className={`mobile-nav-item rounded-lg py-2 text-center relative ${view === target ? 'active bg-teal-50 text-teal-800' : 'text-gray-500'}`}><span className="flex justify-center"><Icon size={19}/></span><span className="block text-[10px] mt-1 font-medium">{label}</span></button>)}
        </div>
      </nav>
      </div>
    </>
  )
}
