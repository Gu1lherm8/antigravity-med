// ==========================================
// components/SecretaryPlanner.tsx
// Feed de tarefas detalhado do Secretário IA
// Mostra TODAS as tarefas do dia com contexto completo
// ==========================================

import React, { useState, useEffect } from 'react';
import {
  Brain, Play, CheckCircle2, Clock, ChevronRight, Zap,
  TrendingUp, AlertTriangle, Loader2, RefreshCw,
  Sparkles, Target, Award, Calendar, SkipForward,
  Plus, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DailyTask {
  id: string;
  order_num: number;
  title: string;
  duration_minutes: number;
  reason: string;
  type: 'theory' | 'questions' | 'review' | 'flashcards';
  topic_id: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'skipped';
  started_at?: string;
  completed_at?: string;
}

interface SecretaryPlannerProps {
  userId: string;
  onStartTask?: (task: DailyTask) => void;
}

const TYPE_CONFIG = {
  questions: { label: 'Questões', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  theory:    { label: 'Teoria',   color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  review:    { label: 'Revisão',  color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  flashcards:{ label: 'Flashcards', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
};

export function SecretaryPlanner({ userId, onStartTask }: SecretaryPlannerProps) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  
  // States para adição manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(60);
  const [newTaskType, setNewTaskType] = useState<DailyTask['type']>('theory');

  useEffect(() => {
    loadTodaysPlan();
  }, [userId]);

  async function loadTodaysPlan() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_task_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('day_date', today)
      .order('order_num');

    if (data && data.length > 0) {
      setTasks(data as DailyTask[]);
    } else {
      // Gerar plano se não existir
      await generatePlan();
    }
    setLoading(false);
  }

  async function generatePlan() {
    setGenerating(true);
    try {
      const res = await fetch('/api/secretary/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.plan) setTasks(data.plan as DailyTask[]);
    } catch (err) {
      console.error('Erro ao gerar plano:', err);
    } finally {
      setGenerating(false);
    }
  }

  async function markTaskDone(taskId: string) {
    const now = new Date().toISOString();
    await supabase
      .from('daily_task_queue')
      .update({ status: 'done', completed_at: now })
      .eq('id', taskId);

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'done', completed_at: now } : t
    ));
    setActiveTask(null);
  }

  async function skipTask(taskId: string) {
    await supabase
      .from('daily_task_queue')
      .update({ status: 'skipped' })
      .eq('id', taskId);

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'skipped' } : t
    ));
  }

  async function startTask(task: DailyTask) {
    await supabase
      .from('daily_task_queue')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', task.id);

    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, status: 'in_progress' } : t
    ));
    setActiveTask(task.id);
    onStartTask?.(task);
  }

  async function addManualTask() {
    if (!newTaskTitle.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    const newOrder = tasks.length + 1;

    const { data, error } = await supabase
      .from('daily_task_queue')
      .insert({
        user_id: userId,
        day_date: today,
        title: newTaskTitle.trim(),
        duration_minutes: newTaskDuration,
        type: newTaskType,
        order_num: newOrder,
        status: 'pending',
        reason: 'Adicionado manualmente'
      })
      .select()
      .single();

    if (!error && data) {
      setTasks(prev => [...prev, data as DailyTask]);
      setShowAddModal(false);
      setNewTaskTitle('');
    } else {
      console.error('Erro ao adicionar tarefa:', error);
    }
  }

  // Métricas do dia
  const done = tasks.filter(t => t.status === 'done').length;
  const total = tasks.filter(t => t.status !== 'skipped').length;
  const doneMinutes = tasks
    .filter(t => t.status === 'done')
    .reduce((acc, t) => acc + t.duration_minutes, 0);
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const nextTask = tasks.find(t => t.status === 'pending');

  if (loading || generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">
          {generating ? 'Calculando seu plano inteligente...' : 'Carregando...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">

      {/* MODAL DE ADIÇÃO MANUAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0A0B14] border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 flex flex-col gap-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Nova Missão</span>
                <h2 className="text-2xl font-black text-white">Adicionar Tarefa</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Título da Aula</label>
                <input 
                  autoFocus
                  type="text"
                  placeholder="Ex: Anatomia Cardíaca"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-teal-500 transition-all font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Duração (min)</label>
                  <input 
                    type="number"
                    value={newTaskDuration}
                    onChange={e => setNewTaskDuration(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-teal-500 transition-all font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</label>
                  <select 
                    value={newTaskType}
                    onChange={e => setNewTaskType(e.target.value as any)}
                    className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-teal-500 transition-all font-bold"
                  >
                    <option value="theory">Teoria</option>
                    <option value="questions">Questões</option>
                    <option value="review">Revisão</option>
                    <option value="flashcards">Flashcards</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={addManualTask}
              className="w-full py-4 bg-teal-500 text-black font-black uppercase tracking-widest rounded-2xl hover:bg-teal-400 transition-all shadow-[0_10px_20px_rgba(20,184,166,0.3)]"
            >
              Criar Missão
            </button>
          </div>
        </div>
      )}

      {/* Cabeçalho com métricas do dia */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Concluídas', value: `${done}/${total}`, icon: CheckCircle2, color: 'text-teal-400' },
          { label: 'Minutos Estudados', value: `${doneMinutes}m`, icon: Clock, color: 'text-indigo-400' },
          { label: 'Progresso', value: `${progress}%`, icon: TrendingUp, color: 'text-amber-400' },
        ].map(metric => (
          <div
            key={metric.label}
            className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 flex flex-col gap-1 text-center"
          >
            <metric.icon className={`w-5 h-5 mx-auto ${metric.color} mb-1`} />
            <span className={`text-2xl font-black ${metric.color}`}>{metric.value}</span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{metric.label}</span>
          </div>
        ))}
      </div>

      {/* Barra de progresso visual */}
      <div className="flex flex-col gap-2">
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] font-bold text-slate-600">Início do dia</span>
          <span className="text-[10px] font-bold text-teal-500">{progress}% concluído</span>
        </div>
      </div>

      {/* Próxima tarefa em destaque (se existir) */}
      {nextTask && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-teal-500/30 to-indigo-500/30 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="relative bg-black/60 border border-teal-500/20 rounded-[2rem] p-8 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-teal-500" />
              <span className="text-[10px] font-black text-teal-500 uppercase tracking-[0.3em]">
                Próxima Missão
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {(() => {
                const cfg = TYPE_CONFIG[nextTask.type] ?? TYPE_CONFIG.theory;
                return (
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border} uppercase tracking-widest`}>
                      {cfg.label}
                    </span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {nextTask.duration_minutes} min
                    </span>
                  </div>
                );
              })()}
              <h3 className="text-3xl font-black text-white tracking-tighter leading-tight">
                {nextTask.title}
              </h3>
              {nextTask.reason && (
                <div className="flex items-start gap-3 p-4 bg-teal-500/5 border border-teal-500/10 rounded-2xl mt-2">
                  <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-slate-400 italic leading-relaxed">
                    "{nextTask.reason}"
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => startTask(nextTask)}
              className="w-full flex items-center justify-between p-5 bg-white text-black rounded-2xl hover:scale-[1.01] active:scale-[0.99] transition-all shadow-[0_10px_30px_rgba(255,255,255,0.1)]"
            >
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Iniciar agora</span>
                <span className="text-lg font-black">COMEÇAR SESSÃO</span>
              </div>
              <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center">
                <Play className="w-5 h-5 fill-current" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Lista completa de tarefas do dia */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Plano Completo de Hoje
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-500/20 transition-all shadow-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar Tarefa
          </button>
        </div>

        {tasks.map((task) => {
          const cfg = TYPE_CONFIG[task.type] ?? TYPE_CONFIG.theory;
          const isDone = task.status === 'done';
          const isActive = task.id === activeTask;
          const isSkipped = task.status === 'skipped';

          return (
            <div
              key={task.id}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                isDone
                  ? 'bg-teal-500/5 border-teal-500/20 opacity-60'
                  : isSkipped
                  ? 'bg-white/[0.02] border-white/5 opacity-40'
                  : isActive
                  ? 'bg-white/[0.05] border-teal-500/30'
                  : 'bg-white/[0.02] border-white/8 hover:border-white/15 hover:bg-white/[0.04]'
              }`}
            >
              {/* Ícone de status */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isDone ? 'bg-teal-500/20' : cfg.bg
              }`}>
                {isDone
                  ? <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  : isSkipped
                  ? <SkipForward className="w-4 h-4 text-slate-500" />
                  : isActive
                  ? <Zap className="w-4 h-4 text-amber-400" />
                  : <span className={`text-xs font-black ${cfg.color}`}>{task.order_num}</span>
                }
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase">{task.duration_minutes}M</span>
                </div>
                <p className={`font-bold text-sm truncate ${isDone || isSkipped ? 'text-slate-500' : 'text-white'}`}>
                  {task.title}
                </p>
              </div>

              {/* Ações */}
              {!isDone && !isSkipped && (
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <button
                      onClick={() => markTaskDone(task.id)}
                      className="px-3 py-1.5 bg-teal-500 text-black rounded-xl text-xs font-black hover:bg-teal-400 transition-colors"
                    >
                      Concluir
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => skipTask(task.id)}
                        className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-white transition-colors"
                        title="Pular tarefa"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => startTask(task)}
                        className="p-2 rounded-xl bg-white/5 text-slate-500 hover:text-teal-400 hover:bg-teal-500/10 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              )}

              {isDone && (
                <Award className="w-4 h-4 text-teal-500 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Botão de regenerar */}
      <button
        onClick={generatePlan}
        disabled={generating}
        className="flex items-center justify-center gap-2 p-4 rounded-2xl border border-white/8 text-slate-500 hover:text-white hover:border-white/20 transition-all text-xs font-bold uppercase tracking-widest"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
        Recalcular Plano
      </button>
    </div>
  );
}
