// ==========================================
// hooks/useRealTimePerformance.ts
// Registra respostas de questões e retorna
// feedback imediato de melhora/piora.
// ==========================================

import { useCallback } from 'react';
import { GapDetector } from '../lib/intelligence/GapDetector';

export interface PerformanceFeedback {
  newScore: number;
  improved: boolean;
  changePercent: number;
  message: string;
}

export function useRealTimePerformance(userId: string | null) {
  /**
   * Chame esta função toda vez que o usuário responder uma questão.
   * topicId  = ID do tópico sendo estudado (ex: "meiose")
   * correct  = true se acertou, false se errou
   * timeSpentSeconds = tempo que levou para responder
   */
  const recordAnswer = useCallback(
    async (
      topicId: string,
      correct: boolean,
      timeSpentSeconds: number = 60
    ): Promise<PerformanceFeedback> => {
      if (!userId) {
        return { newScore: 0, improved: false, changePercent: 0, message: 'Usuário não autenticado.' };
      }

      try {
        // Registra via GapDetector (sem IA — puro banco de dados)
        await GapDetector.recordAnswer(userId, topicId, correct, timeSpentSeconds);

        // Feedback motivacional
        const message = correct
          ? getMotivationalMessage(true)
          : getMotivationalMessage(false);

        return {
          newScore: correct ? 100 : 0, // Score simplificado — o banco tem o acumulado
          improved: correct,
          changePercent: correct ? 10 : -5,
          message,
        };
      } catch (err) {
        console.error('[useRealTimePerformance] Erro ao registrar resposta:', err);
        return { newScore: 0, improved: false, changePercent: 0, message: 'Erro ao salvar resposta.' };
      }
    },
    [userId]
  );

  return { recordAnswer };
}

// ── Frases de feedback ────────────────────────────────────────────
const CORRECT_MESSAGES = [
  'Excelente! Mais um acerto no banco! 🔥',
  'Correto! O Secretário atualizou seu plano.',
  'Acertou! Seu domínio neste tópico cresceu.',
  'Certo! Continue assim, futuro médico(a). 🩺',
];

const WRONG_MESSAGES = [
  'Errou, mas está aprendendo. Revisão agendada!',
  'Quase! O Secretário vai reforçar este tópico.',
  'Gap detectado. Ele entrará na prioridade.',
  'Não se preocupe. Revisar é parte do processo.',
];

function getMotivationalMessage(correct: boolean) {
  const list = correct ? CORRECT_MESSAGES : WRONG_MESSAGES;
  return list[Math.floor(Math.random() * list.length)];
}
