// ==========================================
// api/secretary/sync-external.ts
// Sincroniza atividades do cursinho via Vision IA
// ==========================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { callGeminiVision } from '../lib/gemini';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, imageBase64, description } = req.body;
  if (!userId || (!imageBase64 && !description)) {
    return res.status(400).json({ error: 'Faltam dados para sincronização' });
  }

  try {
    let extractedData = null;

    if (imageBase64) {
      // 1. Usar Gemini Vision para analisar a screenshot/foto
      const systemInstruction = `Você é o Scanner Inteligente da Antigravity Med.
Analise a imagem da plataforma de estudos (Moodle, Blackboard, etc) ou foto de caderno e extraia:
1. Assunto principal (ex: Meiose, Citologia).
2. Disciplina (ex: Biologia).
3. Status (foi uma aula assistida? um exercício feito? qual a nota?).
4. Próximos passos indicados na imagem.

Responda estritamente em JSON:
{
  "topic": "...",
  "subject": "...",
  "activityType": "aula|exercicio|teste",
  "score": 0,
  "summary": "Breve frase descritiva"
}`;

      const response = await callGeminiVision(
        description || 'Analise esta atividade de estudo realizada.',
        imageBase64,
        'image/jpeg',
        systemInstruction
      );
      extractedData = response.parsed;
    } else {
      // Caso seja apenas texto/descrição
      extractedData = {
        topic: description,
        subject: 'Geral',
        activityType: 'manual',
        summary: description
      };
    }

    if (extractedData) {
      // 2. Mapear Assunto para um Topic ID existente (Opcional, mas recomendado)
      const { data: topic } = await supabase
        .from('topics')
        .select('id, subject_id')
        .ilike('name', `%${extractedData.topic}%`)
        .limit(1)
        .single();

      // 3. Salvar na Tabela de Atividades Externas
      const { data: savedActivity, error: dbError } = await supabase
        .from('external_activities')
        .insert({
          user_id: userId,
          source: imageBase64 ? 'scanner' : 'manual',
          type: extractedData.activityType === 'exercicio' ? 'quiz' : 'video_lesson',
          title: extractedData.topic,
          subject_id: topic?.subject_id,
          topic_id: topic?.id,
          raw_data: extractedData,
          completed: true
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return res.status(200).json({
        message: 'Sincronização concluída com sucesso!',
        activity: savedActivity,
        extracted: extractedData
      });
    }

    return res.status(500).json({ error: 'Falha ao extrair dados da imagem' });

  } catch (error: any) {
    console.error('❌ Sync Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
