import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, BookOpen, Layers, X, Save, 
  ChevronRight, Brain, Clock, CheckCircle2,
  Trash2, AlertCircle, BrainCircuit, CalendarDays,
  Settings2, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { subjectService, topicService } from '../services/studyService';
import { intentionService } from '../services/intentionService';
import { cerebroConfigService, UserStudySettings } from '../services/cerebroService';
import { eventBus, APP_EVENTS } from '../services/eventBus';

// ─── Seção 1: Calibrar Cérebro (horas de estudo) ───────────────

function CalibragemCerebro({ onSaved }: { onSaved?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const [settings, setSettings] = useState<Partial<UserStudySettings>>({
    days_per_week: 6,
    hours_per_day: 4,
    subject_distribution: {}
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [subsData, topicsData, configData] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('topics').select('id, subject_id, name, front').order('name'),
        cerebroConfigService.getSettings()
      ]);

      const subs = subsData.data || [];
      setSubjects(subs);
      setTopics(topicsData.data || []);

      if (configData) {
        setSettings({
          days_per_week: configData.days_per_week ?? 6,
          hours_per_day: configData.hours_per_day ?? 4,
          subject_distribution: configData.subject_distribution || {}
        });
      } else {
        const initialDist: Record<string, number> = {};
        subs.forEach(s => { initialDist[s.id] = 0; });
        setSettings(prev => ({ ...prev, subject_distribution: initialDist }));
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao carregar os dados', 'err');
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handleDistributionChange(subjectId: string, hours: number) {
    setSettings(prev => ({
      ...prev,
      subject_distribution: {
        ...(prev.subject_distribution || {}),
        [subjectId]: Math.max(0, hours)
      }
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await cerebroConfigService.saveSettings(settings);
      eventBus.emit(APP_EVENTS.SETTINGS_UPDATED);
      showToast('Cérebro Calibrado com Sucesso! 🧠✨');
      onSaved?.();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar as configurações', 'err');
    } finally {
      setSaving(false);
    }
  }

  const totalAllocatedHours = Object.values(settings.subject_distribution || {}).reduce((acc, curr) => acc + (curr || 0), 0);
  const totalWeeklyHours = (settings.days_per_week || 0) * (settings.hours_per_day || 0);

  return (
    <div className="glass-card border-indigo-500/20 overflow-hidden">
      {/* Header colapsável */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Calibrar Cérebro</h3>
            <p className="text-[11px] text-text-secondary font-medium">
              {totalWeeklyHours}h/semana disponíveis · {totalAllocatedHours}h alocadas nas matérias
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totalAllocatedHours > totalWeeklyHours && (
            <span className="text-[10px] font-black text-red-400 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg uppercase">Excedido</span>
          )}
          {totalAllocatedHours <= totalWeeklyHours && totalAllocatedHours > 0 && (
            <span className="text-[10px] font-black text-emerald-400 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg uppercase">Configurado</span>
          )}
          {collapsed
            ? <ChevronDown className="w-5 h-5 text-text-secondary" />
            : <ChevronUp className="w-5 h-5 text-text-secondary" />
          }
        </div>
      </button>

      {!collapsed && (
        <div className="px-6 pb-6 flex flex-col gap-6 border-t border-white/5">
          {loading ? (
            <div className="flex justify-center p-10">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Carga Horária Base */}
              <div className="pt-6 flex flex-col gap-5">
                <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Carga Horária Base
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dias por Semana */}
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Dias por Semana</label>
                      <span className="text-xl font-black text-indigo-400">{settings.days_per_week}</span>
                    </div>
                    <input
                      type="range" min="1" max="7" step="1"
                      value={settings.days_per_week || 1}
                      onChange={(e) => setSettings({ ...settings, days_per_week: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-text-secondary/50 font-bold">
                      <span>1 dia</span><span>7 dias</span>
                    </div>
                  </div>

                  {/* Horas por Dia */}
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-end">
                      <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Horas Líquidas por Dia</label>
                      <span className="text-xl font-black text-indigo-400">{settings.hours_per_day}h</span>
                    </div>
                    <input
                      type="range" min="1" max="14" step="1"
                      value={settings.hours_per_day || 1}
                      onChange={(e) => setSettings({ ...settings, hours_per_day: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-text-secondary/50 font-bold">
                      <span>1h/dia</span><span>14h/dia</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                  <span className="text-sm font-bold text-text-secondary">Fundo de horas semanal estimado:</span>
                  <span className="text-2xl font-black text-indigo-400">{totalWeeklyHours} horas</span>
                </div>
              </div>

              {/* Distribuição de Matérias */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-end">
                  <h4 className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
                    <CalendarDays className="w-3.5 h-3.5 text-emerald-400" /> Distribuição por Matéria (Horas/Semana)
                  </h4>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black border ${
                    totalAllocatedHours > totalWeeklyHours
                      ? 'border-red-500/30 bg-red-500/10 text-red-400'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {totalAllocatedHours} / {totalWeeklyHours}h
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjects.map(sub => {
                    const hours = settings.subject_distribution?.[sub.id] || 0;
                    const subTopics = topics.filter(t => t.subject_id === sub.id);
                    const fronts = [...new Set(subTopics.map(t => t.front).filter(Boolean))].sort();

                    return (
                      <div key={sub.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/20 transition-all flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-white truncate pr-2">{sub.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[11px] font-black border border-indigo-500/20">{hours}h</span>
                        </div>

                        {fronts.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {fronts.map(f => (
                              <span key={f} className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-text-secondary border border-white/5">
                                Frente {f}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-auto">
                          <button
                            onClick={() => handleDistributionChange(sub.id, hours - 1)}
                            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center font-bold text-white hover:bg-white/15 transition-all text-base shrink-0"
                          >−</button>
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, (hours / (totalWeeklyHours || 1)) * 100))}%` }}
                            />
                          </div>
                          <button
                            onClick={() => handleDistributionChange(sub.id, hours + 1)}
                            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center font-bold text-white hover:bg-white/15 transition-all text-base shrink-0"
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary py-4 text-sm flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_50px_rgba(99,102,241,0.5)] transition-all"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Sincronizando com o Cérebro...' : 'Salvar Calibragem do Cérebro'}
              </button>
            </>
          )}
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border font-bold text-sm ${
          toast.type === 'ok'
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            : 'bg-red-500/20 border-red-500/40 text-red-400'
        }`}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Seção 2: Prescritor de Aulas (selecionar tópicos) ─────────

function PrescritorAulas() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [searchTopic, setSearchTopic] = useState('');
  const [intentions, setIntentions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const diff = today.getDate() - today.getDay();
  const weekStart = new Date(today.setDate(diff)).toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, [weekStart]);

  async function loadData() {
    setLoading(true);
    try {
      const subs = await subjectService.getAll();
      setSubjects(subs);
    } catch (err) {
      console.error('Erro ao carregar matérias:', err);
    }
    try {
      const currentIntentions = await intentionService.getByWeek(weekStart);
      setIntentions(currentIntentions);
    } catch (err) {
      console.error('Erro ao carregar intenções:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (selectedSubject) {
      topicService.getBySubject(selectedSubject).then(setTopics);
    } else {
      setTopics([]);
    }
  }, [selectedSubject]);

  async function addIntention(topic: any) {
    if (intentions.find(i => i.topic_id === topic.id)) return;
    const subject = subjects.find(s => s.id === topic.subject_id);
    const newItem = {
      subject_id: topic.subject_id,
      topic_id: topic.id,
      week_start: weekStart,
      duration_minutes: 90,
      subjects: { name: subject.name, color: subject.color },
      topics: { name: topic.name, front: topic.front }
    };
    setSaving(true);
    try {
      const saved = await intentionService.addIntention(newItem as any);
      setIntentions([...intentions, { ...newItem, id: saved.id }]);
      eventBus.emit(APP_EVENTS.SETTINGS_UPDATED);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function removeIntention(id: string) {
    try {
      await intentionService.deleteIntention(id);
      setIntentions(intentions.filter(i => i.id !== id));
      eventBus.emit(APP_EVENTS.SETTINGS_UPDATED);
    } catch (err) {
      console.error(err);
    }
  }

  const filteredTopics = topics.filter(t =>
    t.name.toLowerCase().includes(searchTopic.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      {/* Painel de seleção */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        <div className="glass-card p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block">
                1. Escolha a Matéria
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-500/50"
              >
                <option value="" className="bg-[#0A0C14]">Selecione uma matéria...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0A0C14]">{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-2 block">
                2. Busque o Assunto
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Ex: Óptica..."
                  value={searchTopic}
                  onChange={(e) => setSearchTopic(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white outline-none focus:border-teal-500/50"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center p-10">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedSubject ? (
              filteredTopics.length > 0 ? (
                filteredTopics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => addIntention(topic)}
                    disabled={!!intentions.find(i => i.topic_id === topic.id)}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all text-left group disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border ${
                        topic.front === 'A' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        topic.front === 'B' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {topic.front || 'A'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{topic.name}</p>
                        <p className="text-[10px] text-text-secondary font-medium">
                          Relevância ENEM: {topic.enem_relevance}/10
                        </p>
                      </div>
                    </div>
                    {intentions.find(i => i.topic_id === topic.id)
                      ? <CheckCircle2 className="w-4 h-4 text-teal-400" />
                      : <Plus className="w-4 h-4 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    }
                  </button>
                ))
              ) : (
                <p className="p-10 text-center text-text-secondary text-sm">Nenhum assunto encontrado.</p>
              )
            ) : (
              <div className="p-16 text-center flex flex-col items-center gap-4 opacity-30">
                <BookOpen className="w-12 h-12" />
                <p className="text-sm font-black uppercase tracking-widest">Aguardando seleção de matéria</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cesta de seleção */}
      <div className="lg:col-span-5 flex flex-col gap-6 sticky top-8">
        <div className="glass-card p-6 border-teal-500/30 bg-teal-500/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-teal-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Layers className="w-4 h-4" /> Planejado para a Semana
            </h3>
            <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-black">
              {intentions.length} {intentions.length === 1 ? 'AULA' : 'AULAS'}
            </span>
          </div>

          <div className="flex flex-col gap-3 max-h-[440px] overflow-y-auto pr-1 custom-scrollbar">
            {intentions.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center gap-3 opacity-40">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-teal-500/50 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-teal-500" />
                </div>
                <p className="text-xs font-bold text-teal-500/70 uppercase">Cesta Vazia</p>
                <p className="text-[10px] text-text-secondary">Selecione tópicos ao lado para planejar sua semana</p>
              </div>
            ) : (
              intentions.map(item => (
                <div key={item.id} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between group">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest">{item.subjects?.name}</span>
                    <p className="text-sm font-bold text-white">{item.topics?.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-text-secondary">
                        <Clock className="w-3 h-3" /> 90min
                      </span>
                      <span className="text-[10px] text-teal-400 font-bold uppercase tracking-tighter">
                        Frente {item.topics?.front || 'A'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeIntention(item.id)}
                    className="p-2 rounded-xl bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {intentions.length > 0 && (
            <div className="mt-2 p-4 border border-teal-500/20 bg-teal-500/5 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-teal-200/60 leading-relaxed font-medium">
                Pronto! Essas aulas estão reservadas. Acesse o <strong>Calendário</strong> e use a <strong>Geração Inteligente</strong> para alocá-las automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────

export function PrescritorSemanal() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-20">

      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic">Cérebro de Elite</h2>
            <p className="text-text-secondary text-sm font-medium">
              Configure sua carga horária e selecione as aulas da semana. O Cérebro cuida do resto.
            </p>
          </div>
        </div>
      </header>

      {/* Seção 1 — Calibrar Cérebro (colapsável) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <span className="text-[10px] font-black">1</span>
          </div>
          <span className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">
            Configure sua agenda de estudos
          </span>
        </div>
        <CalibragemCerebro />
      </section>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">depois</span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* Seção 2 — Prescritor de Aulas */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-teal-500/20 flex items-center justify-center text-teal-400">
            <span className="text-[10px] font-black">2</span>
          </div>
          <span className="text-xs font-black text-text-secondary uppercase tracking-[0.2em]">
            Prescreva as aulas da semana
          </span>
        </div>
        <PrescritorAulas />
      </section>

    </div>
  );
}
