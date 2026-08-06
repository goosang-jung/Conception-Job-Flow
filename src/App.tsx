import React, { useState, useEffect } from 'react'
import { api } from './api'
import { Task, PriorityScore } from './types'
import TaskForm from './components/TaskForm'
import TaskTable from './components/TaskTable'
import PriorityView from './components/PriorityView'
import LandingPage from './LandingPage'
import GovProjectDashboard from './GovProjectDashboard'
import { Menu } from 'lucide-react'

export default function App() {
  const [currentPage, setCurrentPage] = useState<'landing' | 'dashboard'>('landing')
  const [tasks, setTasks] = useState<Task[]>([])
  const [priorities, setPriorities] = useState<PriorityScore[]>([])
  const [view, setView] = useState<'priority' | 'table'>('priority')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 업무 로드
  const loadTasks = async () => {
    setLoading(true)
    try {
      const data = await api.getTasks()
      setTasks(data)
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  // 우선순위 계산
  const calculatePriorities = async () => {
    try {
      const scores = await api.calculatePriorities(tasks)
      setPriorities(scores)
    } catch (error) {
      console.error('Failed to calculate priorities:', error)
    }
  }

  // 초기 로드 및 우선순위 자동 계산
  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    if (tasks.length > 0) {
      calculatePriorities()
    }
  }, [tasks])

  // 새 업무 추가
  const handleAddTask = async (newTask: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const task = await api.createTask(newTask)
      setTasks(prev => [...prev, task])
    } catch (error) {
      console.error('Failed to add task:', error)
    }
  }

  // 업무 상태 업데이트
  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const task = await api.updateTask(id, updates)
      setTasks(prev => prev.map(t => (t.id === id ? task : t)))
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  // 업무 삭제
  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  // 랜딩 페이지 표시
  if (currentPage === 'landing') {
    return <LandingPage onNavigateToDashboard={() => setCurrentPage('dashboard')} />
  }

  // 대시보드 표시
  if (currentPage === 'dashboard') {
    return (
      <GovProjectDashboard />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              정부사업 통합 관리 대시보드
            </h1>
          </div>
          <div className="text-sm text-gray-600">
            총 {tasks.length}개 업무
            {tasks.filter(t => t.status === 'completed').length > 0 &&
              ` (완료: ${tasks.filter(t => t.status === 'completed').length})`}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 네비게이션 탭 */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setView('priority')}
            className={`px-4 py-2 font-medium ${
              view === 'priority'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            우선순위 분석
          </button>
          <button
            onClick={() => setView('table')}
            className={`px-4 py-2 font-medium ${
              view === 'table'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            업무 목록
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : view === 'priority' ? (
          <PriorityView priorities={priorities} tasks={tasks} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <TaskForm onSubmit={handleAddTask} />
            </div>
            <div className="lg:col-span-2">
              <TaskTable
                tasks={tasks}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
