// ============================================================
// components/study/SummaryModule.tsx
// Cadastro (manual + PDF) e listagem de resumos
// Stack: React + TypeScript + TailwindCSS + Lucide React
// ============================================================

import { useState, useEffect, useRef } from 'react'
import {
  Plus, Search, Filter, BookCheck, Upload,
  Calendar, Tag, ChevronDown, X, Eye, Pencil,
  Trash2, Clock, FileText, AlertCircle
} from 'lucide-react'
import { summaryService, subjectService, topicService, subtopicService } from '../../services/studyService'
import type { Summary, SummaryInsert, Subject, Topic, Subtopic, Front } from '../../types/study'

// ── Helpers ───────────────────────────────────────────────────

const FRONT_LABELS: Record<Front, { label: string; color: string }> = {
  A: { label: 'Frente A', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  B: { label: 'Frente B', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  C: { label: 'Frente C', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

const isOverdue = (next_review?: string) =>
  next_review ? new Date(next_review) <= new Date() : false

// ── Props ─────────────────────────────────────────────────────

interface SummaryModuleProps {
  initialSubjectId?: string
}

// ── Formulário de cadastro ─────────────────────────────────────

interface SummaryFormProps {
  subjects: Subject[]
  onSave: (summary: SummaryInsert) => Promise<void>
  onCancel: () => void
  initial?: Partial<SummaryInsert>
}

function SummaryForm({ subjects, onSave, onCancel, initial }: SummaryFormProps) {
  const [form, setForm] = useState<Partial<SummaryInsert>>({
    title: '',
    content: '',
    source_type: 'manual',
    tags: [],
    review_dates: [],
    ...initial
  })
  const [topics, setTopics] = useState<Topic[]>([])
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof SummaryInsert, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }))

  useEffect(() => {
    if (form.subject_id) {
      topicService.getBySubject(form.subject_id).then(setTopics)
      set('topic_id', undefined)
      set('subtopic_id', undefined)
    }
  }, [form.subject_id])

  useEffect(() => {
    if (form.topic_id) {
      subtopicService.getByTopic(form.topic_id).then(setSubtopics)
      set('subtopic_id', undefined)
    }
  }, [form.topic_id])

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags?.includes(tag)) {
      set('tags', [...(form.tags ?? []), tag])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) =>
    set('tags', form.tags?.filter(t => t !== tag) ?? [])

  const handlePDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Aqui você pode integrar com uma API de extração de PDF
    // Por ora, seta o nome do arquivo e source_type
    set('source_type', 'pdf')
    set('source_file', file.name)
    set('title', file.name.replace('.pdf', ''))
    // Placeholder: conteúdo seria gerado externamente (NotebookLM, etc.)
    set('content', `[PDF importado: ${file.name}]\n\nAdicione o conteúdo do resumo aqui.`)
  }

  const handleSubmit = async () => {
    if (!form.title?.trim()) { setError('Título é obrigatório'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave(form as SummaryInsert)
    } catch (e) {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
  const labelClass = "block text-xs font-medium text-slate-400 mb-1.5"
  const selectClass = `${inputClass} cursor-pointer`

  return (
    <div className="flex flex-col gap-5">

      {/* Tipo de entrada */}
      <div className="flex gap-2">
        {(['manual', 'pdf'] as const).map(type => (
          <button
            key={type}
            onClick={() => set('source_type', type)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all
              ${form.source_type === type
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                : 'bg-white/3 border-white/10 text-slate-400 hover:text-slate-200'}`}
          >
            {type === 'manual' ? <FileText size={14} /> : <Upload size={14} />}
            {type === 'manual' ? 'Manual' : 'Importar PDF'}
          </button>
        ))}
      </div>

      {/* Upload PDF */}
      {form.source_type === 'pdf' && (
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500/30 hover:bg-white/3 transition-all"
        >
          <Upload size={24} className="mx-auto mb-2 text-slate-500" />
          <p className="text-sm text-slate-400">Clique para selecionar o PDF</p>
          <p className="text-xs text-slate-600 mt-1">O título será preenchido automaticamente</p>
          {form.source_file && (
            <p className="text-xs text-indigo-400 mt-2 font-medium">{form.source_file}</p>
          )}
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handlePDF} />
        </div>
      )}

      {/* Filtros: matéria > assunto > tópico */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Matéria</label>
          <select className={selectClass} value={form.subject_id ?? ''} onChange={e => set('subject_id', e.target.value || undefined)}>
            <option value="">— Selecione —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Assunto (Tópico)</label>
          <select className={selectClass} value={form.topic_id ?? ''} onChange={e => set('topic_id', e.target.value || undefined)} disabled={!form.subject_id}>
            <option value="">— Selecione —</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Sub-tópico</label>
          <select className={selectClass} value={form.subtopic_id ?? ''} onChange={e => set('subtopic_id', e.target.value || undefined)} disabled={!form.topic_id}>
            <option value="">— Selecione —</option>
            {subtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Frente */}
      <div>
        <label className={labelClass}>Frente de Estudo</label>
        <div className="flex gap-2">
          {(['A', 'B', 'C'] as const).map(f => (
            <button
              key={f}
              onClick={() => set('front', form.front === f ? undefined : f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all
                ${form.front === f
                  ? FRONT_LABELS[f].color + ' border-current'
                  : 'bg-white/3 border-white/10 text-slate-500 hover:text-slate-300'}`}
            >
              {FRONT_LABELS[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Título */}
      <div>
        <label className={labelClass}>Título *</label>
        <input
          className={inputClass}
          placeholder="Ex: Leis de Mendel — 1ª e 2ª Lei"
          value={form.title ?? ''}
          onChange={e => set('title', e.target.value)}
        />
      </div>

      {/* Conteúdo */}
      <div>
        <label className={labelClass}>Conteúdo (suporta Markdown)</label>
        <textarea
          className={`${inputClass} min-h-[160px] resize-y font-mono text-xs`}
          placeholder="Digite o resumo aqui..."
          value={form.content ?? ''}
          onChange={e => set('content', e.target.value)}
        />
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass}>Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            className={inputClass}
            placeholder="Adicionar tag..."
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
          />
          <button onClick={addTag} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/8 transition-all">
            <Plus size={14} />
          </button>
        </div>
        {(form.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.tags!.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-400">
                {tag}
                <button onClick={() => removeTag(tag)}>
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
        >
          {saving ? 'Salvando...' : 'Salvar Resumo'}
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────

export default function SummaryModule({ initialSubjectId }: SummaryModuleProps) {
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSummary, setEditingSummary] = useState<Summary | null>(null)
  const [viewingSummary, setViewingSummary] = useState<Summary | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState(initialSubjectId ?? '')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterFront, setFilterFront] = useState<Front | ''>('')

  const load = async () => {
    setLoading(true)
    const [sums, subs] = await Promise.all([
      summaryService.getAll({
        subject_id: filterSubject || undefined,
        topic_id: filterTopic || undefined,
        front: (filterFront as Front) || undefined,
        search: search || undefined
      }),
      subjectService.getAll()
    ])
    setSummaries(sums)
    setSubjects(subs)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterSubject, filterTopic, filterFront, search])

  useEffect(() => {
    if (filterSubject) topicService.getBySubject(filterSubject).then(setTopics)
    else setTopics([])
    setFilterTopic('')
  }, [filterSubject])

  const handleSave = async (data: SummaryInsert) => {
    if (editingSummary) {
      await summaryService.update(editingSummary.id, data)
    } else {
      await summaryService.create(data)
    }
    setShowForm(false)
    setEditingSummary(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este resumo?')) return
    await summaryService.delete(id)
    load()
  }

  const inputClass = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
  const selectClass = `${inputClass} cursor-pointer`

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookCheck size={20} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-slate-100">Resumos</h2>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            {summaries.length}
          </span>
        </div>
        <button
          onClick={() => { setEditingSummary(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all"
        >
          <Plus size={15} />
          Novo Resumo
        </button>
      </div>

      {/* Formulário */}
      {(showForm || editingSummary) && (
        <div className="bg-slate-800/60 border border-white/8 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">
            {editingSummary ? 'Editar Resumo' : 'Novo Resumo'}
          </h3>
          <SummaryForm
            subjects={subjects}
            initial={editingSummary ?? { subject_id: initialSubjectId }}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingSummary(null) }}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className={`${inputClass} pl-8 w-full`}
            placeholder="Buscar resumos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className={selectClass} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">Todas as matérias</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={selectClass} value={filterTopic} onChange={e => setFilterTopic(e.target.value)} disabled={!filterSubject}>
          <option value="">Todos os assuntos</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className={selectClass} value={filterFront} onChange={e => setFilterFront(e.target.value as Front | '')}>
          <option value="">Todas as frentes</option>
          <option value="A">Frente A</option>
          <option value="B">Frente B</option>
          <option value="C">Frente C</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <BookCheck size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum resumo encontrado</p>
          <p className="text-xs mt-1">Crie seu primeiro resumo acima</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {summaries.map(summary => {
            const overdue = isOverdue(summary.next_review)
            return (
              <div
                key={summary.id}
                className="group relative bg-slate-800/50 border border-white/8 rounded-xl p-4 hover:border-white/15 hover:bg-slate-800/80 transition-all cursor-pointer"
                onClick={() => setViewingSummary(summary)}
              >
                {/* Badge revisão */}
                {overdue && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 border border-amber-500/25 rounded-full">
                    <Clock size={10} className="text-amber-400" />
                    <span className="text-xs text-amber-400 font-medium">Revisar</span>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start gap-2 mb-3 pr-16">
                  {summary.subject && (
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: summary.subject.color }}
                    />
                  )}
                  <h3 className="text-sm font-medium text-slate-200 leading-snug line-clamp-2">
                    {summary.title}
                  </h3>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {summary.subject && (
                    <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
                      {summary.subject.name}
                    </span>
                  )}
                  {summary.topic && (
                    <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">
                      {summary.topic.name}
                    </span>
                  )}
                  {summary.front && (
                    <span className={`text-xs px-2 py-0.5 rounded-md border ${FRONT_LABELS[summary.front].color}`}>
                      {FRONT_LABELS[summary.front].label}
                    </span>
                  )}
                </div>

                {/* Preview conteúdo */}
                {summary.content && (
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {summary.content.replace(/[#*`]/g, '')}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-slate-600">
                    <Calendar size={11} />
                    {formatDate(summary.created_at)}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setEditingSummary(summary); setShowForm(false) }}
                      className="p-1.5 rounded-md hover:bg-white/8 text-slate-500 hover:text-slate-300 transition-all"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(summary.id) }}
                      className="p-1.5 rounded-md hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de visualização */}
      {viewingSummary && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewingSummary(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100 pr-4">{viewingSummary.title}</h2>
              <button onClick={() => setViewingSummary(null)} className="text-slate-500 hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {viewingSummary.subject && (
                <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-md">{viewingSummary.subject.name}</span>
              )}
              {viewingSummary.topic && (
                <span className="text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-md">{viewingSummary.topic.name}</span>
              )}
              {viewingSummary.front && (
                <span className={`text-xs px-2 py-1 rounded-md border ${FRONT_LABELS[viewingSummary.front].color}`}>
                  {FRONT_LABELS[viewingSummary.front].label}
                </span>
              )}
            </div>
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap">
              {viewingSummary.content ?? 'Sem conteúdo'}
            </div>
            {(viewingSummary.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-white/5">
                {viewingSummary.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
