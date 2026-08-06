import React from 'react'
import { Task } from '../types'
import { Trash2, CheckCircle, Circle } from 'lucide-react'

interface TaskTableProps {
  tasks: Task[]
  onUpdate: (id: string, updates: Partial<Task>) => void
  onDelete: (id: string) => void
}

export default function TaskTable({
  tasks,
  onUpdate,
  onDelete,
}: TaskTableProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ko-KR')
  }

  const getDifficultyBadge = (difficulty?: number) => {
    const level = difficulty || 2
    const labels = ['', '매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움']
    const colors = [
      '',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800',
      'bg-red-200 text-red-900',
    ]
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[level]}`}>
        {labels[level]}
      </span>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              상태
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              업무명
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              마감일
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              난이도
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              예상 기간
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              금액
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
              작업
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                등록된 업무가 없습니다.
              </td>
            </tr>
          ) : (
            tasks.map(task => (
              <tr key={task.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <button
                    onClick={() =>
                      onUpdate(task.id, {
                        status:
                          task.status === 'completed'
                            ? 'pending'
                            : 'completed',
                      })
                    }
                    className="text-gray-400 hover:text-green-600"
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{task.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {task.description}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDate(task.deadline)}
                </td>
                <td className="px-4 py-3">{getDifficultyBadge(task.difficulty)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {task.estimatedDays}일
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {task.amount ? `${task.amount}만원` : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onDelete(task.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
