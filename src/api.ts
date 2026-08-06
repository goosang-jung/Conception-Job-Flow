import { Task, EstimationResult, PriorityScore } from './types'

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3002' : '/api')

export const api = {
  // 업무 관리
  async getTasks(): Promise<Task[]> {
    const res = await fetch(`${API_BASE}/tasks`)
    return res.json()
  },

  async createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    })
    return res.json()
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    return res.json()
  },

  async deleteTask(id: string): Promise<void> {
    await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' })
  },

  // AI 난이도 추정
  async estimateDifficulty(
    name: string,
    description: string
  ): Promise<EstimationResult> {
    const res = await fetch(`${API_BASE}/estimate-difficulty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    return res.json()
  },

  // 우선순위 계산
  async calculatePriorities(tasks: Task[]): Promise<PriorityScore[]> {
    const res = await fetch(`${API_BASE}/calculate-priorities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tasks),
    })
    return res.json()
  },

  // 이미지 업로드
  async uploadImage(file: File, taskId: string): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('taskId', taskId)

    const res = await fetch(`${API_BASE}/upload-image`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    return data.url
  },
}
