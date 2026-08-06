import { useState } from 'react'
import { ChevronDown, ChevronRight, Lock, Link2, Sparkles } from 'lucide-react'
import type { ScoredWork, Project, PriorityBucket } from '../types'
import { BUCKET_META } from '../priority'
import { CATEGORY_COLOR, DIFFICULTY_LABEL, describeProject, COST_CATEGORY_LABEL } from '../taxonomy'

const BUCKET_ORDER: PriorityBucket[] = ['now', 'this-week', 'next', 'later']

function DifficultyDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`난이도 ${DIFFICULTY_LABEL[level]}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`w-1.5 h-1.5 rounded-full ${
            n <= level ? (level >= 4 ? 'bg-purple-600' : 'bg-purple-400') : 'bg-gray-200'
          }`}
        />
      ))}
    </span>
  )
}

function WorkRow({ sw, project, rank }: { sw: ScoredWork; project?: Project; rank: number }) {
  const [open, setOpen] = useState(false)
  const meta = BUCKET_META[sw.bucket]
  const color = project ? CATEGORY_COLOR[project.category] : null

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-start gap-3"
        aria-expanded={open}
      >
        <span className={`w-1 self-stretch rounded-full shrink-0 ${meta.bar}`} />
        <span className="text-xs font-bold text-gray-400 w-6 pt-0.5 shrink-0">{rank}</span>

        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{sw.item.title}</span>
            {sw.item.hardDeadline && (
              <Lock size={13} className="text-red-500 shrink-0" aria-label="연기 불가" />
            )}
            {sw.item.blocking && (
              <Link2 size={13} className="text-orange-500 shrink-0" aria-label="다른 일을 막고 있음" />
            )}
          </span>

          <span className="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
            {project && color && (
              <span className={`px-1.5 py-0.5 rounded border ${color.chip}`}>
                {describeProject(project)}
              </span>
            )}
            <span className="text-gray-500">{project?.name}</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">{sw.item.assignee}</span>
          </span>
        </span>

        <span className="flex items-center gap-4 shrink-0 text-xs">
          <span className="hidden sm:block"><DifficultyDots level={sw.item.difficulty} /></span>
          <span className="w-16 text-right text-gray-600">
            {sw.item.cost > 0 ? `${sw.item.cost}백만` : '—'}
          </span>
          <span className={`w-20 text-right font-semibold ${sw.slackDays <= 0 ? 'text-red-600' : 'text-gray-700'}`}>
            {sw.slackDays < 0 ? `${-sw.slackDays}일 지연` : sw.slackDays === 0 ? '오늘 착수' : `여유 ${sw.slackDays}일`}
          </span>
          {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pl-[4.5rem] bg-gray-50/70">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 mb-2">
            <Sparkles size={13} />
            AI 판단 근거 (종합점수 {sw.score})
          </div>
          <ul className="space-y-1 text-sm text-gray-700">
            {sw.reasons.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-gray-400">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span>마감 {sw.item.dueDate}</span>
            <span>착수 마감 {sw.latestStart}</span>
            <span>난이도 {DIFFICULTY_LABEL[sw.item.difficulty]}</span>
            {sw.item.costCategory && <span>비목 {COST_CATEGORY_LABEL[sw.item.costCategory]}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PriorityBoard({
  scored, projects, grouped,
}: {
  scored: ScoredWork[]
  projects: Project[]
  grouped: boolean
}) {
  const byId = new Map(projects.map((p) => [p.id, p]))

  if (scored.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500 text-sm">
        조건에 맞는 업무가 없습니다.
      </div>
    )
  }

  if (!grouped) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {scored.map((sw, i) => (
          <WorkRow key={sw.item.id} sw={sw} project={byId.get(sw.item.projectId)} rank={i + 1} />
        ))}
      </div>
    )
  }

  let rank = 0
  return (
    <div className="space-y-4">
      {BUCKET_ORDER.map((bucket) => {
        const rows = scored.filter((s) => s.bucket === bucket)
        if (rows.length === 0) return null
        const meta = BUCKET_META[bucket]
        return (
          <div key={bucket} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-2.5 border-b flex items-center gap-3 bg-gray-50">
              <span className={`px-2 py-0.5 rounded border text-xs font-bold ${meta.chip}`}>
                {meta.label} {rows.length}
              </span>
              <span className="text-xs text-gray-500">{meta.hint}</span>
            </div>
            {rows.map((sw) => {
              rank += 1
              return <WorkRow key={sw.item.id} sw={sw} project={byId.get(sw.item.projectId)} rank={rank} />
            })}
          </div>
        )
      })}
    </div>
  )
}
