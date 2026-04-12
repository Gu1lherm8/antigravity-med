// ============================================================
// 📄 API: /api/process-pdf
// Processa PDF enviado pelo usuário — gera resumo, flashcards e questões
// Salva tudo no Supabase automaticamente
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGemini } from './lib/gemini.js';
import { supabaseServer } from './lib/supabase-server.js';

const SYSTEM_PROMPT = `Você é o Triturador — o motor intelectual do Antigravity Med.
Sua missão é processar conteúdo acadêmico e gerar material de estudo de altíssima qualidade.

REGRAS ABSOLUTAS:
1. Responda EXCLUSIVAMENTE em JSON válido, sem texto extra
2. O resumo deve ser em Markdown formatado com ## para seções, ### para sub-seções, **negrito** para termos-chave
3. Flashcards devem ter frente (pergunta) e verso (resposta concisa)
4. Questões devem ser estilo ENEM com 5 alternativas
5. Identifique a matéria e tópico do conteúdo automaticamente
6. Mínimo: 5 flashcards e 3 questões por PDF`;

const JSON_FORMAT = `{
  "subject": "nome da matéria (Biologia, Química, etc)",
  "topic": "tópico específico",
  "title": "título do resumo",
  "summary": "resumo completo em markdown formatado",
  "flashcards": [
    { "front": "pergunta", "back": "resposta" }
  ],
  "questions": [
    {
      "text": "enunciado",
      "options": ["A", "B", "C", "D", "E"],
      "correct_answer": 0,
      "explanation": "por que está correta"
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
    const { text, fileName = 'documento.pdf', subject, topic } = req.body || {};

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Texto muito curto. Envie conteúdo com pelo menos 50 caracteres.' });
    }

    // 1. Processar com Gemini
    const prompt = `Processe o seguinte conteúdo acadêmico e gere material de estudo completo:

${subject ? `MATÉRIA INFORMADA: ${subject}` : ''}
${topic ? `TÓPICO INFORMADO: ${topic}` : ''}
ARQUIVO: ${fileName}

CONTEÚDO:
---
${text.substring(0, 15000)}
---

Formato de resposta obrigatório:
${JSON_FORMAT}`;

    const result = await callGemini(prompt, SYSTEM_PROMPT, true);

    if (!result.parsed) {
      throw new Error('IA não retornou JSON válido');
    }

    const data = result.parsed;

    // 2. Buscar ou criar subject e topic no Supabase
    const subjectName = data.subject || subject || 'Geral';
    const topicName = data.topic || topic || 'Geral';

    // Buscar subject
    let { data: subjectRow } = await supabaseServer
      .from('subjects')
      .select('id')
      .eq('name', subjectName)
      .maybeSingle();

    if (!subjectRow) {
      const { data: newSubject } = await supabaseServer
        .from('subjects')
        .insert({ name: subjectName, color: '#3b82f6', enem_weight: 3 })
        .select('id')
        .single();
      subjectRow = newSubject;
    }

    // Buscar topic
    let { data: topicRow } = await supabaseServer
      .from('topics')
      .select('id')
      .eq('name', topicName)
      .eq('subject_id', subjectRow?.id)
      .maybeSingle();

    if (!topicRow && subjectRow) {
      const { data: newTopic } = await supabaseServer
        .from('topics')
        .insert({ name: topicName, subject_id: subjectRow.id, enem_relevance: 3 })
        .select('id')
        .single();
      topicRow = newTopic;
    }

    const topicId = topicRow?.id;
    const savedItems = { theoryNote: false, flashcards: 0, questions: 0 };

    // 3. Salvar resumo (theory_notes)
    if (data.summary && topicId) {
      const { error } = await supabaseServer.from('theory_notes').insert({
        topic_id: topicId,
        title: data.title || `Resumo: ${topicName}`,
        markdown_content: data.summary,
        original_pdf_name: fileName,
      });
      if (!error) savedItems.theoryNote = true;
    }

    // 4. Salvar flashcards
    if (data.flashcards && Array.isArray(data.flashcards) && topicId) {
      const cards = data.flashcards.map((f: any) => ({
        topic_id: topicId,
        front_text: f.front,
        back_text: f.back,
        next_review: new Date().toISOString(),
      }));

      const { error } = await supabaseServer.from('flashcards').insert(cards);
      if (!error) savedItems.flashcards = cards.length;
    }

    // 5. Salvar questões
    if (data.questions && Array.isArray(data.questions)) {
      const questions = data.questions.map((q: any) => ({
        discipline: subjectName,
        topic: topicName,
        question_text: q.text,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty || 'media',
        source: fileName,
      }));

      const { error } = await supabaseServer.from('questions').insert(questions);
      if (!error) savedItems.questions = questions.length;
    }

    return res.status(200).json({
      success: true,
      subject: subjectName,
      topic: topicName,
      title: data.title,
      saved: savedItems,
      preview: {
        summaryLength: data.summary?.length || 0,
        flashcardsCount: data.flashcards?.length || 0,
        questionsCount: data.questions?.length || 0,
      },
      data: data,
    });
  } catch (err: any) {
    console.error('❌ process-pdf error:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
