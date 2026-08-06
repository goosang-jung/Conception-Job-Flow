// ============================================================
// 분류 체계 (Taxonomy)
// 하나의 트리가 아니라 서로 독립적인 4개 축으로 분리합니다.
// 축을 섞으면 "산업부 외주 사업" 같은 표현 불가 항목이 생깁니다.
// ============================================================

/** 축 1 — 사업 대분류 */
export type Category =
  | 'national-rnd' // 국가과제 (R&D)
  | 'gov-project' // 정부사업 (비R&D 발주)
  | 'external' // 외부사업
  | 'internal' // 일반업무

/** 축 1-b — 중분류. 대분류에 따라 가능한 값이 달라집니다 (taxonomy.ts 참조) */
export type Subcategory =
  // national-rnd / gov-project 하위 = 발주 부처
  | 'motie' // 산업통상자원부
  | 'msit' // 과학기술정보통신부
  | 'mss' // 중소벤처기업부
  | 'etc-ministry' // 기타 부처
  // external 하위
  | 'public-office' // 관공서
  | 'general-external' // 일반/기타
  // internal 하위
  | 'business' // 비즈니스
  | 'administration' // 행정

/** 축 1-c — 비즈니스 세부 (subcategory === 'business' 일 때만) */
export type BusinessType = 'development' | 'product' | 'outsourcing'

/** 축 2 — 우리 조직의 참여 형태. internal 에는 해당 없음 */
export type ParticipationRole = 'lead' | 'participant'

/** 축 3 — 비목 (지출 분류) */
export type CostCategory =
  | 'material' // 재료비
  | 'labor' // 인건비
  | 'activity' // 활동비
  | 'indirect' // 간접비
  | 'international' // 국제활동비

// ============================================================
// 도메인 모델
// ============================================================

export interface Project {
  id: string
  name: string
  category: Category
  subcategory: Subcategory
  businessType?: BusinessType
  role?: ParticipationRole
  owner: string
  members: string[]
  startDate: string
  endDate: string
  /** 비목별 예산/집행 (백만원). 예산은 참고용 — 우선순위 판단에는 쓰지 않습니다 */
  budget: Partial<Record<CostCategory, { planned: number; spent: number }>>
}

/** 과제별 특이사항 — 담당자들이 같이 보는 공유 메모 */
export interface ProjectNote {
  id: string
  projectId: string
  author: string
  createdAt: string
  body: string
  /** 캡처/사진. 프로토타입은 data URL, 실서버는 업로드 URL */
  images: string[]
  pinned: boolean
}

export type WorkStatus = 'todo' | 'doing' | 'blocked' | 'done'

export interface WorkItem {
  id: string
  title: string
  projectId: string
  assignee: string
  status: WorkStatus

  /** 마감일 (ISO). 우선순위 계산의 기준점 */
  dueDate: string
  /** 난이도 1(쉬움) ~ 5(매우 어려움). 미입력 시 제목에서 자동 추정 (estimator.ts) */
  difficulty?: 1 | 2 | 3 | 4 | 5
  /** 실제로 손이 가는 작업일. 미입력 시 자동 추정 */
  estimatedDays?: number
  /** 손 놓고 기다려야 하는 기간 (공고기간·결재·납품 리드타임). 미입력 시 자동 추정 */
  leadDays?: number
  /** 금액 규모 (백만원). 없으면 0 */
  cost: number
  costCategory?: CostCategory

  /** 정부 제출처럼 연기 불가능한 외부 마감인가 */
  hardDeadline: boolean
  /** 이 일이 끝나야 다른 일이 시작되는가 */
  blocking: boolean
}

// ============================================================
// 난이도 · 소요일 추정 결과
// ============================================================

export interface AutoEstimate {
  difficulty: 1 | 2 | 3 | 4 | 5
  /** 실제 작업일 */
  workDays: number
  /** 대기일 (공고기간·결재·납품). 착수 시점 역산에 포함됩니다 */
  leadDays: number
  confidence: 'low' | 'medium' | 'high'
  /** manual = 담당자 입력, rule = 규칙 기반, claude = Claude API */
  source: 'manual' | 'rule' | 'claude'
  /** 왜 이렇게 추정했는지 */
  signals: string[]
}

// ============================================================
// 우선순위 엔진 출력
// ============================================================

export type PriorityBucket = 'now' | 'this-week' | 'next' | 'later'

export interface ScoredWork {
  item: WorkItem
  estimate: AutoEstimate
  score: number
  bucket: PriorityBucket
  /** 마감 - (작업일 + 대기일) = 늦어도 이 날짜엔 시작해야 함 */
  latestStart: string
  /** 착수까지 남은 여유 작업일. 음수면 이미 늦음 */
  slackDays: number
  /** 왜 이 순위인지 사람이 읽는 설명 — 신입도 납득할 수 있어야 함 */
  reasons: string[]
}
