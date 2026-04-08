// ============================================================
// 🏆 PROGRESS ENGINE — ANTIGRAVITY MED V3
// Algoritmos de XP Exponencial, Níveis e Anti-Farm
// ============================================================

export interface ProgressResult {
    xpGained: number;
    newLevel: number;
    newTotalXP: number;
    unlockedNextLevel: boolean;
    diminishingFactor: number;
}

export class ProgressEngine {
    private static BASE_XP = 1000;
    private static EXPONENT = 1.5;

    /**
     * Calcula o XP necessário para o próximo nível
     * Fórmula Robust V3: base * (level ^ 1.5)
     */
    static getXPRequiredForNextLevel(currentLevel: number): number {
        return Math.floor(this.BASE_XP * Math.pow(currentLevel, this.EXPONENT));
    }

    /**
     * Calcula o nível atual baseado no XP acumulado
     */
    static calculateLevelFromTotalXP(totalXP: number): number {
        let level = 1;
        while (totalXP >= this.getXPRequiredForNextLevel(level)) {
            totalXP -= this.getXPRequiredForNextLevel(level);
            level++;
        }
        return level;
    }

    /**
     * Processa ganho de XP com lógica Anti-Farm e Diminishing Returns
     * @param baseAmount XP base da tarefa
     * @param recentActivityCount Quantas vezes essa tarefa foi feita recentemente (Anti-Farm)
     * @param durationMinutes Quanto tempo o usuário realmente dedicou (Evitar cliques vazios)
     */
    static processXPGain(
        currentTotalXP: number,
        baseAmount: number,
        recentActivityCount: number = 0,
        durationMinutes: number = 5
    ): ProgressResult {
        // 1. Aplicar Diminishing Returns (Anti-Farm)
        // Reduz o ganho em 20% para cada repetição excessiva no mesmo intervalo
        // Fator cai de 1.0 -> 0.8 -> 0.6... mínimo de 0.2
        const diminishingFactor = Math.max(0.2, 1 - (recentActivityCount * 0.2));
        
        // 2. Validação de Tempo (Evitar cliques repetidos sem estudo real)
        // Se a tarefa de "Questões" (que dura ~10m) for feita em < 1m, ganha XP zero.
        const timeMultiplier = durationMinutes < 1 ? 0 : 1;

        const finalXP = Math.floor(baseAmount * diminishingFactor * timeMultiplier);
        
        const newTotalXP = currentTotalXP + finalXP;
        const currentLevel = this.calculateLevelFromTotalXP(currentTotalXP);
        const newLevel = this.calculateLevelFromTotalXP(newTotalXP);

        return {
            xpGained: finalXP,
            newLevel: newLevel,
            newTotalXP: newTotalXP,
            unlockedNextLevel: newLevel > currentLevel,
            diminishingFactor
        };
    }

    /**
     * Define o XP Base por tipo de tarefa
     */
    static getBaseXPByTask(taskType: string): number {
        switch (taskType.toUpperCase()) {
            case 'QUESTOES': return 150;
            case 'FLASHCARDS': return 80;
            case 'AULA': return 300;
            case 'REVISAO_TEORICA': return 200;
            case 'REDACAO': return 1000;
            default: return 50;
        }
    }
}
