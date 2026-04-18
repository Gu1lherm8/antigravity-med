// ==========================================
// api/secretary/sync-course.ts
// Sincroniza atividades do Moodle para o Supabase
// Endpoint: POST /api/secretary/sync-course
// ==========================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { MoodleConnector } from '../../src/lib/integrations/MoodleConnector';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }

  try {
    // 1. Buscar configurações do Moodle do usuário
    const { data: settings, error: settingsErr } = await supabase
      .from('course_sync_settings')
      .select('moodle_url, moodle_token, naming_pattern')
      .eq('user_id', userId)
      .eq('platform', 'moodle')
      .single();

    if (settingsErr || !settings?.moodle_url || !settings?.moodle_token) {
      return res.status(400).json({
        error: 'Moodle não configurado. Complete o onboarding primeiro.',
        code: 'MOODLE_NOT_CONFIGURED'
      });
    }

    // 2. Iniciar o conector e verificar conexão
    const moodle = new MoodleConnector(settings.moodle_url, settings.moodle_token);
    const connectionTest = await moodle.testConnection();

    if (!connectionTest.ok) {
      return res.status(400).json({
        error: `Não consegui conectar ao Moodle: ${connectionTest.error}`,
        code: 'MOODLE_AUTH_FAILED'
      });
    }

    // 3. Sincronizar
    const syncResult = await moodle.syncAll();

    // 4. Salvar as atividades no Supabase
    let saved = 0;
    let skipped = 0;

    for (const activity of syncResult.activities) {
      // 4a. Tentar encontrar o topic_id pelo nome parseado
      const { data: topic } = await supabase
        .from('topics')
        .select('id, subject_id')
        .ilike('name', `%${activity.parsedTopicName}%`)
        .limit(1)
        .maybeSingle();

      // 4b. Verificar se essa atividade já foi sincronizada (evitar duplicatas)
      const { data: existing } = await supabase
        .from('external_activities')
        .select('id')
        .eq('user_id', userId)
        .eq('raw_data->>externalId', activity.externalId)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue; // Já existe, pular
      }

      // 4c. Inserir a nova atividade
      await supabase.from('external_activities').insert({
        user_id: userId,
        source: 'moodle',
        type: activity.type,
        title: activity.title,
        subject_id: topic?.subject_id ?? null,
        topic_id: topic?.id ?? null,
        score: activity.score ?? null,
        max_score: activity.maxScore ?? null,
        completed: activity.completed,
        raw_data: activity,
        study_date: activity.completedAt ?? new Date().toISOString(),
      });

      // 4d. Se for um quiz com nota, atualizar concept_performance
      if (activity.type === 'quiz' && topic?.id && activity.completed && activity.score != null && activity.maxScore) {
        const accuracyPercent = Math.round((activity.score / activity.maxScore) * 100);
        const isCorrect = accuracyPercent >= 60;

        const { data: existing_perf } = await supabase
          .from('concept_performance')
          .select('*')
          .eq('user_id', userId)
          .eq('topic_id', topic.id)
          .maybeSingle();

        if (existing_perf) {
          const newTotal = existing_perf.total_attempts + 1;
          const newCorrect = existing_perf.correct_count + (isCorrect ? 1 : 0);
          await supabase
            .from('concept_performance')
            .update({
              total_attempts: newTotal,
              correct_count: newCorrect,
              accuracy_percent: Math.round((newCorrect / newTotal) * 100),
              last_attempted: activity.completedAt ?? new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing_perf.id);
        } else {
          await supabase.from('concept_performance').insert({
            user_id: userId,
            topic_id: topic.id,
            correct_count: isCorrect ? 1 : 0,
            total_attempts: 1,
            accuracy_percent: accuracyPercent,
            last_attempted: activity.completedAt ?? new Date().toISOString(),
          });
        }
      }

      saved++;
    }

    // 5. Atualizar timestamp de última sincronização
    await supabase
      .from('course_sync_settings')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId);

    return res.status(200).json({
      message: 'Sincronização concluída!',
      sitename: connectionTest.sitename,
      stats: {
        courses: syncResult.courses.length,
        activities_total: syncResult.activities.length,
        activities_saved: saved,
        activities_skipped: skipped,
        errors: syncResult.errors,
      }
    });

  } catch (error: any) {
    console.error('❌ sync-course error:', error);
    return res.status(500).json({ error: error.message });
  }
}
