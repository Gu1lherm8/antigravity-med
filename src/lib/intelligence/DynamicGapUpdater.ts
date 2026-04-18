// ==========================================
// lib/intelligence/DynamicGapUpdater.ts
// Reatividade em Tempo Real para Gaps de Aprendizagem
// ==========================================

import { supabase } from '../supabase';
import { GapPrioritizer, type ScoredGap } from './GapPrioritizer';

export class DynamicGapUpdater {
  
  /**
   * Reage a uma resposta de questão/simulado para atualizar o score do tópico.
   */
  static async onActivityCompleted(userId: string, topicId: string, isCorrect: boolean, timeSpentSec: number) {
    try {
      // 1. Atualizar ou Criar Performance do Conceito
      const { data: currentPerf, error: fetchError } = await supabase
        .from('concept_performance')
        .select('*')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const newCorrect = (currentPerf?.correct_count || 0) + (isCorrect ? 1 : 0);
      const newTotal = (currentPerf?.total_attempts || 0) + 1;
      const newAccuracy = (newCorrect / newTotal) * 100;

      const { error: upsertPerfError } = await supabase
        .from('concept_performance')
        .upsert({
          user_id: userId,
          topic_id: topicId,
          correct_count: newCorrect,
          total_attempts: newTotal,
          accuracy_percent: newAccuracy,
          time_spent_total: (currentPerf?.time_spent_total || 0) + timeSpentSec,
          last_attempted: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (upsertPerfError) throw upsertPerfError;

      // 2. Recalcular Score de Gap para este tópico
      await this.refreshGapScore(userId, topicId);

    } catch (error) {
      console.error('❌ ANTIGRAVITY: Erro ao atualizar gap dinamicamente:', error);
    }
  }

  /**
   * Recalcula explicitamente o score de um tópico.
   */
  static async refreshGapScore(userId: string, topicId: string) {
    // Buscar configurações do usuário (data da prova, horas por dia)
    const { data: settings } = await supabase
      .from('user_study_settings')
      .select('hours_per_day')
      .eq('user_id', userId)
      .single();

    // Buscar performance do tópico
    const { data: perf } = await supabase
      .from('concept_performance')
      .select(`*, topic:topics(name, priority)`)
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    if (!perf) return;

    // Configuração base (idealmente viria de um perfil do usuário)
    const testDate = new Date('2025-11-03'); // ENEM 2025 aprox
    const dailyHours = settings?.hours_per_day || 4;

    const prioritizer = new GapPrioritizer(testDate, dailyHours);
    
    // Preparar metadados para o prioritizer
    const scored: ScoredGap = prioritizer.calculateScores({
      conceptId: topicId,
      conceptName: perf.topic?.name || 'Assunto',
      currentAccuracy: perf.accuracy_percent,
      lastReviewed: new Date(perf.last_attempted || Date.now()),
      isPrerequisite: perf.topic?.priority === 1, // Exemplo: prioridade 1 = base
      dependentConceptsCount: 2 // Idealmente vem de uma tabela de grafos
    });

    // Salvar na tabela de gaps final
    await supabase
      .from('learning_gaps')
      .upsert({
        user_id: userId,
        topic_id: topicId,
        priority_score: scored.priority_score,
        priority_level: scored.priority_level,
        impact_score: scored.impact_score,
        urgency_score: scored.urgency_score,
        decay_score: scored.decay_score,
        dependency_score: scored.dependency_score,
        reason: scored.reason,
        next_action: scored.priority_level === 'CRÍTICO' ? 'Revisão Teórica Urgente' : 'Sessão de Questões',
        last_calculated: new Date().toISOString()
      });
  }
}
