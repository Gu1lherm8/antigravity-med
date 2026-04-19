import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle, Clock, CalendarDays, BrainCircuit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cerebroConfigService, UserStudySettings } from '../services/cerebroService';
import { eventBus, APP_EVENTS } from '../services/eventBus';

export function ConfigurarCerebro() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

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
          subject_distribution: configData.subject_distribution || {},
          day_configs: configData.day_configs || {
            "1": { active: true, hours: 4, start_time: "08:00" },
            "2": { active: true, hours: 4, start_time: "08:00" },
            "3": { active: true, hours: 4, start_time: "08:00" },
            "4": { active: true, hours: 4, start_time: "08:00" },
            "5": { active: true, hours: 4, start_time: "08:00" },
            "6": { active: true, hours: 4, start_time: "08:00" },
            "0": { active: false, hours: 4, start_time: "08:00" }
          }
        });
      } else {
        // Initialize distribution to 0 for all subjects if new
        const initialDist: Record<string, number> = {};
        subs.forEach(s => { initialDist[s.id] = 0; });
        setSettings(prev => ({ 
          ...prev, 
          subject_distribution: initialDist,
          day_configs: {
            "1": { active: true, hours: 4, start_time: "08:00" },
            "2": { active: true, hours: 4, start_time: "08:00" },
            "3": { active: true, hours: 4, start_time: "08:00" },
            "4": { active: true, hours: 4, start_time: "08:00" },
            "5": { active: true, hours: 4, start_time: "08:00" },
            "6": { active: true, hours: 4, start_time: "08:00" },
            "0": { active: false, hours: 4, start_time: "08:00" }
          }
        }));
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
        [subjectId]: hours
      }
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await cerebroConfigService.saveSettings(settings);
      eventBus.emit(APP_EVENTS.SETTINGS_UPDATED);
      showToast('Cérebro Calibrado com Sucesso! 🧠✨');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar as configurações', 'err');
    } finally {
      setSaving(false);
    }
  }

  const totalAllocatedHours = Object.values(settings.subject_distribution || {}).reduce((acc, curr) => acc + (curr || 0), 0);
  const totalWeeklyHours = (settings.days_per_week || 6) * (settings.hours_per_day || 4);

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      {/* Cabeçalho */}
      <header className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
          <BrainCircuit className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-4xl font-black tracking-tighter">Calibrar Cérebro</h2>
          <p className="text-text-secondary text-sm mt-0.5">
            Configure as regras paramétricas que alimentam o motor de estudo.
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center p-20"><div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Base Configuration */}
          <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
               <label className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
                 <Clock className="w-4 h-4" /> Horas de Estudo Diário
               </label>
               <div className="flex items-center gap-4">
                 <input 
                   type="range" 
                   min="1" max="14" step="1" 
                   value={settings.hours_per_day} 
                   onChange={(e) => setSettings({ ...settings, hours_per_day: parseInt(e.target.value) })}
                   className="w-full accent-indigo-500"
                 />
                 <span className="w-12 text-center font-black text-xl text-white">{settings.hours_per_day}h</span>
               </div>
            </div>

            <div className="flex flex-col gap-2">
               <label className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
                 <CalendarDays className="w-4 h-4" /> Dias de Estudo por Semana
               </label>
               <div className="flex items-center gap-4">
                 <input 
                   type="range" 
                   min="1" max="7" step="1" 
                   value={settings.days_per_week} 
                   onChange={(e) => setSettings({ ...settings, days_per_week: parseInt(e.target.value) })}
                   className="w-full accent-indigo-500"
                 />
                 <span className="w-12 text-center font-black text-xl text-white">{settings.days_per_week}d</span>
               </div>
            </div>
          </div>
      
          {/* Distribuição de Matérias */}

          <div className="glass-card p-8 flex flex-col gap-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black flex items-center gap-2 text-white">
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                  Distribuição de Prescrição (Horas/Semana)
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Defina a quantidade de horas que deseja dedicar para cada matéria.
                </p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-xs font-black flex flex-col items-end border ${totalAllocatedHours > totalWeeklyHours ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}`}>
                <span className="uppercase tracking-widest mb-0.5">Alocado</span>
                <span className="text-lg">{totalAllocatedHours} / {totalWeeklyHours}h</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map(sub => {
                const hours = settings.subject_distribution?.[sub.id] || 0;
                const subTopics = topics.filter(t => t.subject_id === sub.id);
                // agrupar topics por frente
                const groupedTopics = subTopics.reduce((acc, t) => {
                  const f = t.front || 'Geral';
                  if (!acc[f]) acc[f] = [];
                  acc[f].push(t.name);
                  return acc;
                }, {} as Record<string, string[]>);

                return (
                  <div key={sub.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-text-primary truncate pr-2">{sub.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-black">{hours}h</span>
                    </div>
                    
                    {Object.keys(groupedTopics).length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1 border-l-2 border-indigo-500/20 pl-2">
                        {Object.keys(groupedTopics).sort().map(frontName => (
                          <div key={frontName}>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Frente {frontName}</span>
                            <p className="text-[10px] text-text-secondary/80 leading-normal line-clamp-2">
                              {groupedTopics[frontName].join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 mt-auto pt-2">
                      <button 
                        onClick={() => handleDistributionChange(sub.id, Math.max(0, hours - 1))}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-white hover:bg-white/15 transition-all text-xl"
                      >
                        -
                      </button>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, (hours / (totalWeeklyHours || 1)) * 100))}%` }} />
                      </div>
                      <button 
                        onClick={() => handleDistributionChange(sub.id, hours + 1)}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-bold text-white hover:bg-white/15 transition-all text-xl"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Salvar */}
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="btn-primary py-5 text-lg flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:shadow-[0_0_60px_rgba(99,102,241,0.5)] transition-all mt-4"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Sincronizando com o Cérebro...' : 'Salvar Calibragem do Cérebro'}
          </button>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border font-bold text-sm ${toast.type === 'ok' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
