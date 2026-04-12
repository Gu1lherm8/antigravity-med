import React, { useState, useEffect } from 'react';
import {
  Plus, ChevronRight, Pencil, Trash2, BookOpen,
  Star, ArrowLeft, Save, X, CheckCircle2, AlertCircle, Layers,
  Calendar, Clock, Target
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Tipos ─────────────────────────────────────────────────────
interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  enem_weight: number;
  topics?: Topic[];
}

interface Topic {
  id: string;
  subject_id: string;
  name: string;
  enem_relevance: number;
  notes: string;
  // Dashboard Metrics (based on spreadsheet logic)
  difficulty?: 'Fácil' | 'Médio' | 'Difícil';
  theory_status?: 'pendente' | 'concluida';
  exercises_finished_at?: string;
  total_questions?: number;
  correct_answers?: number;
  revision_1_date?: string;
  revision_2_date?: string;
}

interface Lesson {
  id: string;
  subject_id: string;
  topic_id: string;
  title: string;
  status: 'nao_iniciado' | 'em_andamento' | 'concluido';
  watched_at?: string; // Data em que a aula foi assistida
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

// ─── Paleta de cores predefinidas ──────────────────────────────
const COLOR_OPTIONS = [
  { hex: '#E040FB', label: 'Rosa Shock'   },
  { hex: '#2196F3', label: 'Azul Elétrico' },
  { hex: '#00BCD4', label: 'Ciano Neônio'  },
  { hex: '#4CAF50', label: 'Verde Android' },
  { hex: '#FF9800', label: 'Laranja Solar' },
  { hex: '#F44336', label: 'Vermelho Crítico'},
  { hex: '#9C27B0', label: 'Roxo Imperial' },
  { hex: '#009688', label: 'Teal Oceano'   },
  { hex: '#FFEB3B', label: 'Amarelo Ouro'  },
  { hex: '#795548', label: 'Marrom Café'   },
  { hex: '#607D8B', label: 'Cinza Espacial'},
  { hex: '#FF4081', label: 'Pink Neon'     },
  { hex: '#CDDC39', label: 'Lima Ácida'   },
  { hex: '#FF5722', label: 'Laranja Deep'  },
  { hex: '#673AB7', label: 'Roxo Profundo' },
  { hex: '#3F51B5', label: 'Índigo Real'   },
];

const ICON_OPTIONS = ['📚','🧬','⚗️','⚡','📐','🌍','📝','🎨','🏛️','🔬','💡','🌿'];

// ─── Estrelinhas de Relevância ─────────────────────────────────
function StarRating({
  value, onChange, readonly = false
}: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => !readonly && onChange?.(n)}
          className={`transition-all ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          disabled={readonly}
        >
          <Star
            className={`w-4 h-4 ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Toast de feedback ─────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl
      border font-bold text-sm   
      ${type === 'ok'
        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
        : 'bg-red-500/20 border-red-500/40 text-red-400'
      }`}>
      {type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

// ─── Modal de cadastro ─────────────────────────────────────────
function SubjectModal({
  initial, onSave, onClose
}: {
  initial?: Partial<Subject>;
  onSave: (data: Omit<Subject, 'id'>) => Promise<void>;
  onClose: () => void;
}) {
  const [name,   setName]   = useState(initial?.name   ?? '');
  const [icon,   setIcon]   = useState(initial?.icon   ?? '📚');
  const [color,  setColor]  = useState(initial?.color  ?? '#2196F3');
  const [weight, setWeight] = useState(initial?.enem_weight ?? 3);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), icon, color, enem_weight: weight });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-8 flex flex-col gap-6 border-primary/20 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black">
            {initial?.id ? 'Editar Disciplina' : 'Nova Disciplina'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nome */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Nome da Disciplina</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Biologia, Química, Física..."
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold 
              text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-all"
            autoFocus
          />
        </div>

        {/* Ícone */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Ícone</label>
          <div className="flex gap-2 flex-wrap">
            {ICON_OPTIONS.map(ic => (
              <button
                key={ic}
                type="button"
                onClick={() => setIcon(ic)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all
                  ${icon === ic ? 'bg-primary/30 border border-primary scale-110' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
              >
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
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                className={`w-8 h-8 rounded-full border-2 transition-all
                  ${color === c.hex ? 'scale-125 border-white' : 'border-transparent hover:scale-110'}`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Peso ENEM */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">
            Relevância Geral no ENEM
          </label>
          <StarRating value={weight} onChange={setWeight} />
          <p className="text-[10px] text-text-secondary">
            Quanto essa matéria aparece no ENEM (5 = muito frequente)
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Disciplina'}
        </button>
      </div>
    </div>
  );
}

// ─── Modal de assunto (Tópico) ─────────────────────────────
function TopicModal({
  subjectId, initial, onSave, onClose
}: {
  subjectId: string;
  initial?: Partial<Topic>;
  onSave: (data: Omit<Topic, 'id'>) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [relevance, setRelevance] = useState(initial?.enem_relevance ?? 3);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ subject_id: subjectId, name: name.trim(), enem_relevance: relevance, notes: notes.trim() });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-8 flex flex-col gap-6 border-primary/20 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black">{initial?.id ? 'Editar Assunto' : 'Novo Assunto'}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-all"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Nome do Assunto</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Genética, Termodinâmica..." className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-all" autoFocus />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Relevância no ENEM</label>
          <StarRating value={relevance} onChange={setRelevance} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Anotações</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dicas ou observações..." rows={3} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-all resize-none" />
        </div>
        <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-40">
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Assunto'}
        </button>
      </div>
    </div>
  );
}

// ─── Modal de aula ───────────────────────────────────────────
function LessonModal({
  subjectId, topicId, initial, onSave, onClose
}: {
  subjectId: string;
  topicId: string;
  initial?: Partial<Lesson>;
  onSave: (data: Omit<Lesson, 'id'>) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ 
      subject_id: subjectId, 
      topic_id: topicId, 
      title: title.trim(), 
      status: initial?.status ?? 'nao_iniciado' 
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-8 flex flex-col gap-6 border-primary/20 mx-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black">{initial?.id ? 'Editar Aula' : 'Nova Aula'}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Nome da Aula</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Introdução à Genética, Mendelismo..."
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold 
              text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-primary/50 transition-all"
            autoFocus
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Aula'}
        </button>
      </div>
    </div>
  );
}

// ─── Modal de Sessão (Rodada ou Aula) ────────────────────────
function SessionModal({
  type, subjectId, topicId, lessonId, onSave, onClose
}: {
  type: 'aula' | 'questoes' | 'global';
  subjectId: string;
  topicId?: string;
  lessonId?: string;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}) {
  const [total,      setTotal]      = useState(0);
  const [correct,    setCorrect]    = useState(0);
  const [difficulty, setDifficulty] = useState<'Fácil' | 'Médio' | 'Difícil'>('Médio');
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [saving,     setSaving]     = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({
      subject_id: subjectId,
      topic_id: topicId,
      lesson_id: lessonId,
      session_type: type === 'aula' ? 'aula' : type === 'global' ? 'global' : 'questoes',
      total_questions: total,
      correct_answers: correct,
      difficulty,
      completed_at: new Date(date).toISOString(),
      next_revision_date: calculateNextRevision(date)
    });
    setSaving(false);
  }

  function calculateNextRevision(baseDate: string) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7); // Padrão Inicial D+7
    return d.toISOString().split('T')[0];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md p-8 flex flex-col gap-6 border-primary/20 mx-4">
        <h3 className="text-xl font-black">
          {type === 'aula' ? '📡 Registrar Data da Aula' : '🎯 Registrar de Rodada'}
        </h3>
        
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Data da Realização</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white" />
        </div>

        {type !== 'aula' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Acertos</label>
                <input type="number" value={total} onChange={e => setTotal(parseInt(e.target.value) || 0)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white text-center" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Total</label>
                <input type="number" value={correct} onChange={e => setCorrect(parseInt(e.target.value) || 0)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white text-center" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Dificuldade Sentida</label>
              <div className="flex gap-2">
                {['Fácil', 'Médio', 'Difícil'].map(d => (
                  <button key={d} onClick={() => setDifficulty(d as any)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${difficulty === d ? 'bg-primary text-white' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-[2] btn-primary">{saving ? 'Salvando...' : 'Confirmar Reporte'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────
export function Materias() {
  const [subjects,     setSubjects]     = useState<Subject[]>([]);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [activeTopic,   setActiveTopic]   = useState<Topic | null>(null);
  const [topics,       setTopics]       = useState<Topic[]>([]);
  const [lessons,      setLessons]      = useState<Lesson[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showTopicModal,   setShowTopicModal]   = useState(false);
  const [showLessonModal,  setShowLessonModal]  = useState(false);
  const [editSubject,  setEditSubject]  = useState<Subject | undefined>();
  const [editTopic,    setEditTopic]    = useState<Topic   | undefined>();
  const [editLesson,   setEditLesson]   = useState<Lesson  | undefined>();
  const [sessions,     setSessions]     = useState<StudySession[]>([]);
  const [showSessionModal, setShowSessionModal] = useState<{ open: boolean, type: 'aula' | 'questoes' | 'global', lessonId?: string }>({ open: false, type: 'questoes' });
  const [toast,        setToast]        = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Carrega disciplinas ──────────────────────────────────────
  async function loadSubjects() {
    setLoading(true);
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    if (error) { showToast('Erro ao carregar disciplinas', 'err'); }
    else setSubjects(data ?? []);
    setLoading(false);
  }

  // ── Carrega tópicos de uma disciplina ────────────────────────
  async function loadTopics(subjectId: string) {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('subject_id', subjectId)
      .order('enem_relevance', { ascending: false });
    if (error) showToast('Erro ao carregar tópicos', 'err');
    else setTopics(data ?? []);
  }

  // ── Carrega aulas de um tópico ───────────────────────────────
  async function loadLessons(topicId: string) {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('topic_id', topicId)
      .order('order_index');
    if (error) showToast('Erro ao carregar aulas', 'err');
    else setLessons(data ?? []);
  }

  useEffect(() => { loadSubjects(); }, []);
  useEffect(() => {
    if (activeSubject) {
      loadTopics(activeSubject.id);
      setActiveTopic(null);
    }
  }, [activeSubject]);

  useEffect(() => {
    if (activeTopic) {
      loadLessons(activeTopic.id);
      loadSessions(activeTopic.id);
    }
  }, [activeTopic]);

  async function loadSessions(topicId: string) {
    const { data } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('topic_id', topicId)
      .order('completed_at', { ascending: false });
    
    setSessions(data || []);
  }

  async function saveSession(data: any) {
    const { error } = await supabase.from('study_sessions').insert(data);
    if (error) {
      showToast('Erro ao salvar no banco. Tente novamente.', 'err');
      console.error(error);
    } else {
      showToast('Reporte de Missão concluído!');
      if (activeTopic) loadSessions(activeTopic.id);
      setShowSessionModal({ ...showSessionModal, open: false });
    }
  }

  async function deleteSession(id: string) {
    if (!confirm('Excluir esta rodada do histórico?')) return;
    await supabase.from('study_sessions').delete().eq('id', id);
    if (activeTopic) loadSessions(activeTopic.id);
    showToast('Rodada removida.');
  }



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
    if (activeSubject?.id === id) setActiveSubject(null);
    await loadSubjects();
  }

  // ── CRUD Tópicos ─────────────────────────────────────────────
  async function saveTopic(data: Omit<Topic, 'id'>) {
    if (editTopic?.id) {
      const { error } = await supabase.from('topics').update({
        name: data.name, enem_relevance: data.enem_relevance, notes: data.notes
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
    if (activeSubject) await loadTopics(activeSubject.id);
  }

  async function deleteTopic(id: string) {
    if (!confirm('Apagar este tópico?')) return;
    await supabase.from('topics').delete().eq('id', id);
    showToast('Tópico removido');
    if (activeSubject) await loadTopics(activeSubject.id);
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
    const nextStatusMap = {
      'nao_iniciado': 'em_andamento',
      'em_andamento': 'concluido',
      'concluido': 'nao_iniciado'
    } as const;
    const nextStatus = nextStatusMap[lesson.status];
    await supabase.from('lessons').update({ status: nextStatus }).eq('id', lesson.id);
    if (activeTopic) await loadLessons(activeTopic.id);
  }

  // ── Relevância em estrelas visuais ───────────────────────────
  const relevanceLabel = (n: number) => ['','Baixa','Baixa','Média','Alta','Muito Alta'][n] ?? '';

  // ═══════════════════════════════════════════════════════════════
  // RENDER — Vista de Aulas (dentro de um tópico)
  // ═══════════════════════════════════════════════════════════════
  if (activeSubject && activeTopic) {
    return (
      <div className="flex flex-col gap-8">
        <header className="flex items-center gap-4">
          <button
            onClick={() => setActiveTopic(null)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/10 text-text-secondary">{activeSubject.name}</span>
              <ChevronRight className="w-3 h-3 text-text-secondary" />
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: activeSubject.color + '20', color: activeSubject.color }}>{activeTopic.name}</span>
            </div>
            <h2 className="text-3xl font-black tracking-tighter mt-1">Cockpit do Assunto</h2>
          </div>
          <button
            onClick={() => { setEditLesson(undefined); setShowLessonModal(true); }}
            className="btn-primary ml-auto flex items-center gap-2 py-3 px-6"
          >
            <Plus className="w-4 h-4" />
            Nova Aula
          </button>
        </header>

        {/* 🚀 DASHBOARD DO COCKPIT EVOLUÍDO (Multi-Rodadas) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lado Esquerdo: Resumo e Ações */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="glass-card p-6 flex flex-col gap-6">
              <div>
                <h4 className="text-xl font-black text-white">Telemetria</h4>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-1 text-primary">Controle de Calibragem</p>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setShowSessionModal({ open: true, type: 'aula' })}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-left"
                >
                  <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500"><Calendar className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-white">Registrar Aula</p>
                    <p className="text-[9px] text-amber-500/60 font-bold uppercase">Marcar data assistida</p>
                  </div>
                </button>

                <button 
                  onClick={() => setShowSessionModal({ open: true, type: 'questoes' })}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all text-left"
                >
                  <div className="p-2 bg-primary/20 rounded-xl text-primary"><Target className="w-5 h-5" /></div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-white">Nova Rodada</p>
                    <p className="text-[9px] text-primary/60 font-bold uppercase">Cadastrar acertos/erros</p>
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-text-secondary uppercase">Precisão Média</span>
                  <span className="text-lg font-black text-white">
                    {sessions.filter(s => s.session_type === 'questoes').length > 0 
                      ? Math.round(sessions.filter(s => s.session_type === 'questoes').reduce((acc, s) => acc + (s.correct_answers/s.total_questions), 0) / sessions.filter(s => s.session_type === 'questoes').length * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary" 
                    style={{ width: `${sessions.filter(s => s.session_type === 'questoes').length > 0 ? Math.round(sessions.filter(s => s.session_type === 'questoes').reduce((acc, s) => acc + (s.correct_answers/s.total_questions), 0) / sessions.filter(s => s.session_type === 'questoes').length * 100) : 0}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lado Direito: Histórico de Rodadas */}
          <div className="lg:col-span-2 flex flex-col gap-4">
             <div className="flex items-center justify-between mb-2">
               <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest">Log de Missões (Histórico)</h3>
               <span className="text-[10px] text-white/40 font-bold uppercase">{sessions.length} Entradas</span>
             </div>

             <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
               {sessions.length === 0 ? (
                 <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center opacity-30 italic text-sm">
                   Nenhuma atividade registrada para este assunto.
                 </div>
               ) : (
                 sessions.map((s, idx) => (
                   <div key={s.id} className="glass-card p-4 flex items-center gap-4 group hover:border-white/20 transition-all">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.session_type === 'aula' ? 'bg-amber-500/20 text-amber-500' : 'bg-primary/20 text-primary'}`}>
                       {s.session_type === 'aula' ? <BookOpen className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                     </div>
                     <div className="flex-1">
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-black text-white">{s.session_type === 'aula' ? 'Aula Assistida' : 'Rodada de Exercícios'}</span>
                         <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${s.difficulty === 'Fácil' ? 'bg-emerald-500/20 text-emerald-400' : s.difficulty === 'Médio' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                           {s.difficulty}
                         </span>
                       </div>
                       <div className="flex items-center gap-4 mt-1">
                         <span className="text-[10px] text-text-secondary font-bold inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(s.completed_at).toLocaleDateString()}</span>
                         {s.session_type !== 'aula' && (
                           <span className="text-[10px] text-primary font-black uppercase tracking-widest">{s.correct_answers}/{s.total_questions} Acertos ({Math.round(s.correct_answers/s.total_questions*100)}%)</span>
                         )}
                       </div>
                     </div>
                     <button onClick={() => deleteSession(s.id)} className="p-2 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-400/20 rounded-lg transition-all">
                       <Trash2 className="w-4 h-4" />
                     </button>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary">Lista de Aulas</h3>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest text-text-secondary">Lista de Aulas</h3>
        </div>

        {lessons.length === 0 ? (
          <div className="glass-card p-16 flex flex-col items-center gap-4 text-center border-dashed">
            <Layers className="w-12 h-12 text-text-secondary opacity-30" />
            <div>
              <p className="font-black text-lg text-text-secondary">Nenhuma aula cadastrada</p>
              <p className="text-sm text-text-secondary/60 mt-1">Adicione as aulas deste assunto para organizar seu estudo.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lessons.map(lesson => (
              <div
                key={lesson.id}
                className="glass-card p-5 flex items-center gap-5 group hover:border-white/15 transition-all"
                style={{ borderLeftColor: lesson.status === 'concluido' ? '#10b981' : activeSubject.color, borderLeftWidth: 3 }}
              >
                <button
                  onClick={() => toggleLessonStatus(lesson)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    lesson.status === 'concluido' ? 'bg-emerald-500/20 text-emerald-400' : 
                    lesson.status === 'em_andamento' ? 'bg-amber-500/20 text-amber-500' : 'bg-white/5 text-white/20'
                  }`}
                >
                  {lesson.status === 'concluido' ? <CheckCircle2 className="w-6 h-6" /> : <BookOpen className="w-6 h-6" />}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`font-black ${lesson.status === 'concluido' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                    {lesson.title}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: lesson.status === 'concluido' ? '#10b981' : lesson.status === 'em_andamento' ? '#f59e0b' : '#94a3b8' }}>
                    {lesson.status.replace(/_/g, ' ')}
                  </p>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => { setEditLesson(lesson); setShowLessonModal(true); }}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteLesson(lesson.id)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showLessonModal && (
          <LessonModal
            subjectId={activeSubject.id}
            topicId={activeTopic.id}
            initial={editLesson}
            onSave={saveLesson}
            onClose={() => { setShowLessonModal(false); setEditLesson(undefined); }}
          />
        )}
        {showSessionModal.open && (
          <SessionModal
            type={showSessionModal.type}
            subjectId={activeSubject.id}
            topicId={activeTopic.id}
            lessonId={showSessionModal.lessonId}
            onSave={saveSession}
            onClose={() => setShowSessionModal({ ...showSessionModal, open: false })}
          />
        )}
        {toast && <Toast {...toast} />}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER — Vista de Tópicos (dentro de uma disciplina)
  // ═══════════════════════════════════════════════════════════════
  if (activeSubject) {
    return (
      <div className="flex flex-col gap-8">

        {/* Cabeçalho */}
        <header className="flex items-center gap-4">
          <button
            onClick={() => setActiveSubject(null)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: activeSubject.color + '33' }}
          >
            {activeSubject.icon}
          </div>
          <div>
            <h2 className="text-3xl font-black tracking-tighter">{activeSubject.name}</h2>
            <div className="flex items-center gap-3 mt-0.5">
              <StarRating value={activeSubject.enem_weight} readonly />
              <span className="text-xs text-text-secondary font-bold">Peso ENEM</span>
              <span className="text-xs text-text-secondary">·</span>
              <span className="text-xs text-text-secondary font-bold">{topics.length} tópicos</span>
            </div>
          </div>
          <button
            onClick={() => { setEditTopic(undefined); setShowTopicModal(true); }}
            className="btn-primary ml-auto flex items-center gap-2 py-3 px-6"
          >
            <Plus className="w-4 h-4" />
            Novo Tópico
          </button>
        </header>

        {/* Lista de Tópicos */}
        {topics.length === 0 ? (
          <div className="glass-card p-16 flex flex-col items-center gap-4 text-center border-dashed">
            <BookOpen className="w-12 h-12 text-text-secondary opacity-30" />
            <div>
              <p className="font-black text-lg text-text-secondary">Nenhum tópico cadastrado</p>
              <p className="text-sm text-text-secondary/60 mt-1">
                Clique em "Novo Tópico" para adicionar Genética, Citologia, etc.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {topics.map(topic => (
              <div
                key={topic.id}
                className="glass-card p-5 flex items-center gap-5 group hover:border-white/15 transition-all cursor-pointer"
                style={{ borderLeftColor: activeSubject.color, borderLeftWidth: 3 }}
                onClick={() => setActiveTopic(topic)}
              >
                {/* Relevância */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0 w-16">
                  <StarRating value={topic.enem_relevance} readonly />
                  <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">
                    {relevanceLabel(topic.enem_relevance)}
                  </span>
                </div>

                {/* Nome e notas */}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-text-primary">{topic.name}</p>
                  {topic.notes && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{topic.notes}</p>
                  )}
                </div>

                {/* Badge de relevância */}
                <div
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border"
                  style={{
                    backgroundColor: activeSubject.color + '22',
                    borderColor: activeSubject.color + '44',
                    color: activeSubject.color,
                  }}
                >
                  {topic.enem_relevance === 5 ? '🔥 Cai Todo Ano' :
                   topic.enem_relevance === 4 ? '⭐ Frequente' :
                   topic.enem_relevance === 3 ? '📌 Moderado' :
                   topic.enem_relevance === 2 ? '💤 Raro' : '❄️ Muito Raro'}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditTopic(topic); setShowTopicModal(true); }}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dica de integração */}
        {topics.length > 0 && (
          <div className="flex items-start gap-3 p-5 bg-primary/5 border border-primary/15 rounded-2xl">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm font-black text-primary mb-1">Como o Receituário usa esses tópicos</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                Quando você errar questões de <strong className="text-text-primary">{activeSubject.name}</strong> no Quiz,
                o Receituário vai priorizar os tópicos com <strong className="text-text-primary">maior relevância ENEM</strong> primeiro.
                Tópicos com 5⭐ entram na prescrição antes dos com 3⭐.
              </p>
            </div>
          </div>
        )}

        {/* Modais */}
        {showTopicModal && (
          <TopicModal
            subjectId={activeSubject.id}
            initial={editTopic}
            onSave={saveTopic}
            onClose={() => { setShowTopicModal(false); setEditTopic(undefined); }}
          />
        )}
        {toast && <Toast {...toast} />}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER — Vista Grid de Disciplinas
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-8">

      {/* Cabeçalho */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter">Matérias</h2>
            <p className="text-text-secondary text-sm mt-0.5">
              Cadastre suas disciplinas e tópicos · O Receituário usa esses dados
            </p>
          </div>
        </div>
        <button
          onClick={() => { setEditSubject(undefined); setShowSubjectModal(true); }}
          className="btn-primary flex items-center gap-2 py-3 px-6"
        >
          <Plus className="w-4 h-4" />
          Nova Disciplina
        </button>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Grid vazio */}
      {!loading && subjects.length === 0 && (
        <div className="glass-card p-20 flex flex-col items-center gap-6 text-center border-dashed">
          <div className="text-6xl">📚</div>
          <div>
            <h3 className="text-2xl font-black mb-2">Nenhuma disciplina cadastrada</h3>
            <p className="text-text-secondary text-sm max-w-sm leading-relaxed">
              Clique em <strong>"Nova Disciplina"</strong> para adicionar Biologia, Química, etc.
              Depois adicione os tópicos dentro de cada uma.
            </p>
          </div>
          <button
            onClick={() => { setEditSubject(undefined); setShowSubjectModal(true); }}
            className="btn-primary flex items-center gap-2 py-3 px-8 mt-2"
          >
            <Plus className="w-4 h-4" />
            Criar primeira disciplina
          </button>
        </div>
      )}

      {/* Grid de cards */}
      {!loading && subjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {subjects.map(subject => (
            <div
              key={subject.id}
              className="relative group rounded-3xl overflow-hidden cursor-pointer transition-all 
                hover:scale-[1.02] hover:shadow-2xl"
              style={{ boxShadow: `0 4px 30px ${subject.color}22` }}
              onClick={() => setActiveSubject(subject)}
            >
              {/* Fundo degradê */}
              <div
                className="absolute inset-0 opacity-20"
                style={{ background: `linear-gradient(135deg, ${subject.color}, transparent)` }}
              />

              {/* Borda colorida no topo */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: subject.color }} />

              <div className="relative p-6 flex flex-col gap-4 bg-white/3 border border-white/8 rounded-3xl">
                {/* Ícone + ações */}
                <div className="flex items-start justify-between">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ backgroundColor: subject.color + '33' }}
                  >
                    {subject.icon}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={e => { e.stopPropagation(); setEditSubject(subject); setShowSubjectModal(true); }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteSubject(subject.id); }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Nome */}
                <div>
                  <h3 className="text-lg font-black text-text-primary">{subject.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating value={subject.enem_weight} readonly />
                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">ENEM</span>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="flex items-center justify-between pt-2 border-t border-white/8">
                  <span className="text-xs text-text-secondary font-bold">Ver tópicos</span>
                  <ChevronRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    style={{ color: subject.color }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dica geral */}
      {!loading && subjects.length > 0 && (
        <div className="flex items-start gap-3 p-5 bg-white/3 border border-white/5 rounded-2xl">
          <span className="text-xl">🎯</span>
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="text-text-primary font-black">Como o Receituário usa isso:</span>{' '}
            Quando você erra questões no Quiz, o {' '}
            <span className="text-primary font-bold">DecisionEngine</span> multiplica o score pelo peso
            da matéria (estrelinhas) e pela relevância do tópico.
            Isso garante que você estuda primeiro o que <strong className="text-text-primary">mais cai no ENEM</strong>.
          </p>
        </div>
      )}

      {/* Modais */}
      {showSubjectModal && (
        <SubjectModal
          initial={editSubject}
          onSave={saveSubject}
          onClose={() => { setShowSubjectModal(false); setEditSubject(undefined); }}
        />
      )}
      {toast && <Toast {...toast} />}
    </div>
  );
}
