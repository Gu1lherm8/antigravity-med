// ============================================================
// 🧠 MASTERY ENGINE — ANTIGRAVITY MED V3
// Algoritmo de Cálculo de Domínio de Elite
// ============================================================

export interface MasteryMetrics {
    recentCorrectCount: number;
    recentErrorCount: number;
    correctedErrorsCount: number;
    daysSinceLastReview: number;
}

export class MasteryEngine {
    private static WEIGHT_CORRECT = 0.5;
    private static WEIGHT_CORRECTED_ERROR = 0.4;
    private static WEIGHT_RECENT_ERROR = -1.0; // Penalidade alta
    private static WEIGHT_DECAY = -0.3;

    /**
     * Calcula o Domínio (Mastery Score) para um tópico
     * Fórmula Robust V3:
     * (acertos_recentes * 0.5) + (erros_corrigidos * 0.4) - (erros_recentes * 1.0) - (decay * 0.3)
     */
    static calculateMasteryScore(metrics: MasteryMetrics): number {
        const scoreCorrect = metrics.recentCorrectCount * this.WEIGHT_CORRECT;
        const scoreCorrected = metrics.correctedErrorsCount * this.WEIGHT_CORRECTED_ERROR;
        const scoreRecentError = metrics.recentErrorCount * this.WEIGHT_RECENT_ERROR;
        const scoreDecay = metrics.daysSinceLastReview * this.WEIGHT_DECAY;

        const totalMastery = scoreCorrect + scoreCorrected + scoreRecentError + scoreDecay;

        // Normalizar entre 0 e 100 (ou -100 a 100 se preferir)
        // Por padrão, mantemos um valor base para não desencorajar novos tópicos
        let normalized = totalMastery;
        
        // Se o domínio for negativo, o Preceptor deve ser mais agressivo no feedback
        return Number(normalized.toFixed(2));
    }

    /**
     * Determina o nível de proficiência visual
     */
    static getProficiencyLevel(score: number): 'CRÍTICO' | 'INSTÁVEL' | 'SÓLIDO' | 'ELITE' {
        if (score < 0) return 'CRÍTICO';
        if (score < 30) return 'INSTÁVEL';
        if (score < 75) return 'SÓLIDO';
        return 'ELITE';
    }

    /**
     * Calcula o fator de carga cognitiva sugerido para o dia
     * Baseado na média de domínio atual do usuário
     */
    static suggestedCognitiveLoad(averageMastery: number): number {
        if (averageMastery < 20) return 40; // Muito erro: baixa carga, foco em base
        if (averageMastery < 60) return 70; // Médio: carga moderada
        return 100; // Elite: carga máxima permitida
    }
}
