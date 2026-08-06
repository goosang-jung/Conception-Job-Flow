// IRIS/RCMS 크롤러가 붙으면 이 파일 대신 API 응답이 들어옵니다.
// types.ts 가 백엔드와의 계약이므로 필드 이름을 바꾸지 마세요.
import type { Project, WorkItem, ProjectNote } from './types'

/** 데모 기준일. 실서버에서는 new Date() 로 대체됩니다 */
export const TODAY = new Date('2026-08-03T09:00:00+09:00')

export const PROJECTS: Project[] = [
  {
    id: 'P-01',
    name: 'AI 기반 제조 공정 최적화',
    category: 'national-rnd', subcategory: 'motie', role: 'lead',
    owner: '김철수', members: ['김철수', '박민준', '최유진'],
    startDate: '2026-03-01', endDate: '2026-12-31',
    budget: {
      material: { planned: 120, spent: 78 },
      labor: { planned: 260, spent: 165 },
      activity: { planned: 60, spent: 41 },
      indirect: { planned: 45, spent: 28 },
      international: { planned: 15, spent: 8 },
    },
  },
  {
    id: 'P-02',
    name: '스마트 품질검사 시스템 실증',
    category: 'national-rnd', subcategory: 'msit', role: 'participant',
    owner: '이영희', members: ['이영희', '정수현'],
    startDate: '2026-01-01', endDate: '2026-12-31',
    budget: {
      material: { planned: 80, spent: 22 },
      labor: { planned: 150, spent: 71 },
      activity: { planned: 40, spent: 18 },
      indirect: { planned: 30, spent: 14 },
    },
  },
  {
    id: 'P-03',
    name: '중소기업 디지털 전환 지원',
    category: 'gov-project', subcategory: 'mss', role: 'lead',
    owner: '박민준', members: ['박민준', '한지우'],
    startDate: '2026-04-01', endDate: '2026-11-30',
    budget: {
      labor: { planned: 90, spent: 62 },
      activity: { planned: 70, spent: 55 },
      indirect: { planned: 20, spent: 13 },
    },
  },
  {
    id: 'P-04',
    name: '해외 기술협력 국제공동연구',
    category: 'national-rnd', subcategory: 'msit', role: 'participant',
    owner: '정수현', members: ['정수현', '최유진'],
    startDate: '2026-02-01', endDate: '2027-01-31',
    budget: {
      labor: { planned: 110, spent: 40 },
      international: { planned: 85, spent: 31 },
      activity: { planned: 35, spent: 12 },
      indirect: { planned: 25, spent: 9 },
    },
  },
  {
    id: 'P-05',
    name: '지자체 스마트시티 자문',
    category: 'external', subcategory: 'public-office',  role: 'lead',
    owner: '한지우', members: ['한지우', '이영희'],
    startDate: '2026-05-01', endDate: '2026-10-31',
    budget: {
      labor: { planned: 55, spent: 30 },
      activity: { planned: 25, spent: 14 },
    },
  },
  {
    id: 'P-06',
    name: '민간 설비진단 솔루션 납품',
    category: 'external', subcategory: 'general-external', role: 'lead',
    owner: '최유진', members: ['최유진', '김철수'],
    startDate: '2026-06-01', endDate: '2026-09-30',
    budget: {
      material: { planned: 65, spent: 48 },
      labor: { planned: 70, spent: 44 },
    },
  },
  {
    id: 'P-07',
    name: '자사 진단 플랫폼 v2 개발',
    category: 'internal', subcategory: 'business', businessType: 'development',
    owner: '박민준', members: ['박민준', '최유진'],
    startDate: '2026-01-15', endDate: '2026-12-31',
    budget: { labor: { planned: 140, spent: 88 } },
  },
  {
    id: 'P-08',
    name: '센서 모듈 상품화',
    category: 'internal', subcategory: 'business', businessType: 'product',
    owner: '김철수', members: ['김철수'],
    startDate: '2026-03-01', endDate: '2026-11-30',
    budget: {
      material: { planned: 95, spent: 52 },
      labor: { planned: 60, spent: 33 },
    },
  },
  {
    id: 'P-09',
    name: 'UI 리뉴얼 외주 관리',
    category: 'internal', subcategory: 'business', businessType: 'outsourcing',
    owner: '한지우', members: ['한지우'],
    startDate: '2026-07-01', endDate: '2026-10-15',
    budget: { labor: { planned: 45, spent: 18 } },
  },
  {
    id: 'P-10',
    name: '연구소 일반행정',
    category: 'internal', subcategory: 'administration',
    owner: '이영희', members: ['이영희', '한지우'],
    startDate: '2026-01-01', endDate: '2026-12-31',
    budget: { indirect: { planned: 40, spent: 24 } },
  },
]

export const WORK_ITEMS: WorkItem[] = [
  // --- 이미 늦었거나 오늘 착수해야 하는 일 ---
  {
    id: 'W-01', title: '산업부 연차실적보고서 제출', projectId: 'P-01', assignee: '김철수',
    status: 'doing', dueDate: '2026-08-07', difficulty: 4, cost: 0,
    hardDeadline: true, blocking: false,
  },
  {
    id: 'W-02', title: '국제공동연구 중간정산 증빙 취합', projectId: 'P-04', assignee: '정수현',
    status: 'todo', dueDate: '2026-08-10', difficulty: 5, cost: 31,
    costCategory: 'international', hardDeadline: true, blocking: true,
  },
  {
    id: 'W-03', title: '설비진단 솔루션 납품검수 준비', projectId: 'P-06', assignee: '최유진',
    status: 'todo', dueDate: '2026-08-06', difficulty: 3, cost: 65,
    costCategory: 'material', hardDeadline: true, blocking: false,
  },
  // --- 이번 주 ---
  {
    id: 'W-04', title: '품질검사 실증 장비 발주', projectId: 'P-02', assignee: '이영희',
    status: 'todo', dueDate: '2026-08-14', difficulty: 3, cost: 58,
    costCategory: 'material', hardDeadline: false, blocking: true,
  },
  {
    id: 'W-05', title: '중기부 사업 참여기업 모집공고', projectId: 'P-03', assignee: '박민준',
    status: 'doing', dueDate: '2026-08-12', difficulty: 2, cost: 0,
    hardDeadline: true, blocking: true,
  },
  {
    id: 'W-06', title: '지자체 자문 2차 보고자료', projectId: 'P-05', assignee: '한지우',
    status: 'todo', dueDate: '2026-08-13', difficulty: 3, cost: 0,
    hardDeadline: true, blocking: false,
  },
  // --- 다음 순서 ---
  {
    id: 'W-07', title: '제조 최적화 알고리즘 성능 튜닝', projectId: 'P-01', assignee: '박민준',
    status: 'doing', dueDate: '2026-09-15', difficulty: 5, cost: 0,
    hardDeadline: false, blocking: true,
  },
  {
    id: 'W-08', title: '센서 모듈 양산 견적 확정', projectId: 'P-08', assignee: '김철수',
    status: 'todo', dueDate: '2026-08-28', difficulty: 3, cost: 95,
    costCategory: 'material', hardDeadline: false, blocking: false,
  },
  {
    id: 'W-09', title: '외주 UI 1차 산출물 검수', projectId: 'P-09', assignee: '한지우',
    status: 'todo', dueDate: '2026-08-25', difficulty: 2, cost: 22,
    costCategory: 'labor', hardDeadline: false, blocking: false,
  },
  {
    id: 'W-10', title: '플랫폼 v2 인증 모듈 재설계', projectId: 'P-07', assignee: '최유진',
    status: 'blocked', dueDate: '2026-09-05', difficulty: 5, cost: 0,
    hardDeadline: false, blocking: false,
  },
  // --- 여유 ---
  {
    id: 'W-11', title: '4분기 인건비 계상계획 수립', projectId: 'P-10', assignee: '이영희',
    status: 'todo', dueDate: '2026-09-30', difficulty: 2, cost: 0,
    costCategory: 'labor', hardDeadline: false, blocking: false,
  },
  {
    id: 'W-12', title: '해외 파트너 방문 일정 조율', projectId: 'P-04', assignee: '정수현',
    status: 'todo', dueDate: '2026-10-10', difficulty: 2, cost: 18,
    costCategory: 'international', hardDeadline: false, blocking: false,
  },
  {
    id: 'W-13', title: '실증 데이터셋 라벨링 외주 검토', projectId: 'P-02', assignee: '정수현',
    status: 'todo', dueDate: '2026-09-20', difficulty: 3, cost: 40,
    costCategory: 'activity', hardDeadline: false, blocking: false,
  },
  {
    id: 'W-14', title: '보안점검 정기 서류 갱신', projectId: 'P-10', assignee: '한지우',
    status: 'done', dueDate: '2026-07-31', difficulty: 1, cost: 0,
    hardDeadline: true, blocking: false,
  },
]

export const PROJECT_NOTES: ProjectNote[] = [
  {
    id: 'N-01', projectId: 'P-01', author: '김철수', createdAt: '2026-08-01T14:20:00+09:00',
    body: '산업부 담당 주무관 교체됨. 8월부터 이OO 주무관. 연차보고서 양식이 v3로 바뀌어서 작년 양식 그대로 쓰면 반려됩니다. 제출 전 반드시 최신 양식 확인.',
    images: [], pinned: true,
  },
  {
    id: 'N-02', projectId: 'P-04', author: '정수현', createdAt: '2026-07-30T10:05:00+09:00',
    body: '국제활동비는 출장 종료 후 30일 이내 정산 필수. 환율은 지출일 기준 매매기준율 적용. 영수증 원본 스캔본까지 있어야 인정됩니다.',
    images: [], pinned: true,
  },
  {
    id: 'N-03', projectId: 'P-06', author: '최유진', createdAt: '2026-08-02T17:40:00+09:00',
    body: '고객사 검수 담당자가 현장 설치 사진을 요구합니다. 납품 전 설치 상태 캡처해서 여기 올려주세요.',
    images: [], pinned: false,
  },
  {
    id: 'N-04', projectId: 'P-03', author: '박민준', createdAt: '2026-07-28T09:15:00+09:00',
    body: '중기부 공고는 나라장터 게시 후 최소 14일 공고기간 필요. 모집 마감 역산해서 일정 잡아야 함.',
    images: [], pinned: false,
  },
]

export const TEAM = ['김철수', '이영희', '박민준', '정수현', '최유진', '한지우']
