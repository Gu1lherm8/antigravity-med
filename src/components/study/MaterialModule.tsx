// ============================================================
// components/study/MaterialModule.tsx
// Biblioteca de materiais: mapas mentais, infográficos,
// apresentações (NotebookLM), eBooks e PDFs
// Stack: React + TypeScript + TailwindCSS + Lucide React
// ============================================================

import { useState, useEffect, useRef } from 'react'
import {
  BrainCircuit, Plus, Upload, Search, ExternalLink,
  Map, BarChart2, Presentation, BookOpenCheck,
  FileText, Puzzle, Pencil, Trash2, X, AlertCircle,
  Eye, Download
} from 'lucide-react'
import { materialService, subjectService, topicService, subtopicService } from '../../services/studyService'
import type { Material, MaterialInsert, MaterialType, Subject, Topic, Subtopic, Front } from '../../types/study'

// ── Config tipos ──────────────────────────────────────────────

export const MATERIAL_TYPES: Record<MaterialType, { label: string; icon: React.ElementType; color: string }> = {
  mind_map:     { label: 'Mapa Mental',    icon: Map,            color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  infographic:  { label: 'Infográfico',    icon: BarChart2,      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  presentation: { label: 'Apresentação',   icon: Presentation,   color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  ebook:        { label: 'eBook',          icon: BookOpenCheck,  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  pdf:          { label: 'PDF / Resumo',   icon: FileText,       color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  other:        { label: 'Outro',          icon: Puzzle,         color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
}

const FRONT_COLORS: Record<string, string> = {
  A: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  B: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  C: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
}

// ── Formulário ────────────────────────────────────────────────

interface MaterialFormProps {
  subjects: Subject[]
  initial?: Partial<MaterialInsert>
  onSave: (m: MaterialInsert) => Promise<void>
  onCancel: () => void
}

function MaterialForm({ subjects, initial, onSave, onCancel }: MaterialFormProps) {
  const [form, setForm] = useState<Partial<MaterialInsert>>({
    title: '',
    type: 'pdf',
    source: '',
    tags: [],
    ...initial
  })
  const [topics, setTopics] = useState<Topic[]>([])
  const [subtopics, setSubtopics] = useState<Subtopic[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof MaterialInsert, value: unknown) =>
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await materialService.uploadFile(file, form.type ?? 'materials')
      set('file_url', url)
      if (!form.title) set('title', file.name.replace(/\.[^.]+$/, ''))
    } catch (err: any) {
      console.error('Upload falhou:', err)
      setError(`Erro ao fazer upload do arquivo: ${err.message || 'Falha no servidor'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await materialService.uploadFile(file, 'thumbnails')
      set('thumbnail_url', url)
    } catch (err: any) {
      console.error('Upload de capa falhou:', err)
      setError(`Erro ao fazer upload da capa: ${err.message || 'Falha no servidor'}`)
    } finally {
      setUploading(false)
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
    if (!form.title?.trim()) { setError('Título é obrigatório'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave(form as MaterialInsert)
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = "w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-700 transition-all"
  const labelClass = "block text-xs font-medium text-slate-400 mb-1.5"
  const selectClass = `${inputClass} cursor-pointer [&>option]:bg-slate-800 [&>option]:text-slate-200`
  const TypeIcon = MATERIAL_TYPES[form.type ?? 'pdf']?.icon ?? FileText

  return (
    <div className="flex flex-col gap-5">

      {/* Tipo de material */}
      <div>
        <label className={labelClass}>Tipo de Material</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(MATERIAL_TYPES) as [MaterialType, typeof MATERIAL_TYPES[MaterialType]][]).map(([key, cfg]) => {
            const Icon = cfg.icon
            return (
              <button
                key={key}
                onClick={() => set('type', key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all
                  ${form.type === key
                    ? cfg.color + ' border-current'
                    : 'bg-white/3 border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
              >
                <Icon size={14} />
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Upload arquivo */}
      <div>
        <label className={labelClass}>Arquivo</label>
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/30 hover:bg-white/3 transition-all"
          >
            <Upload size={20} className="mx-auto mb-1.5 text-slate-500" />
            <p className="text-xs text-slate-400">{uploading ? 'Enviando...' : form.file_url ? '✓ Arquivo enviado' : 'Upload do arquivo'}</p>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
          </div>
          <div>
            <div
              onClick={() => thumbRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/30 hover:bg-white/3 transition-all h-full flex flex-col items-center justify-center"
            >
              {form.thumbnail_url ? (
                <img src={form.thumbnail_url} alt="Capa" className="h-12 object-contain rounded" />
              ) : (
                <>
                  <Upload size={16} className="mb-1 text-slate-500" />
                  <p className="text-xs text-slate-500">Capa (opcional)</p>
                </>
              )}
              <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={handleThumbUpload} />
            </div>
          </div>
        </div>
        {/* Ou link externo */}
        <div className="mt-2 flex items-center gap-2">
          <ExternalLink size={13} className="text-slate-500 flex-shrink-0" />
          <input
            className={inputClass}
            placeholder="Ou cole um link externo (Google Drive, Notion, etc.)..."
            value={form.file_url?.startsWith('http') ? form.file_url : ''}
            onChange={e => set('file_url', e.target.value)}
          />
        </div>
      </div>

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

      {/* Frente + Fonte */}
      <div className="grid grid-cols-2 gap-3">
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
          <label className={labelClass}>Origem</label>
          <input className={inputClass} placeholder="Ex: NotebookLM, Manual..." value={form.source ?? ''} onChange={e => set('source', e.target.value)} />
        </div>
      </div>

      {/* Título */}
      <div>
        <label className={labelClass}>Título *</label>
        <input className={inputClass} placeholder="Nome do material..." value={form.title ?? ''} onChange={e => set('title', e.target.value)} />
      </div>

      {/* Descrição */}
      <div>
        <label className={labelClass}>Descrição (opcional)</label>
        <textarea
          className={`${inputClass} resize-none`}
          placeholder="Breve descrição do conteúdo..."
          rows={2}
          value={form.description ?? ''}
          onChange={e => set('description', e.target.value)}
        />
      </div>

      {/* Tags */}
      <div>
        <label className={labelClass}>Tags</label>
        <div className="flex gap-2 mb-2">
          <input className={inputClass} placeholder="Adicionar tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} />
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
          disabled={saving || uploading}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
        >
          {saving ? 'Salvando...' : 'Salvar Material'}
        </button>
      </div>
    </div>
  )
}

// ── Card de material ───────────────────────────────────────────

function MaterialCard({ material, onEdit, onDelete }: { material: Material; onEdit: () => void; onDelete: () => void }) {
  const cfg = MATERIAL_TYPES[material.type]
  const Icon = cfg.icon

  const handleOpen = () => {
    if (material.file_url) window.open(material.file_url, '_blank')
  }

  return (
    <div className="group bg-slate-800/50 border border-white/8 rounded-xl overflow-hidden hover:border-white/15 transition-all">
      {/* Thumbnail ou placeholder */}
      <div
        className={`h-28 flex items-center justify-center cursor-pointer relative overflow-hidden
          ${material.thumbnail_url ? '' : 'bg-gradient-to-br from-slate-800 to-slate-900'}`}
        onClick={handleOpen}
      >
        {material.thumbnail_url ? (
          <img src={material.thumbnail_url} alt={material.title} className="w-full h-full object-cover" />
        ) : (
          <Icon size={36} className="opacity-20 text-white" />
        )}
        {material.file_url && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all">
            <ExternalLink size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        {/* Badge tipo */}
        <div className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${cfg.color}`}>
          <Icon size={10} />
          {cfg.label}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-slate-200 line-clamp-1 mb-1">{material.title}</h3>
        {material.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">{material.description}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          {material.subject && (
            <span className="text-xs bg-white/5 text-slate-500 px-1.5 py-0.5 rounded">{material.subject.name}</span>
          )}
          {material.topic && (
            <span className="text-xs bg-white/5 text-slate-500 px-1.5 py-0.5 rounded">{material.topic.name}</span>
          )}
          {material.front && (
            <span className={`text-xs px-1.5 py-0.5 rounded border ${FRONT_COLORS[material.front]}`}>
              F{material.front}
            </span>
          )}
          {material.source && (
            <span className="text-xs text-slate-600 bg-white/3 px-1.5 py-0.5 rounded">{material.source}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          {material.file_url ? (
            <button
              onClick={handleOpen}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ExternalLink size={11} />
              Abrir
            </button>
          ) : <span />}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1.5 rounded hover:bg-white/8 text-slate-500 hover:text-slate-300 transition-all">
              <Pencil size={12} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────

interface MaterialModuleProps {
  initialSubjectId?: string
}

export default function MaterialModule({ initialSubjectId }: MaterialModuleProps) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)

  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState(initialSubjectId ?? '')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterFront, setFilterFront] = useState('')

  const load = async () => {
    setLoading(true)
    const [mats, subs] = await Promise.all([
      materialService.getAll({
        subject_id: filterSubject || undefined,
        topic_id: filterTopic || undefined,
        type: filterType || undefined,
        front: (filterFront as Front) || undefined,
        search: search || undefined,
      }),
      subjectService.getAll()
    ])
    setMaterials(mats)
    setSubjects(subs)
    setLoading(false)
  }

  useEffect(() => { load() }, [filterSubject, filterTopic, filterType, filterFront, search])

  useEffect(() => {
    if (filterSubject) topicService.getBySubject(filterSubject).then(setTopics)
    else setTopics([])
    setFilterTopic('')
  }, [filterSubject])

  const handleSave = async (data: MaterialInsert) => {
    if (editingMaterial) await materialService.update(editingMaterial.id, data)
    else await materialService.create(data)
    setShowForm(false)
    setEditingMaterial(null)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este material?')) return
    await materialService.delete(id)
    load()
  }

  const inputClass = "bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all"
  const selectClass = `${inputClass} cursor-pointer [&>option]:bg-slate-800 [&>option]:text-slate-200`

  // Agrupar por tipo para exibição
  const grouped = materials.reduce<Record<string, Material[]>>((acc, m) => {
    acc[m.type] = acc[m.type] ?? []
    acc[m.type].push(m)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainCircuit size={20} className="text-indigo-400" />
          <h2 className="text-lg font-semibold text-slate-100">Materiais</h2>
          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{materials.length}</span>
        </div>
        <button
          onClick={() => { setEditingMaterial(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all"
        >
          <Plus size={15} />
          Novo Material
        </button>
      </div>

      {(showForm || editingMaterial) && (
        <div className="bg-slate-800/60 border border-white/8 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">
            {editingMaterial ? 'Editar Material' : 'Novo Material'}
          </h3>
          <MaterialForm
            subjects={subjects}
            initial={editingMaterial ?? { subject_id: initialSubjectId }}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingMaterial(null) }}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className={`${inputClass} pl-8 w-full`} placeholder="Buscar materiais..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={selectClass} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">Todas as matérias</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={selectClass} value={filterTopic} onChange={e => setFilterTopic(e.target.value)} disabled={!filterSubject}>
          <option value="">Todos os assuntos</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className={selectClass} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Todos os tipos</option>
          {Object.entries(MATERIAL_TYPES).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select className={selectClass} value={filterFront} onChange={e => setFilterFront(e.target.value)}>
          <option value="">Todas as frentes</option>
          <option value="A">Frente A</option>
          <option value="B">Frente B</option>
          <option value="C">Frente C</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <BrainCircuit size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum material cadastrado</p>
          <p className="text-xs mt-1">Adicione mapas mentais, infográficos, eBooks e mais</p>
        </div>
      ) : filterType ? (
        // Sem agrupamento quando filtrando por tipo
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {materials.map(m => (
            <MaterialCard key={m.id} material={m} onEdit={() => { setEditingMaterial(m); setShowForm(false) }} onDelete={() => handleDelete(m.id)} />
          ))}
        </div>
      ) : (
        // Agrupado por tipo
        <div className="flex flex-col gap-8">
          {(Object.entries(grouped) as [MaterialType, Material[]][]).map(([type, items]) => {
            const cfg = MATERIAL_TYPES[type]
            const Icon = cfg.icon
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon size={16} className={cfg.color.split(' ')[0]} />
                  <h3 className="text-sm font-semibold text-slate-300">{cfg.label}</h3>
                  <span className="text-xs text-slate-600">({items.length})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map(m => (
                    <MaterialCard key={m.id} material={m} onEdit={() => { setEditingMaterial(m); setShowForm(false) }} onDelete={() => handleDelete(m.id)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
