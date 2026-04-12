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
    const prompt = `Processe este conteúdo acadêmico e gere:
- Resumo Markdown (## seções)
- 3 Flashcards (frente/verso)
- 2 Questões ENEM (5 alternativas)

${subject ? `MATÉRIA: ${subject}` : ''}
${topic ? `TÓPICO: ${topic}` : ''}
ARQUIVO: ${fileName}

CONTEÚDO:
---
${text.substring(0, 10000)}
---

Formato JSON:
${JSON_FORMAT}`;

    console.log(`📡 [Triturador] Enviando para Gemini (${text.length} chars)...`);
    const result = await callGemini(prompt, SYSTEM_PROMPT, true);

    if (!result.parsed) {
      console.error('❌ [Triturador] Gemini não retornou JSON:', result.text);
      throw new Error('A IA não conseguiu estruturar as questões. Tente um texto mais curto.');
    }

    const data = result.parsed;
    console.log('✅ [Triturador] Gemini respondeu. Salvando dados...');

    // 2. Buscar ou criar subject e topic no Supabase
    const subjectName = data.subject || subject || 'Geral';
    const topicName = data.topic || topic || 'Geral';
    const savedItems = { theoryNote: false, flashcards: 0, questions: 0 };

    try {
      // Buscar subject
      let { data: subjectRow, error: sErr } = await supabaseServer
        .from('subjects')
        .select('id')
        .eq('name', subjectName)
        .maybeSingle();

      if (sErr) throw new Error(`Erro ao buscar matéria: ${sErr.message}`);

      if (!subjectRow) {
        const { data: newSubject, error: nsErr } = await supabaseServer
          .from('subjects')
          .insert({ name: subjectName, color: '#3b82f6', enem_weight: 3 })
          .select('id')
          .single();
        if (nsErr) throw new Error(`Erro ao criar matéria: ${nsErr.message}`);
        subjectRow = newSubject;
      }

      // Buscar topic
      let { data: topicRow, error: tErr } = await supabaseServer
        .from('topics')
        .select('id')
        .eq('name', topicName)
        .eq('subject_id', subjectRow?.id)
        .maybeSingle();

      if (tErr) throw new Error(`Erro ao buscar tópico: ${tErr.message}`);

      if (!topicRow && subjectRow) {
        const { data: newTopic, error: ntErr } = await supabaseServer
          .from('topics')
          .insert({ name: topicName, subject_id: subjectRow.id, enem_relevance: 3 })
          .select('id')
          .single();
        if (ntErr) throw new Error(`Erro ao criar tópico: ${ntErr.message}`);
        topicRow = newTopic;
      }

      const topicId = topicRow?.id;

      // 3. Salvar resumo (theory_notes)
      if (data.summary && topicId) {
        const { error: tnErr } = await supabaseServer.from('theory_notes').insert({
          topic_id: topicId,
          title: data.title || `Resumo: ${topicName}`,
          markdown_content: data.summary,
          original_pdf_name: fileName,
        });
        if (tnErr) console.warn('⚠️ [Triturador] Erro ao salvar resumo:', tnErr.message);
        else savedItems.theoryNote = true;
      }

      // 4. Salvar flashcards
      if (data.flashcards && Array.isArray(data.flashcards) && topicId) {
        const cards = data.flashcards.map((f: any) => ({
          topic_id: topicId,
          front: f.front,
          back: f.back,
          next_review: new Date().toISOString(),
          // user_id omitido pois a tabela exige REFERENCES profiles(id). 
          // Se o RLS permitir, inseriremos sem user_id ou usaremos um fixo.
        }));

        const { error: fErr } = await supabaseServer.from('flashcards').insert(cards);
        if (fErr) console.warn('⚠️ [Triturador] Erro ao salvar flashcards:', fErr.message);
        else savedItems.flashcards = cards.length;
      }

      // 5. Salvar questões
      if (data.questions && Array.isArray(data.questions)) {
        const questions = data.questions.map((q: any) => ({
          // discipline: subjectName, // Removido se a tabela não tiver
          // topic: topicName,       // Removido se a tabela usar apenas referências
          text: q.text,
          // options: q.options,    // CUIDADO: O esquema não tem a coluna 'options'!
          correct_answer: String(q.options?.[q.correct_answer] || q.correct_answer),
          explanation: q.explanation,
          difficulty: q.difficulty || 'Médio',
          source: fileName,
        }));

        const { error: qErr } = await supabaseServer.from('questions').insert(questions);
        if (qErr) console.warn('⚠️ [Triturador] Erro ao salvar questões:', qErr.message);
        else savedItems.questions = questions.length;
      }
    } catch (dbErr: any) {
      console.error('❌ [Triturador] Erro no Supabase:', dbErr.message);
      // Continuamos para retornar os dados da IA mesmo se o save falhar
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
    console.error('❌ [Triturador] Erro fatal:', err.message);
    return res.status(500).json({
      success: false,
      error: `Erro no Triturador: ${err.message}`,
      tip: 'Verifique se o texto colado não é excessivamente longo.'
    });
  }
}
