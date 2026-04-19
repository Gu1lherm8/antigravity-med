// ==========================================
// lib/intelligence/Secretary.ts
// Orquestrador Principal do Plano de Estudos IA
// ==========================================

import { supabase } from '../supabase';
import type { LearningGap, ExternalActivity, SecretaryDailyPlanTask } from '../../types/study';

export class Secretary {
  
  /**
   * Obtém o plano de estudos para o dia atual.
   * Se não existir, tenta gerar um novo via API.
   */
  static async getTodaysPlan(): Promise<SecretaryDailyPlanTask[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Em um ambiente real, usaríamos o ID do usuário logado.
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      // 1. Verificar se já existe um plano gerado hoje
      const todayString = new Date().toISOString().split('T')[0];
      const { data: existingPlan } = await supabase
        .from('daily_task_queue')
        .select('*')
        .eq('user_id', userId)
        .eq('day_date', todayString)
        .order('order_num');

      if (existingPlan && existingPlan.length > 0) {
        return existingPlan.map(p => ({
          order: p.order_num,
          action: p.title,
          duration: p.duration_minutes,
          reason: p.reason,
          concept_id: p.topic_id,
          priority: p.priority,
          type: p.type
        }));
      }

      // 2. Se não existir, gerar um plano "emergencial" localmente (ou chamar API)
      // Por simplicidade no MVP, vamos buscar os top 3 gaps críticos
      return await this.generateLocalEmergencyPlan(userId);

    } catch (error) {
      console.error('❌ ANTIGRAVITY: Erro ao obter plano do Secretário:', error);
      return [];
    }
  }

  /**
   * Gera um plano básico sem chamar a IA, apenas baseado na matemática dos Gaps.
   */
  private static async generateLocalEmergencyPlan(userId: string): Promise<SecretaryDailyPlanTask[]> {
    const { data: gaps } = await supabase
      .from('learning_gaps')
      .select('*, topic:topics(name, subject:subjects(name))')
      .eq('user_id', userId)
      .order('priority_score', { ascending: false })
      .limit(3);

    if (!gaps || gaps.length === 0) return [];

    return gaps.map((gap, idx) => ({
      order: idx + 1,
      action: `${gap.priority_level === 'CRÍTICO' ? '🚨 REVISÃO URGENTE' : '💡 ESTUDO'}: ${gap.topic?.name}`,
      duration: gap.priority_level === 'CRÍTICO' ? 45 : 30,
      reason: gap.reason || 'Baseado no seu desempenho recente.',
      concept_id: gap.topic_id,
      priority: gap.priority_level === 'BAIXO' ? 'MÉDIO' : gap.priority_level as any,
      type: gap.priority_level === 'CRÍTICO' ? 'summary' : 'question'
    }));
  }

  /**
   * Registra uma atividade externa (cursinho) no sistema.
   */
  static async syncExternalActivity(title: string, source: 'scanner' | 'moodle', subjectName?: string) {
    try {
      // Tentar encontrar o subject_id pelo nome
      let subjectId = null;
      if (subjectName) {
        const { data: subj } = await supabase
          .from('subjects')
          .select('id')
          .ilike('name', subjectName)
          .single();
        subjectId = subj?.id;
      }

      await supabase
        .from('external_activities')
        .insert({
          source,
          type: 'video_lesson',
          title,
          subject_id: subjectId,
          study_date: new Date().toISOString()
        });
      
      return true;
    } catch (error) {
      console.error('❌ ANTIGRAVITY: Erro ao sincronizar atividade externa:', error);
      return false;
    }
  }

  /**
   * Adiciona uma tarefa de emergência à fila do dia atual.
   */
  static async addEmergencyTask(topicId: string, title: string, duration: number = 45) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';
      const todayString = new Date().toISOString().split('T')[0];

      // Pegar a última ordem
      const { data: currentTasks } = await supabase
        .from('daily_task_queue')
        .select('order_num')
        .eq('user_id', userId)
        .eq('day_date', todayString)
        .order('order_num', { ascending: false })
        .limit(1);

      const nextOrder = currentTasks && currentTasks.length > 0 ? currentTasks[0].order_num + 1 : 1;

      await supabase.from('daily_task_queue').insert({
        user_id: userId,
        day_date: todayString,
        title: `🚨 UTI: ${title}`,
        duration_minutes: duration,
        reason: 'Recuperação urgente baseada em erro crítico na UTI.',
        topic_id: topicId,
        priority: 'CRÍTICO',
        type: 'summary',
        order_num: nextOrder
      });

      return true;
    } catch (error) {
      console.error('❌ ANTIGRAVITY: Erro ao adicionar tarefa de emergência:', error);
      return false;
    }
  }
}
