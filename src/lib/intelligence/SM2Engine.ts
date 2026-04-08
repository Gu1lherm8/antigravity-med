// =====================================================
// 🧠 SM-2 Engine — Algoritmo de Repetição Espaçada
// =====================================================
// O SM-2 é o mesmo algoritmo usado pelo Anki e pelo Duolingo.
// Ele calcula: "Quando devo revisar isso de novo para não esquecer?"
// baseado em quantas vezes você acertou e com quanta confiança.

export interface SM2Result {
  newEasinessFactor: number; // Fator de facilidade (quanto mais alto, mais fácil a questão pra você)
  newInterval: number;       // Quantos dias até a próxima revisão
  newRepetitions: number;    // Contador de acertos consecutivos
  nextReviewDate: Date;      // Data exata da próxima revisão
}

export interface SM2Input {
  quality: number;           // Qualidade da resposta: 0-5 (0=errou feio, 5=acertou com certeza)
  easinessFactor: number;    // Fator atual (padrão inicial: 2.5)
  interval: number;          // Intervalo atual em dias
  repetitions: number;       // Quantas vezes seguidas acertou
}

/**
 * Calcula o próximo ciclo de revisão via algoritmo SM-2
 * quality 0-1 = Errou (vai pro intervalo 1)
 * quality 2   = Acertou com dificuldade (começa do zero)
 * quality 3-5 = Acertou com confiança (intervalo cresce)
 */
export function calculateSM2({ quality, easinessFactor, interval, repetitions }: SM2Input): SM2Result {
  let newEF = easinessFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (quality >= 3) {
    // Acertou! Calcula novo intervalo crescente
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easinessFactor);
    }
    newRepetitions = repetitions + 1;
  } else {
    // Errou — reinicia o ciclo do zero
    newRepetitions = 0;
    newInterval = 1;
  }

  // Atualiza o fator de facilidade com base na qualidade
  // Fórmula oficial SM-2: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  newEF = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  // O EF nunca pode cair abaixo de 1.3 (mínimo do algoritmo)
  if (newEF < 1.3) newEF = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    newEasinessFactor: Number(newEF.toFixed(2)),
    newInterval: newInterval,
    newRepetitions: newRepetitions,
    nextReviewDate,
  };
}

/**
 * Converte o confidence_level do Quiz (1-5) para o quality do SM-2 (0-5)
 * "Chute Cego" (1) → quality 1 (errou com dificuldade)
 * "Certeza Absoluta" (5) → quality 5 (acertou perfeitamente)
 */
export function confidenceToQuality(confidenceLevel: number, isCorrect: boolean): number {
  if (!isCorrect) {
    // Errou: quality depende de quão perto estava
    return Math.max(0, confidenceLevel - 3); // 1→0, 2→0, 3→0, 4→1, 5→2
  }
  // Acertou: quality é diretamente o confidence level + 1 para garantir >= 3
  return Math.min(5, confidenceLevel + 2); // 1→3, 2→4, 3→5, 4→5, 5→5
}
