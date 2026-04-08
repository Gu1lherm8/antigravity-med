import { supabase } from '../supabase';

export interface FlowTask {
  id: string;
  type: 'aula' | 'questoes' | 'revisao' | 'flashcard' | 'descanso';
  category: 'critical' | 'mission' | 'spaced' | 'secondary';
  title: string;
  subject: string;
  topic?: string;
  duration_minutes: number;
  priority: number;
  is_adaptive?: boolean;
  cognitive_weight?: number; // 1-10 (Carga cognitiva da tarefa)
  energy_cost?: number;      // 1-10 (Quanto consome de energia)
  interruptionCount?: number; // Rastreamento de interrupções por tópico
}

export interface FlowSession {
  id: string;
  period: 'manha' | 'tarde' | 'noite' | 'personalizado';
  current_task_idx: number;
  queue: FlowTask[];
  status: 'ativo' | 'concluido';
  interruption_map: Record<string, number>; // tópico -> contagem
}

export const FlowEngine = {
  /**
   * Gera a fila inicial baseada no período atual.
   * Prioridade: Crítico > Missão > Spaced > Secundário.
   */
  async generateInitialQueue(period: 'manha' | 'tarde' | 'noite'): Promise<FlowTask[]> {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Críticos (Erros não dominados)
    const { data: criticalErrors } = await supabase
      .from('error_notebook')
      .select('*')
      .eq('mastered', false)
      .limit(3);

    // 2. Missões do Dia
    const { data: missions } = await supabase
      .from('daily_missions')
      .select('*')
      .eq('date', today)
      .eq('period', period)
      .eq('completed', false);

    // 3. Revisões Espaçadas do Cockpit (D+7, D+30)
    const { data: spacedRevisions } = await supabase
      .from('user_topic_progress')
      .select('*, topics(name, subjects(name))')
      .or(`revision_1_date.lte.${today},revision_2_date.lte.${today}`)
      .or('revision_1_done.eq.false,revision_2_done.eq.false');

    const queue: FlowTask[] = [];

    // Adiciona Críticos primeiro
    if (criticalErrors) {
      criticalErrors.forEach(err => {
        queue.push({
          id: `crit-${err.id}`,
          type: 'revisao',
          category: 'critical',
          title: `🧩 Crítico: ${err.topic}`,
          subject: err.discipline,
          topic: err.topic,
          duration_minutes: 15,
          priority: 0,
          is_adaptive: true
        });
      });
    }

    // Adiciona Missões
    if (missions) {
      missions.sort((a, b) => a.order_index - b.order_index).forEach(m => {
        queue.push({
          id: m.id,
          type: m.activity_type as any,
          category: 'mission',
          title: m.title,
          subject: m.description || 'Geral',
          duration_minutes: m.duration_minutes,
          priority: 1,
        });
      });
    }

    // Adiciona Revisões Espaçadas
    if (spacedRevisions) {
      spacedRevisions.forEach(rev => {
        const isRev1 = rev.revision_1_date <= today && !rev.revision_1_done;
        const isRev2 = rev.revision_2_date <= today && !rev.revision_2_done;
        
        if (isRev1 || isRev2) {
          queue.push({
            id: `spaced-${rev.topic_id}-${isRev1 ? 'r1' : 'r2'}`,
            type: 'revisao',
            category: 'spaced',
            title: `🔄 Revisão [${isRev1 ? '1' : '2'}]: ${rev.topics?.name}`,
            subject: rev.topics?.subjects?.name || 'Geral',
            topic: rev.topics?.name,
            duration_minutes: 20,
            priority: 2,
          });
        }
      });
    }

    return queue;
  },

  /**
   * Decide se a fila deve ser alterada com base na performance.
   * Regras: Erro + Alta Confiança | Anti-loop | Limite de 2/tópico.
   */
  adaptiveScheduler(
    currentQueue: FlowTask[], 
    currentIdx: number, 
    result: { isCorrect: boolean, confidence: number, topic?: string },
    interruptionMap: Record<string, number> = {}
  ): { nextQueue: FlowTask[], interruptionMap: Record<string, number> } {
    const newQueue = [...currentQueue];
    const currentTask = newQueue[currentIdx];
    const topic = result.topic || currentTask.topic || 'geral';
    const currentInterrupts = interruptionMap[topic] || 0;

    // REGRA 1: Limite de 2 interrupções por tópico (Anti-loop & Saturação)
    if (currentInterrupts >= 2) {
      console.log(`🛑 FLOW V3: Limite de interrupções atingido para o tópico: ${topic}. Ignorando nova interrupção.`);
      return { nextQueue: newQueue, interruptionMap };
    }

    // REGRA 2: Interrupção Inteligente: Erro com Alta Confiança (4 ou 5)
    const isCriticalError = !result.isCorrect && (result.confidence >= 4);
    
    // REGRA 3: Detecção de Inconsistência de Confiança (Acerto com Confiança 1)
    const isInconsistent = result.isCorrect && (result.confidence === 1);

    if (isCriticalError || isInconsistent) {
      console.log(`🚀 FLOW V3: Intervenção Adaptativa! Motivo: ${isCriticalError ? 'Erro de Alta Confiança' : 'Inconsistência de Confiança'}.`);
      
      const adaptiveTask: FlowTask = {
        id: `adaptive-${topic}-${Date.now()}`,
        type: isCriticalError ? 'revisao' : 'questoes',
        category: 'critical',
        title: isCriticalError ? `⚠️ REFORÇO: ${topic}` : `🧪 TESTE BASE: ${topic}`,
        subject: currentTask.subject,
        topic: topic,
        duration_minutes: isCriticalError ? 10 : 5,
        priority: currentTask.priority,
        is_adaptive: true,
        cognitive_weight: 8,
        energy_cost: 4
      };

      // Insere logo após a tarefa atual, SE a próxima já não for uma adaptação desse tópico
      const nextTask = newQueue[currentIdx + 1];
      if (nextTask?.id.startsWith(`adaptive-${topic}`)) {
        console.log(`🔁 FLOW V3: Anti-loop ativado. Adaptação para ${topic} já está em andamento.`);
        return { nextQueue: newQueue, interruptionMap };
      }

      newQueue.splice(currentIdx + 1, 0, adaptiveTask);
      interruptionMap[topic] = currentInterrupts + 1;
    }

    return { nextQueue: newQueue, interruptionMap };
  },

  /**
   * Salva o estado para persistência (A: Retomar de onde parou).
   */
  async saveSessionState(sessionId: string, currentIdx: number, queue: FlowTask[]) {
    await supabase.from('flow_sessions').update({
      current_task_id: queue[currentIdx]?.id,
      completed_tasks: currentIdx,
      queue: JSON.stringify(queue),
      status: 'ativo'
    }).eq('id', sessionId);
  },

  /**
   * Inicia uma sessão a partir de um StudyPlan do Planner.
   */
  async startSessionFromPlan(plan: any, period: FlowSession['period'] = 'personalizado'): Promise<string | null> {
    const queue: FlowTask[] = plan.tasks.map((t: any) => ({
      id: t.id,
      type: t.type.toLowerCase() as any, // Converte 'QUESTOES' -> 'questoes'
      title: t.title,
      subject: t.subject,
      topic: t.topic,
      duration_minutes: t.durationMinutes,
      priority: t.priorityScore,
    }));

    const { data, error } = await supabase.from('flow_sessions').insert({
      period,
      total_tasks: queue.length,
      queue: JSON.stringify(queue),
      current_task_id: queue[0]?.id,
      status: 'ativo'
    }).select().single();

    if (error) {
      console.error("❌ FLOW ENGINE: Erro ao iniciar sessão:", error);
      return null;
    }

    return data.id;
  },

  /**
   * Busca sessão ativa para retomada.
   */
  async getActiveSession(): Promise<FlowSession | null> {
    const { data } = await supabase
      .from('flow_sessions')
      .select('*')
      .eq('status', 'ativo')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;

    const queue = typeof data.queue === 'string' ? JSON.parse(data.queue) : data.queue;
    const currentIdx = queue.findIndex((t: FlowTask) => t.id === data.current_task_id);

    return {
      id: data.id,
      period: data.period,
      current_task_idx: currentIdx === -1 ? 0 : currentIdx,
      queue,
      status: data.status,
      interruption_map: data.interruption_map || {}
    };
  }
};
