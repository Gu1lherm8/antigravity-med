// ============================================================
// 📝 API: /api/generate-questions
// Gera questões ENEM-style via Gemini com validação rigorosa
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGemini } from './lib/gemini.js';

const SYSTEM_PROMPT = `Você é um professor especialista do ENEM que cria questões de alta qualidade para treino.
Suas questões devem:
1. Ser no estilo ENEM (contextualização + texto-base + 5 alternativas)
2. Ter exatamente 5 alternativas (A a E)
3. Ter apenas 1 alternativa correta
4. Incluir explicação didática detalhada
5. Responder EXCLUSIVAMENTE em JSON, sem texto extra
6. Use linguagem clara e precisa`;

const JSON_FORMAT = `{
  "questions": [
    {
      "id": "q-xxx",
      "text": "enunciado completo da questão com contexto",
      "options": ["alternativa A", "alternativa B", "alternativa C", "alternativa D", "alternativa E"],
      "correct_answer": 0,
      "explanation": "explicação detalhada de por que a alternativa é correta",
      "difficulty": "facil" | "media" | "dificil",
      "topic": "tópico específico",
      "subject": "matéria"
    }
  ]
}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const {
      topic = 'Biologia',
      subject = 'Ciências da Natureza',
      count = 3,
      difficulty = 'media',
      context = '',
    } = req.body || {};

    const prompt = `Gere ${count} questão(ões) estilo ENEM sobre:
MATÉRIA: ${subject}
TÓPICO: ${topic}
DIFICULDADE: ${difficulty}
${context ? `CONTEXTO ADICIONAL: ${context}` : ''}

Formato de resposta obrigatório:
${JSON_FORMAT}`;

    const result = await callGemini(prompt, SYSTEM_PROMPT, true);

    if (!result.parsed?.questions || !Array.isArray(result.parsed.questions)) {
      throw new Error('IA não retornou array de questões');
    }

    // Validar e sanitizar cada questão
    const questions = result.parsed.questions.map((q: any, i: number) => ({
      id: q.id || `q-${Date.now()}-${i}`,
      text: q.text || 'Questão sem enunciado',
      options: Array.isArray(q.options) && q.options.length >= 4
        ? q.options.slice(0, 5)
        : ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D', 'Alternativa E'],
      correct_answer: typeof q.correct_answer === 'number' && q.correct_answer >= 0 && q.correct_answer < 5
        ? q.correct_answer
        : 0,
      explanation: q.explanation || 'Explicação não disponível.',
      difficulty: q.difficulty || difficulty,
      topic: q.topic || topic,
      subject: q.subject || subject,
    }));

    return res.status(200).json({ questions });
  } catch (err: any) {
    console.error('❌ generate-questions error:', err);

    // Fallback: questão genérica
    return res.status(200).json({
      _fallback: true,
      questions: [{
        id: `q-fallback-${Date.now()}`,
        text: `Sobre ${req.body?.topic || 'o tema solicitado'}, qual alternativa melhor descreve o conceito fundamental?`,
        options: [
          'Intervenção imediata com base em evidências',
          'Observação armada e reavaliação periódica',
          'Exame complementar como primeiro passo',
          'Protocolo padrão sem individualização',
          'Nenhuma das alternativas anteriores',
        ],
        correct_answer: 0,
        explanation: 'A abordagem baseada em evidências é sempre a conduta prioritária. Sistema operando em modo fallback — conecte-se à internet para questões personalizadas.',
        difficulty: 'media',
        topic: req.body?.topic || 'Geral',
        subject: req.body?.subject || 'Geral',
      }],
    });
  }
}
