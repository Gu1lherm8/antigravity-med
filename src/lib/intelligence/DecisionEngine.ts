export type Subject = 'Natureza' | 'Matemática' | 'Linguagens' | 'Humanas' | 'Redação';

const SUBJECT_HIBRID_WEIGHTS: Record<Subject, number> = {
  'Natureza': 5.0,    // Peso ESCS 4 + TRI Difícil = Requer mais volume de estudo
  'Matemática': 4.7,  // TRI Máximo (ROI) + Peso ESCS 3
  'Redação': 4.5,     // 1000 pts + 1º Critério de Desempate ESCS
  'Linguagens': 3.8,  // Peso ESCS 4 + TRI Baixa = Foco em acertar as fáceis (Eficiência)
  'Humanas': 2.5      // Peso ESCS 2 + TRI Baixa = Apenas manutenção de base
};

export class DecisionEngine {
  /**
   * 🔥 FÓRMULA ANTIGRAVITY MED V3 — O CÉREBRO HÍBRIDO (ESCS + TRI)
   * O usuário NÃO pensa. O sistema decide com base nos pesos da ESCS e curvas TRI.
   * priority = (frequência de erro * 0.4) + (tempo sem revisar * 0.2) + (peso Híbrido * 0.3) + (dificuldade * 0.1)
   */
  static calculatePriorityScore(
    subject: Subject,
    frequenciaErro: number,    // 0 a 1 (Normalizado: erros / total tentativas)
    tempoSemRevisao: number,   // 0 a 1 (Normalizado: dias / 30 dias max)
    dificuldade: number        // 1 a 3 (1-Fácil, 2-Médio, 3-Difícil)
  ): number {
    
    // Pesos do Cérebro V3
    const subjectWeight = SUBJECT_HIBRID_WEIGHTS[subject] || 3.0;
    const normSubjectWeight = subjectWeight / 5;
    const normDificuldade = dificuldade / 3;

    // Cálculo da Prioridade Híbrida (Damos 30% de peso à importância da matéria na ESCS/TRI)
    const score = (frequenciaErro * 0.4) + 
                  (tempoSemRevisao * 0.2) + 
                  (normSubjectWeight * 0.3) + 
                  (normDificuldade * 0.1);
    
    // Escala de 0 a 100
    return Number((score * 100).toFixed(2));
  }

  /**
   * Determina o tipo de tarefa sugerida para o tópico
   */
  static suggestTaskType(score: number): 'QUESTOES' | 'REVISAO_TEORICA' | 'FLASHCARDS' {
    if (score > 75) return 'REVISAO_TEORICA'; // Urgente: Falha de Base
    if (score > 40) return 'QUESTOES';        // Prática para consolidar TRI
    return 'FLASHCARDS';                     // Manutenção preventiva
  }
}
