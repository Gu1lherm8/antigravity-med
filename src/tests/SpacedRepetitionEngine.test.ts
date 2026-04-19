/**
 * SpacedRepetitionEngine.test.ts
 *
 * Suite completa de testes para o motor SM2 e Ebbinghaus
 * Usa Vitest como framework
 *
 * Executar: npm run test ou vitest run
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  SpacedRepetitionEngine,
  SM2Calculator,
  CRITICAL_SUBJECTS,
  REVIEW_CONFIGS,
} from './SpacedRepetitionEngine'

// ============================================
// TESTES: SM2Calculator
// ============================================

describe('SM2Calculator', () => {
  describe('calculateNextReview', () => {
    it('deve resetar para 1 dia se quality < 3', () => {
      const result = SM2Calculator.calculateNextReview(
        7, // intervalo anterior
        2.5, // ease factor anterior
        2 // quality: falha
      )

      expect(result.nextInterval).toBe(1)
    })

    it('deve manter 3 dias se intervalo anterior é 1 e quality >= 3', () => {
      const result = SM2Calculator.calculateNextReview(1, 2.5, 4)
      expect(result.nextInterval).toBe(3)
    })

    it('deve aumentar intervalo multiplicando pelo ease factor se quality >= 3', () => {
      const result = SM2Calculator.calculateNextReview(7, 2.5, 5)
      // 7 * 2.5 = 17.5 → Math.round(17.5) = 18
      expect(result.nextInterval).toBe(18)
    })

    it('deve aumentar ease factor se quality = 5', () => {
      const result = SM2Calculator.calculateNextReview(7, 2.5, 5)
      expect(result.newEaseFactor).toBeGreaterThan(2.5)
    })

    it('deve diminuir ease factor se quality < 5', () => {
      const result1 = SM2Calculator.calculateNextReview(7, 2.5, 4)
      expect(result1.newEaseFactor).toBeLessThan(2.5)

      const result2 = SM2Calculator.calculateNextReview(7, 2.5, 3)
      expect(result2.newEaseFactor).toBeLessThan(2.5)
    })

    it('deve manter ease factor >= 1.3', () => {
      const result = SM2Calculator.calculateNextReview(7, 1.3, 0) // muito baixo
      expect(result.newEaseFactor).toBeGreaterThanOrEqual(1.3)
    })

    it('deve validar entrada: quality deve estar entre 0-5', () => {
      expect(() => SM2Calculator.calculateNextReview(7, 2.5, 6)).toThrow()
      expect(() => SM2Calculator.calculateNextReview(7, 2.5, -1)).toThrow()
    })

    it('deve lidar com intervalo 0 (primeira revisão)', () => {
      const result = SM2Calculator.calculateNextReview(0, 2.5, 5)
      expect(result.nextInterval).toBe(1)
    })
  })

  describe('calculateRetentionRate', () => {
    it('deve retornar 1.0 para 0 dias decorridos', () => {
      const retention = SM2Calculator.calculateRetentionRate(0, 2.5)
      expect(retention).toBeCloseTo(1.0, 2)
    })

    it('deve retornar < 1.0 para dias > 0', () => {
      const retention = SM2Calculator.calculateRetentionRate(7, 2.5)
      expect(retention).toBeLessThan(1.0)
      expect(retention).toBeGreaterThan(0)
    })

    it('deve diminuir com passar do tempo', () => {
      const day1 = SM2Calculator.calculateRetentionRate(1, 2.5)
      const day7 = SM2Calculator.calculateRetentionRate(7, 2.5)
      const day30 = SM2Calculator.calculateRetentionRate(30, 2.5)

      expect(day1).toBeGreaterThan(day7)
      expect(day7).toBeGreaterThan(day30)
    })

    it('deve respeitar curva de Ebbinghaus (R = e^(-t/S))', () => {
      // Com EF=2.5, S=25
      const retention = SM2Calculator.calculateRetentionRate(25, 2.5)
      // e^(-25/25) = e^(-1) ≈ 0.368
      expect(retention).toBeCloseTo(0.368, 2)
    })

    it('deve clampear resultado entre 0-1', () => {
      const retention1 = SM2Calculator.calculateRetentionRate(-100, 2.5)
      expect(retention1).toBeGreaterThanOrEqual(0)
      expect(retention1).toBeLessThanOrEqual(1)

      const retention2 = SM2Calculator.calculateRetentionRate(1000, 2.5)
      expect(retention2).toBeGreaterThanOrEqual(0)
      expect(retention2).toBeLessThanOrEqual(1)
    })

    it('deve aumentar retenção com maior ease factor', () => {
      const ef1_3 = SM2Calculator.calculateRetentionRate(7, 1.3)
      const ef2_5 = SM2Calculator.calculateRetentionRate(7, 2.5)
      const ef4_0 = SM2Calculator.calculateRetentionRate(7, 4.0)

      expect(ef1_3).toBeLessThan(ef2_5)
      expect(ef2_5).toBeLessThan(ef4_0)
    })
  })
})

// ============================================
// TESTES: SpacedRepetitionEngine
// ============================================

describe('SpacedRepetitionEngine', () => {
  describe('getConfigForSubject', () => {
    it('deve retornar config crítica para Bio/Física/Química/Matemática', () => {
      const configBio = SpacedRepetitionEngine.getConfigForSubject('Biologia')
      const configFisica = SpacedRepetitionEngine.getConfigForSubject('Física')

      expect(configBio.isCritical).toBe(true)
      expect(configFisica.isCritical).toBe(true)
    })

    it('deve retornar config padrão para matérias não-críticas', () => {
      const config = SpacedRepetitionEngine.getConfigForSubject('História')
      expect(config.isCritical).toBe(false)
    })

    it('deve ter intervalos maiores para matérias não-críticas', () => {
      const critical = SpacedRepetitionEngine.getConfigForSubject('Biologia')
      const nonCritical = SpacedRepetitionEngine.getConfigForSubject('História')

      // Primeiro intervalo não-crítico deve ser >= primeiro crítico
      expect(nonCritical.baseIntervals[0]).toBeGreaterThanOrEqual(
        critical.baseIntervals[0]
      )
    })
  })

  describe('calculateNextReviewDate', () => {
    beforeEach(() => {
      // Usar data fixed para testes
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2024-04-15'))
    })

    it('deve calcular data futura > data atual', () => {
      const result = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date('2024-04-15'),
        accuracyPercent: 80,
        subjectName: 'Biologia',
      })

      expect(result.nextReviewDate.getTime()).toBeGreaterThan(
        new Date('2024-04-15').getTime()
      )
    })

    it('deve aumentar intervalo com accuracy >= 70%', () => {
      const low = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date('2024-04-15'),
        accuracyPercent: 50,
        subjectName: 'Biologia',
        currentIntervalDays: 7,
      })

      const high = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date('2024-04-15'),
        accuracyPercent: 90,
        subjectName: 'Biologia',
        currentIntervalDays: 7,
      })

      expect(high.intervalDays).toBeGreaterThan(low.intervalDays)
    })

    it('deve reduzir intervalo se accuracy < 70%', () => {
      const normal = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date('2024-04-15'),
        accuracyPercent: 75,
        subjectName: 'Biologia',
        currentIntervalDays: 14,
      })

      const reduced = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date('2024-04-15'),
        accuracyPercent: 65,
        subjectName: 'Biologia',
        currentIntervalDays: 14,
      })

      expect(reduced.intervalDays).toBeLessThan(normal.intervalDays)
    })

    it('deve ter confidence score = accuracy / 100', () => {
      const result = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date('2024-04-15'),
        accuracyPercent: 85,
        subjectName: 'Biologia',
      })

      expect(result.confidenceScore).toBeCloseTo(0.85, 2)
    })

    it('deve calcular retenção estimada (0-1)', () => {
      const result = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date('2024-04-15'),
        accuracyPercent: 80,
        subjectName: 'Biologia',
      })

      expect(result.retentionRate).toBeGreaterThanOrEqual(0)
      expect(result.retentionRate).toBeLessThanOrEqual(1)
    })

    it('deve incrementar review count', () => {
      const result = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date('2024-04-15'),
        accuracyPercent: 80,
        subjectName: 'Biologia',
        reviewCount: 5,
      })

      expect(result.reviewCount).toBe(6)
    })

    it('deve aplicar hard_multiplier para accuracy < 70%', () => {
      const normal = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date('2024-04-15'),
        accuracyPercent: 75,
        subjectName: 'Biologia',
        currentIntervalDays: 10,
      })

      const hard = SpacedRepetitionEngine.calculateNextReviewDate({
        lastCompletedDate: new Date('2024-04-15'),
        accuracyPercent: 60,
        subjectName: 'Biologia',
        currentIntervalDays: 10,
      })

      // Com multiplier 0.6, o intervalo de 6 dias (10 * hard) deve ser < 10
      expect(hard.intervalDays).toBeLessThan(normal.intervalDays)
    })
  })

  describe('calculateReviewPriority', () => {
    it('deve ser CRÍTICO se vencido 7+ dias e accuracy < 70%', () => {
      const priority = SpacedRepetitionEngine.calculateReviewPriority(
        new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 dias atrás
        65, // 65%
        0.2 // baixa retenção
      )

      expect(priority).toBe('CRÍTICO')
    })

    it('deve ser ALTO se retenção < 0.4', () => {
      const priority = SpacedRepetitionEngine.calculateReviewPriority(
        new Date(), // hoje
        80,
        0.3 // baixa retenção
      )

      expect(priority).toBe('ALTO')
    })

    it('deve ser MÉDIO se vence em 2-3 dias', () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      const priority = SpacedRepetitionEngine.calculateReviewPriority(
        futureDate,
        80,
        0.6
      )

      expect(priority).toBe('MÉDIO')
    })

    it('deve ser BAIXO se futuro distante', () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      const priority = SpacedRepetitionEngine.calculateReviewPriority(
        futureDate,
        80,
        0.8
      )

      expect(priority).toBe('BAIXO')
    })
  })

  describe('prioritizeTopicsForSubject', () => {
    it('deve agrupar tópicos por prioridade', () => {
      const topics = [
        {
          topicId: '1',
          topicName: 'Mitose',
          subjectId: 'bio1',
          subjectName: 'Biologia',
          accuracyPercent: 50,
          totalAttempts: 10,
          correctAttempts: 5,
          lastAttemptDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          isDue: true,
          daysSinceLastReview: 30,
          reviewPriority: 'CRÍTICO' as const,
        },
        {
          topicId: '2',
          topicName: 'Meiose',
          subjectId: 'bio1',
          subjectName: 'Biologia',
          accuracyPercent: 85,
          totalAttempts: 10,
          correctAttempts: 8,
          lastAttemptDate: new Date(),
          isDue: false,
          daysSinceLastReview: 0,
          reviewPriority: 'BAIXO' as const,
        },
      ]

      const grouped = SpacedRepetitionEngine.prioritizeTopicsForSubject(topics)

      expect(grouped.get('CRÍTICO')?.length).toBeGreaterThan(0)
      expect(grouped.get('BAIXO')?.length).toBeGreaterThan(0)
    })
  })

  describe('daysUntilForgetfulness', () => {
    it('deve calcular dias até retenção < 10%', () => {
      const days = SpacedRepetitionEngine.daysUntilForgetfulness(0, 2.5, 0.1)
      expect(days).toBeGreaterThan(0)
    })

    it('deve ser maior com maior ease factor', () => {
      const daysLow = SpacedRepetitionEngine.daysUntilForgetfulness(0, 1.3, 0.1)
      const daysHigh = SpacedRepetitionEngine.daysUntilForgetfulness(0, 4.0, 0.1)

      expect(daysHigh).toBeGreaterThan(daysLow)
    })

    it('deve retornar 0 se já foi esquecido (dias_since > calculation)', () => {
      const days = SpacedRepetitionEngine.daysUntilForgetfulness(100, 1.3, 0.1)
      expect(days).toBeLessThanOrEqual(0)
    })
  })
})

// ============================================
// TESTES: Casos Extremos e Edge Cases
// ============================================

describe('Edge Cases', () => {
  it('deve lidar com accuracy 0%', () => {
    const result = SpacedRepetitionEngine.calculateNextReviewDate({
      lastCompletedDate: new Date(),
      accuracyPercent: 0,
      subjectName: 'Biologia',
    })

    expect(result.intervalDays).toBeGreaterThanOrEqual(1)
  })

  it('deve lidar com accuracy 100%', () => {
    const result = SpacedRepetitionEngine.calculateNextReviewDate({
      lastCompletedDate: new Date(),
      accuracyPercent: 100,
      subjectName: 'Biologia',
    })

    expect(result.intervalDays).toBeGreaterThan(0)
  })

  it('deve lidar com datas no passado distante', () => {
    const oldDate = new Date(2020, 0, 1)
    const result = SpacedRepetitionEngine.calculateNextReviewDate({
      lastCompletedDate: oldDate,
      accuracyPercent: 75,
      subjectName: 'Biologia',
    })

    expect(result.daysSinceLastReview).toBeGreaterThan(1000)
  })

  it('deve lidar com ease factor no limite inferior (1.3)', () => {
    const result = SM2Calculator.calculateNextReview(7, 1.3, 0)
    expect(result.newEaseFactor).toBeGreaterThanOrEqual(1.3)
  })

  it('deve lidar com review count = 0', () => {
    const result = SpacedRepetitionEngine.calculateNextReviewDate({
      lastCompletedDate: new Date(),
      accuracyPercent: 80,
      subjectName: 'Biologia',
      reviewCount: 0,
    })

    expect(result.reviewCount).toBe(1)
  })
})

// ============================================
// TESTES: Progressão SM2 Realista
// ============================================

describe('Progressão SM2 Realista', () => {
  it('deve simular progressão de estudo completa', () => {
    let schedule = SpacedRepetitionEngine.calculateNextReviewDate({
      lastCompletedDate: new Date('2024-04-15'),
      accuracyPercent: 85,
      subjectName: 'Biologia',
    })

    // 1a revisão: 85% → próxima em ~1 dia
    expect(schedule.intervalDays).toBeGreaterThanOrEqual(1)
    const day1Ease = schedule.easeFactor

    // Simular 2a revisão (3 dias depois, 90%)
    schedule = SpacedRepetitionEngine.calculateNextReviewDate({
      lastCompletedDate: new Date('2024-04-18'),
      accuracyPercent: 90,
      subjectName: 'Biologia',
      currentIntervalDays: schedule.intervalDays,
      currentEaseFactor: day1Ease,
      reviewCount: 1,
    })

    expect(schedule.intervalDays).toBeGreaterThan(1)
    const day2Ease = schedule.easeFactor

    // Ease factor deve aumentar com performance boa
    expect(day2Ease).toBeGreaterThan(day1Ease)

    // Simular 3a revisão com performance ruim (50%)
    schedule = SpacedRepetitionEngine.calculateNextReviewDate({
      lastCompletedDate: new Date('2024-04-25'),
      accuracyPercent: 50,
      subjectName: 'Biologia',
      currentIntervalDays: schedule.intervalDays,
      currentEaseFactor: day2Ease,
      reviewCount: 2,
    })

    // Deve resetar para 1 dia
    expect(schedule.intervalDays).toBe(1)
    expect(schedule.easeFactor).toBeLessThan(day2Ease)
  })
})
