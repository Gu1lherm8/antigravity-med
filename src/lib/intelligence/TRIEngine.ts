/**
 * ============================================================================
 * MOTOR ANALÍTICO T.R.I (Teoria de Resposta ao Item) Simulado
 * ============================================================================
 * 
 * Calcula o Theta (Proficiência) aproximado do usuário baseado na coerência.
 * Parâmetros de calibração baseados no modelo logístico (versão adaptativa local):
 * - Itens fáceis: Maior peso garantidor (base do ENEM)
 * - Itens médios: Peso diferencial
 * - Itens difíceis: Menor peso garantidor (Bônus, mas punido severamente se errar fácil)
 */

export interface ScoreData {
  easy: { total: number; correct: number };
  medium: { total: number; correct: number };
  hard: { total: number; correct: number };
}

export class TRIEngine {
  // Parâmetros base da escala (ENEM)
  private static readonly BASE_SCORE_NATUREZA   = 450; // Chute zerado
  private static readonly MAX_SCORE_NATUREZA    = 900; 
  private static readonly BASE_SCORE_MATEMATICA = 400;
  private static readonly MAX_SCORE_MATEMATICA  = 980;

  /**
   * Calcula a Coerência Pedagógica (0 a 100%)
   * Fórmula: Quanto você acertou das fáceis em relação às difíceis.
   * Se acertou muitas difíceis mas errou fáceis = Chute (Coerência baixa).
   */
  static calculateCoherence(data: ScoreData): number {
    const pEasy = data.easy.total > 0 ? data.easy.correct / data.easy.total : 0;
    const pMedium = data.medium.total > 0 ? data.medium.correct / data.medium.total : 0;
    const pHard = data.hard.total > 0 ? data.hard.correct / data.hard.total : 0;

    // Se a pessoa acertar menos faceis que dificeis, é o maior sinal de incoerência!
    let incoherencePenalty = 0;
    
    // Penalidade 1: Difícil > Fácil
    if (pHard > pEasy && pHard > 0) {
      incoherencePenalty += (pHard - pEasy) * 40; 
    }
    // Penalidade 2: Médio > Fácil
    if (pMedium > pEasy && pMedium > 0) {
      incoherencePenalty += (pMedium - pEasy) * 20;
    }

    const coherence = Math.max(0, Math.min(100, 100 - incoherencePenalty));
    return Number(coherence.toFixed(1));
  }

  /**
   * Estima o Theta (Nota Simulada TRI).
   */
  static calculateTheta(
    subject: string, 
    data: ScoreData, 
    coherence: number
  ): number {
    // Definimos base min e max (padrões de régua ENEM variam por área)
    const BASE_SCORE = subject.includes('Matemática') ? this.BASE_SCORE_MATEMATICA : this.BASE_SCORE_NATUREZA;
    const MAX_SCORE = subject.includes('Matemática') ? this.MAX_SCORE_MATEMATICA : this.MAX_SCORE_NATUREZA;

    const pEasy = data.easy.total > 0 ? data.easy.correct / data.easy.total : 0;
    const pMedium = data.medium.total > 0 ? data.medium.correct / data.medium.total : 0;
    const pHard = data.hard.total > 0 ? data.hard.correct / data.hard.total : 0;

    // Modelo de ponderação simulada: 
    // Fáceis representam o alicerce principal do pulo nos primeiros 200 pontos.
    const weightEasy = 0.50; 
    const weightMedium = 0.35;
    const weightHard = 0.15;

    // Cálculo da taxa bruta empírica do cara (o quanto de carga ele superou)
    const rawProgress = (pEasy * weightEasy) + (pMedium * weightMedium) + (pHard * weightHard); // Vai de 0.0 a 1.0

    // Modulador: A TRI reduz absurdamente o valor dos acertos difíceis se a coerência for baixa
    const coherenceFactor = coherence / 100;
    
    // Calcula o "Salto"
    const amplitude = (MAX_SCORE - BASE_SCORE);
    
    // O Score Final sofre o impacto pesado da coerência (diferencial do TRI contra Teoria Clássica)
    const simulatedScore = BASE_SCORE + (amplitude * rawProgress * coherenceFactor);

    return Number(Math.max(BASE_SCORE, Math.min(MAX_SCORE, simulatedScore)).toFixed(1));
  }
}
