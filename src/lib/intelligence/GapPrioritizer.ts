// ==========================================
// lib/intelligence/GapPrioritizer.ts
// Algoritmo de Scoring de Lacunas de Aprendizagem
// ==========================================

import type { LearningGap, Topic } from '../../types/study';

export type PriorityLevel = 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO';

export interface GapMeta {
  conceptId: string;
  conceptName: string;
  currentAccuracy: number;
  lastReviewed: Date;
  isPrerequisite: boolean;
  dependentConceptsCount: number;
}

export interface ScoredGap {
  topic_id: string;
  topic_name: string;
  priority_score: number;
  priority_level: PriorityLevel;
  impact_score: number;
  urgency_score: number;
  decay_score: number;
  dependency_score: number;
  reason: string;
  estimated_minutes: number;
}

export class GapPrioritizer {
  private testDate: Date;
  private dailyHours: number;

  constructor(testDate: Date, dailyHours: number) {
    this.testDate = testDate;
    this.dailyHours = dailyHours;
  }

  /**
   * Calcula o score final de uma lacuna usando a fórmula ponderada:
   * (Impact * 0.35) + (Urgency * 0.30) + (Decay * 0.20) + (Dependency * 0.15)
   */
  public calculateScores(gap: GapMeta): ScoredGap {
    const impact = this.calculateImpact(gap);
    const urgency = this.calculateUrgency();
    const decay = this.calculateDecay(gap.lastReviewed);
    const dependency = this.calculateDependency(gap.isPrerequisite, gap.dependentConceptsCount);

    const totalScore = (impact * 0.35) + (urgency * 0.30) + (decay * 0.20) + (dependency * 0.15);
    const score = Math.min(100, Math.max(0, Math.round(totalScore)));

    return {
      topic_id: gap.conceptId,
      topic_name: gap.conceptName,
      priority_score: score,
      priority_level: this.getPriorityLevel(score),
      impact_score: impact,
      urgency_score: urgency,
      decay_score: decay,
      dependency_score: dependency,
      reason: this.generateReason(gap, score, urgency, decay),
      estimated_minutes: this.estimateStudyTime(gap.currentAccuracy)
    };
  }

  // 1️⃣ IMPACT SCORE: Baseado na taxa de erro e relevância ENEM
  private calculateImpact(gap: GapMeta): number {
    const errorRate = 100 - gap.currentAccuracy;
    // Mock de frequência ENEM (idealmente vem do banco)
    const enemFreq = this.getMockEnemFrequency(gap.conceptName);
    return (errorRate * 0.6) + (enemFreq * 0.4);
  }

  // 2️⃣ URGENCY SCORE: Tempo até a prova
  private calculateUrgency(): number {
    const daysUntil = Math.ceil((this.testDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) return 100;
    if (daysUntil <= 30) return 80;
    if (daysUntil <= 90) return 50;
    return 20;
  }

  // 3️⃣ DECAY SCORE: Curva de esquecimento (Ebbinghaus)
  private calculateDecay(lastReviewed: Date): number {
    const daysSince = Math.ceil((Date.now() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24));
    // Simulação de curva: quanto mais tempo passa, maior a necessidade de revisão
    // 100 * (1 - e^-0.15t)
    const factor = 100 * (1 - Math.exp(-0.15 * daysSince));
    return Math.min(100, Math.round(factor));
  }

  // 4️⃣ DEPENDENCY SCORE: Se é pré-requisito
  private calculateDependency(isPrerequisite: boolean, dependentCount: number): number {
    if (!isPrerequisite) return 10;
    return Math.min(100, 40 + (dependentCount * 15));
  }

  private getPriorityLevel(score: number): PriorityLevel {
    if (score >= 80) return 'CRÍTICO';
    if (score >= 60) return 'ALTO';
    if (score >= 40) return 'MÉDIO';
    return 'BAIXO';
  }

  private estimateStudyTime(accuracy: number): number {
    const base = 25; // tempo base em min
    const errorFactor = (100 - accuracy) / 100;
    return Math.round(base + (base * errorFactor * 1.5)); // até 62 min
  }

  private generateReason(gap: GapMeta, score: number, urgency: number, decay: number): string {
    if (gap.currentAccuracy < 50 && urgency > 70) {
      return `CRÍTICO: Baixo desempenho (${gap.currentAccuracy}%) em tema de alta urgência.`;
    }
    if (gap.isPrerequisite && score > 60) {
      return `CONCEITO-BASE: Domine este tema para destravar conteúdos dependentes.`;
    }
    if (decay > 70) {
      return `REVISÃO: Curva de esquecimento atingida. Estudado há muito tempo.`;
    }
    return `MELHORIA: Reforce este tema para garantir consistência na prova.`;
  }

  private getMockEnemFrequency(name: string): number {
    const freqs: Record<string, number> = {
      'Meiose': 85,
      'Citologia': 95,
      'Ecologia': 90,
      'Genética': 88,
      'Termodinâmica': 75
    };
    return freqs[name] || 50;
  }
}
