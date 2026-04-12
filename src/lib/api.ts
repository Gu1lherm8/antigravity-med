// ============================================================
// 🔗 API CLIENT — Frontend → Server API Routes
// Centralizador de todas as chamadas de API
// ============================================================

const API_BASE = import.meta.env.DEV
  ? '' // Proxy do Vite em dev
  : ''; // Mesmo domínio em produção

interface ApiOptions {
  timeout?: number;
  retries?: number;
}

async function apiCall<T>(endpoint: string, body: any, options: ApiOptions = {}): Promise<T> {
  const { timeout = 30000, retries = 2 } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${API_BASE}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`API ${endpoint} retornou ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error(`API ${endpoint} falhou`);
}

// ===================================================================
// FUNÇÕES PÚBLICAS — Usadas pelos componentes React
// ===================================================================

export interface DailyPlan {
  planId: string;
  totalMinutes: number;
  coachMessage: string;
  tasks: PlanTask[];
  _fallback?: boolean;
}

export interface PlanTask {
  id: string;
  type: 'QUESTOES' | 'REVISAO_TEORICA' | 'FLASHCARDS' | 'DESCANSO';
  title: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  reason: string;
  priorityScore: number;
  status: string;
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
  topic: string;
  subject: string;
}

export interface CoachFeedback {
  severity: 'critico' | 'alerta' | 'bom' | 'excelente';
  headline: string;
  message: string;
  action: string;
  projection: string;
  emoji: string;
  _fallback?: boolean;
}

export interface PDFResult {
  success: boolean;
  subject: string;
  topic: string;
  title: string;
  saved: {
    theoryNote: boolean;
    flashcards: number;
    questions: number;
  };
  preview: {
    summaryLength: number;
    flashcardsCount: number;
    questionsCount: number;
  };
  data: any;
  error?: string;
}

/**
 * Gera plano de estudo diário.
 * O USUÁRIO define o tempo — o sistema se adapta.
 */
export async function generateDailyPlan(
  availableMinutes: number,
  period: 'manha' | 'tarde' | 'noite' | 'personalizado' = 'personalizado'
): Promise<DailyPlan> {
  return apiCall<DailyPlan>('generate-plan', { availableMinutes, period }, { timeout: 45000 });
}

/**
 * Gera questões via IA para um tópico específico.
 */
export async function generateQuestions(
  topic: string,
  subject: string,
  count: number = 3,
  difficulty: string = 'media'
): Promise<{ questions: GeneratedQuestion[]; _fallback?: boolean }> {
  return apiCall('generate-questions', { topic, subject, count, difficulty }, { timeout: 30000 });
}

/**
 * Pega feedback do treinador IA baseado na performance recente.
 */
export async function getCoachFeedback(): Promise<CoachFeedback> {
  return apiCall<CoachFeedback>('coach-feedback', {}, { timeout: 20000 });
}

/**
 * Processa texto de PDF — gera resumo, flashcards e questões.
 */
export async function processPDFContent(
  text: string,
  fileName: string = 'documento.pdf',
  subject?: string,
  topic?: string
): Promise<PDFResult> {
  return apiCall<PDFResult>('process-pdf', { text, fileName, subject, topic }, { timeout: 60000 });
}
