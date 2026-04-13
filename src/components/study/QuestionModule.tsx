// ============================================================
// components/study/QuestionModule.tsx
// Cadastro (manual + imagem/PDF) e listagem de questões
// Stack: React + TypeScript + TailwindCSS + Lucide React
// ============================================================

import { useState, useEffect, useRef } from 'react'
import {
  Plus, Search, FileQuestion, Upload, Image,
  X, Pencil, Trash2, CheckCircle, XCircle,
  ChevronDown, ChevronUp, AlertCircle, Eye
} from 'lucide-react'
import { questionService, subjectService, topicService, subtopicService } from '../../services/studyService'
import type { Question, QuestionInsert, QuestionOption, Subject, Topic, Subtopic, Front, Difficulty } from '../../types/study'

// ── Config ────────────────────────────────────────────────────

const FRONT_COLORS: Record<Front, string> = {
  A: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  B: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  C: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string }> = {
  easy:   { label: 'Fácil',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  medium: { label: 'Médio',  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  hard:   { label: 'Difícil',color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
}

const OPTION_IDS = ['A', 'B', 'C', 'D', 'E']

// ── Formulário ────────────────────────────────────────────────

interface QuestionFormProps {
  subjects: Subject[]
  initial?: Partial<QuestionInsert>
  onSave: (q: QuestionInsert) => Promise<void>
  onCancel: () => void
}

function QuestionForm({ subjects, initial, onSave, onCancel }: QuestionFormProps) {
  const [form, setForm] = useState<Partial<QuestionInsert>>({
    statement: '',
    options: OPTION_IDS.map(id => ({ id, text: '' })),
    correct_option: '',
    explanation: '',
    source_type: 'manual',
    tags: [],
    ...initial
  })
  const [topics, setTopics] = useState<Topic[]>([])
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const imageRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof QuestionInsert, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }))

  useEffect(() => {
    if (form.subject_id) {
      topicService.getBySubject(form.subject_id).then(setTopics)
      set('topic_id', undefined)
    }
  }, [form.subject_id])

  useEffect(() => {
    if (form.topic_id) {
      subtopicService.getByTopic(form.topic_id).then(setSubtopics)
      set('subtopic_id', undefined)
    }
  }, [form.topic_id])

  const updateOption = (index: number, text: string) => {
    const opts = [...(form.options ?? [])]
    opts[index] = { ...opts[index], text }
    set('options', opts)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const url = await questionService.uploadImage(file)
      set('image_url', url)
      set('source_type', 'image')
    } catch {
      setError('Erro ao fazer upload da imagem')
    } finally {
      setUploadingImage(false)
    }
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags?.includes(tag)) {
      set('tags', [...(form.tags ?? []), tag])
      setTagInput('')
    }
  }

  const handleSubmit = async () => {
    if (!form.statement?.trim()) { setError('Enunciado é obrigatório'); return }
    if (!form.correct_option)    { setError('Marque a alternativa correta'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave(form as QuestionInsert)
    } catch {
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

      {/* Tipo */}
      <div className="flex gap-2">
        {(['manual', 'image'] as const).map(type => (
          <button
            key={type}
            onClick={() => set('source_type', type)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all
              ${form.source_type === type
                ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                : 'bg-white/3 border-white/10 text-slate-400 hover:text-slate-200'}`}
          >
            {type === 'manual' ? <FileQuestion size={14} /> : <Image size={14} />}
            {type === 'manual' ? 'Digitar questão' : 'Upload imagem'}
          </button>
        ))}
      </div>

      {/* Upload de imagem da questão */}
      {form.source_type === 'image' && (
        <div>
          <div
            onClick={() => imageRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500/30 hover:bg-white/3 transition-all"
          >
            {form.image_url ? (
              <img src={form.image_url} alt="Questão" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <>
                <Image size={24} className="mx-auto mb-2 text-slate-500" />
                <p className="text-sm text-slate-400">
                  {uploadingImage ? 'Enviando...' : 'Clique para selecionar imagem da questão'}
                </p>
                <p className="text-xs text-slate-600 mt-1">PNG, JPG, WEBP</p>
              </>
            )}
            <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Após o upload, preencha o enunciado e alternativas manualmente abaixo.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Matéria</label>
          <select className={selectClass} value={form.subject_id ?? ''} onChange={e => set('subject_id', e.target.value || undefined)}>
            <option value="">— Selecione —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Assunto</label>
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

      {/* Frente + Dificuldade + Fonte */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Frente</label>
          <select className={selectClass} value={form.front ?? ''} onChange={e => set('front', e.target.value || undefined)}>
            <option value="">—</option>
            <option value="A">Frente A</option>
            <option value="B">Frente B</option>
            <option value="C">Frente C</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Dificuldade</label>
          <select className={selectClass} value={form.difficulty ?? ''} onChange={e => set('difficulty', e.target.value || undefined)}>
            <option value="">—</option>
            <option value="easy">Fácil</option>
            <option value="medium">Médio</option>
            <option value="hard">Difícil</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Fonte / Ano</label>
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Ex: ENEM 2023" value={form.source ?? ''} onChange={e => set('source', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Enunciado */}
      <div>
        <label className={labelClass}>Enunciado *</label>
        <textarea
          className={`${inputClass} min-h-[100px] resize-y`}
          placeholder="Digite o enunciado da questão..."
          value={form.statement ?? ''}
          onChange={e => set('statement', e.target.value)}
        />
      </div>

      {/* Alternativas */}
      <div>
        <label className={labelClass}>Alternativas</label>
        <div className="flex flex-col gap-2">
          {(form.options ?? []).map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-2">
              <button
                onClick={() => set('correct_option', opt.id)}
                className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border-2 transition-all
                  ${form.correct_option === opt.id
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-white/15 text-slate-500 hover:border-emerald-500/50'}`}
              >
                {opt.id}
              </button>
              <input
                className={inputClass}
                placeholder={`Alternativa ${opt.id}...`}
                value={opt.text}
                onChange={e => updateOption(i, e.target.value)}
              />
            </div>
          ))}
        </div>
        {form.correct_option && (
          <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle size={12} />
            Alternativa correta: {form.correct_option}
          </p>
        )}
      </div>

      {/* Resolução */}
      <div>
        <label className={labelClass}>Resolução / Comentário (opcional)</label>
        <textarea
          className={`${inputClass} min-h-[80px] resize-y`}
          placeholder="Explique a resolução da questão..."
          value={form.explanation ?? ''}
          onChange={e => set('explanation', e.target.value)}
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
          <button onClick={addTag} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-slate-200 transition-all">
            <Plus size={14} />
          </button>
        </div>
        {(form.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.tags!.map(tag => (
              <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-400">
                {tag}
                <button onClick={() => set('tags', form.tags?.filter(t => t !== tag))}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancelar</button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
        >
          {saving ? 'Salvando...' : 'Salvar Questão'}
        </button>
      </div>
    </div>
  )
}

// ── Card de questão ───────────────────────────────────────────

function QuestionCard({ question, onEdit, onDelete }: { question: Question; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [answered, setAnswered] = useState<string | null>(null)

  return (
    <div className="group bg-slate-800/50 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
      {/* Meta */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {question.subject && (
          <span className="text-xs px-2 py-0.5 bg-white/5 rounded-md text-slate-400">{question.subject.name}</span>
        )}
        {question.topic && (
          <span className="text-xs px-2 py-0.5 bg-white/5 rounded-md text-slate-400">{question.topic.name}</span>
        )}
        {question.front && (
          <span className={`text-xs px-2 py-0.5 rounded-md border ${FRONT_COLORS[question.front]}`}>
            Frente {question.front}
          </span>
        )}
        {question.difficulty && (
          <span className={`text-xs px-2 py-0.5 rounded-md border ${DIFFICULTY_CONFIG[question.difficulty].color}`}>
            {DIFFICULTY_CONFIG[question.difficulty].label}
          </span>
        )}
        {question.source && (
          <span className="text-xs text-slate-600 ml-auto">{question.source}</span>
        )}
      </div>

      {/* Imagem */}
      {question.image_url && (
        <img src={question.image_url} alt="Questão" className="w-full max-h-48 object-contain rounded-lg mb-3 bg-white/5" />
      )}

      {/* Enunciado */}
      <p className={`text-sm text-slate-300 leading-relaxed mb-3 ${!expanded ? 'line-clamp-3' : ''}`}>
        {question.statement}
      </p>

      {/* Alternativas (só quando expandido) */}
      {expanded && question.options && (
        <div className="flex flex-col gap-2 mb-3">
          {question.options.map(opt => {
            const isCorrect = opt.id === question.correct_option
            const isChosen = opt.id === answered
            return (
              <button
                key={opt.id}
                onClick={() => setAnswered(opt.id)}
                disabled={!!answered}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all
                  ${answered
                    ? isCorrect
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isChosen
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-white/3 border-white/8 text-slate-500'
                    : 'bg-white/3 border-white/8 text-slate-300 hover:bg-white/6 hover:border-white/15'}`}
              >
                <span className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border
                  ${answered && isCorrect ? 'border-emerald-500 text-emerald-400' :
                    answered && isChosen ? 'border-rose-500 text-rose-400' :
                    'border-white/20 text-slate-400'}`}>
                  {opt.id}
                </span>
                {opt.text}
                {answered && isCorrect && <CheckCircle size={14} className="ml-auto text-emerald-400 flex-shrink-0" />}
                {answered && isChosen && !isCorrect && <XCircle size={14} className="ml-auto text-rose-400 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Resolução */}
      {expanded && answered && question.explanation && (
        <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-lg p-3 mb-3">
          <p className="text-xs font-medium text-indigo-400 mb-1">Resolução</p>
          <p className="text-sm text-slate-300">{question.explanation}</p>
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center justify-between mt-2">
        <button
          onClick={() => { setExpanded(e => !e); setAnswered(null) }}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Recolher' : 'Responder'}
        </button>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-white/8 text-slate-500 hover:text-slate-300 transition-all">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────

interface QuestionModuleProps {
  initialSubjectId?: string
}

export default function QuestionModule({ initialSubjectId }: QuestionModuleProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState(initialSubjectId ?? '')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterFront, setFilterFront] = useState<Front | ''>('')
  const [filterDifficulty, setFilterDifficulty] = useState('')

  const load = async () => {
    setLoading(true)
    const [qs, subs] = await Promise.all([
      questionService.getAll({
        subject_id: filterSubject || undefined,
        topic_id: filterTopic || undefined,
        front: (filterFront as Front) || undefined,
        difficulty: filterDifficulty || undefined,
        search: search || undefined,
      }),
      subjectService.getAll()
    ])
    setQuestions(qs)
    setSubjects(subs)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterSubject, filterTopic, filterFront, filterDifficulty, search])
  useEffect(() => {
    if (filterSubject) topicService.getBySubject(filterSubject).then(setTopics)
    else setTopics([])
    setFilterTopic('')
  }, [filterSubject])

  const handleSave = async (data: QuestionInsert) => {
    if (editingQuestion) await questionService.update(editingQuestion.id, data)
    else await questionService.create(data)
    setShowForm(false)
    setEditingQuestion(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta questão?')) return
    await questionService.delete(id)
    load()
  }

  const inputClass = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
  const selectClass = `${inputClass} cursor-pointer`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileQuestion size={20} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-slate-100">Questões</h2>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{questions.length}</span>
        </div>
        <button
          onClick={() => { setEditingQuestion(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all"
        >
          <Plus size={15} />
          Nova Questão
        </button>
      </div>

      {(showForm || editingQuestion) && (
        <div className="bg-slate-800/60 border border-white/8 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">
            {editingQuestion ? 'Editar Questão' : 'Nova Questão'}
          </h3>
          <QuestionForm
            subjects={subjects}
            initial={editingQuestion ?? { subject_id: initialSubjectId }}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingQuestion(null) }}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className={`${inputClass} pl-8 w-full`} placeholder="Buscar questões..." value={search} onChange={e => setSearch(e.target.value)} />
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
        <select className={selectClass} value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
          <option value="">Todas as dificuldades</option>
          <option value="easy">Fácil</option>
          <option value="medium">Médio</option>
          <option value="hard">Difícil</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FileQuestion size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma questão encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {questions.map(q => (
            <QuestionCard
              key={q.id}
              question={q}
              onEdit={() => { setEditingQuestion(q); setShowForm(false) }}
              onDelete={() => handleDelete(q.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
