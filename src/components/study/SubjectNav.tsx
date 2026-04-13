// ============================================================
// components/study/SubjectNav.tsx
// Navegação principal: matérias + frentes A/B/C
// Stack: React + TypeScript + TailwindCSS + Lucide React
// ============================================================

import { useState, useEffect } from 'react'
import {
  Microscope, FlaskConical, Zap, Calculator,
  Landmark, Globe, BookOpen, Users, BookMarked,
  Type, Languages, ChevronRight, LayoutGrid,
  BookCheck, FileQuestion, BrainCircuit, GraduationCap,
  Layers
} from 'lucide-react'
import { subjectService } from '../../services/studyService'
import type { Subject } from '../../types/study'

// ── Mapa de ícones ────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Microscope, FlaskConical, Zap, Calculator,
  Landmark, Globe, BookOpen, Users, BookMarked,
  Type, Languages
}

// ── Frentes ───────────────────────────────────────────────────

const FRONT_CONFIG = {
  A: { label: 'Frente A', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  B: { label: 'Frente B', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  C: { label: 'Frente C', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-400' },
}

// ── Módulos do app por matéria ─────────────────────────────────

const SUBJECT_MODULES = [
  { id: 'summaries',  label: 'Resumos',      icon: BookCheck },
  { id: 'questions',  label: 'Questões',     icon: FileQuestion },
  { id: 'materials',  label: 'Materiais',    icon: BrainCircuit },
  { id: 'simulations',label: 'Simulados',    icon: GraduationCap },
]

// ── Props ─────────────────────────────────────────────────────

interface SubjectNavProps {
  onNavigate: (module: string, subjectId?: string, front?: string) => void
  activeModule?: string
  activeSubjectId?: string
}

// ── Componente ────────────────────────────────────────────────

export default function SubjectNav({ onNavigate, activeModule, activeSubjectId }: SubjectNavProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    subjectService.getAll().then(data => {
      setSubjects(data)
      setLoading(false)
    })
  }, [])

  const toggleSubject = (id: string) => {
    setExpandedSubject(prev => prev === id ? null : id)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col gap-1 p-2">

      {/* Visão geral */}
      <button
        onClick={() => onNavigate('dashboard')}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
          ${activeModule === 'dashboard'
            ? 'bg-indigo-500/15 text-indigo-400'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
      >
        <LayoutGrid size={16} />
        Dashboard geral
      </button>

      <div className="h-px bg-white/5 my-1" />

      {/* Lista de matérias */}
      <p className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Matérias
      </p>

      {subjects.map(subject => {
        const Icon = ICON_MAP[subject.icon ?? ''] ?? Layers
        const isExpanded = expandedSubject === subject.id
        const isActive = activeSubjectId === subject.id

        return (
          <div key={subject.id}>
            {/* Cabeçalho da matéria */}
            <button
              onClick={() => toggleSubject(subject.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                ${isActive
                  ? 'bg-white/8 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              {/* Dot colorido */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: subject.color }}
              />
              <Icon size={15} className="flex-shrink-0" />
              <span className="flex-1 text-left truncate">{subject.name}</span>
              <ChevronRight
                size={14}
                className={`flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>

            {/* Expandido: frentes + módulos */}
            {isExpanded && (
              <div className="ml-5 mt-1 mb-1 flex flex-col gap-0.5 border-l border-white/5 pl-3">

                {/* Frentes */}
                <p className="text-xs text-slate-600 px-1 py-1 font-medium">Frentes de Estudo</p>
                {(['A', 'B', 'C'] as const).map(front => {
                  const fc = FRONT_CONFIG[front]
                  const label = front === 'A'
                    ? subject.front_a
                    : front === 'B'
                    ? subject.front_b
                    : subject.front_c
                  return (
                    <button
                      key={front}
                      onClick={() => onNavigate('front', subject.id, front)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all
                        ${activeModule === 'front' && activeSubjectId === subject.id
                          ? 'bg-white/5 text-slate-200'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${fc.dot}`} />
                      <span className="font-medium text-slate-400">{fc.label}</span>
                      {label && (
                        <span className="truncate text-slate-600" title={label}>
                          — {label}
                        </span>
                      )}
                    </button>
                  )
                })}

                <div className="h-px bg-white/5 my-1" />

                {/* Módulos por matéria */}
                <p className="text-xs text-slate-600 px-1 py-1 font-medium">Módulos</p>
                {SUBJECT_MODULES.map(mod => {
                  const ModIcon = mod.icon
                  return (
                    <button
                      key={mod.id}
                      onClick={() => onNavigate(mod.id, subject.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all
                        ${activeModule === mod.id && activeSubjectId === subject.id
                          ? 'bg-indigo-500/10 text-indigo-400'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                    >
                      <ModIcon size={13} />
                      {mod.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
