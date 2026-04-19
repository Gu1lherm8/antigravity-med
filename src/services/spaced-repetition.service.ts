/**
 * spaced-repetition.service.ts
 * 
 * Service que integra Curva de Esquecimento com:
 * - Caderno de Erros
 * - Study Sessions (aulas assistidas)
 * - Performance tracking
 * - Notificações
 */

import { supabase } from '../lib/supabase'
import {
  SpacedRepetitionEngine,
  ReviewSchedule,
  PerformanceMetric,
} from '../lib/intelligence/SpacedRepetitionEngine'

// ============================================
// TIPOS
// ============================================

export interface SpacedReviewRecord {
  id: string
  itemType: 'topic' | 'lesson' | 'summary' | 'question'
  itemId: string
  topicId: string
  subjectId: string
  topicName: string
  subjectName: string
  easeFactor: number
  intervalDays: number
  reviewCount: number
  lastReviewDate: Date | null
  nextReviewDate: Date
  accuracyPercent: number
  retentionRate: number
}

export interface ReviewNotification {
  id: string
  type: 'overdue' | 'due_today' | 'scheduled' | 'critical'
  priority: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO'
  title: string
  message: string
  topicId: string
  subjectId: string
  isRead: boolean
  createdAt: Date
}

// ============================================
// SERVICE
// ============================================

export const spacedRepetitionService = {
  /**
   * Criar agendamento de revisão para um tópico
   */
  async createReviewSchedule(
    topicId: string,
    subjectId: string,
    accuracy: number,
    sessionCount: number = 1
  ): Promise<SpacedReviewRecord> {
    try {
      const { data: topic } = await supabase
        .from('topics')
        .select('name, subjects(id, name)')
        .eq('id', topicId)
        .single()

      if (!topic) throw new Error('Tópico não encontrado')

      const subject = topic.subjects as any
      const reviewSchedule = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date(),
        accuracyPercent: accuracy,
        subjectName: subject.name,
        reviewCount: sessionCount,
      })

      const { data, error } = await supabase
        .from('spaced_review_schedule')
        .upsert({
          item_type: 'topic',
          item_id: topicId,
          topic_id: topicId,
          subject_id: subjectId,
          ease_factor: reviewSchedule.easeFactor,
          interval_days: reviewSchedule.intervalDays,
          review_count: reviewSchedule.reviewCount,
          accuracy_percent: accuracy,
          retention_rate: reviewSchedule.retentionRate,
          last_review_date: new Date().toISOString(),
          next_review_date: reviewSchedule.nextReviewDate.toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      return this.mapDbRecordToInterface(data)
    } catch (error) {
      console.error('Erro ao criar agendamento de revisão:', error)
      throw error
    }
  },

  /**
   * Registrar conclusão de uma revisão e calcular próxima
   */
  async completeReview(
    scheduleId: string,
    qualityScore: number, // 0-5
    accuracyPercent: number,
    confidenceLevel?: number
  ): Promise<SpacedReviewRecord> {
    try {
      // Buscar agendamento atual
      const { data: schedule } = await supabase
        .from('spaced_review_schedule')
        .select('*')
        .eq('id', scheduleId)
        .single()

      if (!schedule) throw new Error('Agendamento não encontrado')

      // Calcular próxima revisão com SM2
      const reviewSchedule = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date(),
        accuracyPercent,
        subjectName: schedule.subject?.name || 'Outro',
        currentIntervalDays: schedule.interval_days,
        currentEaseFactor: schedule.ease_factor,
        reviewCount: schedule.review_count,
      })

      // Atualizar agendamento
      const { data: updated, error: updateError } = await supabase
        .from('spaced_review_schedule')
        .update({
          ease_factor: reviewSchedule.easeFactor,
          interval_days: reviewSchedule.intervalDays,
          review_count: reviewSchedule.reviewCount + 1,
          accuracy_percent: accuracyPercent,
          retention_rate: reviewSchedule.retentionRate,
          last_review_date: new Date().toISOString(),
          next_review_date: reviewSchedule.nextReviewDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId)
        .select()
        .single()

      if (updateError) throw updateError

      // Registrar no histórico
      await supabase.from('review_session_history').insert({
        spaced_review_id: scheduleId,
        item_type: schedule.item_type,
        item_id: schedule.item_id,
        quality_score: qualityScore,
        accuracy_percent: accuracyPercent,
        confidence_level: confidenceLevel,
        new_ease_factor: reviewSchedule.easeFactor,
        new_interval_days: reviewSchedule.intervalDays,
        new_next_review_date: reviewSchedule.nextReviewDate.toISOString(),
        reviewed_at: new Date().toISOString(),
      })

      // Criar notificações se necessário
      await this.createNotificationsForSchedule(updated.id, updated)

      return this.mapDbRecordToInterface(updated)
    } catch (error) {
      console.error('Erro ao completar revisão:', error)
      throw error
    }
  },

  /**
   * Buscar agendamentos vencidos
   */
  async getOverdueReviews(): Promise<SpacedReviewRecord[]> {
    try {
      const { data, error } = await supabase
        .from('v_review_dashboard')
        .select('*')
        .eq('status', 'VENCIDO')
        .order('next_review_date', { ascending: true })

      if (error) throw error

      return (data || []).map((record) => this.mapDbVViewRecordToInterface(record))
    } catch (error) {
      console.error('Erro ao buscar revisões vencidas:', error)
      return []
    }
  },

  /**
   * Buscar agendamentos para hoje
   */
  async getReviewsDueToday(): Promise<SpacedReviewRecord[]> {
    try {
      const { data, error } = await supabase
        .from('v_review_dashboard')
        .select('*')
        .eq('status', 'HOJE')
        .order('priority', { ascending: true })

      if (error) throw error

      return (data || []).map((record) => this.mapDbVViewRecordToInterface(record))
    } catch (error) {
      console.error('Erro ao buscar revisões de hoje:', error)
      return []
    }
  },

  /**
   * Buscar agendamentos críticos
   */
  async getCriticalReviews(): Promise<SpacedReviewRecord[]> {
    try {
      const { data, error } = await supabase
        .from('v_review_dashboard')
        .select('*')
        .eq('priority', 'CRÍTICO')
        .order('days_since_review', { ascending: false })

      if (error) throw error

      return (data || []).map((record) => this.mapDbVViewRecordToInterface(record))
    } catch (error) {
      console.error('Erro ao buscar revisões críticas:', error)
      return []
    }
  },

  /**
   * Sincronizar performance de error_notebook com review_schedule
   * Chamado quando um erro é marcado como dominado ou melhorado
   */
  async syncErrorNotebookPerformance(topicName: string, subjectName: string) {
    try {
      // Buscar tópico
      const { data: topic } = await supabase
        .from('topics')
        .select('id, subject_id')
        .eq('name', topicName)
        .single()

      if (!topic) return

      // Buscar erros não dominados deste tópico
      const { data: errors } = await supabase
        .from('error_notebook')
        .select('*')
        .eq('topic', topicName)
        .eq('discipline', subjectName)
        .eq('mastered', false)

      // Calcular novo accuracy baseado em erros
      const errorCount = errors?.length || 0
      const accuracy = Math.max(0, 100 - errorCount * 5) // cada erro = -5%

      // Atualizar agendamento
      await this.createReviewSchedule(topic.id, topic.subject_id, accuracy)
    } catch (error) {
      console.error('Erro ao sincronizar caderno de erros:', error)
    }
  },

  /**
   * Integração com study_sessions: criar agendamento após sessão
   */
  async onStudySessionCompleted(
    topicId: string,
    subjectId: string,
    correctAnswers: number,
    totalQuestions: number
  ) {
    try {
      const accuracy = (correctAnswers / totalQuestions) * 100
      await this.createReviewSchedule(topicId, subjectId, accuracy)
    } catch (error) {
      console.error('Erro ao processar sessão de estudo:', error)
    }
  },

  /**
   * Atualizar notificações: marcar como lidas
   */
  async markNotificationsAsRead(notificationIds: string[]) {
    try {
      await supabase
        .from('review_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', notificationIds)
    } catch (error) {
      console.error('Erro ao marcar notificações como lidas:', error)
    }
  },

  /**
   * Enviar notificação de revisão via browser
   */
  async sendBrowserNotification(notification: ReviewNotification) {
    if (!('Notification' in window)) return

    if (Notification.permission !== 'granted') {
      await Notification.requestPermission()
    }

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '📚',
        badge: '🎓',
        tag: `review-${notification.id}`,
      })

      // Marcar como enviada no BD
      await supabase
        .from('review_notifications')
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq('id', notification.id)
    }
  },

  /**
   * Obter métricas agregadas por matéria
   */
  async getSubjectMetrics() {
    try {
      const { data, error } = await supabase
        .from('v_subject_review_metrics')
        .select('*')

      if (error) throw error
      return data
    } catch (error) {
      console.error('Erro ao buscar métricas de matéria:', error)
      return []
    }
  },

  /**
   * Injeta uma revisão de emergência (vinda da UTI)
   * Força o intervalo para 1 dia e aumenta a prioridade
   */
  async injectUTIEmergencyReview(topicId: string, subjectId: string) {
    try {
      const { data: schedule } = await supabase
        .from('spaced_review_schedule')
        .select('*')
        .eq('topic_id', topicId)
        .single()

      const nextReview = new Date()
      nextReview.setDate(nextReview.getDate() + 1) // Amanhã sem falta

      const { data: updated, error } = await supabase
        .from('spaced_review_schedule')
        .upsert({
          topic_id: topicId,
          subject_id: subjectId,
          item_type: 'topic',
          item_id: topicId,
          interval_days: 1, // Reset para 1 dia
          ease_factor: 1.3, // Prioridade máxima (fica difícil)
          next_review_date: nextReview.toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Criar notificação CRÍTICA
      await supabase.from('review_notifications').insert({
        notification_type: 'critical',
        priority: 'CRÍTICO',
        title: '🚨 UTI: Revisão de Emergência',
        message: 'Um tópico crítico foi injetado na sua rotina via UTI. Revise amanhã!',
        spaced_review_id: updated.id,
        topic_id: topicId,
        subject_id: subjectId,
        created_at: new Date().toISOString()
      })

      return updated
    } catch (error) {
      console.error('Erro ao injetar emergência UTI:', error)
      throw error
    }
  },

  // ===== HELPERS =====

  private mapDbRecordToInterface(data: any): SpacedReviewRecord {
    return {
      id: data.id,
      itemType: data.item_type,
      itemId: data.item_id,
      topicId: data.topic_id,
      subjectId: data.subject_id,
      topicName: data.topic?.name || 'Unknown',
      subjectName: data.subject?.name || 'Unknown',
      easeFactor: data.ease_factor,
      intervalDays: data.interval_days,
      reviewCount: data.review_count,
      lastReviewDate: data.last_review_date ? new Date(data.last_review_date) : null,
      nextReviewDate: new Date(data.next_review_date),
      accuracyPercent: data.accuracy_percent,
      retentionRate: data.retention_rate,
    }
  },

  private mapDbVViewRecordToInterface(data: any): SpacedReviewRecord {
    return {
      id: data.id,
      itemType: 'topic',
      itemId: data.item_id,
      topicId: data.topic_id,
      subjectId: data.subject_id,
      topicName: data.topic_name,
      subjectName: data.subject_name,
      easeFactor: data.ease_factor,
      intervalDays: data.interval_days,
      reviewCount: data.review_count,
      lastReviewDate: data.last_review_date ? new Date(data.last_review_date) : null,
      nextReviewDate: new Date(data.next_review_date),
      accuracyPercent: data.accuracy_percent,
      retentionRate: data.retention_rate,
    }
  },

  private async createNotificationsForSchedule(scheduleId: string, schedule: any) {
    const reviewDate = new Date(schedule.next_review_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    reviewDate.setHours(0, 0, 0, 0)

    const daysUntilReview = Math.floor(
      (reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    let notificationType: 'overdue' | 'due_today' | 'scheduled' | 'critical'
    let priority: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO'
    let title: string
    let message: string

    if (daysUntilReview < -7 && schedule.accuracy_percent < 70) {
      notificationType = 'critical'
      priority = 'CRÍTICO'
      title = '🚨 Revisão Crítica'
      message = `${schedule.topic?.name} está vencido há muitos dias e com performance baixa!`
    } else if (daysUntilReview < 0) {
      notificationType = 'overdue'
      priority = 'ALTO'
      title = '⚠️ Revisão Vencida'
      message = `${schedule.topic?.name} estava programada para há ${Math.abs(daysUntilReview)} dias`
    } else if (daysUntilReview === 0) {
      notificationType = 'due_today'
      priority = 'MÉDIO'
      title = '📌 Revisão para Hoje'
      message = `Hora de revisar ${schedule.topic?.name}!`
    } else {
      notificationType = 'scheduled'
      priority = 'BAIXO'
      title = '📅 Revisão Programada'
      message = `${schedule.topic?.name} em ${daysUntilReview} dias`
    }

    await supabase.from('review_notifications').insert({
      notification_type: notificationType,
      priority,
      title,
      message,
      spaced_review_id: scheduleId,
      topic_id: schedule.topic_id,
      subject_id: schedule.subject_id,
      created_at: new Date().toISOString(),
    })
  },
}

export default spacedRepetitionService
