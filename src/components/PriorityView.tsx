import React from 'react'
import { Task, PriorityScore } from '../types'
import { AlertCircle, TrendingDown } from 'lucide-react'

interface PriorityViewProps {
  priorities: PriorityScore[]
  tasks: Task[]
}

export default function PriorityView({ priorities, tasks }: PriorityViewProps) {
  const getTaskById = (id: string) => tasks.find(t => t.id === id)

  const taskMap = new Map(tasks.map(t => [t.id, t]))

  const ranked = [...priorities].sort((a, b) => a.rank - b.rank)

  const getPriorityColor = (rank: number) => {
    if (rank === 1) return 'bg-red-50 border-l-4 border-red-500'
    if (rank <= 3) return 'bg-orange-50 border-l-4 border-orange-500'
    if (rank <= 6) return 'bg-yellow-50 border-l-4 border-yellow-500'
    return 'bg-green-50 border-l-4 border-green-500'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 70) return '매우 시급'
    if (score >= 50) return '시급'
    if (score >= 30) return '중간'
    return '낮음'
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm">총 업무</div>
          <div className="text-3xl font-bold text-gray-900">{tasks.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm">진행 중</div>
          <div className="text-3xl font-bold text-blue-600">
            {tasks.filter(t => t.status === 'in-progress').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm">완료</div>
          <div className="text-3xl font-bold text-green-600">
            {tasks.filter(t => t.status === 'completed').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm">평균 난이도</div>
          <div className="text-3xl font-bold text-orange-600">
            {(
              tasks.reduce((s, t) => s + (t.difficulty || 2), 0) / tasks.length
            ).toFixed(1)}
          </div>
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
          우선순위를 계산할 업무가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {ranked.map((item, index) => {
            const task = getTaskById(item.taskId)
            if (!task) return null

            const now = new Date()
            const deadline = new Date(task.deadline)
            const daysLeft = Math.ceil(
              (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
            const isOverdue = daysLeft < 0

            return (
              <div
                key={item.taskId}
                className={`p-4 rounded-lg ${getPriorityColor(item.rank)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl font-bold text-gray-400 min-w-12">
                    #{item.rank}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">
                        {task.name}
                      </h3>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          item.score >= 70
                            ? 'bg-red-200 text-red-900'
                            : item.score >= 50
                              ? 'bg-orange-200 text-orange-900'
                              : item.score >= 30
                                ? 'bg-yellow-200 text-yellow-900'
                                : 'bg-green-200 text-green-900'
                        }`}
                      >
                        {getScoreLabel(item.score)}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                          <AlertCircle size={14} />
                          {Math.abs(daysLeft)}일 지연
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-3">
                      {task.description}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs">
                      <div>
                        <span className="text-gray-600">마감일:</span>
                        <span className="font-medium ml-1">
                          {deadline.toLocaleDateString('ko-KR')}
                        </span>
                        {daysLeft >= 0 && (
                          <span className="text-gray-500 ml-1">({daysLeft}일)</span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-600">난이도:</span>
                        <span className="font-medium ml-1">
                          {['', '매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움'][
                            task.difficulty || 2
                          ]}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">예상:</span>
                        <span className="font-medium ml-1">
                          {task.estimatedDays}일
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">금액:</span>
                        <span className="font-medium ml-1">
                          {task.amount ? `${task.amount}만원` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* 점수 분석 */}
                    <div className="bg-white bg-opacity-60 p-2 rounded text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-700">
                          마감 긴급도:
                          <span className="font-bold text-red-600 ml-1">
                            {item.breakdown.deadline.toFixed(1)}점
                          </span>
                        </span>
                        <span className="text-gray-700">
                          대기 영향도:
                          <span className="font-bold text-orange-600 ml-1">
                            {item.breakdown.blocking.toFixed(1)}점
                          </span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">
                          금액 중요도:
                          <span className="font-bold text-yellow-600 ml-1">
                            {item.breakdown.amount.toFixed(1)}점
                          </span>
                        </span>
                        <span className="text-gray-700">
                          난이도:
                          <span className="font-bold text-blue-600 ml-1">
                            {item.breakdown.difficulty.toFixed(1)}점
                          </span>
                        </span>
                      </div>
                      <div className="pt-1 border-t border-gray-300">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-800 font-bold">
                            최종 점수:
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {item.score.toFixed(1)}점
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 판정 설명 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <TrendingDown size={18} />
          우선순위 판정 근거
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • <span className="font-medium">마감 긴급도 (30점)</span>: 마감일까지의
            시간 부족도
          </li>
          <li>
            • <span className="font-medium">대기 영향도 (25점)</span>: 이 업무가
            끝나야 다른 일이 시작되는 정도
          </li>
          <li>
            • <span className="font-medium">금액 중요도 (25점)</span>: 업무의 예산
            규모
          </li>
          <li>
            • <span className="font-medium">난이도 (20점)</span>: 업무 완료의
            어려움
          </li>
        </ul>
      </div>
    </div>
  )
}
