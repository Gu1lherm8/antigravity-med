// ==========================================
// lib/intelligence/GapDetector.ts
// Detecta automaticamente lacunas de aprendizagem
// com base na performance do aluno.
// SEM dependência de IA externa — algoritmo puro.
// ==========================================

import { supabase } from '../supabase';
import { GapPrioritizer, type GapMeta, type ScoredGap } from './GapPrioritizer';

export interface DetectedGapSummary {
  created: number;
  updated: number;
  resolved: number;
  gaps: ScoredGap[];
}

export class GapDetector {

  /**
   * Ponto de entrada principal.
   * Lê a performance do usuário e atualiza a tabela learning_gaps.
   */
  static async runForUser(userId: string): Promise<DetectedGapSummary> {
    const summary: DetectedGapSummary = { created: 0, updated: 0, resolved: 0, gaps: [] };

    // 1. Buscar configurações (data da prova, horas/dia)
    const { data: settings } = await supabase
      .from('course_sync_settings')
      .select('exam_date, daily_hours')
      .eq('user_id', userId)
      .single();

    const testDate = settings?.exam_date
      ? new Date(settings.exam_date)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // fallback: 90 dias

    const dailyHours = settings?.daily_hours ?? 4;

    const prioritizer = new GapPrioritizer(testDate, dailyHours);

    // 2. Buscar todos os tópicos com performance registrada (abaixo de 80%)
    const { data: performances } = await supabase
      .from('concept_performance')
      .select(`
        *,
        topic:topics(
          id, name,
          prerequisites:topic_dependencies!topic_id(count)
        )
      `)
      .eq('user_id', userId)
      .lt('accuracy_percent', 80); // Apenas onde ainda há lacuna

    if (!performances || performances.length === 0) return summary;

    for (const perf of performances) {
      const topicId = perf.topic_id;
      const topic = perf.topic;
      const dependentCount = Number(topic?.prerequisites?.[0]?.count ?? 0);

      // 3. Montar o objeto GapMeta para o Prioritizer
      const meta: GapMeta = {
        conceptId: topicId,
        conceptName: topic?.name ?? 'Desconhecido',
        currentAccuracy: perf.accuracy_percent ?? 0,
        lastReviewed: perf.last_attempted
          ? new Date(perf.last_attempted)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // nunca revisado = 30 dias atrás
        isPrerequisite: dependentCount > 0,
        dependentConceptsCount: dependentCount,
      };

      // 4. Calcular score
      const scored = prioritizer.calculateScores(meta);
      summary.gaps.push(scored);

      // 5. Verificar se já existe um gap para esse tópico
      const { data: existing } = await supabase
        .from('learning_gaps')
        .select('id')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .single();

      const gapPayload = {
        user_id: userId,
        topic_id: topicId,
        priority_score: scored.priority_score,
        priority_level: scored.priority_level,
        impact_score: scored.impact_score,
        urgency_score: scored.urgency_score,
        decay_score: scored.decay_score,
        dependency_score: scored.dependency_score,
        reason: scored.reason,
        next_action: GapDetector.buildNextAction(scored),
        estimated_minutes: scored.estimated_minutes,
        is_resolved: false,
        last_calculated: new Date().toISOString(),
      };

      if (existing) {
        // Atualizar
        await supabase.from('learning_gaps').update(gapPayload).eq('id', existing.id);
        summary.updated++;
      } else {
        // Criar novo gap
        await supabase.from('learning_gaps').insert(gapPayload);
        summary.created++;
      }
    }

    // 6. Marcar gaps como resolvidos quando acurácia >= 80%
    const { data: resolved } = await supabase
      .from('concept_performance')
      .select('topic_id')
      .eq('user_id', userId)
      .gte('accuracy_percent', 80);

    if (resolved && resolved.length > 0) {
      const resolvedIds = resolved.map(r => r.topic_id);
      const { count } = await supabase
        .from('learning_gaps')
        .update({ is_resolved: true })
        .eq('user_id', userId)
        .in('topic_id', resolvedIds)
        .eq('is_resolved', false)
        .select('id', { count: 'exact' });
      summary.resolved = count ?? 0;
    }

    return summary;
  }

  /**
   * Gera o texto de "próxima ação" baseado no tipo de gap.
   * Ex: "Resolver 5 questões de Meiose" ou "Revisar teoria de Fotossíntese"
   */
  private static buildNextAction(gap: ScoredGap): string {
    if (gap.priority_level === 'CRÍTICO') {
      return `Resolver 10 questões de ${gap.topic_name}`;
    }
    if (gap.priority_level === 'ALTO') {
      return `Resolver 5 questões de ${gap.topic_name}`;
    }
    if (gap.decay_score > 70) {
      return `Revisar anotações de ${gap.topic_name} (15 min)`;
    }
    return `Estudar ${gap.topic_name} pelo material do cursinho`;
  }

  /**
   * Registra uma resposta do aluno e atualiza concept_performance.
   * Deve ser chamado sempre que o aluno termina um exercício dentro do app.
   */
  static async recordAnswer(
    userId: string,
    topicId: string,
    isCorrect: boolean,
    timeSpentSeconds: number = 60
  ): Promise<void> {
    // Busca ou cria o registro de performance
    const { data: existing } = await supabase
      .from('concept_performance')
      .select('*')
      .eq('user_id', userId)
      .eq('topic_id', topicId)
      .single();

    const now = new Date().toISOString();

    if (existing) {
      const newCorrect = existing.correct_count + (isCorrect ? 1 : 0);
      const newTotal = existing.total_attempts + 1;
      await supabase
        .from('concept_performance')
        .update({
          correct_count: newCorrect,
          total_attempts: newTotal,
          accuracy_percent: Math.round((newCorrect / newTotal) * 100),
          last_attempted: now,
          last_correct: isCorrect ? now : existing.last_correct,
          time_spent_total: existing.time_spent_total + timeSpentSeconds,
          updated_at: now,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('concept_performance').insert({
        user_id: userId,
        topic_id: topicId,
        correct_count: isCorrect ? 1 : 0,
        total_attempts: 1,
        accuracy_percent: isCorrect ? 100 : 0,
        last_attempted: now,
        last_correct: isCorrect ? now : null,
        time_spent_total: timeSpentSeconds,
      });
    }
  }
}
