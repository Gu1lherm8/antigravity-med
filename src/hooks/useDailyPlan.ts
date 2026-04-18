// ==========================================
// hooks/useDailyPlan.ts
// Gerencia o plano diário: carrega, navega e
// atualiza tarefas do SecretaryPlanner.
// ==========================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface PlanTask {
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

export function useDailyPlan(userId: string) {
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // ── Tarefas calculadas ────────────────────────────────────────
  const done      = tasks.filter(t => t.status === 'done').length;
  const total     = tasks.filter(t => t.status !== 'skipped').length;
  const progress  = total > 0 ? Math.round((done / total) * 100) : 0;
  const doneMinutes = tasks.filter(t => t.status === 'done')
                           .reduce((a, t) => a + t.duration_minutes, 0);
  const nextTask  = tasks.find(t => t.status === 'pending');
  const isAllDone = total > 0 && done === total;

  // ── Carregar plano do banco ───────────────────────────────────
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_task_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('day_date', today)
      .order('order_num');

    if (data && data.length > 0) {
      setTasks(data as PlanTask[]);
    } else {
      await generate(userId);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // ── Gerar plano via API ───────────────────────────────────────
  async function generate(uid: string) {
    setGenerating(true);
    try {
      const res = await fetch('/api/secretary/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
      const data = await res.json();
      if (data.plan) setTasks(data.plan as PlanTask[]);
    } catch (err) {
      console.error('[useDailyPlan] Erro ao gerar plano:', err);
    } finally {
      setGenerating(false);
    }
  }

  // ── Ações nas tarefas ─────────────────────────────────────────
  const startTask = useCallback(async (taskId: string) => {
    const now = new Date().toISOString();
    await supabase.from('daily_task_queue')
      .update({ status: 'in_progress', started_at: now })
      .eq('id', taskId);
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'in_progress', started_at: now } : t
    ));
  }, []);

  const completeTask = useCallback(async (taskId: string) => {
    const now = new Date().toISOString();
    await supabase.from('daily_task_queue')
      .update({ status: 'done', completed_at: now })
      .eq('id', taskId);
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'done', completed_at: now } : t
    ));
  }, []);

  const skipTask = useCallback(async (taskId: string) => {
    await supabase.from('daily_task_queue')
      .update({ status: 'skipped' })
      .eq('id', taskId);
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'skipped' } : t
    ));
  }, []);

  const addTask = useCallback(async (
    title: string,
    duration_minutes: number,
    type: PlanTask['type']
  ) => {
    if (!userId || !title.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const nextOrder = tasks.length + 1;
    const { data, error } = await supabase
      .from('daily_task_queue')
      .insert({
        user_id: userId, day_date: today,
        title: title.trim(), duration_minutes, type,
        order_num: nextOrder, status: 'pending',
        reason: 'Adicionado manualmente',
      })
      .select().single();
    if (!error && data) setTasks(prev => [...prev, data as PlanTask]);
  }, [userId, tasks.length]);

  return {
    tasks, loading, generating,
    done, total, progress, doneMinutes, nextTask, isAllDone,
    startTask, completeTask, skipTask, addTask,
    reload: load,
  };
}
