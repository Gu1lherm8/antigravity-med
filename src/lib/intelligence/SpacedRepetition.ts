export interface SM2Result {
  easinessFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: Date;
}

export class SpacedRepetition {
  /**
   * SuperMemo-2 (SM-2) Algorithm implementation
   * @param quality Confiança do aluno (0 a 5)
   * 0: Erro completo (branco total)
   * 1: Erro, mas com lembrança de ter estudado
   * 2: Acerto chutado / Dificuldade extrema
   * 3: Acerto, mas custou muito tempo/esforço
   * 4: Acerto com pequena hesitação
   * 5: Acerto Perfeito (Recuperação imediata)
   * 
   * @param previousEF Fator de facilidade atual (padrão 2.5)
   * @param previousReps Quantidade de repetições acumuladas
   * @param previousInterval Intervalo anterior em dias
   */
  static calculate(
    quality: number,
    previousEF: number = 2.5,
    previousReps: number = 0,
    previousInterval: number = 0
  ): SM2Result {
    let easinessFactor = previousEF;
    let intervalDays = previousInterval;
    let repetitions = previousReps;

    // Se errou feio (0, 1, 2)
    if (quality < 3) {
      repetitions = 0;
      intervalDays = 1; // Revisar amanhã!
    } else {
      // Se lembrou/acertou (3, 4, 5)
      if (repetitions === 0) {
        intervalDays = 1;
      } else if (repetitions === 1) {
        intervalDays = 6;
      } else {
        intervalDays = Math.round(intervalDays * easinessFactor);
      }
      repetitions += 1;
    }

    // Fórmula exata do Fator de Facilidade (Limita o mínimo em 1.3)
    easinessFactor = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easinessFactor = Math.max(1.3, easinessFactor);

    // Soma a data atual + os dias calculados
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

    return {
      easinessFactor: Number(easinessFactor.toFixed(2)),
      intervalDays,
      repetitions,
      nextReviewDate
    };
  }
}
