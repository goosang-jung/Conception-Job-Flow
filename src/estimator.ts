import type { WorkItem, AutoEstimate, Project } from './types'

// ============================================================
// 난이도 · 소요일 자동 추정기 (규칙 기반, 오프라인)
//
// 정부과제 행정업무는 제목만으로도 성격이 상당히 예측됩니다.
// "정산 증빙 취합"은 서류량이 많고 반려 위험이 있어 오래 걸리고,
// "공고"는 실작업은 이틀이지만 법정 공고기간 14일을 기다려야 합니다.
//
// 그래서 두 가지를 분리해서 추정합니다:
//   workDays — 실제로 손이 가는 작업일
//   leadDays — 손 놓고 기다려야 하는 기간 (공고기간·결재·외부검토)
// 착수 시점은 둘을 합쳐서 역산해야 맞습니다.
//
// 판정 근거(signals)를 함께 내보내 신입도 납득할 수 있게 합니다.
// ============================================================

interface Rule {
  re: RegExp
  difficulty: 1 | 2 | 3 | 4 | 5
  workDays: number
  leadDays?: number
  label: string
}

/** 위에서부터 먼저 매칭되는 규칙 하나를 사용합니다. 구체적인 것부터 배치. */
const RULES: Rule[] = [
  { re: /알고리즘|튜닝|최적화|재설계|아키텍처|모델\s*개발/, difficulty: 5, workDays: 12, label: '고난도 기술 작업' },
  { re: /개발|구현|설계|프로토타입|고도화/, difficulty: 4, workDays: 8, label: '개발·설계 작업' },
  { re: /정산|증빙|집행\s*실적/, difficulty: 4, workDays: 6, leadDays: 2, label: '정산·증빙 (서류량 많고 반려 위험)' },
  { re: /연차\s*실적|최종\s*보고|결과\s*보고/, difficulty: 4, workDays: 7, leadDays: 2, label: '정기 실적보고 (기관 검토 있음)' },
  { re: /계획서|제안서|사업\s*계획|과제\s*기획/, difficulty: 4, workDays: 7, label: '기획 문서 작성' },
  { re: /중간\s*보고|보고서|보고\s*자료|발표\s*자료/, difficulty: 3, workDays: 4, label: '보고 자료 작성' },
  { re: /공고|모집|공모/, difficulty: 2, workDays: 2, leadDays: 14, label: '공고 (법정 공고기간 14일 필요)' },
  { re: /입찰|낙찰/, difficulty: 3, workDays: 3, leadDays: 10, label: '입찰 (공고·평가 기간 필요)' },
  { re: /계약|협약|약정/, difficulty: 3, workDays: 3, leadDays: 3, label: '계약 (상대방 날인 대기)' },
  { re: /발주|구매|견적|조달/, difficulty: 3, workDays: 3, leadDays: 5, label: '발주 (납품 리드타임 있음)' },
  { re: /검수|납품|인수/, difficulty: 3, workDays: 3, label: '검수·납품' },
  { re: /점검|확인|검토|리뷰/, difficulty: 2, workDays: 2, label: '점검·검토' },
  { re: /조율|일정|회의|섭외|미팅/, difficulty: 2, workDays: 1, leadDays: 3, label: '일정 조율 (상대방 회신 대기)' },
  { re: /갱신|등록|신청|제출|접수/, difficulty: 2, workDays: 1, leadDays: 2, label: '단순 행정 처리' },
]

const FALLBACK: Rule = { re: /.*/, difficulty: 3, workDays: 3, label: '유형 미분류 — 보통으로 가정' }

interface Modifier {
  test: (item: WorkItem, project?: Project, matched?: Rule) => boolean
  difficulty?: number
  workDays?: number
  leadDays?: number
  label: string
}

const MODIFIERS: Modifier[] = [
  {
    test: (i) => /국제|해외|글로벌|해외출장/.test(i.title) || i.costCategory === 'international',
    difficulty: 1, workDays: 2, leadDays: 2,
    label: '국제 건 — 환율·시차·원본 증빙으로 가중',
  },
  {
    test: (i, _p, r) => /정산|증빙/.test(i.title) && /최종|중간|연차/.test(i.title),
    difficulty: 1, workDays: 2,
    label: '정기 정산 — 누적분 대조로 가중',
  },
  {
    test: (_i, p) => p?.role === 'lead',
    workDays: 1,
    label: '주관기관 — 참여기관 취합 부담',
  },
  {
    test: (i) => i.cost >= 50,
    workDays: 2, leadDays: 2,
    label: '5천만원 이상 — 내부 검토 절차 추가',
  },
  {
    test: (i) => i.hardDeadline && /제출|보고|정산/.test(i.title),
    leadDays: 1,
    label: '기관 제출 건 — 반려 시 재제출 여유 확보',
  },
]

const clampDifficulty = (n: number): 1 | 2 | 3 | 4 | 5 =>
  Math.min(5, Math.max(1, Math.round(n))) as 1 | 2 | 3 | 4 | 5

/**
 * 제목과 과제 정보만으로 난이도·소요일을 추정합니다.
 * 네트워크·API 키가 필요 없어 항상 동작합니다.
 */
export function estimateLocal(item: WorkItem, project?: Project): AutoEstimate {
  const matched = RULES.find((r) => r.re.test(item.title))
  const base = matched ?? FALLBACK

  const signals: string[] = [`"${base.label}"으로 분류`]
  let difficulty = base.difficulty
  let workDays = base.workDays
  let leadDays = base.leadDays ?? 0

  if (base.leadDays) {
    signals.push(`대기 ${base.leadDays}일 반영 — ${base.label}`)
  }

  for (const m of MODIFIERS) {
    if (!m.test(item, project, matched)) continue
    difficulty += m.difficulty ?? 0
    workDays += m.workDays ?? 0
    leadDays += m.leadDays ?? 0
    signals.push(m.label)
  }

  return {
    difficulty: clampDifficulty(difficulty),
    workDays: Math.max(0.5, workDays),
    leadDays,
    confidence: matched ? 'high' : 'low',
    source: 'rule',
    signals,
  }
}

/**
 * 사람이 입력한 값이 있으면 그것을 쓰고, 없으면 자동 추정합니다.
 * 우선순위 엔진은 항상 이 함수를 통해 값을 얻습니다.
 */
export function resolveEstimate(item: WorkItem, project?: Project): AutoEstimate {
  const auto = estimateLocal(item, project)

  const hasManual = item.difficulty != null || item.estimatedDays != null
  if (!hasManual) return auto

  return {
    difficulty: item.difficulty ?? auto.difficulty,
    workDays: item.estimatedDays ?? auto.workDays,
    leadDays: item.leadDays ?? auto.leadDays,
    confidence: 'high',
    source: 'manual',
    signals: ['담당자가 직접 입력한 값'],
  }
}

// ============================================================
// Claude 기반 추정 (백엔드 경유)
//
// ⚠️ 브라우저에서 Anthropic API를 직접 호출하면 API 키가 노출됩니다.
//    반드시 서버(server/estimate.ts)를 거쳐야 합니다.
//
// 규칙 기반으로 못 잡는 케이스를 보완합니다:
//   - 규칙에 없는 새 유형 (confidence: 'low' 인 항목)
//   - "작년과 동일 양식이라 금방 끝남" 같은 맥락이 담긴 제목
// ============================================================

export interface EstimateRequestItem {
  id: string
  title: string
  projectName?: string
  category?: string
  role?: string
  cost?: number
  hardDeadline?: boolean
}

/** 서버의 /api/estimate 로 배치 요청. 실패하면 규칙 기반으로 자동 폴백합니다. */
export async function estimateWithClaude(
  items: WorkItem[],
  projects: Map<string, Project>,
  endpoint = '/api/estimate',
): Promise<Map<string, AutoEstimate>> {
  const payload: EstimateRequestItem[] = items.map((i) => {
    const p = projects.get(i.projectId)
    return {
      id: i.id,
      title: i.title,
      projectName: p?.name,
      category: p?.category,
      role: p?.role,
      cost: i.cost,
      hardDeadline: i.hardDeadline,
    }
  })

  const result = new Map<string, AutoEstimate>()

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: payload }),
    })
    if (!res.ok) throw new Error(`estimate api ${res.status}`)

    const data = (await res.json()) as {
      estimates: Array<{
        id: string
        difficulty: 1 | 2 | 3 | 4 | 5
        workDays: number
        leadDays: number
        confidence: 'low' | 'medium' | 'high'
        signals: string[]
      }>
    }

    for (const e of data.estimates) {
      result.set(e.id, {
        difficulty: e.difficulty,
        workDays: e.workDays,
        leadDays: e.leadDays,
        confidence: e.confidence,
        source: 'claude',
        signals: e.signals,
      })
    }
  } catch (err) {
    // 서버가 없거나 실패해도 화면이 죽지 않도록 규칙 기반으로 채웁니다.
    console.warn('Claude 추정 실패 — 규칙 기반으로 대체합니다.', err)
  }

  for (const item of items) {
    if (!result.has(item.id)) {
      result.set(item.id, estimateLocal(item, projects.get(item.projectId)))
    }
  }

  return result
}
