import type { WorkItem, ScoredWork, PriorityBucket, AutoEstimate, Project } from './types'
import { DIFFICULTY_LABEL } from './taxonomy'
import { resolveEstimate } from './estimator'

// ============================================================
// 우선순위 엔진
//
// 핵심 아이디어: 마감일순 정렬은 틀립니다.
// 난이도가 높은 일은 오래 걸리므로 더 일찍 착수해야 합니다.
// 게다가 공고·계약처럼 "기다리는 기간"이 있는 일은 훨씬 더 일찍 움직여야 합니다.
//   착수마감일 = 마감일 − (작업일 + 대기일)
//   여유(slack) = 착수마감일 − 오늘
// slack 이 0 이하면 "오늘 시작하지 않으면 마감을 못 맞추는 일"입니다.
//
// 신입 담당자도 납득할 수 있도록 모든 판정에 reasons 를 함께 냅니다.
// ============================================================

/** 주말을 제외한 작업일 수. b가 a보다 과거면 음수 */
export function businessDaysBetween(a: Date, b: Date): number {
  const sign = b >= a ? 1 : -1
  const [from, to] = sign > 0 ? [a, b] : [b, a]

  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())

  let days = 0
  const cursor = new Date(start)
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1)
    const dow = cursor.getDay()
    if (dow !== 0 && dow !== 6) days++
  }
  return days * sign
}

/** 작업일 기준으로 n일 전 날짜 (주말 건너뜀) */
function subtractBusinessDays(date: Date, n: number): Date {
  const result = new Date(date)
  let remaining = Math.ceil(n)
  while (remaining > 0) {
    result.setDate(result.getDate() - 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) remaining--
  }
  return result
}

export function estimateDays(item: WorkItem): number {
  return item.estimatedDays ?? DIFFICULTY_TO_DAYS[item.difficulty]
}

/** 시급도 0~100. slack 이 작을수록 높음 */
function urgencyScore(slackDays: number): number {
  if (slackDays <= 0) return 100
  if (slackDays >= 20) return 0
  return Math.round(100 * (1 - slackDays / 20))
}

/** 영향도 0~100. 놓쳤을 때의 파급이 큰 일일수록 높음 */
function impactScore(item: WorkItem): number {
  let s = 0
  if (item.hardDeadline) s += 30 // 정부 제출 등 연기 불가
  if (item.blocking) s += 25 // 다른 일을 막고 있음
  s += Math.min(item.cost / 50, 1) * 25 // 5천만원 이상이면 만점
  s += ((item.difficulty - 1) / 4) * 20 // 난이도
  return Math.min(Math.round(s), 100)
}

function bucketOf(slackDays: number, score: number): PriorityBucket {
  if (slackDays <= 0) return 'now'
  if (slackDays <= 3) return 'this-week'
  // 여유가 있어도 파급이 매우 큰 일은 한 단계 끌어올림
  if (slackDays <= 10) return score >= 80 ? 'this-week' : 'next'
  return score >= 80 ? 'next' : 'later'
}

function buildReasons(item: WorkItem, slackDays: number, days: number, latestStart: Date): string[] {
  const reasons: string[] = []
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

  if (slackDays < 0) {
    reasons.push(`이미 ${-slackDays}일 늦었습니다. ${fmt(latestStart)}까지 착수했어야 합니다`)
  } else if (slackDays === 0) {
    reasons.push(`오늘 시작하지 않으면 마감을 못 맞춥니다`)
  } else {
    reasons.push(`${fmt(latestStart)}까지 착수하면 됩니다 (여유 ${slackDays}일)`)
  }

  reasons.push(`난이도 ${DIFFICULTY_LABEL[item.difficulty]} → 약 ${days}일 소요 예상`)

  if (item.hardDeadline) reasons.push('연기 불가한 외부 마감입니다')
  if (item.blocking) reasons.push('이 일이 끝나야 다른 일이 시작됩니다')
  if (item.cost >= 50) reasons.push(`금액 규모가 큽니다 (${item.cost}백만원)`)

  return reasons
}

export function scoreWork(item: WorkItem, today = new Date()): ScoredWork {
  const days = estimateDays(item)
  const due = new Date(item.dueDate)
  const latestStart = subtractBusinessDays(due, days)
  const slackDays = businessDaysBetween(today, latestStart)

  const impact = impactScore(item)
  const score = Math.round(urgencyScore(slackDays) * 0.6 + impact * 0.4)

  return {
    item,
    score,
    bucket: bucketOf(slackDays, score),
    latestStart: latestStart.toISOString().slice(0, 10),
    slackDays,
    reasons: buildReasons(item, slackDays, days, latestStart),
  }
}

export type SortMode = 'ai' | 'urgent' | 'difficult' | 'expensive'

export const SORT_MODE_LABEL: Record<SortMode, string> = {
  ai: 'AI 종합 판단',
  urgent: '가장 시급한 일',
  difficult: '가장 어려운 일',
  expensive: '가장 비싼 일',
}

const COMPARATORS: Record<SortMode, (a: ScoredWork, b: ScoredWork) => number> = {
  ai: (a, b) => b.score - a.score,
  urgent: (a, b) => a.slackDays - b.slackDays,
  difficult: (a, b) => b.item.difficulty - a.item.difficulty || b.score - a.score,
  expensive: (a, b) => b.item.cost - a.item.cost || b.score - a.score,
}

export function prioritize(items: WorkItem[], mode: SortMode = 'ai', today = new Date()): ScoredWork[] {
  return items
    .filter((i) => i.status !== 'done')
    .map((i) => scoreWork(i, today))
    .sort(COMPARATORS[mode])
}

export const BUCKET_META: Record<PriorityBucket, { label: string; hint: string; chip: string; bar: string }> = {
  now: {
    label: '지금 바로',
    hint: '오늘 착수하지 않으면 마감을 놓칩니다',
    chip: 'bg-red-100 text-red-800 border-red-300',
    bar: 'bg-red-500',
  },
  'this-week': {
    label: '이번 주',
    hint: '3일 안에 시작해야 합니다',
    chip: 'bg-orange-100 text-orange-800 border-orange-300',
    bar: 'bg-orange-500',
  },
  next: {
    label: '다음 순서',
    hint: '아직 여유가 있습니다',
    chip: 'bg-sky-100 text-sky-800 border-sky-300',
    bar: 'bg-sky-500',
  },
  later: {
    label: '여유',
    hint: '지금 신경 쓰지 않아도 됩니다',
    chip: 'bg-slate-100 text-slate-700 border-slate-300',
    bar: 'bg-slate-400',
  },
}
