// ============================================================
// 🧠 API: /api/coach-feedback
// IA Treinador — Frases motivacionais/duras baseadas na performance
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGemini } from './lib/gemini.js';
import { supabaseServer } from './lib/supabase-server.js';

const SYSTEM_PROMPT = `Você é o Preceptor do Antigravity Med — um treinador implacável de aprovação em medicina.
Sua função é analisar a performance do aluno e dar feedback DIRETO, sem rodeios.

REGRAS:
1. Se o aluno está fraco, DIGA com firmeza (não seja cruel, mas seja direto)
2. Se o aluno está indo bem, reconheça MAS eleve o padrão
3. Sempre dê uma AÇÃO CONCRETA ("faça X agora")
4. Use referência à meta: ESCS Cota ~812 pontos
5. Inclua projeção realista
6. Responda EXCLUSIVAMENTE em JSON`;

const JSON_FORMAT = `{
  "severity": "critico" | "alerta" | "bom" | "excelente",
  "headline": "frase de impacto curta (máx 10 palavras)",
  "message": "mensagem detalhada (2-3 frases)",
  "action": "ação concreta para o aluno fazer AGORA",
  "projection": "projeção de nota se continuar assim",
  "emoji": "emoji que representa o estado"
}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    // 1. Buscar dados de performance
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

    const [attemptsRes, errorsRes, sessionsRes] = await Promise.all([
      supabaseServer.from('attempts').select('is_correct, confidence_level, created_at').gte('created_at', weekAgo).order('created_at', { ascending: false }),
      supabaseServer.from('error_notebook').select('discipline, mastered, created_at').eq('mastered', false),
      supabaseServer.from('flow_sessions').select('started_at, status, completed_tasks, total_tasks').order('started_at', { ascending: false }).limit(10),
    ]);

    const attempts = attemptsRes.data || [];
    const errors = errorsRes.data || [];
    const sessions = sessionsRes.data || [];

    // 2. Calcular métricas
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.is_correct).length;
    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
    const pendingErrors = errors.length;

    // Streak de dias (quantos dias seguidos estudou)
    const studyDays = new Set(sessions.map(s => s.started_at?.split('T')[0])).size;

    // Última sessão
    const lastSession = sessions[0];
    const daysSinceLastStudy = lastSession
      ? Math.floor((now.getTime() - new Date(lastSession.started_at).getTime()) / 86400000)
      : 999;

    // Matérias com mais erros
    const errorsBySubject: Record<string, number> = {};
    for (const e of errors) {
      errorsBySubject[e.discipline] = (errorsBySubject[e.discipline] || 0) + 1;
    }
    const worstSubject = Object.entries(errorsBySubject).sort((a, b) => b[1] - a[1])[0];

    const context = `
PERFORMANCE DO ALUNO (últimos 7 dias):
- Acurácia geral: ${accuracy}% (${correctAttempts}/${totalAttempts} questões)
- Erros não dominados: ${pendingErrors}
- Dias ativos na semana: ${studyDays}/7
- Dias sem estudar: ${daysSinceLastStudy}
- Matéria com mais erros: ${worstSubject ? `${worstSubject[0]} (${worstSubject[1]} erros)` : 'N/A'}
- Meta: ESCS Cota ~812 pontos

Gere o feedback no formato:
${JSON_FORMAT}`;

    const result = await callGemini(context, SYSTEM_PROMPT, true);

    if (result.parsed) {
      return res.status(200).json(result.parsed);
    }

    throw new Error('Resposta IA inválida');
  } catch (err: any) {
    console.error('❌ coach-feedback error:', err);

    // Fallback: feedback local baseado em heurísticas simples
    return res.status(200).json({
      severity: 'alerta',
      headline: 'Sistema em modo local',
      message: 'Continue estudando com foco nos pontos fracos. Cada minuto conta para a aprovação.',
      action: 'Faça 10 questões de Natureza agora — é a matéria com maior peso.',
      projection: 'Mantenha o ritmo para alcançar 812+',
      emoji: '⚡',
      _fallback: true,
    });
  }
}
