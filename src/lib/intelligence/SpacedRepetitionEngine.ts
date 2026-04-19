/**
 * SpacedRepetitionEngine.ts
 * 
 * Motor de Revisão Espaçada usando SuperMemo 2 com suporte a periodização customizada.
 * Disciplinas críticas (Bio, Física, Química, Matemática) seguem SM2 rigoroso.
 * Outras disciplinas têm intervalos mais flexíveis.
 * 
 * Integração com Neurociência: Ebbinghaus + SM2 + Neuroplasticidade
 */

import { Database } from './types/study'

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface ReviewSchedule {
  nextReviewDate: Date
  intervalDays: number
  easeFactor: number
  reviewCount: number
  lastReviewDate: Date | null
  confidenceScore: number // 0-1
  retentionRate: number // % estimado de retenção
}

export interface ReviewConfig {
  subjectName: string
  isCritical: boolean // Bio, Física, Química, Matemática
  baseIntervals: number[]
  hardMultiplier: number // 0.5-0.8 (reduz intervalo se performance < 70%)
}

export interface PerformanceMetric {
  topicId: string
  topicName: string
  subjectId: string
  subjectName: string
  accuracyPercent: number
  totalAttempts: number
  correctAttempts: number
  lastAttemptDate: Date
  isDue: boolean
  daysSinceLastReview: number
  reviewPriority: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO'
}

// ============================================
// CONFIGURAÇÃO DE DISCIPLINAS
// ============================================

export const CRITICAL_SUBJECTS = ['Biologia', 'Física', 'Química', 'Matemática']

export const REVIEW_CONFIGS: Record<string, ReviewConfig> = {
  'Biologia': {
    subjectName: 'Biologia',
    isCritical: true,
    baseIntervals: [1, 3, 7, 14, 30, 60], // dias (SM2 rigoroso)
    hardMultiplier: 0.6,
  },
  'Física': {
    subjectName: 'Física',
    isCritical: true,
    baseIntervals: [1, 3, 7, 14, 30, 60],
    hardMultiplier: 0.5, // mais rigoroso que Bio (conteúdo cumulativo)
  },
  'Química': {
    subjectName: 'Química',
    isCritical: true,
    baseIntervals: [1, 3, 7, 14, 30, 60],
    hardMultiplier: 0.6,
  },
  'Matemática': {
    subjectName: 'Matemática',
    isCritical: true,
    baseIntervals: [1, 3, 7, 14, 30, 60],
    hardMultiplier: 0.5,
  },
  // Padrão para outras matérias (mais flexível)
  'default': {
    subjectName: 'Outro',
    isCritical: false,
    baseIntervals: [2, 5, 10, 21, 45], // intervalos maiores
    hardMultiplier: 0.7,
  },
}

// ============================================
// ALGORITMO SM2
// ============================================

/**
 * SuperMemo 2 (SM-2)
 * 
 * Entrada:
 *  - I(n): intervalo anterior (dias)
 *  - EF: ease factor anterior (0-1000, padrão 2500 = 2.5)
 *  - q: quality (0-5, onde 5 = perfeito, <3 = fail)
 * 
 * Saída:
 *  - I(n+1): novo intervalo
 *  - EF': novo ease factor
 * 
 * Fórmula original SM2:
 *  EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 *  se EF' < 1.3 então EF' = 1.3
 *  
 *  I(1) = 1
 *  I(2) = 3
 *  I(n) = I(n-1) * EF para n > 2
 */

export class SM2Calculator {
  /**
   * Calcula o próximo intervalo de revisão usando SM2
   */
  static calculateNextReview(
    previousInterval: number,
    easeFactor: number,
    quality: number // 0-5
  ): {
    nextInterval: number
    newEaseFactor: number
  } {
    // Validação de entrada
    if (quality < 0 || quality > 5) {
      throw new Error('Quality deve estar entre 0 e 5')
    }

    let newEaseFactor = easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    if (newEaseFactor < 1.3) {
      newEaseFactor = 1.3
    }

    let nextInterval: number

    if (quality < 3) {
      // Falha: volta para o começo
      nextInterval = 1
    } else if (previousInterval === 0) {
      // Primeira revisão
      nextInterval = 1
    } else if (previousInterval === 1) {
      // Segunda revisão
      nextInterval = 3
    } else {
      // Revisões subsequentes
      nextInterval = Math.round(previousInterval * newEaseFactor)
    }

    return {
      nextInterval,
      newEaseFactor,
    }
  }

  /**
   * Calcula a taxa de retenção estimada usando curva de Ebbinghaus
   * R = e^(-t/S)
   * 
   * R: taxa de retenção (0-1)
   * t: tempo decorrido (dias)
   * S: force of memory (proporcional ao ease factor)
   */
  static calculateRetentionRate(daysSinceReview: number, easeFactor: number): number {
    const forceOfMemory = easeFactor * 10 // escalar para dias
    const retention = Math.exp(-daysSinceReview / forceOfMemory)
    return Math.max(0, Math.min(1, retention)) // clamp 0-1
  }
}

// ============================================
// ENGINE DE REVISÃO ESPAÇADA PRINCIPAL
// ============================================

export class SpacedRepetitionEngine {
  /**
   * Mapeia uma matéria para sua configuração de revisão
   */
  static getConfigForSubject(subjectName: string): ReviewConfig {
    return REVIEW_CONFIGS[subjectName] || REVIEW_CONFIGS['default']
  }

  /**
   * Calcula a próxima data de revisão baseado em:
   * 1. Performance atual (acertos < 70% = multiplica intervalo)
   * 2. Criticidade da matéria (SM2 rigoroso para críticas)
   * 3. Histórico de revisões (ease factor)
   */
  static calculateNextReviewDate(params: {
    lastCompletedDate: Date
    accuracyPercent: number
    subjectName: string
    currentIntervalDays?: number
    currentEaseFactor?: number
    reviewCount?: number
  }): ReviewSchedule {
    const config = this.getConfigForSubject(params.subjectName)
    const currentIntervalDays = params.currentIntervalDays || 0
    const currentEaseFactor = params.currentEaseFactor || 2.5
    const reviewCount = params.reviewCount || 0

    // ===== PASSO 1: Mapear accuracy para quality (0-5) =====
    // accuracy < 70% = "falha" na ótica SM2
    let quality: number
    if (params.accuracyPercent >= 95) quality = 5 // Perfeito
    else if (params.accuracyPercent >= 85) quality = 4 // Muito bom
    else if (params.accuracyPercent >= 70) quality = 3 // Bom (limite do "sucesso")
    else if (params.accuracyPercent >= 50) quality = 2 // Fraco
    else quality = 1 // Muito fraco

    // ===== PASSO 2: Calcular intervalo SM2 =====
    const sm2Result = SM2Calculator.calculateNextReview(
      currentIntervalDays,
      currentEaseFactor,
      quality
    )

    let intervalDays = sm2Result.nextInterval
    let easeFactor = sm2Result.newEaseFactor

    // ===== PASSO 3: Aplicar multiplicador para performance baixa =====
    if (params.accuracyPercent < 70) {
      const hardReduction = config.hardMultiplier
      intervalDays = Math.ceil(intervalDays * hardReduction)
    }

    // ===== PASSO 4: Cálculo de retenção estimada =====
    const retentionRate = SM2Calculator.calculateRetentionRate(
      intervalDays,
      easeFactor
    )

    // ===== PASSO 5: Calcular data =====
    const nextReviewDate = new Date(params.lastCompletedDate)
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays)

    const daysSinceLastReview = Math.floor(
      (Date.now() - params.lastCompletedDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    return {
      nextReviewDate,
      intervalDays,
      easeFactor,
      reviewCount: reviewCount + 1,
      lastReviewDate: params.lastCompletedDate,
      confidenceScore: params.accuracyPercent / 100,
      retentionRate,
    }
  }

  /**
   * Classifica o nível de prioridade de revisão baseado em:
   * - Dias em atraso
   * - Taxa de retenção estimada
   * - Performance histórica
   */
  static calculateReviewPriority(
    nextReviewDate: Date,
    accuracyPercent: number,
    retentionRate: number
  ): 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO' {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    nextReviewDate.setHours(0, 0, 0, 0)

    const daysOverdue = Math.floor(
      (today.getTime() - nextReviewDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // CRÍTICO: vencido há muito tempo + performance baixa
    if (daysOverdue >= 7 && accuracyPercent < 70) return 'CRÍTICO'
    if (daysOverdue >= 3 && retentionRate < 0.3) return 'CRÍTICO'

    // ALTO: vencido recentemente ou retenção muito baixa
    if (daysOverdue >= 1 || retentionRate < 0.4) return 'ALTO'

    // MÉDIO: vence nos próximos 2-3 dias
    if (daysOverdue >= -3) return 'MÉDIO'

    // BAIXO: futuro distante
    return 'BAIXO'
  }

  /**
   * Agrupa tópicos por prioridade de revisão para uma matéria
   */
  static prioritizeTopicsForSubject(
    topics: PerformanceMetric[]
  ): Map<'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO', PerformanceMetric[]> {
    const grouped = new Map<
      'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO',
      PerformanceMetric[]
    >()

    grouped.set('CRÍTICO', [])
    grouped.set('ALTO', [])
    grouped.set('MÉDIO', [])
    grouped.set('BAIXO', [])

    topics.forEach((topic) => {
      const priority = this.calculateReviewPriority(
        topic.isDue ? new Date() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        topic.accuracyPercent,
        SM2Calculator.calculateRetentionRate(topic.daysSinceLastReview, 2.5)
      )
      grouped.get(priority)!.push(topic)
    })

    return grouped
  }

  /**
   * Estima quantos dias até o aluno "esquecer" completamente (retenção < 10%)
   */
  static daysUntilForgetfulness(
    daysSinceReview: number,
    easeFactor: number,
    threshold: number = 0.1
  ): number {
    // R = e^(-t/S), queremos R = threshold
    // t = -S * ln(threshold)
    const forceOfMemory = easeFactor * 10
    const daysUntilThreshold = -forceOfMemory * Math.log(threshold)
    return Math.round(Math.max(0, daysUntilThreshold - daysSinceReview))
  }
}

