// ============================================================
// 📄 API: /api/process-pdf
// Processa PDF enviado pelo usuário — gera resumo, flashcards e questões
// Salva tudo no Supabase automaticamente
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGemini } from './lib/gemini.js';
import { supabaseServer } from './lib/supabase-server.js';

// Estende o tempo máximo da API Serverless no Vercel para 60 segundos (Evita Error 500 por Timeout)
export const maxDuration = 60;

const SYSTEM_PROMPT = `Você é o Triturador — o orquestrador intelectual definitivo do Antigravity Med.
Sua missão é processar conteúdo acadêmico (PDFs e anotações brutas) e gerar material de hiper-absorção em JSON estruturado, aplicando ciência cognitiva.

REGRAS ABSOLUTAS:
1. Responda EXCLUSIVAMENTE com o objeto JSON válido.
2. Seja cirúrgico: Resumos devem extrair apenas a "polpa" do conteúdo, dividida por ## seções.
3. Use analogias no resumo para conceitos densos.
4. Flashcards DEVEM incluir um mnemônico ou técnica de memória (ex: Associação) junto com a resposta.
5. As questões geradas devem simular o nível de dificuldade de bancas reais (Morte Súbita).`;

const JSON_FORMAT = `{
  "subject": "Nome da matéria (Ex: Biologia)",
  "topic": "Tópico específico (Ex: Krebs)",
  "title": "Título épico para o resumo",
  "summary": "Resumo em Markdown formatado. Inclua Múltiplas Seções (##), Pontos chave em bullets, e pelo menos UMA Analogia no final.",
  "flashcards": [
    { 
      "front": "Pergunta clara e restrita", 
      "back": "Resposta direta + 🧠 Técnica de Memória (ex: Acrônimo ou Palácio)" 
    }
  ],
  "questions": [
    {
      "text": "Enunciado complexo da questão",
      "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D", "Alternativa E"],
      "correct_answer": 0,
      "explanation": "Explicação detalhada do gabarito definitivo.",
      "difficulty": "Médio"
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

    // Otimização de payload gigante: Se o texto for absurdamente enorme (ex: 150 mil chars), 
    // cortamos um pedaço considerável mas seguro, garantindo que caiba no tempo do Vercel
    const MAX_CHARS = 25000;
    const processedText = text.length > MAX_CHARS ? text.substring(0, MAX_CHARS) + '... [CORTADO DEVIDO A LIMITES DE TAMANHO]' : text;

    // 1. Processar com Gemini seguindo pipeline do Super Prompt
    const prompt = `ALVO: Extração Cognitiva e Parser Estruturado.

METADADOS FORNECIDOS PELO USUÁRIO (se disponível):
${subject ? `- MATÉRIA: ${subject}` : ''}
${topic ? `- TÓPICO: ${topic}` : ''}
- ARQUIVO ORIGINAL: ${fileName}

CONTEÚDO BRUTO:
---
${processedText}
---

INSTRUÇÕES DE SAÍDA:
Gere no mínimo:
- Resumo estruturado do texto (com seções, pontos-chave e analogia).
- De 5 a 10 Flashcards (com mnemônicos no 'back').
- De 3 a 5 Questões complexas de múltipla escolha (A-E).

Siga RIGOROSAMENTE o JSON:
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
