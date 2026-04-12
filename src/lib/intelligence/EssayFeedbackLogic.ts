/**
 * 📝 EssayFeedbackLogic — Avaliação automática de redação ENEM 2025
 * Implementa os 5 critérios oficiais do ENEM (C1-C5) com penalidades e red flags.
 */

export type CompetencyScore = 0 | 40 | 80 | 120 | 160 | 200;

export interface EssayCompetencies {
  c1: CompetencyScore; // Domínio da norma culta da Língua Portuguesa
  c2: CompetencyScore; // Compreensão da proposta e aplicação de conceitos
  c3: CompetencyScore; // Seleção e organização dos argumentos
  c4: CompetencyScore; // Mecanismos linguísticos de coesão
  c5: CompetencyScore; // Proposta de intervenção
}

export interface C5Elements {
  agente: boolean;      // Quem executa a ação
  acao: boolean;        // O que será feito (verbo claro)
  meio: boolean;        // Como será feito (por meio de...)
  efeito: boolean;      // Para que (finalidade)
  detalhamento: boolean; // Informação extra sobre um dos itens
}

export interface EssayFeedback {
  totalScore: number;
  competencies: EssayCompetencies;
  c5Elements: C5Elements;
  redFlags: string[];
  warnings: string[];
  suggestions: string[];
  penaltyApplied: boolean;   // Penalidade dupla C2+C3
  isZeroScore: boolean;
  scoreLevel: 'CRITICO' | 'INSUFICIENTE' | 'REGULAR' | 'BOM' | 'EXCELENTE';
}

export interface SoundAlertLevel {
  level: 'ok' | 'warning' | 'critical';
  message: string;
}

// Limites de pontuação por nível
const NOTA_THRESHOLDS = {
  CRITICO: 200,
  INSUFICIENTE: 400,
  REGULAR: 600,
  BOM: 800,
  EXCELENTE: 1000,
} as const;

export class EssayFeedbackLogic {

  /**
   * Avalia a redação completa com base nos critérios ENEM 2025.
   */
  static evaluate(competencies: EssayCompetencies, c5Elements: C5Elements): EssayFeedback {
    const redFlags: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let isZeroScore = false;
    let penaltyApplied = false;

    // ============================================================
    // 🚨 VERIFICAÇÕES DE NOTA ZERO (Red Flags Automáticos)
    // ============================================================
    
    if (competencies.c1 === 0) {
      redFlags.push('⚠️ C1 ZERADA: Texto com desvios gramaticais graves que comprometem a compreensão.');
    }

    if (competencies.c2 === 0 && competencies.c3 === 0) {
      redFlags.push('🚨 NOTA ZERO: Texto não atende à proposta e não traz argumentação.');
      isZeroScore = true;
    }

    if (competencies.c5 === 0) {
      redFlags.push('🚨 C5 ZERADA: Ausência ou inadequação total da proposta de intervenção.');
    }

    // ============================================================
    // ⚠️ PENALIDADE DUPLA C2 + C3 (Critério ENEM 2025)
    // Quando o texto foge ao tema E não tem coerência, ambos caem 40pts.
    // ============================================================
    let adjustedC2 = competencies.c2;
    let adjustedC3 = competencies.c3;

    if (competencies.c2 <= 80 && competencies.c3 <= 80 && !isZeroScore) {
      penaltyApplied = true;
      adjustedC2 = Math.max(0, competencies.c2 - 40) as CompetencyScore;
      adjustedC3 = Math.max(0, competencies.c3 - 40) as CompetencyScore;
      warnings.push('🔴 PENALIDADE DUPLA APLICADA: C2+C3 reduzidas em 40pts cada. Verifique aderência ao tema e coerência.');
    }

    // ============================================================
    // 📋 VALIDAÇÃO C5: Checklist dos 5 elementos obrigatórios
    // ============================================================
    const c5Count = Object.values(c5Elements).filter(Boolean).length;
    
    if (!c5Elements.agente) warnings.push('❌ C5 Incompleta: Falta o AGENTE (quem vai executar a proposta).');
    if (!c5Elements.acao) warnings.push('❌ C5 Incompleta: Falta a AÇÃO (o que será feito, use um verbo de ação).');
    if (!c5Elements.meio) warnings.push('❌ C5 Incompleta: Falta o MEIO/MODO (por meio de, através de...).');
    if (!c5Elements.efeito) warnings.push('❌ C5 Incompleta: Falta o EFEITO/FINALIDADE (a fim de, com o intuito de...).');
    if (!c5Elements.detalhamento) warnings.push('⚠️ C5 sem detalhamento: Adicione informação extra para garantir 200pts.');

    // Validação do Repertório Produtivo (C2) — previne penalidade dupla
    if (competencies.c2 < 120) {
      warnings.push('⚠️ Risco de repertório improdutivo: Seu argumento precisa estar diretamente ligado à tese. Evite exemplos decorativos.');
    }

    // ============================================================
    // 💡 SUGESTÕES DE MELHORIA
    // ============================================================
    if (competencies.c4 < 160) {
      suggestions.push('💡 Melhore a coesão: Use mais conectivos adversativos (no entanto, entretanto) e aditivos (além disso, ademais) entre parágrafos.');
    }

    if (c5Count < 5) {
      suggestions.push(`💡 Sua C5 tem ${c5Count}/5 elementos. Complete para garantir os 200 pontos nesta competência.`);
    }

    if (competencies.c1 < 120) {
      suggestions.push('💡 Revise a gramática: Foco em regência verbal/nominal e concordância que são os erros mais comuns.');
    }

    // Calcula nota final com ajuste de penalidade
    const totalScore = 
      competencies.c1 + 
      adjustedC2 + 
      adjustedC3 + 
      competencies.c4 + 
      competencies.c5;

    // Determina nível de performance
    const scoreLevel = EssayFeedbackLogic.getScoreLevel(isZeroScore ? 0 : totalScore);

    return {
      totalScore: isZeroScore ? 0 : totalScore,
      competencies: {
        c1: competencies.c1,
        c2: adjustedC2,
        c3: adjustedC3,
        c4: competencies.c4,
        c5: competencies.c5,
      },
      c5Elements,
      redFlags,
      warnings,
      suggestions,
      penaltyApplied,
      isZeroScore,
      scoreLevel,
    };
  }

  /**
   * Retorna o nível de desempenho com base na nota total.
   */
  static getScoreLevel(score: number): EssayFeedback['scoreLevel'] {
    if (score === 0 || score < NOTA_THRESHOLDS.CRITICO) return 'CRITICO';
    if (score < NOTA_THRESHOLDS.INSUFICIENTE) return 'INSUFICIENTE';
    if (score < NOTA_THRESHOLDS.REGULAR) return 'REGULAR';
    if (score < NOTA_THRESHOLDS.BOM) return 'BOM';
    return 'EXCELENTE';
  }

  /**
   * Retorna o alerta sonoro adequado com base nos red flags.
   * Usado pelo SoundService para feedback imediato.
   */
  static getSoundAlert(feedback: EssayFeedback): SoundAlertLevel {
    if (feedback.isZeroScore || feedback.redFlags.length > 0) {
      return { level: 'critical', message: 'Atenção crítica necessária!' };
    }
    if (feedback.warnings.length > 0 || feedback.penaltyApplied) {
      return { level: 'warning', message: 'Melhorias necessárias.' };
    }
    return { level: 'ok', message: 'Excelente desempenho!' };
  }

  /**
   * Gera uma estimativa de nota C5 com base nos elementos preenchidos.
   */
  static estimateC5Score(elements: C5Elements): CompetencyScore {
    const count = Object.values(elements).filter(Boolean).length;
    const scores: CompetencyScore[] = [0, 40, 80, 120, 160, 200];
    return scores[count];
  }

  /**
   * Verifica se há risco de penalidade dupla (C2+C3).
   * Retorna true se o texto está em zona de risco.
   */
  static hasDualPenaltyRisk(c2: CompetencyScore, c3: CompetencyScore): boolean {
    return c2 <= 80 && c3 <= 80;
  }
}
