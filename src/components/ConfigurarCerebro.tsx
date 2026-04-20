import React, { useState, useEffect } from 'react';
import {
  Save, CheckCircle2, AlertCircle, Clock, CalendarDays,
  BrainCircuit, ArrowRight, Zap, TrendingUp, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cerebroConfigService, UserStudySettings } from '../services/cerebroService';
import { eventBus, APP_EVENTS } from '../services/eventBus';

interface ConfigurarCerebroProps {
  onNavigateToCalendar?: () => void;
}

export function ConfigurarCerebro({ onNavigateToCalendar }: ConfigurarCerebroProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [justSaved, setJustSaved] = useState(false);

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
    setTimeout(() => setToast(null), 4000);
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
      // 🔔 Notifica o Calendário que as configurações mudaram
      eventBus.emit(APP_EVENTS.SETTINGS_UPDATED);
      setJustSaved(true);
      showToast('Cérebro Calibrado! O Calendário foi notificado. 🧠✨');
      setTimeout(() => setJustSaved(false), 5000);
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar as configurações', 'err');
    } finally {
      setSaving(false);
    }
  }

  const totalAllocatedHours = Object.values(settings.subject_distribution || {}).reduce(
    (acc, curr) => acc + (curr || 0), 0
  );
  const totalWeeklyHours = (settings.days_per_week || 0) * (settings.hours_per_day || 0);
  const remaining = totalWeeklyHours - totalAllocatedHours;

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full pb-10">

      {/* ── Cabeçalho ── */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <BrainCircuit className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter">Calibrar Cérebro</h2>
            <p className="text-text-secondary text-sm mt-0.5">
              Configure sua carga horária — o Calendário usa isso para gerar sua semana automaticamente.
            </p>
          </div>
        </div>

        {onNavigateToCalendar && (
          <button
            onClick={onNavigateToCalendar}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-teal-400 hover:bg-teal-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(20,184,166,0.15)] group shrink-0"
          >
            <Calendar className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Ver Calendário</span>
          </button>
        )}
      </header>

      {/* ── Banner informativo ── */}
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5">
        <Zap className="w-5 h-5 text-indigo-400 shrink-0" />
        <p className="text-xs text-indigo-200/70 font-medium leading-relaxed">
          <strong className="text-indigo-300">Como funciona:</strong> Defina quantas horas por semana você quer estudar e distribua entre as matérias.
          Depois, acesse o <strong className="text-teal-300">Calendário</strong> e clique em{' '}
          <strong className="text-teal-300">"Gerar Semana V2"</strong> — o Cérebro monta seu cronograma automaticamente com base nessas configurações.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-8">

          {/* ── Card 1: Carga Horária Base ── */}
          <div className="glass-card p-8 flex flex-col gap-6 border-indigo-500/20 border-t-4">
            <h3 className="text-xl font-black flex items-center gap-2 text-white">
              <Clock className="w-5 h-5 text-indigo-400" />
              Carga Horária Base
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Dias por Semana */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Dias por Semana</label>
                  <span className="text-2xl font-black text-indigo-400">{settings.days_per_week}</span>
                </div>
                <input
                  type="range" min="1" max="7" step="1"
                  value={settings.days_per_week || 1}
                  onChange={(e) => setSettings({ ...settings, days_per_week: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-text-secondary/50 font-bold">
                  <span>1 dia</span>
                  <span>7 dias</span>
                </div>
              </div>

              {/* Horas por Dia */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Horas Líquidas por Dia</label>
                  <span className="text-2xl font-black text-indigo-400">{settings.hours_per_day}h</span>
                </div>
                <input
                  type="range" min="1" max="14" step="1"
                  value={settings.hours_per_day || 1}
                  onChange={(e) => setSettings({ ...settings, hours_per_day: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-text-secondary/50 font-bold">
                  <span>1h/dia</span>
                  <span>14h/dia</span>
                </div>
              </div>
            </div>

            {/* Resumo */}
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col gap-1 text-center">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Total Semanal</span>
                <span className="text-2xl font-black text-indigo-400">{totalWeeklyHours}h</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1 text-center">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Alocado</span>
                <span className={`text-2xl font-black ${totalAllocatedHours > totalWeeklyHours ? 'text-red-400' : 'text-emerald-400'}`}>
                  {totalAllocatedHours}h
                </span>
              </div>
              <div className={`p-4 rounded-xl flex flex-col gap-1 text-center border ${remaining < 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-white/5 border-white/10'}`}>
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Disponível</span>
                <span className={`text-2xl font-black ${remaining < 0 ? 'text-red-400' : 'text-white'}`}>
                  {remaining}h
                </span>
              </div>
            </div>
          </div>

          {/* ── Card 2: Distribuição por Matéria ── */}
          <div className="glass-card p-8 flex flex-col gap-6">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h3 className="text-xl font-black flex items-center gap-2 text-white">
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                  Horas por Matéria (semana)
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Defina quantas horas semanais dedicar a cada matéria.
                </p>
              </div>
              {totalAllocatedHours > totalWeeklyHours && (
                <div className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-black flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Excedeu em {totalAllocatedHours - totalWeeklyHours}h
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map(sub => {
                const hours = settings.subject_distribution?.[sub.id] || 0;
                const subTopics = topics.filter(t => t.subject_id === sub.id);
                const fronts = [...new Set(subTopics.map(t => t.front).filter(Boolean))].sort();
                const pct = Math.min(100, Math.max(0, (hours / (totalWeeklyHours || 1)) * 100));

                return (
                  <div
                    key={sub.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-bold text-sm text-white leading-tight">{sub.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[11px] font-black border border-indigo-500/20 shrink-0">
                        {hours}h
                      </span>
                    </div>

                    {fronts.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {fronts.map(f => (
                          <span
                            key={f}
                            className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white/5 text-text-secondary border border-white/5"
                          >
                            Frente {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Barra de progresso */}
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Controles +/- */}
                    <div className="flex items-center gap-2 mt-auto">
                      <button
                        onClick={() => handleDistributionChange(sub.id, hours - 1)}
                        disabled={hours <= 0}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-white hover:bg-white/15 transition-all text-lg disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      >
                        −
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-[10px] text-text-secondary">{pct.toFixed(0)}% do total</span>
                      </div>
                      <button
                        onClick={() => handleDistributionChange(sub.id, hours + 1)}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-white hover:bg-white/15 transition-all text-lg shrink-0"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              {subjects.length === 0 && (
                <div className="col-span-3 p-10 text-center opacity-40">
                  <p className="text-sm text-text-secondary">
                    Nenhuma matéria encontrada. Cadastre matérias na aba <strong>Matérias</strong> primeiro.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Botões de ação ── */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 btn-primary py-5 text-base flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:shadow-[0_0_60px_rgba(99,102,241,0.5)] transition-all"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Sincronizando com o Cérebro...' : 'Salvar Calibragem do Cérebro'}
            </button>

            {justSaved && onNavigateToCalendar && (
              <button
                onClick={onNavigateToCalendar}
                className="flex items-center justify-center gap-2 px-8 py-5 bg-teal-500 hover:bg-teal-400 text-white rounded-2xl font-black text-base transition-all shadow-[0_0_30px_rgba(20,184,166,0.4)] animate-pulse"
              >
                <TrendingUp className="w-5 h-5" />
                Ir ao Calendário
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>

        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border font-bold text-sm max-w-sm ${
          toast.type === 'ok'
            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            : 'bg-red-500/20 border-red-500/40 text-red-400'
        }`}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
