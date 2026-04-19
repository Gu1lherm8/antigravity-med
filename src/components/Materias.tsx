import React, { useState, useEffect } from 'react';
import {
  Plus, ChevronRight, Pencil, Trash2, BookOpen,
  Star, ArrowLeft, Save, X, CheckCircle2, AlertCircle, Layers,
  Calendar, Clock, Target, LayoutGrid, BookCheck, FileQuestion,
  BrainCircuit, GraduationCap, Microscope, FlaskConical, Zap,
  Calculator, Landmark, Globe, Users, BookMarked, Type, Languages
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Imports dos Módulos de Conteúdo (antes no ENEM) ──────────
import SummaryModule from './study/SummaryModule';
import QuestionModule from './study/QuestionModule';
import MaterialModule from './study/MaterialModule';
import SimulationModule from './study/SimulationModule';

// ─── Helper de ícone ─────────────────────────────────────────
function renderIcon(iconName: string) {
  if (!iconName) return '📚';
  if (iconName.length <= 4) return iconName;
  const IconComponent = (LucideIcons as any)[iconName];
  if (IconComponent) return <IconComponent className="w-8 h-8" />;
  return '📚';
}

const ICON_MAP: Record<string, React.ElementType> = {
  Microscope, FlaskConical, Zap, Calculator,
  Landmark, Globe, BookOpen, Users, BookMarked,
  Type, Languages
};

// ─── Tipos ────────────────────────────────────────────────────
interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  enem_weight: number;
  front_a?: string | null;
  front_b?: string | null;
  front_c?: string | null;
  topics?: Topic[];
}

interface Topic {
  id: string;
  subject_id: string;
  name: string;
  enem_relevance: number;
  notes: string;
  front?: 'A' | 'B' | 'C' | null;
  difficulty?: 'Fácil' | 'Médio' | 'Difícil';
  theory_status?: 'pendente' | 'concluida';
}

interface Lesson {
  id: string;
  subject_id: string;
  topic_id: string;
  title: string;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido';
  watched_at?: string;
}

interface StudySession {
  id: string;
  subject_id: string;
  topic_id?: string;
  lesson_id?: string;
  session_type: 'aula' | 'questoes' | 'revisao' | 'simulado' | 'global';
  total_questions: number;
  correct_answers: number;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  completed_at: string;
  next_revision_date?: string;
  is_revision_done: boolean;
}

// ─── Config de Frentes ────────────────────────────────────────
const FRONT_CONFIG = {
  A: { label: 'Frente A', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400', badge: 'emerald' },
  B: { label: 'Frente B', color: 'bg-amber-500/15 text-amber-400 border-amber-500/25', dot: 'bg-amber-400', badge: 'amber' },
  C: { label: 'Frente C', color: 'bg-rose-500/15 text-rose-400 border-rose-500/25', dot: 'bg-rose-400', badge: 'rose' },
};

// ─── Módulos disponíveis por matéria ─────────────────────────
const SUBJECT_MODULES = [
  { id: 'topics',      label: 'Tópicos',     icon: Layers,        color: '#6366f1' },
  { id: 'summaries',   label: 'Resumos',     icon: BookCheck,     color: '#3b82f6' },
  { id: 'questions',   label: 'Questões',    icon: FileQuestion,   color: '#10b981' },
  { id: 'materials',   label: 'Materiais',   icon: BrainCircuit,  color: '#8b5cf6' },
  { id: 'simulations', label: 'Simulados',   icon: GraduationCap, color: '#f59e0b' },
];

// ─── Paleta de Cores ─────────────────────────────────────────
const COLOR_OPTIONS = [
  { hex: '#E040FB', label: 'Rosa Shock' }, { hex: '#2196F3', label: 'Azul Elétrico' },
  { hex: '#00BCD4', label: 'Ciano Neônio' }, { hex: '#4CAF50', label: 'Verde Android' },
  { hex: '#FF9800', label: 'Laranja Solar' }, { hex: '#F44336', label: 'Vermelho Crítico' },
  { hex: '#9C27B0', label: 'Roxo Imperial' }, { hex: '#009688', label: 'Teal Oceano' },
  { hex: '#FFEB3B', label: 'Amarelo Ouro' }, { hex: '#795548', label: 'Marrom Café' },
  { hex: '#607D8B', label: 'Cinza Espacial' }, { hex: '#FF4081', label: 'Pink Neon' },
  { hex: '#CDDC39', label: 'Lima Ácida' }, { hex: '#FF5722', label: 'Laranja Deep' },
  { hex: '#673AB7', label: 'Roxo Profundo' }, { hex: '#3F51B5', label: 'Índigo Real' },
];

const ICON_OPTIONS = ['📚','🧬','⚗️','⚡','📐','🌍','📝','🎨','🏛️','🔬','💡','🌿'];

// ─── StarRating ───────────────────────────────────────────────
function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => !readonly && onChange?.(n)}
          className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          disabled={readonly}>
          <Star className={`w-4 h-4 ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`} />
        </button>
      ))}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border font-bold text-sm
      ${type === 'ok' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}>
      {type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

// ─── SubjectModal (COM campos de frentes) ────────────────────
function SubjectModal({ initial, onSave, onClose }: {
  initial?: Partial<Subject>;
  onSave: (data: Omit<Subject, 'id'>) => Promise<void>;
  onClose: () => void;
}) {
  const [name,    setName]    = useState(initial?.name   ?? '');
  const [icon,    setIcon]    = useState(initial?.icon   ?? '📚');
  const [color,   setColor]   = useState(initial?.color  ?? '#2196F3');
  const [weight,  setWeight]  = useState(initial?.enem_weight ?? 3);
  const [frontA,  setFrontA]  = useState(initial?.front_a ?? '');
  const [frontB,  setFrontB]  = useState(initial?.front_b ?? '');
  const [frontC,  setFrontC]  = useState(initial?.front_c ?? '');
  const [saving,  setSaving]  = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({
      name: name.trim(), icon, color, enem_weight: weight,
      front_a: frontA.trim() || null,
      front_b: frontB.trim() || null,
      front_c: frontC.trim() || null,
    });
    setSaving(false);
  }

  const inputCls = "bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-all w-full";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg p-8 flex flex-col gap-5 border-primary/20 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black">{initial?.id ? 'Editar Disciplina' : 'Nova Disciplina'}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
        </div>

        {/* Nome */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Nome da Disciplina</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Biologia, Química, Física..." className={inputCls} autoFocus />
        </div>

        {/* Ícone */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Ícone</label>
          <div className="flex gap-2 flex-wrap">
            {ICON_OPTIONS.map(ic => (
              <button key={ic} type="button" onClick={() => setIcon(ic)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all
                  ${icon === ic ? 'bg-primary/30 border border-primary scale-110' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        {/* Cor */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Cor do Card</label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map(c => (
              <button key={c.hex} type="button" onClick={() => setColor(c.hex)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c.hex ? 'scale-125 border-white' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: c.hex }} title={c.label} />
            ))}
          </div>
        </div>

        {/* Peso ENEM */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Relevância no ENEM</label>
          <StarRating value={weight} onChange={setWeight} />
        </div>

        {/* Frentes A/B/C */}
        <div className="flex flex-col gap-3 p-4 bg-white/3 border border-white/8 rounded-2xl">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-xs font-black text-primary uppercase tracking-widest">Divisão por Frentes de Estudo</span>
          </div>
          <p className="text-[10px] text-text-secondary leading-relaxed -mt-1">
            Divida a disciplina em grupos temáticos. O Cérebro Central usa isso para rotacionar automaticamente as frentes na sua semana.
          </p>
          
          <div className="flex flex-col gap-3">
            {/* Frente A */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-24 shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs font-black text-emerald-400">Frente A</span>
              </div>
              <input value={frontA} onChange={e => setFrontA(e.target.value)}
                placeholder="Ex: Citologia e Genética"
                className={inputCls} />
            </div>
            {/* Frente B */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-24 shrink-0">
                <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-xs font-black text-amber-400">Frente B</span>
              </div>
              <input value={frontB} onChange={e => setFrontB(e.target.value)}
                placeholder="Ex: Ecologia e Evolução (opcional)"
                className={inputCls} />
            </div>
            {/* Frente C */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-24 shrink-0">
                <div className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                <span className="text-xs font-black text-rose-400">Frente C</span>
              </div>
              <input value={frontC} onChange={e => setFrontC(e.target.value)}
                placeholder="Ex: Fisiologia Humana (opcional)"
                className={inputCls} />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={!name.trim() || saving}
          className="btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-40">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Disciplina'}
        </button>
      </div>
    </div>
  );
}

// ─── TopicModal ───────────────────────────────────────────────
function TopicModal({ subjectId, initial, onSave, onClose }: {
  subjectId: string;
  initial?: Partial<Topic>;
  onSave: (data: Omit<Topic, 'id'>) => Promise<void>;
  onClose: () => void;
}) {
  const [name,      setName]      = useState(initial?.name ?? '');
  const [relevance, setRelevance] = useState(initial?.enem_relevance ?? 3);
  const [notes,     setNotes]     = useState(initial?.notes ?? '');
  const [front,     setFront]     = useState<'A' | 'B' | 'C' | ''>((initial?.front as any) ?? '');
  const [saving,    setSaving]    = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ subject_id: subjectId, name: name.trim(), enem_relevance: relevance, notes: notes.trim(), front: front ? front as 'A'|'B'|'C' : null });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-8 flex flex-col gap-5 border-primary/20 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black">{initial?.id ? 'Editar Assunto' : 'Novo Assunto'}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Nome do Assunto</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Genética, Termodinâmica..."
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-all" autoFocus />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Frente de Estudo</label>
          <div className="flex gap-2">
            {(['A', 'B', 'C'] as const).map(f => {
              const fc = FRONT_CONFIG[f];
              return (
                <button key={f} type="button" onClick={() => setFront(front === f ? '' : f)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all border ${front === f ? fc.color : 'bg-white/5 text-text-secondary border-white/10 hover:bg-white/10'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mx-auto mb-1 ${fc.dot}`} />
                  Frente {f}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Relevância no ENEM</label>
          <StarRating value={relevance} onChange={setRelevance} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Anotações</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dicas ou observações..." rows={3}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-all resize-none" />
        </div>
        <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-40">
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Assunto'}
        </button>
      </div>
    </div>
  );
}

// ─── LessonModal ──────────────────────────────────────────────
function LessonModal({ subjectId, topicId, initial, onSave, onClose }: {
  subjectId: string; topicId: string;
  initial?: Partial<Lesson>;
  onSave: (data: Omit<Lesson, 'id'>) => Promise<void>;
  onClose: () => void;
}) {
  const [title,  setTitle]  = useState(initial?.title ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ subject_id: subjectId, topic_id: topicId, title: title.trim(), status: initial?.status ?? 'nao_iniciado' });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-8 flex flex-col gap-5 border-primary/20 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black">{initial?.id ? 'Editar Aula' : 'Nova Aula'}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Nome da Aula</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Introdução à Genética..."
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-all" autoFocus />
        </div>
        <button onClick={handleSave} disabled={!title.trim() || saving} className="btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-40">
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Aula'}
        </button>
      </div>
    </div>
  );
}

// ─── SessionModal ─────────────────────────────────────────────
function SessionModal({ type, subjectId, topicId, lessonId, onSave, onClose }: {
  type: 'aula' | 'questoes' | 'global';
  subjectId: string; topicId?: string; lessonId?: string;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [total,      setTotal]      = useState(0);
  const [correct,    setCorrect]    = useState(0);
  const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Médio');
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({
      subject_id: subjectId, topic_id: topicId, lesson_id: lessonId,
      session_type: type === 'aula' ? 'aula' : type === 'global' ? 'global' : 'questoes',
      total_questions: total, correct_answers: correct, difficulty,
      notes: notes.trim(),
      completed_at: new Date(date).toISOString(),
      next_revision_date: (() => { const d = new Date(date); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })()
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-8 flex flex-col gap-5 border-primary/20 mx-4">
        <h3 className="text-xl font-black">{type === 'aula' ? '📡 Registrar Aula' : '🎯 Registrar Rodada'}</h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{type === 'aula' ? 'Qual Aula?' : 'Qual Material?'}</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={type === 'aula' ? 'Ex: Aula 01 - Introdução' : 'Ex: Lista do Ferreto...'}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder:text-text-secondary/40" />
        </div>
        {type !== 'aula' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Acertos</label>
                <input type="number" value={correct} onChange={e => setCorrect(parseInt(e.target.value) || 0)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white text-center" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Total</label>
                <input type="number" value={total} onChange={e => setTotal(parseInt(e.target.value) || 0)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white text-center" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Dificuldade</label>
              <div className="flex gap-2">
                {['Fácil', 'Médio', 'Difícil'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d as any)}
                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${difficulty === d ? 'bg-primary text-white' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-[2] btn-primary">{saving ? 'Salvando...' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar de Navegação ─────────────────────────────────────
function MateriasNav({
  subjects, loading, activeSubjectId, activeModule,
  onNavigate, onAddSubject
}: {
  subjects: Subject[];
  loading: boolean;
  activeSubjectId?: string;
  activeModule: string;
  onNavigate: (module: string, subjectId?: string) => void;
  onAddSubject: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded(prev => prev === id ? null : id);
  }

  return (
    <aside className="w-60 shrink-0 border-r border-white/5 bg-[#080910] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-black text-text-secondary uppercase tracking-widest">Matérias</span>
          <button onClick={onAddSubject}
            className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-all">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 p-2 flex-1">
        {/* Dashboard geral */}
        <button
          onClick={() => onNavigate('grid')}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
            ${activeModule === 'grid' && !activeSubjectId ? 'bg-primary/15 text-primary' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span>Visão Geral</span>
        </button>

        <div className="h-px bg-white/5 my-1" />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : subjects.map(subject => {
          const Icon = ICON_MAP[subject.icon] ?? Layers;
          const isExpanded = expanded === subject.id;
          const isActive = activeSubjectId === subject.id;

          const fronts = [
            subject.front_a ? { key: 'A', label: subject.front_a } : null,
            subject.front_b ? { key: 'B', label: subject.front_b } : null,
            subject.front_c ? { key: 'C', label: subject.front_c } : null,
          ].filter(Boolean) as { key: string; label: string }[];

          return (
            <div key={subject.id}>
              <button
                onClick={() => toggle(subject.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                  ${isActive ? 'bg-white/8 text-white' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1 text-left truncate text-xs">{subject.name}</span>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="ml-5 mt-0.5 mb-1 flex flex-col border-l border-white/5 pl-2.5 gap-0.5">
                  {/* Frentes */}
                  {fronts.length > 0 && (
                    <>
                      <p className="text-[9px] text-text-secondary/50 px-1 pt-1 pb-0.5 font-semibold uppercase tracking-wider">Frentes</p>
                      {fronts.map(f => {
                        const fc = FRONT_CONFIG[f.key as 'A'|'B'|'C'];
                        return (
                          <div key={f.key} className="flex items-center gap-1.5 px-2 py-1 rounded-lg">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${fc.dot}`} />
                            <span className="text-[9px] font-bold text-text-secondary/60">{f.key}</span>
                            <span className="text-[9px] text-text-secondary/50 truncate">{f.label}</span>
                          </div>
                        );
                      })}
                      <div className="h-px bg-white/5 my-0.5" />
                    </>
                  )}

                  {/* Módulos */}
                  <p className="text-[9px] text-text-secondary/50 px-1 pt-0.5 pb-0.5 font-semibold uppercase tracking-wider">Módulos</p>
                  {SUBJECT_MODULES.map(mod => {
                    const ModIcon = mod.icon;
                    const isModActive = activeSubjectId === subject.id && activeModule === mod.id;
                    return (
                      <button key={mod.id}
                        onClick={() => onNavigate(mod.id, subject.id)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all
                          ${isModActive ? 'text-white' : 'text-text-secondary/60 hover:text-text-secondary hover:bg-white/5'}`}
                        style={isModActive ? { backgroundColor: mod.color + '22', color: mod.color } : {}}>
                        <ModIcon className="w-3 h-3 shrink-0" />
                        {mod.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ─── Componente Principal ─────────────────────────────────────
export function Materias() {
  const [subjects,     setSubjects]     = useState<Subject[]>([]);
  const [topics,       setTopics]       = useState<Topic[]>([]);
  const [lessons,      setLessons]      = useState<Lesson[]>([]);
  const [sessions,     setSessions]     = useState<StudySession[]>([]);
  const [loading,      setLoading]      = useState(true);

  // Navegação unificada
  const [activeModule,    setActiveModule]    = useState('grid');       // 'grid' | 'topics' | 'cockpit' | 'summaries' | 'questions' | 'materials' | 'simulations'
  const [activeSubjectId, setActiveSubjectId] = useState<string | undefined>();
  const [activeSubject,   setActiveSubject]   = useState<Subject | null>(null);
  const [activeTopic,     setActiveTopic]     = useState<Topic | null>(null);

  // Modais
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTopicModal,   setShowTopicModal]   = useState(false);
  const [showLessonModal,  setShowLessonModal]  = useState(false);
  const [editSubject,      setEditSubject]      = useState<Subject | undefined>();
  const [editTopic,        setEditTopic]        = useState<Topic | undefined>();
  const [editLesson,       setEditLesson]       = useState<Lesson | undefined>();
  const [showSessionModal, setShowSessionModal] = useState<{ open: boolean; type: 'aula' | 'questoes' | 'global' }>({ open: false, type: 'questoes' });
  const [toast,            setToast]            = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // Filtro de frente na vista de tópicos
  const [frontFilter, setFrontFilter] = useState<'A'|'B'|'C'|''>('');

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function navigate(module: string, subjectId?: string) {
    setActiveModule(module);
    setActiveSubjectId(subjectId);
    setActiveTopic(null);
    if (subjectId) {
      const sub = subjects.find(s => s.id === subjectId);
      setActiveSubject(sub ?? null);
      if (module === 'topics' || module === 'summaries' || module === 'questions' || module === 'materials' || module === 'simulations') {
        loadTopics(subjectId);
      }
    } else {
      setActiveSubject(null);
    }
  }

  // ── Loaders ─────────────────────────────────────────────────
  async function loadSubjects() {
    setLoading(true);
    const { data, error } = await supabase.from('subjects').select('*').order('name');
    if (error) showToast('Erro ao carregar disciplinas', 'err');
    else setSubjects(data ?? []);
    setLoading(false);
  }

  async function loadTopics(subjectId: string) {
    const { data } = await supabase.from('topics').select('*')
      .eq('subject_id', subjectId).order('enem_relevance', { ascending: false });
    setTopics(data ?? []);
  }

  async function loadLessons(topicId: string) {
    const { data } = await supabase.from('lessons').select('*')
      .eq('topic_id', topicId).order('order_index');
    setLessons(data ?? []);
  }

  async function loadSessions(topicId: string) {
    const { data } = await supabase.from('study_sessions').select('*')
      .eq('topic_id', topicId).order('completed_at', { ascending: false });
    setSessions(data ?? []);
  }

  useEffect(() => { loadSubjects(); }, []);

  // ── CRUD Disciplinas ─────────────────────────────────────────
  async function saveSubject(data: Omit<Subject, 'id'>) {
    if (editSubject?.id) {
      const { error } = await supabase.from('subjects').update(data).eq('id', editSubject.id);
      if (error) { showToast('Erro ao salvar', 'err'); return; }
      showToast('Disciplina atualizada!');
    } else {
      const { error } = await supabase.from('subjects').insert(data);
      if (error) { showToast('Erro ao criar disciplina', 'err'); return; }
      showToast('Disciplina criada!');
    }
    setShowSubjectModal(false);
    setEditSubject(undefined);
    await loadSubjects();
  }

  async function deleteSubject(id: string) {
    if (!confirm('Apagar esta disciplina e todos os seus tópicos?')) return;
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) { showToast('Erro ao apagar', 'err'); return; }
    showToast('Disciplina removida');
    if (activeSubjectId === id) navigate('grid');
    await loadSubjects();
  }

  // ── CRUD Tópicos ─────────────────────────────────────────────
  async function saveTopic(data: Omit<Topic, 'id'>) {
    if (editTopic?.id) {
      const { error } = await supabase.from('topics').update({
        name: data.name, enem_relevance: data.enem_relevance, notes: data.notes, front: data.front
      }).eq('id', editTopic.id);
      if (error) { showToast('Erro ao salvar', 'err'); return; }
      showToast('Tópico atualizado!');
    } else {
      const { error } = await supabase.from('topics').insert(data);
      if (error) { showToast('Tópico já existe ou erro ao criar', 'err'); return; }
      showToast('Tópico adicionado!');
    }
    setShowTopicModal(false);
    setEditTopic(undefined);
    if (activeSubjectId) await loadTopics(activeSubjectId);
  }

  async function deleteTopic(id: string) {
    if (!confirm('Apagar este tópico?')) return;
    await supabase.from('topics').delete().eq('id', id);
    showToast('Tópico removido');
    if (activeSubjectId) await loadTopics(activeSubjectId);
  }

  // ── CRUD Aulas ────────────────────────────────────────────────
  async function saveLesson(data: Omit<Lesson, 'id'>) {
    if (editLesson?.id) {
      const { error } = await supabase.from('lessons').update(data).eq('id', editLesson.id);
      if (error) { showToast('Erro ao salvar aula', 'err'); return; }
      showToast('Aula atualizada!');
    } else {
      const { error } = await supabase.from('lessons').insert(data);
      if (error) { showToast('Erro ao criar aula', 'err'); return; }
      showToast('Aula adicionada!');
    }
    setShowLessonModal(false);
    setEditLesson(undefined);
    if (activeTopic) await loadLessons(activeTopic.id);
  }

  async function deleteLesson(id: string) {
    if (!confirm('Apagar esta aula?')) return;
    await supabase.from('lessons').delete().eq('id', id);
    showToast('Aula removida');
    if (activeTopic) await loadLessons(activeTopic.id);
  }

  async function toggleLessonStatus(lesson: Lesson) {
    const map = { 'nao_iniciado': 'em_andamento', 'em_andamento': 'concluido', 'concluido': 'nao_iniciado' } as const;
    await supabase.from('lessons').update({ status: map[lesson.status] }).eq('id', lesson.id);
    if (activeTopic) await loadLessons(activeTopic.id);
  }

  async function saveSession(data: any) {
    const { error } = await supabase.from('study_sessions').insert(data);
    if (error) { showToast('Erro ao salvar', 'err'); return; }
    showToast('Reporte concluído!');
    if (activeTopic) loadSessions(activeTopic.id);
    setShowSessionModal({ ...showSessionModal, open: false });
  }

  async function deleteSession(id: string) {
    if (!confirm('Excluir esta rodada?')) return;
    await supabase.from('study_sessions').delete().eq('id', id);
    if (activeTopic) loadSessions(activeTopic.id);
    showToast('Rodada removida.');
  }

  const relevanceLabel = (n: number) => ['','Baixa','Baixa','Média','Alta','Muito Alta'][n] ?? '';

  // ── Filtro de tópicos por frente ──────────────────────────────
  const filteredTopics = frontFilter ? topics.filter(t => t.front === frontFilter) : topics;
  const topicsByFront = {
    A: topics.filter(t => t.front === 'A'),
    B: topics.filter(t => t.front === 'B'),
    C: topics.filter(t => t.front === 'C'),
    sem: topics.filter(t => !t.front),
  };

  // ═══════════════════════════════════════════════════════════════
  // LAYOUT PRINCIPAL — duas colunas (Sidebar + Conteúdo)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex bg-[#080910] border border-white/5 rounded-2xl overflow-hidden min-h-[800px] shadow-2xl -m-2">

      {/* Sidebar de navegação */}
      <MateriasNav
        subjects={subjects}
        loading={loading}
        activeSubjectId={activeSubjectId}
        activeModule={activeModule}
        onNavigate={navigate}
        onAddSubject={() => { setEditSubject(undefined); setShowSubjectModal(true); }}
      />

      {/* Área principal */}
      <main className="flex-1 overflow-y-auto bg-[#05060A] p-6 flex flex-col gap-6">

        {/* ── GRID de Disciplinas ─── */}
        {activeModule === 'grid' && (
          <div className="flex flex-col gap-6">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tighter">Base de Estudos ENEM</h2>
                <p className="text-text-secondary text-sm mt-0.5">Selecione uma disciplina para acessar tópicos, resumos, questões e simulados</p>
              </div>
              <button onClick={() => { setEditSubject(undefined); setShowSubjectModal(true); }}
                className="btn-primary flex items-center gap-2 py-2.5 px-5">
                <Plus className="w-4 h-4" /> Nova Disciplina
              </button>
            </header>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="glass-card p-20 flex flex-col items-center gap-6 text-center border-dashed">
                <div className="text-6xl">📚</div>
                <div>
                  <h3 className="text-2xl font-black mb-2">Nenhuma disciplina cadastrada</h3>
                  <p className="text-text-secondary text-sm max-w-sm">Clique em "Nova Disciplina" para começar.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map(subject => (
                  <div key={subject.id}
                    className="relative group rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl"
                    style={{ boxShadow: `0 4px 30px ${subject.color}22` }}
                    onClick={() => navigate('topics', subject.id)}>

                    <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(135deg, ${subject.color}, transparent)` }} />
                    <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: subject.color }} />

                    <div className="relative p-5 flex flex-col gap-3 bg-white/3 border border-white/8 rounded-2xl h-full">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: subject.color + '33' }}>
                          {renderIcon(subject.icon)}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setEditSubject(subject); setShowSubjectModal(true); }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteSubject(subject.id)}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 transition-all">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-text-primary">{subject.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StarRating value={subject.enem_weight} readonly />
                          <span className="text-[9px] text-text-secondary font-bold uppercase tracking-wider">ENEM</span>
                        </div>
                      </div>

                      {/* Frentes */}
                      {(subject.front_a || subject.front_b || subject.front_c) && (
                        <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                          {subject.front_a && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">A</span>
                              <span className="text-[10px] text-text-secondary truncate">{subject.front_a}</span>
                            </div>
                          )}
                          {subject.front_b && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">B</span>
                              <span className="text-[10px] text-text-secondary truncate">{subject.front_b}</span>
                            </div>
                          )}
                          {subject.front_c && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-1.5 py-0.5">C</span>
                              <span className="text-[10px] text-text-secondary truncate">{subject.front_c}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-auto">
                        <span className="text-xs text-text-secondary font-bold">Ver tópicos</span>
                        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" style={{ color: subject.color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TÓPICOS de uma disciplina ─── */}
        {activeModule === 'topics' && activeSubject && (
          <div className="flex flex-col gap-6">
            <header className="flex items-center gap-4">
              <button onClick={() => navigate('grid')}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: activeSubject.color + '33' }}>
                {renderIcon(activeSubject.icon)}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-black tracking-tighter">{activeSubject.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating value={activeSubject.enem_weight} readonly />
                  <span className="text-xs text-text-secondary">· {topics.length} tópicos</span>
                </div>
              </div>
              <button onClick={() => { setEditTopic(undefined); setShowTopicModal(true); }}
                className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm">
                <Plus className="w-3.5 h-3.5" /> Novo Tópico
              </button>
            </header>

            {/* Filtro por frente */}
            {(activeSubject.front_a || activeSubject.front_b || activeSubject.front_c) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">Filtrar:</span>
                <button onClick={() => setFrontFilter('')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all border ${frontFilter === '' ? 'bg-white/15 border-white/30 text-white' : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'}`}>
                  Todos
                </button>
                {(['A', 'B', 'C'] as const).map(f => {
                  const label = f === 'A' ? activeSubject.front_a : f === 'B' ? activeSubject.front_b : activeSubject.front_c;
                  if (!label) return null;
                  const fc = FRONT_CONFIG[f];
                  return (
                    <button key={f} onClick={() => setFrontFilter(frontFilter === f ? '' : f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all border ${frontFilter === f ? fc.color : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full inline-block mr-1.5 ${fc.dot}`} />
                      {f}: {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Lista de tópicos */}
            {topics.length === 0 ? (
              <div className="glass-card p-16 flex flex-col items-center gap-4 text-center border-dashed">
                <BookOpen className="w-12 h-12 text-text-secondary opacity-30" />
                <div>
                  <p className="font-black text-lg text-text-secondary">Nenhum tópico cadastrado</p>
                  <p className="text-sm text-text-secondary/60 mt-1">Clique em "Novo Tópico" para adicionar conteúdos.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredTopics.map(topic => {
                  const fc = topic.front ? FRONT_CONFIG[topic.front] : null;
                  return (
                    <div key={topic.id}
                      className="glass-card p-4 flex items-center gap-4 group hover:border-white/15 transition-all cursor-pointer"
                      style={{ borderLeftColor: activeSubject.color, borderLeftWidth: 3 }}
                      onClick={() => {
                        setActiveTopic(topic);
                        loadLessons(topic.id);
                        loadSessions(topic.id);
                        setActiveModule('cockpit');
                      }}>

                      <div className="flex flex-col items-center gap-1 shrink-0 w-14">
                        <StarRating value={topic.enem_relevance} readonly />
                        <span className="text-[8px] font-bold text-text-secondary uppercase">{relevanceLabel(topic.enem_relevance)}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-text-primary text-sm">
                            {topic.front ? `${topic.front}: ` : ''}{topic.name}
                          </p>
                          {fc && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${fc.color}`}>
                              {topic.front}
                            </span>
                          )}
                        </div>
                        {topic.notes && <p className="text-xs text-text-secondary mt-0.5 truncate">{topic.notes}</p>}
                      </div>

                      <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black border opacity-80"
                        style={{ backgroundColor: activeSubject.color + '22', borderColor: activeSubject.color + '44', color: activeSubject.color }}>
                        {topic.enem_relevance === 5 ? '🔥' : topic.enem_relevance === 4 ? '⭐' : topic.enem_relevance === 3 ? '📌' : '💤'}
                      </div>

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setEditTopic(topic); setShowTopicModal(true); }}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteTopic(topic.id)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── COCKPIT do assunto (aulas + sessões) ─── */}
        {activeModule === 'cockpit' && activeSubject && activeTopic && (
          <div className="flex flex-col gap-6">
            <header className="flex items-center gap-3">
              <button onClick={() => setActiveModule('topics')}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/10 text-text-secondary">{activeSubject.name}</span>
                  <ChevronRight className="w-3 h-3 text-text-secondary" />
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: activeSubject.color + '20', color: activeSubject.color }}>{activeTopic.name}</span>
                  {activeTopic.front && <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${FRONT_CONFIG[activeTopic.front].color}`}>Frente {activeTopic.front}</span>}
                </div>
                <h2 className="text-2xl font-black tracking-tighter mt-1">Cockpit do Assunto</h2>
              </div>
              <button onClick={() => { setEditLesson(undefined); setShowLessonModal(true); }}
                className="btn-primary ml-auto flex items-center gap-2 py-2 px-4 text-sm">
                <Plus className="w-3.5 h-3.5" /> Nova Aula
              </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Telemetria */}
              <div className="lg:col-span-1 glass-card p-5 flex flex-col gap-4">
                <div>
                  <h4 className="text-lg font-black">Telemetria</h4>
                  <p className="text-[9px] text-primary font-bold uppercase tracking-widest mt-0.5">Controle de Calibragem</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => setShowSessionModal({ open: true, type: 'aula' })}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-left">
                    <div className="p-1.5 bg-amber-500/20 rounded-lg text-amber-500"><Calendar className="w-4 h-4" /></div>
                    <div>
                      <p className="text-xs font-black text-white">Registrar Aula</p>
                      <p className="text-[8px] text-amber-500/60 font-bold uppercase">Marcar data assistida</p>
                    </div>
                  </button>
                  <button onClick={() => setShowSessionModal({ open: true, type: 'questoes' })}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-left">
                    <div className="p-1.5 bg-primary/20 rounded-lg text-primary"><Target className="w-4 h-4" /></div>
                    <div>
                      <p className="text-xs font-black text-white">Nova Rodada</p>
                      <p className="text-[8px] text-primary/60 font-bold uppercase">Registrar acertos/erros</p>
                    </div>
                  </button>
                </div>
                <div className="pt-3 border-t border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-text-secondary uppercase">Precisão Média</span>
                    <span className="text-base font-black text-white">
                      {sessions.filter(s => s.session_type === 'questoes').length > 0
                        ? Math.round(sessions.filter(s => s.session_type === 'questoes').reduce((acc, s) => acc + (s.correct_answers / s.total_questions), 0) / sessions.filter(s => s.session_type === 'questoes').length * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${sessions.filter(s => s.session_type === 'questoes').length > 0 ? Math.round(sessions.filter(s => s.session_type === 'questoes').reduce((acc, s) => acc + (s.correct_answers / s.total_questions), 0) / sessions.filter(s => s.session_type === 'questoes').length * 100) : 0}%` }} />
                  </div>
                </div>
              </div>

              {/* Log de Missões */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest">Log de Missões</h3>
                  <span className="text-[9px] text-white/40 font-bold uppercase">{sessions.length} entradas</span>
                </div>
                <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {sessions.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center opacity-30 italic text-sm">
                      Nenhuma atividade registrada.
                    </div>
                  ) : sessions.map(s => (
                    <div key={s.id} className="glass-card p-3 flex items-center gap-3 group hover:border-white/20 transition-all">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.session_type === 'aula' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'}`}>
                        {s.session_type === 'aula' ? <BookOpen className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">{s.session_type === 'aula' ? 'Aula Assistida' : 'Rodada'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${s.difficulty === 'Fácil' ? 'bg-emerald-500/20 text-emerald-400' : s.difficulty === 'Médio' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{s.difficulty}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[9px] text-text-secondary inline-flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{new Date(s.completed_at).toLocaleDateString()}</span>
                          {s.session_type !== 'aula' && <span className="text-[9px] text-primary font-black">{s.correct_answers}/{s.total_questions} ({Math.round(s.correct_answers / s.total_questions * 100)}%)</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteSession(s.id)} className="p-1.5 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-400/20 rounded-lg transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aulas */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-text-secondary">Lista de Aulas</h3>
              </div>
              {lessons.length === 0 ? (
                <div className="glass-card p-12 flex flex-col items-center gap-3 text-center border-dashed">
                  <Layers className="w-10 h-10 text-text-secondary opacity-30" />
                  <div>
                    <p className="font-black text-base text-text-secondary">Nenhuma aula cadastrada</p>
                    <p className="text-xs text-text-secondary/60 mt-1">Adicione as aulas deste assunto.</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {lessons.map(lesson => (
                    <div key={lesson.id}
                      className="glass-card p-4 flex items-center gap-4 group hover:border-white/15 transition-all"
                      style={{ borderLeftColor: lesson.status === 'concluido' ? '#10b981' : activeSubject.color, borderLeftWidth: 3 }}>
                      <button onClick={() => toggleLessonStatus(lesson)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${lesson.status === 'concluido' ? 'bg-emerald-500/20 text-emerald-400' : lesson.status === 'em_andamento' ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-white/20'}`}>
                        {lesson.status === 'concluido' ? <CheckCircle2 className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm ${lesson.status === 'concluido' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{lesson.title}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: lesson.status === 'concluido' ? '#10b981' : lesson.status === 'em_andamento' ? '#f59e0b' : '#94a3b8' }}>
                          {lesson.status.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditLesson(lesson); setShowLessonModal(true); }}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteLesson(lesson.id)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Módulos de Conteúdo (integrados do ENEM) ─── */}
        {activeModule === 'summaries'   && <div className="p-2"><SummaryModule   initialSubjectId={activeSubjectId} /></div>}
        {activeModule === 'questions'   && <div className="p-2"><QuestionModule  initialSubjectId={activeSubjectId} /></div>}
        {activeModule === 'materials'   && <div className="p-2"><MaterialModule  initialSubjectId={activeSubjectId} /></div>}
        {activeModule === 'simulations' && <div className="p-2"><SimulationModule /></div>}

      </main>

      {/* ── Modais globais ─── */}
      {showSubjectModal && (
        <SubjectModal
          initial={editSubject}
          onSave={saveSubject}
          onClose={() => { setShowSubjectModal(false); setEditSubject(undefined); }}
        />
      )}
      {showTopicModal && activeSubjectId && (
        <TopicModal
          subjectId={activeSubjectId}
          initial={editTopic}
          onSave={saveTopic}
          onClose={() => { setShowTopicModal(false); setEditTopic(undefined); }}
        />
      )}
      {showLessonModal && activeSubject && activeTopic && (
        <LessonModal
          subjectId={activeSubject.id}
          topicId={activeTopic.id}
          initial={editLesson}
          onSave={saveLesson}
          onClose={() => { setShowLessonModal(false); setEditLesson(undefined); }}
        />
      )}
      {showSessionModal.open && activeSubject && activeTopic && (
        <SessionModal
          type={showSessionModal.type}
          subjectId={activeSubject.id}
          topicId={activeTopic.id}
          onSave={saveSession}
          onClose={() => setShowSessionModal({ ...showSessionModal, open: false })}
        />
      )}
      {toast && <Toast {...toast} />}
    </div>
  );
}
