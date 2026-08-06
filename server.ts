import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import JSZip from 'jszip'

const app = express()
app.set('trust proxy', 1)
app.use(express.json({ limit: '80mb' }))
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }))
app.use((req, _res, next) => {
  if (req.url === '/api') req.url = '/'
  else if (req.url.startsWith('/api/')) req.url = req.url.slice(4)
  next()
})
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  if (process.env.FORCE_HTTPS === 'true' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`)
  }
  next()
})

interface Task {
  id: string
  name: string
  description: string
  deadline: string
  difficulty?: number
  estimatedDays?: number
  amount?: number
  assignee?: string
  collaborators?: string[]
  project?: string
  categoryGroup?: 'nationalProject' | 'budgetApproval' | 'evidenceAudit' | 'peoplePerformance' | 'businessSupport'
  categoryDetail?: string
  workType?: 'planning' | 'execution' | 'settlement' | 'review' | 'report' | 'submission'
  budgetCategory?: 'labor' | 'materials' | 'activity' | 'international' | 'outsourcing' | 'incentive' | 'indirect'
  cashAmount?: number
  inKindAmount?: number
  approvalStage?: 'draft' | 'requested' | 'approved' | 'paid' | 'rejected'
  approvalMemo?: string
  rejectionReason?: string
  approvedBy?: string
  approvedAt?: string
  approvalHistory?: ApprovalHistory[]
  budgetHistory?: BudgetHistory[]
  createdAt: string
  status: 'pending' | 'in-progress' | 'review' | 'blocked' | 'completed'
  attachments?: Attachment[]
}

interface ApprovalHistory {
  id: string
  stage: 'draft' | 'requested' | 'approved' | 'paid' | 'rejected'
  memo?: string
  actor: string
  createdAt: string
}

interface BudgetHistory {
  id: string
  actor: string
  createdAt: string
  before: {
    budgetCategory?: Task['budgetCategory']
    cashAmount?: number
    inKindAmount?: number
    amount?: number
    approvalStage?: Task['approvalStage']
  }
  after: {
    budgetCategory?: Task['budgetCategory']
    cashAmount?: number
    inKindAmount?: number
    amount?: number
    approvalStage?: Task['approvalStage']
  }
}

interface Attachment {
  id: string
  name: string
  url: string
  type: 'image' | 'video'
  mimeType: string
  size: number
  uploadedAt: string
  tag?: 'quote' | 'receipt' | 'inspection' | 'meeting' | 'siteVideo' | 'deliverable' | 'other'
  note?: string
  submissionStatus?: 'pending' | 'submitted'
  submittedAt?: string
  submittedBy?: string
  submissionMemo?: string
  history?: EvidenceHistory[]
}

interface EvidenceHistory {
  id: string
  action: 'uploaded' | 'tagged' | 'noted' | 'submitted' | 'downloaded' | 'deleted'
  actor: string
  createdAt: string
  memo?: string
}

interface TeamMember {
  name: string
  createdAt: string
}

interface PersonalEntry {
  id: string
  person: string
  type: 'leave' | 'schedule' | 'trip' | 'performance'
  title: string
  startDate: string
  endDate: string
  note?: string
  subtype?: string
  approvalStatus: 'draft' | 'requested' | 'approved' | 'rejected'
  startTime?: string
  endTime?: string
  location?: string
  substitute?: string
  amount?: number
  quantity?: number
  unit?: string
  visibility: 'summary' | 'team' | 'admin'
  evidence?: string
  createdAt: string
}

interface DashboardBackupPayload {
  version?: number
  exportedAt?: string
  tasks?: Task[]
  team?: string[]
  personalEntries?: PersonalEntry[]
}

const tasks: Map<string, Task> = new Map()
const teamMembers: Set<string> = new Set(['정구상', '현연주', '김현수', '임주희', '김강민', '이상준', '최동이', '마세윤', '박준우'])
const personalEntries: Map<string, PersonalEntry> = new Map()
const DATA_DIR = process.env.DATA_DIR || path.resolve('data')
const DATA_FILE = path.join(DATA_DIR, 'dashboard.json')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin1234')
const APPROVER_PASSWORD = process.env.APPROVER_PASSWORD || ''
const USER_PASSWORD = process.env.USER_PASSWORD || ''
type UserRole = 'admin' | 'approver' | 'user'
const sessions = new Map<string, UserRole>()

fs.mkdirSync(UPLOAD_DIR, { recursive: true })
app.use('/uploads', express.static(UPLOAD_DIR, {
  index: false,
  maxAge: '7d',
  setHeaders: res => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
  },
}))

const readToken = (req: express.Request) => req.headers.authorization?.replace(/^Bearer\s+/i, '') || ''
const roleOf = (req: express.Request) => sessions.get(readToken(req))
const requireRole = (roles: UserRole[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const role = roleOf(req)
  if (!role || !roles.includes(role)) return res.status(401).json({ error: '권한이 필요합니다.' })
  next()
}
const requireAdmin = requireRole(['admin'])
const requireApproverOrAdmin = requireRole(['admin', 'approver'])

const persist = () => {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks: Array.from(tasks.values()), team: Array.from(teamMembers), personalEntries: Array.from(personalEntries.values()) }, null, 2), 'utf8')
}

const restore = () => {
  if (!fs.existsSync(DATA_FILE)) return false
  const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as { tasks?: Task[]; team?: string[]; personalEntries?: PersonalEntry[] }
  saved.tasks?.forEach(task => tasks.set(task.id, task))
  if (saved.team) {
    teamMembers.clear()
    saved.team.forEach(name => teamMembers.add(name))
  }
  saved.personalEntries?.forEach(entry => personalEntries.set(entry.id, {
    ...entry,
    approvalStatus: entry.approvalStatus || 'approved',
    visibility: entry.visibility || 'summary',
  }))
  return true
}

// 초기 샘플 데이터
const initSampleData = () => {
  const sampleTasks: Task[] = [
    {
      id: uuidv4(),
      name: '국제공동연구 정산 증빙',
      description: '지난 연도 공동연구 참여 내역 정산 및 증빙 자료 준비',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      difficulty: 5,
      estimatedDays: 14,
      amount: 95,
      createdAt: new Date().toISOString(),
      status: 'pending',
    },
    {
      id: uuidv4(),
      name: '산업부 연차실적보고서',
      description: '올해 산업부 과제 진행 현황 및 성과 보고서 작성',
      deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      difficulty: 4,
      estimatedDays: 7,
      amount: 65,
      createdAt: new Date().toISOString(),
      status: 'pending',
    },
    {
      id: uuidv4(),
      name: '설비진단 납품검수',
      description: '외주 설비진단 업체 납품물 최종 검수 및 승인',
      deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      difficulty: 2,
      estimatedDays: 3,
      amount: 58,
      createdAt: new Date().toISOString(),
      status: 'pending',
    },
  ]

  sampleTasks.forEach(task => {
    tasks.set(task.id, task)
  })
}

if (!restore()) {
  initSampleData()
  persist()
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'conception-job-flow', tasks: tasks.size })
})

app.post('/auth/login', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'ADMIN_PASSWORD가 설정되지 않았습니다.' })
  const supplied = String(req.body?.password || '')
  const credentials: Array<{ role: UserRole; password: string }> = [
    { role: 'admin', password: ADMIN_PASSWORD },
    { role: 'approver', password: APPROVER_PASSWORD },
    { role: 'user', password: USER_PASSWORD },
  ].filter(item => item.password)
  const matched = credentials.find(item => {
    const expected = Buffer.from(item.password)
    const actual = Buffer.from(supplied)
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  })
  if (!matched) return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' })
  const token = crypto.randomBytes(32).toString('hex')
  sessions.set(token, matched.role)
  res.json({ token, role: matched.role })
})

app.get('/auth/session', (req, res) => {
  const role = roleOf(req)
  res.json({ admin: role === 'admin', role: role || null })
})
app.post('/auth/logout', (req, res) => {
  sessions.delete(readToken(req))
  res.status(204).send()
})

app.get('/backup', requireAdmin, (_req, res) => {
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    service: 'conception-job-flow',
    storage: {
      dataFile: DATA_FILE,
      uploadDir: UPLOAD_DIR,
      uploadPolicy: '이미지·동영상 원본 파일은 JSON에 포함하지 않습니다. data/uploads 폴더를 별도로 복사해 보관하세요.',
    },
    tasks: Array.from(tasks.values()),
    team: Array.from(teamMembers),
    personalEntries: Array.from(personalEntries.values()),
    evidenceMetadataCount: Array.from(tasks.values()).reduce((sum, task) => sum + (task.attachments?.length || 0), 0),
  })
})

app.post('/backup/restore', requireAdmin, (req, res) => {
  const payload = req.body as DashboardBackupPayload
  if (!Array.isArray(payload?.tasks) || !Array.isArray(payload?.team) || !Array.isArray(payload?.personalEntries)) {
    return res.status(400).json({ error: '백업 파일 형식이 올바르지 않습니다.' })
  }

  tasks.clear()
  payload.tasks.forEach(task => {
    if (task?.id && task?.name) tasks.set(task.id, task)
  })

  teamMembers.clear()
  payload.team
    .filter(name => typeof name === 'string' && name.trim())
    .forEach(name => teamMembers.add(name.trim()))

  personalEntries.clear()
  payload.personalEntries.forEach(entry => {
    if (entry?.id && entry?.person) {
      personalEntries.set(entry.id, {
        ...entry,
        approvalStatus: entry.approvalStatus || 'approved',
        visibility: entry.visibility || 'summary',
      })
    }
  })

  persist()
  res.json({
    restoredAt: new Date().toISOString(),
    tasks: tasks.size,
    team: teamMembers.size,
    personalEntries: personalEntries.size,
    evidenceMetadataCount: Array.from(tasks.values()).reduce((sum, task) => sum + (task.attachments?.length || 0), 0),
  })
})

app.use((req, res, next) => {
  const protectedResource = req.path.startsWith('/tasks') || req.path.startsWith('/team')
  if (req.method === 'PATCH' && req.path.startsWith('/tasks/')) {
    const approverFields = new Set(['approvalStage', 'approvalMemo', 'rejectionReason', 'approvedBy', 'approvedAt', 'approvalHistory'])
    const keys = Object.keys(req.body || {})
    if (keys.length && keys.every(key => approverFields.has(key))) return requireApproverOrAdmin(req, res, next)
  }
  if (protectedResource && req.method !== 'GET') return requireAdmin(req, res, next)
  next()
})

// GET /tasks
app.get('/tasks', (req, res) => {
  res.json(Array.from(tasks.values()))
})

// POST /tasks
app.post('/tasks', (req, res) => {
  const { name, description, deadline, difficulty, estimatedDays, amount, assignee, collaborators, project, categoryGroup, categoryDetail, workType, budgetCategory, cashAmount, inKindAmount, approvalStage, status, attachments } = req.body

  const newTask: Task = {
    id: uuidv4(),
    name,
    description,
    deadline,
    difficulty: difficulty || 2,
    estimatedDays: estimatedDays || 3,
    amount: amount || 0,
    assignee,
    collaborators: Array.isArray(collaborators) ? collaborators : [],
    project,
    categoryGroup: categoryGroup || 'nationalProject',
    categoryDetail: categoryDetail || '사업계획',
    workType: workType || 'execution',
    budgetCategory,
    cashAmount: Number(cashAmount || 0),
    inKindAmount: Number(inKindAmount || 0),
    approvalStage: approvalStage || 'requested',
    status: status || 'pending',
    attachments: Array.isArray(attachments) ? attachments : [],
    createdAt: new Date().toISOString(),
  }

  tasks.set(newTask.id, newTask)
  persist()
  res.status(201).json(newTask)
})

// PATCH /tasks/:id
app.patch('/tasks/:id', (req, res) => {
  const { id } = req.params
  const task = tasks.get(id)

  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  const updated = { ...task, ...req.body }
  tasks.set(id, updated)
  persist()
  res.json(updated)
})

// DELETE /tasks/:id
app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params
  tasks.delete(id)
  persist()
  res.status(204).send()
})

// POST /estimate-difficulty
app.post('/estimate-difficulty', (req, res) => {
  const { name, description } = req.body
  const text = `${name} ${description}`.toLowerCase()

  const veryHardKeywords = [
    '국제',
    '공동연구',
    '정산',
    '복잡한',
    '대규모',
    '통합',
  ]
  const hardKeywords = [
    '보고서',
    '검수',
    '분석',
    '개선',
    '설계',
    '구현',
  ]
  const easyKeywords = [
    '검증',
    '확인',
    '정렬',
    '수정',
  ]

  let difficulty = 2
  let estimatedDays = 3

  if (veryHardKeywords.some(kw => text.includes(kw))) {
    difficulty = 5
    estimatedDays = 14
  } else if (
    hardKeywords.some(kw => text.includes(kw)) ||
    description.length > 200
  ) {
    difficulty = 4
    estimatedDays = 7
  } else if (easyKeywords.some(kw => text.includes(kw))) {
    difficulty = 1
    estimatedDays = 1
  }

  res.json({
    difficulty,
    estimatedDays,
    reasoning: veryHardKeywords.some(kw => text.includes(kw))
      ? '국제공동연구, 복잡한 프로세스'
      : hardKeywords.some(kw => text.includes(kw))
        ? '리뷰, 분석, 설계 필요'
        : '단순 검증/수정',
  })
})

// POST /calculate-priorities
app.post('/calculate-priorities', (req, res) => {
  const taskList = req.body as Task[]
  const now = new Date()

  const scores = taskList.map(task => {
    const deadline = new Date(task.deadline)
    const daysUntilDeadline = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    const deadlineScore = Math.max(0, 30 - Math.max(0, daysUntilDeadline) * 2)
    const maxAmount = Math.max(...taskList.map(t => t.amount || 0))
    const amountScore = maxAmount > 0 ? ((task.amount || 0) / maxAmount) * 25 : 0
    const difficultyScore = ((task.difficulty || 1) / 5) * 20

    return {
      taskId: task.id,
      score: deadlineScore + amountScore + difficultyScore,
      breakdown: {
        deadline: deadlineScore,
        blocking: 0,
        amount: amountScore,
        difficulty: difficultyScore,
      },
      rank: 0,
    }
  })

  const ranked = scores
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }))

  res.json(ranked)
})

const extensionByMime: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

const cleanFileName = (name: string) => name.replace(/[^\p{L}\p{N}._ -]+/gu, '').trim().slice(0, 80) || 'attachment'

app.post('/uploads', requireAdmin, (req, res) => {
  const { name, mimeType, data } = req.body || {}
  if (!name || !mimeType || !data || typeof data !== 'string') {
    return res.status(400).json({ error: '파일 정보가 올바르지 않습니다.' })
  }

  const type = String(mimeType).startsWith('image/') ? 'image' : String(mimeType).startsWith('video/') ? 'video' : null
  if (!type) return res.status(400).json({ error: '이미지 또는 동영상 파일만 업로드할 수 있습니다.' })

  const base64 = data.includes(',') ? data.split(',').pop() || '' : data
  const buffer = Buffer.from(base64, 'base64')
  const maxBytes = 30 * 1024 * 1024
  if (!buffer.length || buffer.length > maxBytes) {
    return res.status(413).json({ error: '첨부파일은 30MB 이하만 업로드할 수 있습니다.' })
  }

  const id = uuidv4()
  const ext = extensionByMime[String(mimeType)] || (type === 'image' ? 'bin' : 'mp4')
  const safeName = cleanFileName(String(name))
  const storedName = `${id}-${safeName.replace(/\.[^.]+$/, '')}.${ext}`
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buffer)

  const attachment: Attachment = {
    id,
    name: safeName,
    url: `/uploads/${storedName}`,
    type,
    mimeType: String(mimeType),
    size: buffer.length,
    tag: 'other',
    note: '',
    submissionStatus: 'pending',
    history: [{ id: uuidv4(), action: 'uploaded', actor: '관리자', createdAt: new Date().toISOString(), memo: safeName }],
    uploadedAt: new Date().toISOString(),
  }
  res.status(201).json(attachment)
})

// PATCH /tasks/:taskId/attachments/:attachmentId
app.patch('/tasks/:taskId/attachments/:attachmentId', requireAdmin, (req, res) => {
  const { taskId, attachmentId } = req.params
  const task = tasks.get(taskId)
  if (!task) return res.status(404).json({ error: 'Task not found' })

  const allowedTags = new Set(['quote', 'receipt', 'inspection', 'meeting', 'siteVideo', 'deliverable', 'other'])
  const attachments = (task.attachments || []).map(attachment => {
    if (attachment.id !== attachmentId) return attachment
    const tag = typeof req.body?.tag === 'string' && allowedTags.has(req.body.tag) ? req.body.tag : attachment.tag
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 300) : attachment.note
    const submissionStatus = req.body?.submissionStatus === 'submitted' || req.body?.submissionStatus === 'pending' ? req.body.submissionStatus : attachment.submissionStatus
    const submittedAt = typeof req.body?.submittedAt === 'string' ? req.body.submittedAt : attachment.submittedAt
    const submittedBy = typeof req.body?.submittedBy === 'string' ? req.body.submittedBy.slice(0, 80) : attachment.submittedBy
    const submissionMemo = typeof req.body?.submissionMemo === 'string' ? req.body.submissionMemo.slice(0, 300) : attachment.submissionMemo
    const changedAction = tag !== attachment.tag ? 'tagged' : note !== attachment.note ? 'noted' : submissionStatus !== attachment.submissionStatus ? 'submitted' : null
    const historyMemo = changedAction === 'tagged' ? String(tag || '') : changedAction === 'submitted' ? String(submissionMemo || submissionStatus || '') : String(note || '')
    const history = changedAction ? [...(attachment.history || []), { id: uuidv4(), action: changedAction, actor: '관리자', createdAt: new Date().toISOString(), memo: historyMemo }] : attachment.history
    return { ...attachment, tag, note, submissionStatus, submittedAt, submittedBy, submissionMemo, history }
  })

  if (!attachments.some(attachment => attachment.id === attachmentId)) return res.status(404).json({ error: 'Attachment not found' })

  const updated = { ...task, attachments }
  tasks.set(taskId, updated)
  persist()
  res.json(updated)
})

// DELETE /tasks/:taskId/attachments/:attachmentId
app.delete('/tasks/:taskId/attachments/:attachmentId', requireAdmin, (req, res) => {
  const { taskId, attachmentId } = req.params
  const task = tasks.get(taskId)
  if (!task) return res.status(404).json({ error: 'Task not found' })

  const target = (task.attachments || []).find(attachment => attachment.id === attachmentId)
  if (!target) return res.status(404).json({ error: 'Attachment not found' })

  if (target.url?.startsWith('/uploads/')) {
    const fileName = path.basename(target.url)
    const filePath = path.resolve(UPLOAD_DIR, fileName)
    const uploadRoot = path.resolve(UPLOAD_DIR)
    if (filePath.startsWith(uploadRoot)) {
      try { fs.unlinkSync(filePath) } catch { /* 파일이 이미 없으면 업무 연결만 정리 */ }
    }
  }

  const updated = { ...task, attachments: (task.attachments || []).filter(attachment => attachment.id !== attachmentId) }
  tasks.set(taskId, updated)
  persist()
  res.json(updated)
})

// POST /upload-image (데이터 URL 저장)
app.post('/upload-image', requireAdmin, (req, res) => {
  const { file, taskId } = req.body
  // 프로토타입: 데이터 URL 그대로 반환
  res.json({ url: file })
})

// GET /team (담당자 목록 조회)
app.get('/team', (req, res) => {
  res.json(Array.from(teamMembers))
})

// 일반 사용자는 상세 제목/메모 없이 팀 가용성에 필요한 간접 정보만 조회합니다.
app.get('/personal-summary', (_req, res) => {
  res.json(Array.from(personalEntries.values())
    .filter(entry => entry.approvalStatus === 'approved')
    .map(({ id, person, type, subtype, startDate, endDate, startTime, endTime }) => ({ id, person, type, subtype, startDate, endDate, startTime, endTime })))
})

app.get('/personal-entries', requireAdmin, (_req, res) => {
  res.json(Array.from(personalEntries.values()))
})

app.post('/personal-entries', requireAdmin, (req, res) => {
  const { person, type, title, startDate, endDate, note, subtype, approvalStatus, startTime, endTime, location, substitute, amount, quantity, unit, visibility, evidence } = req.body || {}
  if (!teamMembers.has(person) || !['leave', 'schedule', 'trip', 'performance'].includes(type) || !title || !startDate) {
    return res.status(400).json({ error: '필수 개인 기록 정보가 올바르지 않습니다.' })
  }
  const entry: PersonalEntry = {
    id: uuidv4(), person, type, title, startDate, endDate: endDate || startDate, note, subtype,
    approvalStatus: ['draft', 'requested', 'approved', 'rejected'].includes(approvalStatus) ? approvalStatus : 'requested',
    startTime, endTime, location, substitute,
    amount: Number(amount || 0), quantity: Number(quantity || 0), unit, evidence,
    visibility: ['summary', 'team', 'admin'].includes(visibility) ? visibility : 'summary',
    createdAt: new Date().toISOString(),
  }
  personalEntries.set(entry.id, entry)
  persist()
  res.status(201).json(entry)
})

app.patch('/personal-entries/:id', requireAdmin, (req, res) => {
  const current = personalEntries.get(req.params.id)
  if (!current) return res.status(404).json({ error: '개인 기록을 찾을 수 없습니다.' })
  const allowed = ['title','startDate','endDate','note','subtype','approvalStatus','startTime','endTime','location','substitute','amount','quantity','unit','visibility','evidence']
  const changes = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)))
  const updated = { ...current, ...changes }
  personalEntries.set(current.id, updated)
  persist()
  res.json(updated)
})

app.delete('/personal-entries/:id', requireAdmin, (req, res) => {
  if (!personalEntries.delete(req.params.id)) return res.status(404).json({ error: '개인 기록을 찾을 수 없습니다.' })
  persist()
  res.status(204).send()
})

// POST /team (담당자 추가)
app.post('/team', (req, res) => {
  const { name } = req.body

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid name' })
  }

  if (teamMembers.has(name)) {
    return res.status(400).json({ error: 'Team member already exists' })
  }

  teamMembers.add(name)
  persist()
  res.status(201).json({ name, createdAt: new Date().toISOString() })
})

// DELETE /team/:name (담당자 삭제)
app.delete('/team/:name', (req, res) => {
  const { name } = req.params

  if (!teamMembers.has(name)) {
    return res.status(404).json({ error: 'Team member not found' })
  }

  teamMembers.delete(name)
  persist()
  res.status(204).send()
})

const evidenceTagLabel: Record<string, string> = {
  quote: '견적서',
  receipt: '영수증',
  inspection: '검수사진',
  meeting: '회의사진',
  siteVideo: '현장영상',
  deliverable: '결과물',
  other: '기타',
}

const safeZipSegment = (value: string) => cleanFileName(value).replace(/[\\/]+/g, '_') || 'item'

app.get('/evidence-package.zip', requireAdmin, async (_req, res) => {
  const evidenceFiles = Array.from(tasks.values()).flatMap(task => (task.attachments || []).map(attachment => ({ task, attachment })))
  if (!evidenceFiles.length) return res.status(404).json({ error: 'ZIP으로 묶을 증빙 파일이 없습니다.' })

  const zip = new JSZip()
  const generatedAt = new Date().toISOString()
  zip.file('00_제출표지/README.txt', [
    'Conception Job Flow 증빙 제출 패키지',
    `생성일: ${generatedAt}`,
    `전체 증빙: ${evidenceFiles.length}`,
    '이 ZIP은 서버에서 data/uploads 원본 파일을 기준으로 생성되었습니다.',
  ].join('\n'))

  const manifest = evidenceFiles.map(({ task, attachment }, index) => {
    const sourceFileName = attachment.url?.startsWith('/uploads/') ? path.basename(attachment.url) : ''
    const extension = path.extname(sourceFileName || attachment.name) || ''
    const tag = attachment.tag || 'other'
    const targetPath = `02_업무별증빙/${String(index + 1).padStart(3, '0')}_${safeZipSegment(task.name)}/${safeZipSegment(evidenceTagLabel[tag] || '기타')}_${safeZipSegment(attachment.name)}${extension && !attachment.name.endsWith(extension) ? extension : ''}`
    return {
      order: index + 1,
      taskId: task.id,
      taskName: task.name,
      assignee: task.assignee || '미배정',
      tag,
      tagLabel: evidenceTagLabel[tag] || '기타',
      submissionStatus: attachment.submissionStatus || 'pending',
      note: attachment.note || '',
      uploadedAt: attachment.uploadedAt,
      size: attachment.size,
      sourceFileName,
      targetPath,
    }
  })

  zip.file('01_증빙목록/manifest.json', JSON.stringify({ generatedAt, files: manifest }, null, 2))
  zip.file('01_증빙목록/files.csv', [
    '순번,업무명,담당자,태그,제출상태,크기,업로드일,저장경로',
    ...manifest.map(file => `${file.order},"${file.taskName.replace(/"/g, '""')}","${file.assignee.replace(/"/g, '""')}","${file.tagLabel}","${file.submissionStatus}",${file.size},"${file.uploadedAt}","${file.targetPath.replace(/"/g, '""')}"`),
  ].join('\n'))
  zip.file('03_미제출점검/unsubmitted.json', JSON.stringify(manifest.filter(file => file.submissionStatus !== 'submitted'), null, 2))

  for (const file of manifest) {
    const filePath = path.resolve(UPLOAD_DIR, file.sourceFileName)
    const uploadRoot = path.resolve(UPLOAD_DIR)
    if (file.sourceFileName && filePath.startsWith(uploadRoot) && fs.existsSync(filePath)) {
      zip.file(file.targetPath, fs.readFileSync(filePath))
    } else {
      zip.file(`${file.targetPath}.missing.txt`, `원본 파일을 찾지 못했습니다: ${file.sourceFileName}`)
    }
  }

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="conception-evidence-package-${new Date().toISOString().slice(0, 10)}.zip"`)
  res.send(buffer)
})

const distDir = path.resolve('dist')
const apkPath = process.env.APK_PATH || path.resolve('android/app/build/outputs/apk/debug/app-debug.apk')
app.get('/downloads/Conception-Job-Flow.apk', (_req, res) => {
  if (!fs.existsSync(apkPath)) return res.status(404).json({ error: 'APK가 아직 빌드되지 않았습니다.' })
  res.download(apkPath, 'Conception-Job-Flow.apk')
})
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

const PORT = Number(process.env.PORT || 3002)
const HOST = process.env.HOST || 'localhost'
app.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST
  console.log(`✅ Conception Job Flow: http://${displayHost}:${PORT}`)
  if (HOST === '0.0.0.0') {
    console.log(`📱 Mobile LAN test: use http://<PC_LOCAL_IP>:${PORT}`)
  }
})
