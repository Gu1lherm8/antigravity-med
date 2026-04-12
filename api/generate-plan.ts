// ============================================================
// ⚙️ API: /api/generate-plan
// Motor de Decisão — Gera plano de estudo diário personalizado
// O USUÁRIO escolhe o tempo, o SISTEMA se adapta.
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGemini } from './lib/gemini.js';
import { supabaseServer } from './lib/supabase-server.js';

const SYSTEM_PROMPT = `Você é o Preceptor — o motor de inteligência do Antigravity Med, uma plataforma de estudos para o ENEM focada em aprovação em Medicina na ESCS (Cota, corte ~812 pontos).

Sua missão: dado o contexto de performance do aluno e o TEMPO DISPONÍVEL que ELE ESCOLHEU, gere um plano de estudo otimizado.

REGRAS:
1. O tempo total das tarefas DEVE ser EXATAMENTE o tempo disponível informado
2. Priorize matérias com mais erros recentes
3. Pesos ESCS Cota: Natureza (5), Matemática (4.7), Redação (4.5), Linguagens (3.8), Humanas (2.5)
4. Inclua pausas de 5min a cada 45min de estudo
5. Manhã = tarefas cognitivas pesadas | Noite = revisão leve
6. Se houver erros críticos (>60% de erro), FORCE treino imediato nesse tópico
7. Responda EXCLUSIVAMENTE em JSON, sem texto extra`;

const JSON_FORMAT = `{
  "planId": "plan-YYYY-MM-DD",
  "totalMinutes": number,
  "coachMessage": "frase motivacional ou dura baseada na performance",
  "tasks": [
    {
      "id": "t-xxx",
      "type": "QUESTOES" | "REVISAO_TEORICA" | "FLASHCARDS" | "DESCANSO",
      "title": "título da tarefa",
      "subject": "matéria",
      "topic": "tópico específico",
      "durationMinutes": number,
      "reason": "por que esta tarefa é importante agora",
      "priorityScore": number (0-100)
    }
  ]
}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { availableMinutes = 60, period = 'personalizado' } = req.body || {};

    // 1. Buscar dados de performance do aluno
    const [errorsRes, attemptsRes, missionsRes] = await Promise.all([
      supabaseServer.from('error_notebook').select('topic, discipline, mastered, times_correct_after, created_at').eq('mastered', false).limit(20),
      supabaseServer.from('attempts').select('question_id, is_correct, confidence_level, created_at, questions(discipline, topic)').order('created_at', { ascending: false }).limit(100),
      supabaseServer.from('daily_missions').select('*').eq('date', new Date().toISOString().split('T')[0]).eq('completed', false),
    ]);

    const errors = errorsRes.data || [];
    const attempts = attemptsRes.data || [];
    const pendingMissions = missionsRes.data || [];

    // 2. Calcular estatísticas por matéria
    const statsBySubject: Record<string, { total: number; errors: number; lastError: string }> = {};
    for (const a of attempts) {
      const q = a.questions as any;
      if (!q) continue;
      const key = q.discipline || 'Geral';
      if (!statsBySubject[key]) statsBySubject[key] = { total: 0, errors: 0, lastError: '' };
      statsBySubject[key].total++;
      if (!a.is_correct) {
        statsBySubject[key].errors++;
        if (!statsBySubject[key].lastError) statsBySubject[key].lastError = q.topic;
      }
    }

    // 3. Montar contexto para a IA
    const context = `
TEMPO DISPONÍVEL ESCOLHIDO PELO ALUNO: ${availableMinutes} minutos
PERÍODO: ${period}
DATA: ${new Date().toLocaleDateString('pt-BR')}

ERROS NÃO DOMINADOS (${errors.length}):
${errors.map(e => `- ${e.discipline} > ${e.topic} (acertos: ${e.times_correct_after}/3)`).join('\n') || 'Nenhum erro pendente'}

PERFORMANCE POR MATÉRIA (últimas 100 tentativas):
${Object.entries(statsBySubject).map(([subj, s]) => `- ${subj}: ${s.total} questões, ${s.errors} erros (${Math.round((s.errors / s.total) * 100)}%), último erro: ${s.lastError}`).join('\n') || 'Sem dados de performance'}

MISSÕES PENDENTES HOJE (${pendingMissions.length}):
${pendingMissions.map(m => `- ${m.title} (${m.duration_minutes}min, tipo: ${m.activity_type})`).join('\n') || 'Nenhuma missão pendente'}

Gere o plano de estudo no seguinte formato JSON:
${JSON_FORMAT}`;

    // 4. Chamar Gemini
    const result = await callGemini(context, SYSTEM_PROMPT, true);

    if (!result.parsed || !result.parsed.tasks) {
      throw new Error('IA retornou JSON sem campo tasks');
    }

    // 5. Garantir IDs únicos
    result.parsed.tasks = result.parsed.tasks.map((t: any, i: number) => ({
      ...t,
      id: t.id || `t-${Date.now()}-${i}`,
      status: 'PENDENTE',
    }));

    return res.status(200).json(result.parsed);
  } catch (err: any) {
    console.error('❌ generate-plan error:', err);

    // FALLBACK LOCAL: gerar plano básico sem IA
    const fallback = generateFallbackPlan(req.body?.availableMinutes || 60);
    return res.status(200).json({
      ...fallback,
      _fallback: true,
      _error: err.message,
    });
  }
}

// Fallback: plano básico quando a IA falha
function generateFallbackPlan(minutes: number) {
  const tasks = [];
  let remaining = minutes;

  if (remaining >= 15) {
    tasks.push({
      id: `t-fb-${Date.now()}-1`,
      type: 'QUESTOES',
      title: 'Treino de Questões — Natureza',
      subject: 'Ciências da Natureza',
      topic: 'Biologia Geral',
      durationMinutes: Math.min(20, remaining),
      reason: 'Natureza tem o maior peso na ESCS (5.0)',
      priorityScore: 90,
      status: 'PENDENTE',
    });
    remaining -= tasks[tasks.length - 1].durationMinutes;
  }

  if (remaining >= 15) {
    tasks.push({
      id: `t-fb-${Date.now()}-2`,
      type: 'QUESTOES',
      title: 'Treino de Questões — Matemática',
      subject: 'Matemática',
      topic: 'Resolução de Problemas',
      durationMinutes: Math.min(15, remaining),
      reason: 'Matemática tem altíssimo ROI no TRI',
      priorityScore: 85,
      status: 'PENDENTE',
    });
    remaining -= tasks[tasks.length - 1].durationMinutes;
  }

  if (remaining >= 10) {
    tasks.push({
      id: `t-fb-${Date.now()}-3`,
      type: 'REVISAO_TEORICA',
      title: 'Revisão de Base',
      subject: 'Geral',
      topic: 'Revisão Espaçada',
      durationMinutes: Math.min(15, remaining),
      reason: 'Consolidar conhecimento antes do esquecimento',
      priorityScore: 70,
      status: 'PENDENTE',
    });
    remaining -= tasks[tasks.length - 1].durationMinutes;
  }

  if (remaining >= 5) {
    tasks.push({
      id: `t-fb-${Date.now()}-4`,
      type: 'FLASHCARDS',
      title: 'Dose de Reforço — Anki (SM-2)',
      subject: 'Geral',
      topic: 'Revisão Espaçada',
      durationMinutes: remaining,
      reason: 'Manutenção da memória de longo prazo',
      priorityScore: 60,
      status: 'PENDENTE',
    });
  }

  return {
    planId: `plan-fallback-${new Date().toISOString().split('T')[0]}`,
    totalMinutes: minutes,
    coachMessage: 'Sistema operando em modo local. Siga o plano de combate!',
    tasks,
  };
}
