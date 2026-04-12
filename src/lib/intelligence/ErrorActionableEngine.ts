/**
 * 🚑 ErrorActionableEngine — Motor que transforma erros em ação automática
 * Quando o aluno erra, o sistema diagnostica e injeta reforço no próximo plano.
 */
import { supabase } from '../supabase';

export type ErrorPatologia = 'Teoria' | 'Interpretação' | 'Cálculo';

interface ErrorInjectionPayload {
  question_id: string;
  topic: string;
  subject: string;
  patologia: ErrorPatologia;
  user_id: string | null;
}

export class ErrorActionableEngine {

  /**
   * Registra a patologia de um erro e injeta reforço no próximo plano.
   * É chamado quando o aluno clica em "INJETAR AGORA" na UTI.
   */
  static async diagnoseAndInject(payload: ErrorInjectionPayload): Promise<boolean> {
    try {
      // 1. Atualiza o attempt com a patologia classificada
      const { error: updateError } = await supabase
        .from('attempts')
        .update({ error_type: payload.patologia })
        .eq('question_id', payload.question_id)
        .eq('is_correct', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (updateError) console.warn('Aviso ao atualizar attempt:', updateError.message);

      // 2. Cria tarefa de reforço no banco para o próximo plano
      const reforcoTask = {
        topic: payload.topic,
        subject: payload.subject,
        task_type: payload.patologia === 'Teoria' ? 'REVISAO_TEORICA' : 'QUESTOES',
        priority_score: 95, // Alta prioridade pois é reforço de erro
        status: 'pending',
        source: 'error_injection',
        error_patologia: payload.patologia,
        user_id: payload.user_id,
        scheduled_for: new Date().toISOString().split('T')[0], // hoje
      };

      const { error: insertError } = await supabase
        .from('study_tasks')
        .insert(reforcoTask);

      if (insertError) {
        // Tabela pode não existir ainda — log sem quebrar o fluxo
        console.warn('study_tasks não encontrada, usando fallback local:', insertError.message);
        ErrorActionableEngine.saveLocalFallback(payload);
      }

      console.log(`✅ ErrorActionableEngine: Reforço injetado para "${payload.topic}" (${payload.patologia})`);
      return true;
    } catch (err) {
      console.error('❌ ErrorActionableEngine falhou:', err);
      ErrorActionableEngine.saveLocalFallback(payload);
      return false;
    }
  }

  /**
   * Fallback local quando o Supabase não tem a tabela study_tasks ainda.
   * Salva no localStorage para o FlowEngine consumir na próxima sessão.
   */
  private static saveLocalFallback(payload: ErrorInjectionPayload) {
    try {
      const key = 'ag_error_injections';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push({
        ...payload,
        injectedAt: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(existing));
      console.log('📦 Reforço salvo localmente (fallback).');
    } catch (e) {
      console.error('Erro no fallback localStorage:', e);
    }
  }

  /**
   * Retorna os reforços pendentes salvos no localStorage.
   * Usado pelo FlowEngine para incluir no próximo plano.
   */
  static getPendingLocalInjections(): ErrorInjectionPayload[] {
    try {
      return JSON.parse(localStorage.getItem('ag_error_injections') || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Limpa os reforços locais após serem consumidos pelo FlowEngine.
   */
  static clearLocalInjections() {
    localStorage.removeItem('ag_error_injections');
  }

  /**
   * Detecta erros recorrentes (>= 2 erros no mesmo tópico nos últimos 7 dias).
   * Retorna lista de tópicos críticos que precisam de atenção urgente.
   */
  static async detectRecurringErrors(userId: string | null): Promise<string[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data } = await supabase
        .from('attempts')
        .select('questions(topic)')
        .eq('is_correct', false)
        .gte('created_at', sevenDaysAgo.toISOString());

      if (!data) return [];

      // Conta frequência por tópico
      const topicCount: Record<string, number> = {};
      (data as any[]).forEach((attempt) => {
        const topic = attempt.questions?.topic;
        if (topic) topicCount[topic] = (topicCount[topic] || 0) + 1;
      });

      // Retorna tópicos com 2+ erros (recorrentes)
      return Object.entries(topicCount)
        .filter(([, count]) => count >= 2)
        .sort(([, a], [, b]) => b - a)
        .map(([topic]) => topic);
    } catch (err) {
      console.error('Erro ao detectar padrões:', err);
      return [];
    }
  }
}
