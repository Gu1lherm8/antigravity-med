import { useState, useEffect } from 'react';
import { 
  Zap, CheckCircle2, Circle, Clock, Sun, Sunset, Moon,
  Trophy, AlertTriangle, Brain, Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DataWarmupBanner } from './DataWarmupBanner';


interface DailyMission {
  id: string;
  period: 'manha' | 'tarde' | 'noite';
  title: string;
  description: string;
  activity_type: 'aula' | 'questoes' | 'revisao' | 'flashcard' | 'estudo';
  duration_minutes: number;
  completed: boolean;
  order_index: number;
  color: string;
}

interface MissaoDoDiaProps {
  onStartFlow: (queue: any[], period: 'manha' | 'tarde' | 'noite') => void;
}

const PRECEPTOR_FRASES = [
  "Analise. Decida. Lidere.",
  "A base técnica é construída na repetição deliberada.",
  "O conhecimento não é passivo. Inicie a missão.",
  "Seu progresso é monitorado. Mantenha o padrão de elite.",
  "O tempo é o recurso mais escasso. Use-o com precisão.",
  "Elite não adia o inevitável. Comece agora.",
];

const PERIOD_CONFIG = {
  manha: { label: 'Manhã', icon: Sun, cor: '#f59e0b', bg: 'from-amber-500/20 to-transparent' },
  tarde: { label: 'Tarde', icon: Sunset, cor: '#f97316', bg: 'from-orange-500/20 to-transparent' },
  noite: { label: 'Noite', icon: Moon, cor: '#6366f1', bg: 'from-indigo-500/20 to-transparent' },
};

const ACTIVITY_EMOJI: Record<string, string> = {
  aula: '📚',
  questoes: '📝',
  revisao: '🔄',
  flashcard: '🃏',
  estudo: '🎯',
};

export function MissaoDoDia({ onStartFlow }: MissaoDoDiaProps) {
  const [missions, setMissions] = useState<DailyMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMission] = useState<string | null>(null);
  const [preceptorFrase] = useState(() => PRECEPTOR_FRASES[Math.floor(Math.random() * PRECEPTOR_FRASES.length)]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { loadMissions(); }, []);

  async function loadMissions() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('daily_missions')
        .select('*')
        .eq('date', today)
        .order('order_index');
      setMissions(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function toggleMission(id: string, current: boolean) {
    await supabase.from('daily_missions').update({ completed: !current }).eq('id', id);
    setMissions(prev => prev.map(m => m.id === id ? { ...m, completed: !current } : m));
  }

  async function gerarMissoes() {
    const padrao = [
      { period: 'manha', title: 'Ver plano do dia', activity_type: 'revisao', duration_minutes: 10, order_index: 1, color: '#6366f1' },
      { period: 'manha', title: 'Aula do cursinho', activity_type: 'aula', duration_minutes: 60, order_index: 2, color: '#3b82f6' },
      { period: 'tarde', title: '10 Questões', activity_type: 'questoes', duration_minutes: 30, order_index: 3, color: '#10b981' },
      { period: 'noite', title: 'Revisão de Flashcards', activity_type: 'flashcard', duration_minutes: 20, order_index: 4, color: '#f59e0b' },
    ];
    await supabase.from('daily_missions').insert(padrao.map(m => ({ ...m, date: today })));
    await loadMissions();
  }

  // Importar do plano do Secretário (daily_task_queue → daily_missions)
  async function importFromSecretary() {
    const uid = '00000000-0000-0000-0000-000000000000';
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || uid;

    const { data: tasks } = await supabase
      .from('daily_task_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('day_date', today)
      .order('order_num');

    if (!tasks || tasks.length === 0) {
      await gerarMissoes();
      return;
    }

    const TYPE_PERIOD: Record<string, 'manha' | 'tarde' | 'noite'> = {
      theory: 'manha', questions: 'tarde', review: 'tarde', flashcards: 'noite',
    };
    const TYPE_ACTIVITY: Record<string, string> = {
      theory: 'aula', questions: 'questoes', review: 'revisao', flashcards: 'flashcard',
    };
    const TYPE_COLOR: Record<string, string> = {
      theory: '#3b82f6', questions: '#10b981', review: '#f59e0b', flashcards: '#8b5cf6',
    };

    const missions = tasks.map((t, i) => ({
      date: today,
      period: TYPE_PERIOD[t.type] || 'manha',
      title: t.title,
      description: t.reason || '',
      activity_type: TYPE_ACTIVITY[t.type] || 'estudo',
      duration_minutes: t.duration_minutes,
      completed: t.status === 'done',
      order_index: i + 1,
      color: TYPE_COLOR[t.type] || '#6366f1',
    }));

    await supabase.from('daily_missions').insert(missions);
    await loadMissions();
  }

  const concluidas = missions.filter(m => m.completed).length;
  const total = missions.length;
  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  const periodos = ['manha', 'tarde', 'noite'] as const;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  async function handleStartFlow(period: 'manha' | 'tarde' | 'noite') {
    const missionsInPeriod = missions.filter(m => m.period === period && !m.completed);
    if (missionsInPeriod.length === 0) return;

    const queue = missionsInPeriod.map(m => ({
      id: m.id,
      type: m.activity_type,
      title: m.title,
      subject: m.description || 'Geral',
      duration_minutes: m.duration_minutes,
      priority: m.order_index
    }));

    onStartFlow(queue, period);
  }

  return (
    <div className="flex flex-col gap-8    ">
      {/* Header com Preceptor */}
      <div className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-transparent" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">🎖️ Preceptor</p>
            <p className="text-xl font-black text-white mt-0.5">"{preceptorFrase}"</p>
          </div>
        </div>
      </div>

      {/* Progresso do dia */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">

        {/* Aviso warmup — aparece quando ainda há poucos dados */}
        {total === 0 && (
          <DataWarmupBanner
            title="Missões manuais por ora"
            whatItDoes="O Secretário vai gerar missões inteligentes e personalizadas automaticamente conforme você acumula dados de estudo. Nas primeiras semanas, use 'Gerar Padrão' como ponto de partida."
            needs={[
              'Registre aulas assistidas e rodadas de questões',
              'O sistema detecta seus pontos fracos ao longo do tempo',
              'Revisões programadas pela curva de esquecimento ativam após dados acumulados',
            ]}
            timeEstimate="1-2 semanas"
            variant="inline"
          />
        )}

          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter">🔥 MISSÃO DO DIA</h2>
            <p className="text-text-secondary text-sm mt-1">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-primary">{progresso}%</span>
            <p className="text-text-secondary text-xs">{concluidas}/{total} concluídas</p>
          </div>
        </div>
        <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden mb-6">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all "
            style={{ width: `${progresso}%` }}
          />
        </div>
        
        {total > 0 && concluidas < total && (
          <button 
            onClick={() => handleStartFlow(periodos.find(p => missions.some(m => m.period === p && !m.completed)) || 'manha')}
            className="w-full py-4 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all"
          >
            <Zap className="w-5 h-5 fill-current" /> COMEÇAR AGORA (FLOW ENGINE)
          </button>
        )}

        {progresso === 100 && (
          <div className="mt-4 flex items-center gap-2 text-emerald-400 font-bold justify-center bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20   ">
            <Trophy className="w-5 h-5" /> Dia completo! Missão cumprida. 🏆
          </div>
        )}
      </div>

      {/* Se não tem missões */}
      {total === 0 && (
        <div className="flex flex-col items-center gap-5 py-12 text-center">
          <div className="w-16 h-16 rounded-3xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Brain className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">Nenhuma missão para hoje</p>
            <p className="text-slate-500 mt-1 font-medium text-sm">Importe do Secretário ou crie manualmente.</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={importFromSecretary}
              className="flex items-center justify-center gap-2 py-3 bg-teal-500 text-black font-black rounded-2xl hover:bg-teal-400 transition-all shadow-[0_10px_20px_rgba(20,184,166,0.2)]"
            >
              <Download className="w-4 h-4" /> Importar do Secretário
            </button>
            <button
              onClick={gerarMissoes}
              className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
            >
              <Zap className="w-4 h-4" /> Gerar Padrão
            </button>
          </div>
        </div>
      )}

      {/* Missões por período */}
      <div className="flex flex-col gap-6 mb-12">
        {periodos.map(periodo => {
          const msDoPeriodo = missions.filter(m => m.period === periodo);
          if (msDoPeriodo.length === 0) return null;
          const config = PERIOD_CONFIG[periodo];
          const Icon = config.icon;

          return (
            <div key={periodo} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.cor + '20' }}>
                    <Icon className="w-4 h-4" style={{ color: config.cor }} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.15em]" style={{ color: config.cor }}>{config.label}</h3>
                </div>
                {!msDoPeriodo.every(m => m.completed) && (
                  <button 
                    onClick={() => handleStartFlow(periodo)}
                    className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-lg hover:bg-primary/20"
                  >
                    INICIAR TURNO
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                  {msDoPeriodo.sort((a, b) => a.order_index - b.order_index).map((mission, idx) => (
                    <div
                      key={mission.id}
                      className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all     ${
                        mission.completed
                          ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60'
                          : activeMission === mission.id
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
                      }`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleMission(mission.id, mission.completed); }}
                        className="flex-shrink-0 transition-transform hover:scale-110"
                      >
                        {mission.completed
                          ? <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          : <Circle className="w-6 h-6 text-text-secondary" />
                        }
                      </button>

                      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: mission.color }} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span>{ACTIVITY_EMOJI[mission.activity_type] || '📌'}</span>
                          <span className={`font-bold text-sm ${mission.completed ? 'line-through text-text-secondary' : 'text-white'}`}>
                            {mission.title}
                          </span>
                        </div>
                        {mission.description && (
                          <p className="text-text-secondary text-xs mt-0.5 truncate">{mission.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-text-secondary text-xs">
                          <Clock className="w-3 h-3" />
                          <span>{mission.duration_minutes}min</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
