// ==========================================
// components/SecretaryDashboard.tsx
// Hub principal do Secretário Inteligente
// Parte 2: Streak real, Celebração, Study Flow
// ==========================================

import React, { useState, useEffect } from 'react';
import {
  Brain, Flame, RefreshCw, Settings, Loader2,
  Zap, Trophy, Star, CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { OnboardingCourse } from './OnboardingCourse';
import { SecretaryPlanner } from './SecretaryPlanner';
import { DailyStudyFlow } from './study/DailyStudyFlow';
import { useCourseSync } from '../hooks/useCourseSync';

type DashboardState = 'loading' | 'needs_onboarding' | 'ready' | 'studying' | 'celebrating';

interface ActiveStudyTask {
  id: string;
  title: string;
  type: 'theory' | 'questions' | 'review' | 'flashcards';
  topicId: string | null;
  durationMinutes: number;
}

export function SecretaryDashboard() {
  const [state, setState] = useState<DashboardState>('loading');
  const [userId, setUserId] = useState<string>('');
  const [greeting, setGreeting] = useState('');
  const [streak, setStreak] = useState(0);
  const [plannerKey, setPlannerKey] = useState(0); // Força re-render do Planner
  const [activeTask, setActiveTask] = useState<ActiveStudyTask | null>(null);

  const { sync, syncNow, isSyncing } = useCourseSync(userId);

  useEffect(() => {
    setGreeting(getGreeting());
    init();
  }, []);

  async function init() {
    setState('loading');
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id || '00000000-0000-0000-0000-000000000000';
    setUserId(uid);

    const { data: settings } = await supabase
      .from('course_sync_settings')
      .select('id')
      .eq('user_id', uid)
      .maybeSingle();

    if (!settings) {
      setState('needs_onboarding');
      return;
    }

    const s = await calcStreak(uid);
    setStreak(s);
    setState('ready');
  }

  // ── Streak: conta dias seguidos com ao menos 1 tarefa concluída ──
  async function calcStreak(uid: string): Promise<number> {
    // 1. Tenta na tabela study_streaks (mais precisa)
    const { data: streaks } = await supabase
      .from('study_streaks')
      .select('study_date')
      .eq('user_id', uid)
      .order('study_date', { ascending: false })
      .limit(90);

    const source = streaks && streaks.length > 0
      ? streaks.map(r => r.study_date)
      : await getDoneTaskDays(uid); // fallback

    if (!source || source.length === 0) return 0;

    const days = [...new Set(source)].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    let count = 0;
    let check = today;

    for (const day of days) {
      if (day === check) {
        count++;
        const d = new Date(check + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        check = d.toISOString().split('T')[0];
      } else {
        break;
      }
    }
    return count;
  }

  async function getDoneTaskDays(uid: string): Promise<string[]> {
    const { data } = await supabase
      .from('daily_task_queue')
      .select('day_date')
      .eq('user_id', uid)
      .eq('status', 'done')
      .order('day_date', { ascending: false })
      .limit(60);
    return data?.map(r => r.day_date) ?? [];
  }

  // ── Sincronização com feedback visual ────────────────────────────
  async function handleSync() {
    const ok = await syncNow();
    if (ok) {
      // Recarrega o planner após sync bem-sucedido
      setPlannerKey(k => k + 1);
      const s = await calcStreak(userId);
      setStreak(s);
    }
  }

  // ── Iniciar sessão de estudo ──────────────────────────────────────
  function handleStartTask(task: any) {
    setActiveTask({
      id: task.id,
      title: task.title,
      type: task.type,
      topicId: task.topic_id,
      durationMinutes: task.duration_minutes,
    });
    setState('studying');
  }

  // ── Concluir sessão de estudo ─────────────────────────────────────
  async function handleStudyComplete() {
    // Registra o dia no streak
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('study_streaks').upsert({
      user_id: userId,
      study_date: today,
      tasks_completed: 1,
    }, { onConflict: 'user_id,study_date' });

    const newStreak = await calcStreak(userId);
    setStreak(newStreak);

    // Verifica se completou o dia inteiro
    const { data: tasks } = await supabase
      .from('daily_task_queue')
      .select('status')
      .eq('user_id', userId)
      .eq('day_date', today);

    const total = tasks?.filter(t => t.status !== 'skipped').length ?? 0;
    const done  = tasks?.filter(t => t.status === 'done').length ?? 0;

    setActiveTask(null);
    setPlannerKey(k => k + 1);

    if (total > 0 && done >= total) {
      setState('celebrating');
    } else {
      setState('ready');
    }
  }

  function getGreeting() {
    const hr = new Date().getHours();
    if (hr < 12) return 'Bom dia, futuro médico.';
    if (hr < 18) return 'Boa tarde. O foco continua.';
    return 'Boa noite. Fila de tarefas atualizada.';
  }

  // ─── LOADING ────────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-4">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
        <p className="text-xs font-black text-teal-500/50 uppercase tracking-[0.3em]">
          Antigravity inicializando secretário...
        </p>
      </div>
    );
  }

  // ─── ONBOARDING ─────────────────────────────────────────────────────────────
  if (state === 'needs_onboarding') {
    return (
      <OnboardingCourse
        userId={userId}
        onComplete={() => { init(); }}
      />
    );
  }

  // ─── SESSÃO DE ESTUDO ────────────────────────────────────────────────────────
  if (state === 'studying' && activeTask) {
    return (
      <DailyStudyFlow
        userId={userId}
        taskTitle={activeTask.title}
        taskType={activeTask.type}
        topicId={activeTask.topicId}
        durationMinutes={activeTask.durationMinutes}
        onComplete={handleStudyComplete}
        onBack={() => { setActiveTask(null); setState('ready'); }}
      />
    );
  }

  // ─── CELEBRAÇÃO: DIA COMPLETO 🎉 ─────────────────────────────────────────────
  if (state === 'celebrating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-10 text-center px-4 animate-in fade-in duration-700">
        {/* Glow */}
        <div className="relative">
          <div className="absolute inset-0 bg-teal-500/30 rounded-full blur-3xl scale-150" />
          <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center shadow-[0_0_80px_rgba(20,184,166,0.5)]">
            <Trophy className="w-16 h-16 text-white" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.5em]">Missão Cumprida</span>
          <h1 className="text-5xl font-black text-white tracking-tighter leading-none">
            Dia 100%<br />
            <span className="text-teal-400 italic">concluído!</span>
          </h1>
          <p className="text-slate-400 font-medium mt-2">
            Você completou todas as missões de hoje. O Secretário vai preparar um novo plano amanhã.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          {[
            { icon: Flame, label: 'Dias seguidos', value: `${streak}`, color: 'text-orange-400' },
            { icon: Star, label: 'Status', value: 'Elite 🩺', color: 'text-teal-400' },
          ].map(m => (
            <div key={m.label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 items-center">
              <m.icon className={`w-6 h-6 ${m.color}`} />
              <span className={`text-2xl font-black ${m.color}`}>{m.value}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.label}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setState('ready')}
          className="px-8 py-4 bg-teal-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-teal-400 transition-all shadow-[0_15px_40px_rgba(20,184,166,0.3)]"
        >
          Ver Resumo Completo
        </button>
      </div>
    );
  }

  // ─── DASHBOARD PRINCIPAL ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* HERO: Cabeçalho do Secretário */}
      <header className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-teal-500/20 via-indigo-500/5 to-transparent border border-teal-500/10 p-8 flex flex-col md:flex-row items-center gap-6 group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />

        {/* Avatar da IA */}
        <div className="relative z-10 w-20 h-20 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_50px_rgba(20,184,166,0.2)] group-hover:scale-110 transition-transform duration-500">
          <Brain className="w-10 h-10 text-teal-400" />
        </div>

        {/* Texto */}
        <div className="relative z-10 flex-1 flex flex-col gap-1.5 text-center md:text-left">
          <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.3em]">
            {greeting}
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none">
            Secretário Inteligente
            <br />
            <span className="text-teal-400 italic">no comando.</span>
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-1 leading-relaxed max-w-lg">
            Seu plano foi calculado com base na sua performance e no que você viu no cursinho.{' '}
            <span className="text-white font-bold">Só execute.</span>
          </p>
        </div>

        {/* Stats rápidos */}
        <div className="relative z-10 flex items-center gap-3 flex-wrap justify-center">

          {/* Streak */}
          <div className={`flex flex-col items-center gap-1 px-5 py-4 rounded-2xl border transition-all ${
            streak > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-black/40 border-white/5'
          }`}>
            <div className="flex items-center gap-2">
              <Flame className={`w-4 h-4 ${streak > 0 ? 'text-orange-500' : 'text-slate-600'}`} />
              <span className="text-2xl font-black text-white">{streak}</span>
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dias seguidos</span>
          </div>

          {/* Botão de sync com progresso visual */}
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all shadow-lg ${
                sync.phase === 'done'
                ? 'bg-emerald-500 text-white border-emerald-400'
                : isSyncing
                ? 'bg-teal-500/10 border-teal-500/20 text-teal-400 cursor-not-allowed'
                : 'bg-teal-500 text-white border-teal-400 hover:scale-105 active:scale-95'
              }`}
            >
              {sync.phase === 'done'
                ? <CheckCircle2 className="w-4 h-4" />
                : <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              }
              <span className="text-xs font-black uppercase tracking-widest leading-none">
                {isSyncing ? sync.message : sync.phase === 'done' ? 'Sincronizado!' : 'Sincronizar Estudos'}
              </span>
            </button>

            {/* Barra de progresso durante sync */}
            {isSyncing && (
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-500"
                  style={{ width: `${sync.progress}%` }}
                />
              </div>
            )}
          </div>

          {/* Reconfigurar */}
          <button
            onClick={() => setState('needs_onboarding')}
            title="Reconfigurar cursinho"
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Banner de estado da sincronização */}
      {isSyncing && (
        <div className="flex items-center gap-3 p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl">
          <Zap className="w-4 h-4 text-teal-400 animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-teal-300">{sync.message}</p>
            <div className="h-1 mt-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${sync.progress}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] font-black text-teal-500">{sync.progress}%</span>
        </div>
      )}

      {/* PLANNER: Feed diário de tarefas */}
      <SecretaryPlanner
        key={plannerKey}
        userId={userId}
        onStartTask={handleStartTask}
      />
    </div>
  );
}
