import React, { useState, useRef } from 'react'
import { Task } from '../types'
import { api } from '../api'
import { estimateDifficultyRules } from '../utils/priority'
import { Upload, Zap } from 'lucide-react'

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'createdAt'>) => void
}

export default function TaskForm({ onSubmit }: TaskFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [difficulty, setDifficulty] = useState<number | undefined>()
  const [estimatedDays, setEstimatedDays] = useState<number | undefined>()
  const [amount, setAmount] = useState<number | undefined>()
  const [estimating, setEstimating] = useState(false)
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AI 난이도 추정
  const handleEstimate = async () => {
    if (!name) return

    setEstimating(true)
    try {
      const result = await api.estimateDifficulty(name, description)
      setDifficulty(result.difficulty)
      setEstimatedDays(result.estimatedDays)
    } catch (error) {
      console.error('Estimation failed:', error)
      // 폴백: 규칙 기반 추정
      const fallback = estimateDifficultyRules(name, description)
      setDifficulty(fallback.difficulty)
      setEstimatedDays(fallback.estimatedDays)
    } finally {
      setEstimating(false)
    }
  }

  // 이미지 선택
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onload = e => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  // 이미지 붙여넣기
  const handleImagePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          setImage(file)
          const reader = new FileReader()
          reader.onload = e => setImagePreview(e.target?.result as string)
          reader.readAsDataURL(file)
        }
        break
      }
    }
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newTask: Omit<Task, 'id' | 'createdAt'> = {
      name,
      description,
      deadline,
      difficulty: difficulty || 2,
      estimatedDays: estimatedDays || 3,
      amount: amount || 0,
      status: 'pending',
    }

    onSubmit(newTask)

    // 폼 초기화
    setName('')
    setDescription('')
    setDeadline('')
    setDifficulty(undefined)
    setEstimatedDays(undefined)
    setAmount(undefined)
    setImage(null)
    setImagePreview(null)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">새 업무 추가</h2>

      {/* 업무명 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">업무명</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="예: 국제공동연구 정산 증빙"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* 설명 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">설명</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onPaste={handleImagePaste}
          placeholder="예: 지난 연도 공동연구 참여 내역 정산 및 증빙 자료 준비"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">💡 Ctrl+V로 이미지 붙여넣기 가능</p>
      </div>

      {/* 이미지 미리보기 */}
      {imagePreview && (
        <div className="mb-4">
          <img
            src={imagePreview}
            alt="preview"
            className="max-w-full h-auto max-h-40 rounded"
          />
          <button
            type="button"
            onClick={() => {
              setImage(null)
              setImagePreview(null)
            }}
            className="text-xs text-red-600 mt-2 hover:underline"
          >
            이미지 제거
          </button>
        </div>
      )}

      {/* 마감일 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">마감일</label>
        <input
          type="date"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      {/* AI 난이도 추정 */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <button
          type="button"
          onClick={handleEstimate}
          disabled={!name || estimating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          <Zap size={16} />
          {estimating ? '추정 중...' : 'AI 난이도 추정'}
        </button>
      </div>

      {/* 난이도 및 예상 기간 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">난이도</label>
          <select
            value={difficulty || 2}
            onChange={e => setDifficulty(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>매우 쉬움</option>
            <option value={2}>쉬움</option>
            <option value={3}>보통</option>
            <option value={4}>어려움</option>
            <option value={5}>매우 어려움</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">예상 기간 (일)</label>
          <input
            type="number"
            value={estimatedDays || 3}
            onChange={e => setEstimatedDays(Number(e.target.value))}
            min="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* 금액 */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">금액 (만원)</label>
        <input
          type="number"
          value={amount || 0}
          onChange={e => setAmount(Number(e.target.value))}
          min="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 파일 업로드 버튼 (숨김) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* 제출 버튼 */}
      <button
        type="submit"
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
      >
        업무 추가
      </button>
    </form>
  )
}
