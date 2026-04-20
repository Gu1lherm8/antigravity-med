import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Edit3, Clock,
  BookOpen, HelpCircle, RotateCcw, Layers, Palette, Trash2,
  Settings, AlertTriangle, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cerebroEngine } from '../services/cerebroService';
import { spacedRepetitionService, type SpacedReviewRecord } from '../services/spaced-repetition.service';
import { useCalendarCriticalReviews, utiCalendarIntegration } from '../services/uti-calendar-integration';
import { eventBus, APP_EVENTS } from '../services/eventBus';

interface UserPreferences {
  hours_per_day: number;
  days_per_week: number;
  intensity: 'Leve' | 'Moderada' | 'Hardcore';
}

interface ScheduleEntry {
  id: string;
  day_of_week: number;
  activity_type: string;
  title: string;
  subject_name: string;
  duration_minutes: number;
  start_time: string;
  color: string;
  status: string;
  notes: string;
  week_start: string;
}

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const DIAS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const parseLocalDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const CORES = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f43f5e',
  '#d946ef', '#0ea5e9', '#14b8a6', '#f97316', '#fbbf24'
];

const TIPO_CONFIG: Record<string, { label: string; emoji: string; cor: string }> = {
  aula:      { label: 'Aula',      emoji: '📚', cor: '#3b82f6' },
  questoes:  { label: 'Questões',  emoji: '📝', cor: '#10b981' },
  revisao:   { label: 'Revisão',   emoji: '🔄', cor: '#f59e0b' },
  flashcard: { label: 'Flashcard', emoji: '🃏', cor: '#8b5cf6' },
  estudo:    { label: 'Estudo',    emoji: '🎯', cor: '#6366f1' },
};

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface ModalEntry {
  id?: string;
  day_of_week: number;
  title: string;
  activity_type: string;
  subject_name: string;
  duration_minutes: number;
  start_time: string;
  color: string;
  notes: string;
}

export function CalendarioSemanal() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalEntry | null>(null);
  const [selected, setSelected] = useState<ScheduleEntry | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences>({ hours_per_day: 4, days_per_week: 5, intensity: 'Moderada' });
  const [pendingReviews, setPendingReviews] = useState<SpacedReviewRecord[]>([]);

  const { criticalReviews } = useCalendarCriticalReviews();

  useEffect(() => { 
    loadEntries(); 
    loadPreferences();
  }, [weekStart]);

  // 🔔 Escuta o evento do Cérebro: quando salva, recarrega preferências
  useEffect(() => {
    const unsub = eventBus.on(APP_EVENTS.SETTINGS_UPDATED, () => {
      loadPreferences();
    });
    return unsub;
  }, []);

  async function loadPreferences() {
    const { data } = await supabase.from('user_study_preferences').select('*').single();
    if (data) setPrefs(data);
  }

  async function savePreferences(newPrefs: UserPreferences) {
    const { error } = await supabase.from('user_study_preferences').upsert({ 
      ...newPrefs, 
      updated_at: new Date().toISOString() 
    });
    if (!error) {
      setPrefs(newPrefs);
      setShowSettings(false);
    }
  }

  async function loadEntries() {
    setLoading(true);
    // 1. Buscar entradas do cronograma fixo
    const { data: scheduleData } = await supabase
      .from('weekly_schedule')
      .select('*')
      .eq('week_start', weekStart)
      .order('start_time');
    
    setEntries(scheduleData || []);

    // 2. Buscar revisões pendentes (SM2)
    try {
      const overdue = await spacedRepetitionService.getOverdueReviews();
      const todayReviews = await spacedRepetitionService.getReviewsDueToday();
      setPendingReviews([...overdue, ...todayReviews]);
    } catch (e) {
      console.warn('⚠️ Erro ao carregar revisões SM2:', e);
    }

    setLoading(false);
  }

  function prevWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split('T')[0]);
  }

  function nextWeek() {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split('T')[0]);
  }

  function openAdd(day: number) {
    setModal({
      day_of_week: day,
      title: '',
      activity_type: 'aula',
      subject_name: '',
      duration_minutes: 60,
      start_time: '08:00',
      color: '#6366f1',
      notes: '',
    });
  }

  async function saveEntry() {
    if (!modal || !modal.title.trim()) return;
    if (modal.id) {
      await supabase.from('weekly_schedule').update({ ...modal }).eq('id', modal.id);
    } else {
      await supabase.from('weekly_schedule').insert({ ...modal, week_start: weekStart, status: 'pendente' });
    }
    setModal(null);
    setSelected(null);
    await loadEntries();
  }

  async function deleteEntry(id: string) {
    await supabase.from('weekly_schedule').delete().eq('id', id);
    setSelected(null);
    await loadEntries();
  }

  async function toggleStatus(entry: ScheduleEntry) {
    const next = entry.status === 'concluido' ? 'pendente' : 'concluido';
    await supabase.from('weekly_schedule').update({ status: next }).eq('id', entry.id);
    await loadEntries();
  }

  async function apagarSemana() {
    if (!confirm('🛑 ATENÇÃO: Isso apagará TODOS os compromissos desta semana. Deseja continuar?')) return;
    await supabase.from('weekly_schedule').delete().eq('week_start', weekStart);
    await loadEntries();
  }

  async function gerarSemanaV2() {
    setLoading(true);
    try {
      // 1. Limpa a semana atual para evitar duplicidade
      await supabase.from('weekly_schedule').delete().eq('week_start', weekStart);

      // 2. Gera o plano pelo Cérebro Central (Elite Engine)
      const weekEntries = await cerebroEngine.generateWeeklyPlan(weekStart);

      if (!weekEntries || weekEntries.length === 0) {
        alert('Cérebro: Não consegui gerar planos. Verifique suas metas e matérias!');
        setLoading(false);
        return;
      }

      // 3. Persiste no banco
      const { error } = await supabase.from('weekly_schedule').insert(weekEntries);
      
      if (error) throw error;

      await loadEntries();
      alert('🚀 Cronograma de Elite Gerado com Sucesso!');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar cronograma: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = parseLocalDate(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="flex flex-col gap-6   ">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white">🗓️ Calendário Semanal</h2>
          <p className="text-text-secondary mt-1">Organize e visualize sua semana de estudos</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={apagarSemana} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20" title="Apagar Semana">
            <Trash2 className="w-5 h-5" />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl bg-white/5 text-text-secondary hover:text-white transition-all border border-white/10">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={gerarSemanaV2} disabled={loading} className="btn-primary text-sm flex items-center gap-2 py-2 px-4">
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
            {loading ? 'Sincronizando...' : 'Gerar Semana V2'}
          </button>
          <div className="flex items-center gap-2 glass-card px-4 py-2">
            <button onClick={prevWeek} className="hover:text-white text-text-secondary transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-white min-w-[140px] text-center">
              {parseLocalDate(weekStart).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — {(() => {
                const d = parseLocalDate(weekStart);
                d.setDate(d.getDate() + 6);
                return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
              })()}
            </span>
            <button onClick={nextWeek} className="hover:text-white text-text-secondary transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {criticalReviews && criticalReviews.length > 0 && (
        <div className="mb-4 mt-2 p-4 rounded-xl border border-red-500 bg-red-500/10">
          <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5"/>
            🚨 Revisões Críticas da U.T.I.
          </h3>
          <div className="flex flex-col gap-2">
            {criticalReviews.map(review => (
              <div
                key={review.id}
                dangerouslySetInnerHTML={{
                  __html: utiCalendarIntegration.getBadgeHTML(review)
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-3">
        {semana.map((dia, idx) => {
          const isHoje = dia.toDateString() === new Date().toDateString();
          const entriesDoDia = entries.filter(e => e.day_of_week === idx);

          return (
            <div key={idx} className={`flex flex-col gap-2 min-h-[280px] rounded-2xl p-3 border transition-all ${
              isHoje ? 'border-primary/40 bg-primary/5' : 'border-white/5 bg-white/[0.02]'
            }`}>
              <div className="flex flex-col items-center pb-2 border-b border-white/10">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{DIAS[idx]}</span>
                <span className={`text-lg font-black mt-0.5 ${isHoje ? 'text-primary' : 'text-white'}`}>
                  {dia.getDate()}
                </span>
                {isHoje && <span className="text-[9px] font-black text-primary uppercase tracking-widest">Hoje</span>}
                {/* Indicador de Revisão Pura (SM2) */}
                {pendingReviews.some(r => {
                  const rDate = new Date(r.nextReviewDate);
                  rDate.setHours(0,0,0,0);
                  const dDate = new Date(dia);
                  dDate.setHours(0,0,0,0);
                  return rDate.getTime() === dDate.getTime() || (isHoje && rDate < dDate);
                }) && (
                  <div className="flex items-center gap-1 mt-1 bg-red-500/20 px-1.5 py-0.5 rounded-full border border-red-500/30">
                    <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                    <span className="text-[8px] font-black text-red-400 uppercase">Revisão</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                {entriesDoDia.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => setSelected(entry)}
                    className={`w-full text-left rounded-lg px-2 py-1.5 transition-all hover:brightness-110     ${
                      entry.status === 'concluido' ? 'opacity-50' : ''
                    }`}
                    style={{ backgroundColor: entry.color + '25', borderLeft: `3px solid ${entry.color}` }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[10px] shrink-0">{TIPO_CONFIG[entry.activity_type]?.emoji || '📌'}</span>
                        <span className="text-[10px] font-bold text-white truncate">{entry.title}</span>
                      </div>
                      <Trash2 className="w-3 h-3 text-white/20 hover:text-red-400 transition-colors shrink-0" onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }} />
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2 h-2 text-white/50" />
                      <span className="text-[9px] text-white/50">{entry.start_time?.slice(0,5)} • {entry.duration_minutes}min</span>
                    </div>
                    {entry.status === 'concluido' && <Check className="w-2.5 h-2.5 text-emerald-400 mt-0.5" />}
                  </button>
                ))}
              </div>

              <button
                onClick={() => openAdd(idx)}
                className="flex items-center justify-center gap-1 py-1.5 rounded-xl border border-dashed border-white/10 text-text-secondary hover:border-primary/30 hover:text-primary transition-all text-xs"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">Legenda:</span>
        {Object.entries(TIPO_CONFIG).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: val.cor }} />
            <span className="text-xs text-text-secondary">{val.emoji} {val.label}</span>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4   " onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} className="glass-card p-6 w-full max-w-md    ">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center text-xl" style={{ backgroundColor: selected.color + '30' }}>
                  {TIPO_CONFIG[selected.activity_type]?.emoji || '📌'}
                </div>
                <h3 className="text-xl font-black text-white">{selected.title}</h3>
                <p className="text-text-secondary text-sm">{DIAS_FULL[selected.day_of_week]} • {selected.start_time?.slice(0,5)} • {selected.duration_minutes}min</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-text-secondary hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>
            {selected.subject_name && <p className="text-sm text-text-secondary mb-4">📖 {selected.subject_name}</p>}
            {selected.notes && <p className="text-sm text-white/70 mb-4">{selected.notes}</p>}
            <div className="flex gap-3">
              <button onClick={() => toggleStatus(selected)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${selected.status === 'concluido' ? 'bg-white/10 text-white' : 'bg-emerald-500 text-white'}`}>
                <Check className="w-4 h-4" /> {selected.status === 'concluido' ? 'Reabrir' : 'Concluir'}
              </button>
              <button onClick={() => { setModal({ ...selected }); setSelected(null); }} className="px-4 py-3 rounded-2xl bg-white/5 text-text-secondary hover:text-white transition-all"><Edit3 className="w-4 h-4" /></button>
              <button onClick={() => deleteEntry(selected.id)} className="px-4 py-3 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {modal !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4   " onClick={() => setModal(null)}>
          <div onClick={e => e.stopPropagation()} className="glass-card p-6 w-full max-w-lg    ">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white">{modal.id ? 'Editar Bloco' : `+ Novo Bloco — ${DIAS_FULL[modal.day_of_week]}`}</h3>
              <button onClick={() => setModal(null)} className="text-text-secondary hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Título *</label>
                <input value={modal.title} onChange={e => setModal({ ...modal, title: e.target.value })} placeholder="Ex: Aula de Genética" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-primary/50 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Tipo</label>
                  <select value={modal.activity_type} onChange={e => setModal({ ...modal, activity_type: e.target.value, color: TIPO_CONFIG[e.target.value]?.cor || modal.color })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50">
                    {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k} className="bg-[#0A0C14]">{v.emoji} {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Matéria</label>
                  <input value={modal.subject_name} onChange={e => setModal({ ...modal, subject_name: e.target.value })} placeholder="Ex: Biologia" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-primary/50 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Horário</label>
                  <input type="time" value={modal.start_time} onChange={e => setModal({ ...modal, start_time: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Duração (min)</label>
                  <input type="number" value={modal.duration_minutes} onChange={e => setModal({ ...modal, duration_minutes: parseInt(e.target.value) || 30 })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block flex items-center gap-1"><Palette className="w-3 h-3" /> Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {CORES.map(cor => (
                    <button key={cor} onClick={() => setModal({ ...modal, color: cor })} className="w-8 h-8 rounded-xl transition-all hover:scale-110" style={{ backgroundColor: cor, outline: modal.color === cor ? `3px solid ${cor}` : 'none', outlineOffset: 2 }} />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 block">Anotações</label>
                <textarea value={modal.notes} onChange={e => setModal({ ...modal, notes: e.target.value })} placeholder="Observações opcionais..." rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-text-secondary focus:border-primary/50 outline-none resize-none" />
              </div>

              <button onClick={saveEntry} className="w-full py-4 bg-primary rounded-2xl font-black text-white shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all">
                {modal.id ? 'Salvar Alterações' : 'Adicionar ao Calendário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4   " onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()} className="glass-card p-8 w-full max-w-md border-primary/30    ">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-primary/20 rounded-2xl text-primary"><Settings className="w-6 h-6" /></div>
              <div>
                <h3 className="text-xl font-black text-white">Configurações do Plano</h3>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">Motor Adaptativo V2</p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <label className="text-xs font-black text-text-secondary uppercase tracking-widest mb-3 block">Horas por Dia</label>
                <input type="range" min="1" max="12" value={prefs.hours_per_day} onChange={e => setPrefs({ ...prefs, hours_per_day: parseInt(e.target.value) })} className="w-full accent-primary bg-white/5 h-2 rounded-lg" />
                <div className="flex justify-between mt-2"><span className="text-xs font-bold text-text-secondary">1h</span><span className="text-sm font-black text-primary">{prefs.hours_per_day}h Disponíveis</span><span className="text-xs font-bold text-text-secondary">12h</span></div>
              </div>

              <div>
                <label className="text-xs font-black text-text-secondary uppercase tracking-widest mb-3 block">Dias por Semana</label>
                <div className="flex gap-2">
                  {[5, 6, 7].map(d => (
                    <button key={d} onClick={() => setPrefs({ ...prefs, days_per_week: d })} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${prefs.days_per_week === d ? 'bg-primary text-white' : 'bg-white/5 text-text-secondary hover:bg-white/10'}`}>
                      {d} Dias
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-text-secondary uppercase tracking-widest mb-3 block">Intensidade de Estudo</label>
                <div className="flex flex-col gap-2">
                  {['Leve', 'Moderada', 'Hardcore'].map(i => (
                    <button key={i} onClick={() => setPrefs({ ...prefs, intensity: i as any })} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${prefs.intensity === i ? 'bg-primary/10 border-primary text-white' : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10'}`}>
                      <span className="font-bold">{i}</span>
                      {prefs.intensity === i && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-[10px] text-amber-200/70 font-medium leading-relaxed">
                  A intensidade **Hardcore** aumenta a frequência de blocos de questões e simulados baseados em seus erros recentes.
                </p>
              </div>

              <button onClick={() => savePreferences(prefs)} className="w-full py-4 btn-primary font-black">
                Salvar Preferências
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
