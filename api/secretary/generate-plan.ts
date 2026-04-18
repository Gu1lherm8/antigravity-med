// ==========================================
// api/secretary/generate-plan.ts
// Gera o plano de estudos diário LOCALMENTE
// SEM dependência de IA externa ou Gemini API
// Usa o GapPrioritizer + lógica de tempo
// ==========================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

const TASK_TYPE_LABELS: Record<string, string> = {
  CRÍTICO: 'questions',
  ALTO: 'questions',
  MÉDIO: 'theory',
  BAIXO: 'review',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Verificar se já existe plano gerado hoje para evitar duplicatas
    const { data: existingPlan } = await supabase
      .from('daily_task_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('day_date', today)
      .order('order_num');

    if (existingPlan && existingPlan.length > 0) {
      return res.status(200).json({
        message: 'Plano já existe para hoje.',
        plan: existingPlan,
        cached: true,
      });
    }

    // 2. Buscar settings do usuário (horas disponíveis)
    const { data: settings } = await supabase
      .from('course_sync_settings')
      .select('daily_hours')
      .eq('user_id', userId)
      .maybeSingle();

    const dailyHoursAvailable = settings?.daily_hours ?? 3;
    let remainingMinutes = Math.round(dailyHoursAvailable * 60);

    // 3. Buscar os top gaps não resolvidos (ordenados por score)
    const { data: gaps, error: gapsErr } = await supabase
      .from('learning_gaps')
      .select(`
        *,
        topic:topics(id, name, subject:subjects(name))
      `)
      .eq('user_id', userId)
      .eq('is_resolved', false)
      .order('priority_score', { ascending: false })
      .limit(15);

    if (gapsErr) throw gapsErr;

    // 4. Buscar atividades do Moodle não mapeadas (que ainda não viraram gap)
    const { data: pending } = await supabase
      .from('external_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('study_date', { ascending: true })
      .limit(5);

    // 5. Construir a fila de tarefas inteligente
    const planTasks: {
      order_num: number;
      title: string;
      duration_minutes: number;
      reason: string;
      type: string;
      topic_id: string | null;
      gap_id: string | null;
    }[] = [];

    let order = 1;

    // 5a. Primeiros: gaps CRÍTICOS e ALTOS (exercícios)
    for (const gap of (gaps ?? [])) {
      if (remainingMinutes <= 0) break;

      const duration = Math.min(gap.estimated_minutes ?? 30, remainingMinutes);
      if (duration < 10) break; // não vale adicionar bloco menor que 10 min

      const taskType = TASK_TYPE_LABELS[gap.priority_level] ?? 'theory';

      planTasks.push({
        order_num: order++,
        title: gap.next_action ?? `Estudar ${gap.topic?.name}`,
        duration_minutes: duration,
        reason: gap.reason ?? 'Alta prioridade no seu plano de estudos.',
        type: taskType,
        topic_id: gap.topic_id,
        gap_id: gap.id,
      });

      remainingMinutes -= duration;
    }

    // 5b. No tempo restante: tarefas pendentes do Moodle (não feitas ainda)
    for (const act of (pending ?? [])) {
      if (remainingMinutes <= 0) break;
      const duration = act.type === 'quiz' ? 20 : 15;
      if (duration > remainingMinutes) break;

      planTasks.push({
        order_num: order++,
        title: `📚 Cursinho: ${act.title}`,
        duration_minutes: duration,
        reason: 'Atividade pendente no seu cursinho — importante não atrasar.',
        type: act.type === 'quiz' ? 'questions' : 'theory',
        topic_id: act.topic_id ?? null,
        gap_id: null,
      });

      remainingMinutes -= duration;
    }

    // 5c. Se não há nada para fazer, criar tarefa de revisão geral
    if (planTasks.length === 0) {
      planTasks.push({
        order_num: 1,
        title: '🎉 Revisão Livre',
        duration_minutes: 30,
        reason: 'Nenhum gap crítico detectado. Faça uma revisão do que quiser!',
        type: 'review',
        topic_id: null,
        gap_id: null,
      });
    }

    // 6. Salvar o plano gerado no banco
    const toInsert = planTasks.map(t => ({
      user_id: userId,
      day_date: today,
      ...t,
      status: 'pending',
    }));

    const { data: savedPlan, error: insertErr } = await supabase
      .from('daily_task_queue')
      .insert(toInsert)
      .select();

    if (insertErr) throw insertErr;

    return res.status(200).json({
      message: 'Plano gerado com sucesso!',
      plan: savedPlan,
      cached: false,
      stats: {
        total_tasks: planTasks.length,
        total_minutes: planTasks.reduce((a, b) => a + b.duration_minutes, 0),
        gaps_included: planTasks.filter(t => t.gap_id).length,
        moodle_tasks: planTasks.filter(t => !t.gap_id && t.topic_id).length,
      }
    });

  } catch (error: any) {
    console.error('❌ generate-plan error:', error);
    return res.status(500).json({ error: error.message });
  }
}
