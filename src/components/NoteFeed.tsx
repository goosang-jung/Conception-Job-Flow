import { useState, useRef } from 'react'
import { Pin, ImagePlus, X, Send } from 'lucide-react'
import type { ProjectNote, Project } from '../types'
import { CATEGORY_COLOR } from '../taxonomy'

function filesToDataUrls(files: File[], cb: (urls: string[]) => void) {
  const images = files.filter((f) => f.type.startsWith('image/'))
  if (images.length === 0) return
  Promise.all(
    images.map(
      (f) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(f)
        }),
    ),
  ).then(cb)
}

function Composer({
  projects, currentUser, onSubmit,
}: {
  projects: Project[]
  currentUser: string
  onSubmit: (n: { projectId: string; body: string; images: string[] }) => void
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [body, setBody] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const addImages = (urls: string[]) => setImages((prev) => [...prev, ...urls])

  const submit = () => {
    if (!body.trim() && images.length === 0) return
    onSubmit({ projectId, body: body.trim(), images })
    setBody('')
    setImages([])
  }

  return (
    <div
      className={`p-4 border-b transition ${dragging ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        filesToDataUrls(Array.from(e.dataTransfer.files), addImages)
      }}
    >
      <div className="flex gap-2 mb-2">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white flex-1 min-w-0"
          aria-label="특이사항을 남길 과제"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onPaste={(e) => {
          const files = Array.from(e.clipboardData.files)
          if (files.length) { e.preventDefault(); filesToDataUrls(files, addImages) }
        }}
        placeholder="특이사항을 적어주세요. 캡처 이미지는 Ctrl+V 로 바로 붙여넣거나 여기에 끌어다 놓으면 됩니다."
        rows={3}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />

      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {images.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt={`첨부 ${i + 1}`} className="w-16 h-16 object-cover rounded border" />
              <button
                onClick={() => setImages(images.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5 hover:bg-red-600"
                aria-label={`첨부 ${i + 1} 삭제`}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center mt-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-100"
        >
          <ImagePlus size={15} /> 이미지 추가
        </button>
        <input
          ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => {
            filesToDataUrls(Array.from(e.target.files ?? []), addImages)
            e.target.value = ''
          }}
        />
        <button
          onClick={submit}
          disabled={!body.trim() && images.length === 0}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={13} /> {currentUser} 이름으로 공유
        </button>
      </div>
    </div>
  )
}

export default function NoteFeed({
  notes, projects, currentUser, onAdd, onTogglePin,
}: {
  notes: ProjectNote[]
  projects: Project[]
  currentUser: string
  onAdd: (n: { projectId: string; body: string; images: string[] }) => void
  onTogglePin: (id: string) => void
}) {
  const byId = new Map(projects.map((p) => [p.id, p]))
  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.createdAt.localeCompare(a.createdAt)
  })

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b">
        <h2 className="font-bold text-gray-900">과제별 특이사항</h2>
        <p className="text-xs text-gray-500 mt-0.5">담당자 전원이 함께 보는 공유 메모</p>
      </div>

      <Composer projects={projects} currentUser={currentUser} onSubmit={onAdd} />

      <div className="divide-y overflow-y-auto max-h-[520px]">
        {sorted.map((n) => {
          const p = byId.get(n.projectId)
          const color = p ? CATEGORY_COLOR[p.category] : null
          return (
            <div key={n.id} className={`p-4 ${n.pinned ? 'bg-amber-50/60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  {color && <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />}
                  <span className="text-xs font-semibold text-gray-900 truncate">{p?.name}</span>
                </div>
                <button
                  onClick={() => onTogglePin(n.id)}
                  className={`shrink-0 p-1 rounded hover:bg-gray-200 ${n.pinned ? 'text-amber-600' : 'text-gray-300'}`}
                  aria-label={n.pinned ? '고정 해제' : '상단 고정'}
                >
                  <Pin size={14} fill={n.pinned ? 'currentColor' : 'none'} />
                </button>
              </div>

              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{n.body}</p>

              {n.images.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {n.images.map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noreferrer">
                      <img src={src} alt={`${p?.name} 첨부 ${i + 1}`}
                        className="w-20 h-20 object-cover rounded border hover:opacity-80 transition" />
                    </a>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2">
                {n.author} · {new Date(n.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
