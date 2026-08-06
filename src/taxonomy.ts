import type {
  Category, Subcategory, BusinessType, ParticipationRole, CostCategory,
} from './types'

/** 대분류 → 허용 중분류. 새 분류가 생기면 이 표만 고치면 됩니다. */
export const CATEGORY_TREE: Record<Category, { label: string; short: string; children: Subcategory[] }> = {
  'national-rnd': {
    label: '국가과제 (R&D)',
    short: '국가과제',
    children: ['motie', 'msit', 'mss', 'etc-ministry'],
  },
  'gov-project': {
    label: '정부사업',
    short: '정부사업',
    children: ['motie', 'msit', 'mss', 'etc-ministry'],
  },
  external: {
    label: '외부사업',
    short: '외부',
    children: ['public-office', 'general-external'],
  },
  internal: {
    label: '일반업무',
    short: '일반',
    children: ['business', 'administration'],
  },
}

export const SUBCATEGORY_LABEL: Record<Subcategory, string> = {
  motie: '산업부',
  msit: '과기부',
  mss: '중기부',
  'etc-ministry': '기타부처',
  'public-office': '관공서',
  'general-external': '일반/기타',
  business: '비즈니스',
  administration: '행정',
}

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  development: '개발',
  product: '상품',
  outsourcing: '외주',
}

export const ROLE_LABEL: Record<ParticipationRole, string> = {
  lead: '주관',
  participant: '참여',
}

export const COST_CATEGORY_LABEL: Record<CostCategory, string> = {
  material: '재료비',
  labor: '인건비',
  activity: '활동비',
  indirect: '간접비',
  international: '국제활동비',
}

export const COST_CATEGORY_ORDER: CostCategory[] = [
  'material', 'labor', 'activity', 'indirect', 'international',
]

/** 대분류별 색상 — 한눈에 보는 화면에서 사업 성격을 구분하는 용도 */
export const CATEGORY_COLOR: Record<Category, { dot: string; chip: string }> = {
  'national-rnd': { dot: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'gov-project': { dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  external: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  internal: { dot: 'bg-slate-500', chip: 'bg-slate-50 text-slate-700 border-slate-200' },
}

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: '매우 쉬움', 2: '쉬움', 3: '보통', 4: '어려움', 5: '매우 어려움',
}

/** 난이도 → 예상 소요 작업일 기본 추정치. estimatedDays 미입력 시 사용 */
export const DIFFICULTY_TO_DAYS: Record<number, number> = {
  1: 0.5, 2: 1, 3: 3, 4: 7, 5: 14,
}

/** 과제 분류를 사람이 읽는 한 줄로 */
export function describeProject(p: {
  category: Category; subcategory: Subcategory
  businessType?: BusinessType; role?: ParticipationRole
}): string {
  const parts = [CATEGORY_TREE[p.category].short, SUBCATEGORY_LABEL[p.subcategory]]
  if (p.businessType) parts.push(BUSINESS_TYPE_LABEL[p.businessType])
  if (p.role) parts.push(ROLE_LABEL[p.role])
  return parts.join(' · ')
}
