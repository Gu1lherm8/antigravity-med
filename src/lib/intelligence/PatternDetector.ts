export interface DiagnosticError {
  topic: string;
  discipline: string;
  diagnosis_type: string;
  created_at: string;
}

export class PatternDetector {
  /**
   * Identifica clusters de erros para detectar "Raiz do Erro".
   * Avalia a recorrência de um mesmo tópico com a mesma categoria de diagnóstico.
   */
  static detectCriticalWeaknesses(history: DiagnosticError[]): { topic: string; warningLevel: string; rootCause: string }[] {
    const errorMap: Record<string, { count: number, types: string[] }> = {};

    // Agrupa erros por tópico
    history.forEach(err => {
      // Pula se for "Falta de Atenção" pois não é buraco conceitual
      if (err.diagnosis_type === 'Falta de Atenção') return;

      if (!errorMap[err.topic]) {
        errorMap[err.topic] = { count: 0, types: [] };
      }
      errorMap[err.topic].count++;
      errorMap[err.topic].types.push(err.diagnosis_type);
    });

    const weaknesses = [];

    // Detecção:
    // Se errou o > 2 vezes o mesmo tópico e o tipo de erro predominante é 'Base Teórica'
    for (const [topic, data] of Object.entries(errorMap)) {
      if (data.count > 1) {
        weaknesses.push({
          topic,
          warningLevel: data.count > 3 ? 'CRÍTICO' : 'ATENÇÃO',
          rootCause: this.findMostFrequent(data.types)
        });
      }
    }

    return weaknesses.sort((a, b) => b.warningLevel.length - a.warningLevel.length);
  }

  private static findMostFrequent(arr: string[]): string {
    const map: Record<string, number> = {};
    let max = 0;
    let res = '';
    for (const el of arr) {
      if (!map[el]) map[el] = 0;
      map[el]++;
      if (map[el] > max) {
        max = map[el];
        res = el;
      }
    }
    return res;
  }
}
