/**
 * uti-calendar-integration.ts
 *
 * Integração entre UTI (Unidade de Terapia Intensiva de Erros)
 * e CalendarioSemanal para priorizar erros críticos
 *
 * Fluxo:
 * 1. Erro é injetado na UTI
 * 2. Sistema marca como CRÍTICO no spaced_review_schedule
 * 3. Calendário busca revisões CRÍTICAS de hoje
 * 4. Usuário vê alerta vermelho no calendário
 */

import React from 'react'
import { supabase } from '../lib/supabase'
import spacedRepetitionService from './spaced-repetition.service'
import { SpacedRepetitionEngine } from '../lib/intelligence/SpacedRepetitionEngine'

// ============================================
// TIPOS
// ============================================

export interface CriticalReview {
  id: string
  topicId: string
  topicName: string
  subjectId: string
  subjectName: string
  priority: 'CRÍTICO' | 'ALTO'
  daysOverdue: number
  accuracyPercent: number
  errorCount: number
  nextReviewDate: Date
  reason: string // Por que é crítico
}

export interface UTIInjectionEvent {
  errorNotebookId: string
  topicId: string
  subjectId: string
  topicName: string
  subjectName: string
  errorType: 'teoria' | 'interpretação' | 'cálculo'
  timestamp: Date
}

// ============================================
// SERVICE: UTI → Calendar Integration
// ============================================

export const utiCalendarIntegration = {
  /**
   * Processar injeção de tratamento da UTI
   * → Reduzir urgência de revisão
   * → Criar alerta no calendário
   */
  async onErrorInjected(event: UTIInjectionEvent): Promise<void> {
    try {
      console.log(
        `🏥 Erro injetado na UTI: ${event.topicName}/${event.subjectName}`
      )

      // 1. Marcar como revisão crítica no SM2
      await spacedRepetitionService.createReviewSchedule(
        event.topicId,
        event.subjectId,
        40 // accuracy baixa para forçar urgência
      )

      // 2. Criar notificação de revisão CRÍTICA
      const { data: schedule } = await supabase
        .from('spaced_review_schedule')
        .select('id')
        .eq('topic_id', event.topicId)
        .eq('subject_id', event.subjectId)
        .single()

      if (schedule) {
        await supabase.from('review_notifications').insert({
          notification_type: 'critical',
          priority: 'CRÍTICO',
          title: `🚨 Revisão Urgente: ${event.topicName}`,
          message: `Este tópico foi sinalizado na UTI e precisa de revisão imediata.`,
          spaced_review_id: schedule.id,
          topic_id: event.topicId,
          subject_id: event.subjectId,
          created_at: new Date().toISOString(),
        })
      }

      // 3. Adicionar à fila diária (secretary para hoje)
      const today = new Date()
      await supabase.from('daily_task_queue').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        day_date: today.toISOString().split('T')[0],
        order_num: 1, // Máxima prioridade
        type: 'review',
        title: `⚠️ Revisar: ${event.topicName}`,
        topic_id: event.topicId,
        subject_id: event.subjectId,
        duration_minutes: 20,
        reason: `Sinalizado na UTI como erro crítico (${event.errorType})`,
        status: 'pending',
      })

      console.log('✅ Revisão crítica criada no calendário para hoje')
    } catch (error) {
      console.error('Erro ao integrar UTI com Calendário:', error)
    }
  },

  /**
   * Buscar todas as revisões críticas do dia
   */
  async getCriticalReviewsForToday(): Promise<CriticalReview[]> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Buscar na view v_review_dashboard filtrado por CRÍTICO
      const { data } = await supabase
        .from('v_review_dashboard')
        .select(
          `
          id,
          topic_id,
          topic_name,
          subject_id,
          subject_name,
          priority,
          days_since_review,
          accuracy_percent,
          next_review_date
        `
        )
        .eq('priority', 'CRÍTICO')
        .lte('next_review_date', today.toISOString())
        .order('next_review_date', { ascending: true })

      // Buscar contagem de erros por tópico
      const criticalReviews: CriticalReview[] = []

      for (const item of data || []) {
        const { data: errors } = await supabase
          .from('error_notebook')
          .select('count')
          .eq('topic', item.topic_name)
          .eq('mastered', false)

        const daysOverdue = Math.floor(
          (today.getTime() - new Date(item.next_review_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )

        criticalReviews.push({
          id: item.id,
          topicId: item.topic_id,
          topicName: item.topic_name,
          subjectId: item.subject_id,
          subjectName: item.subject_name,
          priority: 'CRÍTICO',
          daysOverdue,
          accuracyPercent: item.accuracy_percent,
          errorCount: (errors?.[0]?.count as number) || 0,
          nextReviewDate: new Date(item.next_review_date),
          reason: `${daysOverdue} dias vencido + ${(errors?.[0]?.count as number) || 0} erros não resolvidos`,
        })
      }

      return criticalReviews
    } catch (error) {
      console.error('Erro ao buscar revisões críticas:', error)
      return []
    }
  },

  /**
   * Buscar revisões críticas por matéria
   */
  async getCriticalReviewsBySubject(subjectId: string): Promise<CriticalReview[]> {
    try {
      const today = new Date()

      const { data } = await supabase
        .from('v_review_dashboard')
        .select(
          `
          id,
          topic_id,
          topic_name,
          subject_id,
          subject_name,
          priority,
          accuracy_percent,
          next_review_date
        `
        )
        .eq('subject_id', subjectId)
        .eq('priority', 'CRÍTICO')
        .order('next_review_date', { ascending: true })

      const criticalReviews: CriticalReview[] = []

      for (const item of data || []) {
        const daysOverdue = Math.floor(
          (today.getTime() - new Date(item.next_review_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )

        criticalReviews.push({
          id: item.id,
          topicId: item.topic_id,
          topicName: item.topic_name,
          subjectId: item.subject_id,
          subjectName: item.subject_name,
          priority: 'CRÍTICO',
          daysOverdue,
          accuracyPercent: item.accuracy_percent,
          errorCount: 0,
          nextReviewDate: new Date(item.next_review_date),
          reason: `${daysOverdue} dias vencido (performance baixa)`,
        })
      }

      return criticalReviews
    } catch (error) {
      console.error('Erro ao buscar revisões críticas por matéria:', error)
      return []
    }
  },

  /**
   * Completar revisão crítica (marca como sincronizada)
   */
  async completeCriticalReview(
    scheduleId: string,
    accuracy: number
  ): Promise<void> {
    try {
      // Usar o service de spaced repetition para registrar conclusão
      await spacedRepetitionService.completeReview(scheduleId, 4, accuracy)

      // Remover das tarefas diárias críticas
      const { data: dailyTask } = await supabase
        .from('daily_task_queue')
        .select('id')
        .eq('type', 'review')
        .like('title', '%Revisar%')
        .eq('status', 'pending')
        .single()

      if (dailyTask) {
        await supabase
          .from('daily_task_queue')
          .update({ status: 'done' })
          .eq('id', dailyTask.id)
      }

      console.log('✅ Revisão crítica completada!')
    } catch (error) {
      console.error('Erro ao completar revisão crítica:', error)
    }
  },

  /**
   * Validar se revisão é realmente crítica
   */
  isCritical(review: CriticalReview): boolean {
    const TODAY = new Date()
    const reviewDate = new Date(review.nextReviewDate)
    const daysOverdue = Math.floor(
      (TODAY.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Critério 1: Vencido 7+ dias E performance < 70%
    if (daysOverdue >= 7 && review.accuracyPercent < 70) {
      return true
    }

    // Critério 2: Muitos erros não resolvidos
    if (review.errorCount >= 3) {
      return true
    }

    // Critério 3: Retenção muito baixa
    const retention = SpacedRepetitionEngine.calculateReviewPriority(
      reviewDate,
      review.accuracyPercent,
      0.3
    )
    return retention === 'CRÍTICO'
  },

  /**
   * Gerar badge visual para o calendário
   */
  getBadgeHTML(review: CriticalReview): string {
    const urgency = this.isCritical(review) ? '🔴' : '🟠'

    return `
      <div style="
        background: ${this.isCritical(review) ? '#fee2e2' : '#fef3c7'};
        border: 2px solid ${this.isCritical(review) ? '#ef4444' : '#f59e0b'};
        border-radius: 6px;
        padding: 8px;
        margin: 4px 0;
        font-size: 12px;
      ">
        <div style="font-weight: 600; color: ${this.isCritical(review) ? '#991b1b' : '#92400e'};">
          ${urgency} ${review.topicName}
        </div>
        <div style="font-size: 11px; color: ${this.isCritical(review) ? '#7f1d1d' : '#b45309'}; margin-top: 4px;">
          ${review.reason}
        </div>
      </div>
    `
  },
}

// ============================================
// HOOK PARA REACT (CalendarioSemanal)
// ============================================

export function useCalendarCriticalReviews() {
  const [criticalReviews, setCriticalReviews] = React.useState<CriticalReview[]>(
    []
  )
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const loadCritical = async () => {
      try {
        const reviews =
          await utiCalendarIntegration.getCriticalReviewsForToday()
        setCriticalReviews(reviews)
      } catch (error) {
        console.error('Erro ao carregar revisões críticas:', error)
      } finally {
        setLoading(false)
      }
    }

    loadCritical()

    // Atualizar a cada 5 minutos
    const interval = setInterval(loadCritical, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { criticalReviews, loading }
}

export default utiCalendarIntegration
