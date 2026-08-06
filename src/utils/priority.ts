import { Task, PriorityScore } from '../types'

export function calculatePriorityScore(
  task: Task,
  allTasks: Task[]
): PriorityScore {
  const now = new Date()
  const deadline = new Date(task.deadline)
  const daysUntilDeadline = Math.ceil(
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  // 연기불가 마감: 30점 (남은 날짜가 적을수록 높음)
  const deadlineScore = Math.max(0, 30 - Math.max(0, daysUntilDeadline) * 2)

  // 다른 일을 막음: 25점 (사람이 지정하게 되는데, 일단 0)
  const blockingScore = 0

  // 금액: 25점 (금액이 많을수록 높음)
  const maxAmount = Math.max(...allTasks.map(t => t.amount || 0))
  const amountScore = maxAmount > 0 ? ((task.amount || 0) / maxAmount) * 25 : 0

  // 난이도: 20점 (난이도가 높을수록 높음)
  const difficultyScore = ((task.difficulty || 1) / 5) * 20

  const totalScore =
    deadlineScore + blockingScore + amountScore + difficultyScore

  return {
    taskId: task.id,
    score: totalScore,
    breakdown: {
      deadline: deadlineScore,
      blocking: blockingScore,
      amount: amountScore,
      difficulty: difficultyScore,
    },
    rank: 0, // 나중에 할당
  }
}

export function rankTasks(scores: PriorityScore[]): PriorityScore[] {
  return scores
    .sort((a, b) => b.score - a.score)
    .map((score, index) => ({
      ...score,
      rank: index + 1,
    }))
}

// 규칙 기반 난이도 추정
export function estimateDifficultyRules(
  name: string,
  description: string
): { difficulty: number; estimatedDays: number; reasoning: string } {
  const text = `${name} ${description}`.toLowerCase()

  let difficulty = 2 // 기본값 = 중간 난이도
  let estimatedDays = 3

  // 키워드 기반 난이도 조정
  const veryHardKeywords = [
    '국제',
    '공동연구',
    '정산',
    '복잡한',
    '대규모',
    '통합',
    '변경',
  ]
  const hardKeywords = [
    '보고서',
    '검수',
    '분석',
    '개선',
    '설계',
    '구현',
    '테스트',
  ]
  const easyKeywords = [
    '검증',
    '확인',
    '정렬',
    '수정',
    '문서화',
    '업로드',
  ]

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

  // 마감일까지의 날짜로 추정 조정 (추후 구현)
  const reasoning = veryHardKeywords.some(kw => text.includes(kw))
    ? '국제공동연구, 복잡한 프로세스 포함'
    : hardKeywords.some(kw => text.includes(kw))
      ? '리뷰, 분석, 설계 필요'
      : '단순 검증/수정 작업'

  return { difficulty, estimatedDays, reasoning }
}
