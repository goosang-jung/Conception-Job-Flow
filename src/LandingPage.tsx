import React from 'react'

interface LandingPageProps {
  onNavigateToDashboard?: () => void
}

export default function LandingPage({ onNavigateToDashboard }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-gray-900">Conception Job Flow</h1>
          <p className="text-lg text-gray-600 mt-2">사내 프로젝트 통합 관리 시스템</p>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* 소개 */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">📋 개요</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Conception Job Flow는 팀의 모든 프로젝트와 업무를 효율적으로 관리하는 통합 대시보드입니다.
            우선순위 분석, 일정 관리, 팀 협업을 한 곳에서 처리할 수 있습니다.
          </p>
        </section>

        {/* 주요 기능 */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">✨ 주요 기능</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-blue-900 mb-2">📊 우선순위 분석</h3>
              <p className="text-gray-700">마감일, 금액, 난이도를 기반으로 업무의 우선순위를 자동 분석합니다.</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-green-900 mb-2">📅 일정 관리</h3>
              <p className="text-gray-700">달력과 연간 일정으로 프로젝트 진행 상황을 한눈에 파악합니다.</p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-purple-900 mb-2">👥 팀 협업</h3>
              <p className="text-gray-700">담당자 관리, 프로젝트 분류로 팀 협업을 체계화합니다.</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold text-orange-900 mb-2">📈 통계</h3>
              <p className="text-gray-700">프로젝트별, 담당자별 통계로 팀 성과를 측정합니다.</p>
            </div>
          </div>
        </section>

        {/* 프로젝트 분류 */}
        <section className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🏢 프로젝트 유형</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <span className="text-2xl">🏛️</span>
              <div>
                <h3 className="font-bold text-lg text-gray-900">정부사업</h3>
                <p className="text-gray-600">정부 발주 프로젝트 및 과제</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl">🔧</span>
              <div>
                <h3 className="font-bold text-lg text-gray-900">내부전략</h3>
                <p className="text-gray-600">회사 내부 전략 프로젝트</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl">⚙️</span>
              <div>
                <h3 className="font-bold text-lg text-gray-900">운영/지속</h3>
                <p className="text-gray-600">지속적인 운영 및 유지보수</p>
              </div>
            </div>
          </div>
        </section>

        {/* 시작하기 */}
        <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">🚀 시작하기</h2>
          <p className="text-lg mb-6">대시보드에 접속하여 팀의 모든 업무를 관리하세요.</p>
          <button
            onClick={onNavigateToDashboard}
            className="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            대시보드 이동
          </button>
        </section>

        {/* 정보 */}
        <section className="bg-gray-50 rounded-lg shadow p-8 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">ℹ️ 정보</h2>
          <div className="grid grid-cols-2 gap-4 text-gray-700">
            <div>
              <span className="font-bold">버전:</span> 1.0.0
            </div>
            <div>
              <span className="font-bold">환경:</span> 사내 (로컬 네트워크)
            </div>
            <div>
              <span className="font-bold">접속:</span> WiFi (192.168.x.x)
            </div>
            <div>
              <span className="font-bold">상태:</span> 운영 중
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-gray-400 text-center py-6 mt-12">
        <p>&copy; 2026 Conception Job Flow. All rights reserved.</p>
      </footer>
    </div>
  )
}
