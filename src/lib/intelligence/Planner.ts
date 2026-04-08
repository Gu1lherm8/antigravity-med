export interface PilotTask {
  id: string;
  type: 'QUESTOES' | 'REVISAO_TEORICA' | 'FLASHCARDS' | 'DESCANSO';
  title: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  status: 'PENDENTE' | 'EXECUTANDO' | 'CONCLUIDO';
  priorityScore: number;
}

export interface StudyPlan {
  planId: string;
  availableTimeMinutes: number;
  priorityScore: number;
  tasks: PilotTask[];
}

export class Planner {
  /**
   * Converte a decisão matemática em um plano de Piloto Automático Executável.
   */
  static buildDailyExecutionPlan(
    availableTimeMinutes: number, 
    blindSpots: any[]
  ): StudyPlan {
    const tasks: PilotTask[] = [];
    let remainingTime = availableTimeMinutes;

    // Priorizar pontos cegos críticos primeiro
    const sortedSpots = [...blindSpots].sort((a, b) => b.priorityScore - a.priorityScore);

    for (const spot of sortedSpots) {
      if (remainingTime <= 0) break;

      // Se houver erro crítico (> 10 pts), forçar bloco de questões seguido de revisão
      const duration = Math.min(15, remainingTime); // Blocos de no máx 15 min

      tasks.push({
        id: `t-${Math.random().toString(36).substring(2, 7)}-${spot.topic}`,
        type: 'QUESTOES',
        title: `Treino de Elite: ${spot.topic}`,
        subject: spot.discipline,
        topic: spot.topic,
        durationMinutes: duration,
        status: 'PENDENTE',
        priorityScore: spot.priorityScore
      });

      remainingTime -= duration;

      // Adicionar revisão teórica se houver tempo
      if (remainingTime >= 10 && spot.priorityScore > 8) {
        tasks.push({
          id: `r-${Math.random().toString(36).substring(2, 7)}-${spot.topic}`,
          type: 'REVISAO_TEORICA',
          title: `Tratamento de Base: ${spot.topic}`,
          subject: spot.discipline,
          topic: spot.topic,
          durationMinutes: 10,
          status: 'PENDENTE',
          priorityScore: spot.priorityScore
        });
        remainingTime -= 10;
      }
    }

    // Se sobrar tempo, incluir Flashcards (SM-2)
    if (remainingTime >= 5) {
      tasks.push({
        id: `a-${Math.random().toString(36).substring(2, 7)}`,
        type: 'FLASHCARDS',
        title: 'Dose de Reforço: Anki (SM-2)',
        subject: 'Geral',
        topic: 'Revisão Espaçada',
        durationMinutes: remainingTime,
        status: 'PENDENTE',
        priorityScore: 5
      });
    }

    return {
      planId: `plan-${new Date().toISOString().split('T')[0]}`,
      availableTimeMinutes,
      priorityScore: sortedSpots[0]?.priorityScore || 0,
      tasks
    };
  }
}
