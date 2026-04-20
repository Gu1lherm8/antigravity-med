import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Brain, Clock, CheckCircle2,
  AlertCircle, BrainCircuit, CalendarDays,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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



// ─── Componente Principal ────────────────────────────────────────

export function PrescritorSemanal({ onNavigateToCalendar }: { onNavigateToCalendar?: () => void }) {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pb-20">

      {/* Header */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter uppercase italic">Cérebro Central</h2>
            <p className="text-text-secondary text-sm font-medium">
              Configure sua carga horária e selecione as aulas da semana. O Cérebro cuida do resto.
            </p>
          </div>
        </div>
        <button 
          onClick={onNavigateToCalendar} 
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-teal-400 hover:bg-teal-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(20,184,166,0.15)] group shrink-0"
        >
          <CalendarDays className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Ver Calendário</span>
        </button>
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

    </div>
  );
}
