// ==========================================
// api/secretary/detect-gaps.ts
// Endpoint para rodar o GapDetector no servidor
// Endpoint: POST /api/secretary/detect-gaps
// ==========================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GapPrioritizer, type GapMeta } from '../../src/lib/intelligence/GapPrioritizer';

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
    // 1. Buscar settings do usuário (data da prova e horas/dia)
    const { data: settings } = await supabase
      .from('course_sync_settings')
      .select('exam_date, daily_hours')
      .eq('user_id', userId)
      .maybeSingle();

    const testDate = settings?.exam_date
      ? new Date(settings.exam_date)
      : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const dailyHours = settings?.daily_hours ?? 4;
    const prioritizer = new GapPrioritizer(testDate, dailyHours);

    // 2. Buscar todos os tópicos com performance abaixo de 80%
    const { data: performances, error: perfErr } = await supabase
      .from('concept_performance')
      .select(`
        *,
        topic:topics(
          id, name,
          prerequisites:topic_dependencies!topic_id(count)
        )
      `)
      .eq('user_id', userId)
      .lt('accuracy_percent', 80);

    if (perfErr) throw perfErr;

    const summary = { created: 0, updated: 0, resolved: 0 };

    if (performances && performances.length > 0) {
      for (const perf of performances) {
        const dependentCount = Number(perf.topic?.prerequisites?.[0]?.count ?? 0);

        const meta: GapMeta = {
          conceptId: perf.topic_id,
          conceptName: perf.topic?.name ?? 'Desconhecido',
          currentAccuracy: perf.accuracy_percent ?? 0,
          lastReviewed: perf.last_attempted
            ? new Date(perf.last_attempted)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          isPrerequisite: dependentCount > 0,
          dependentConceptsCount: dependentCount,
        };

        const scored = prioritizer.calculateScores(meta);

        // Determinar próxima ação
        let next_action = `Estudar ${scored.topic_name}`;
        if (scored.priority_level === 'CRÍTICO') next_action = `Resolver 10 questões de ${scored.topic_name}`;
        else if (scored.priority_level === 'ALTO') next_action = `Resolver 5 questões de ${scored.topic_name}`;
        else if (scored.decay_score > 70) next_action = `Revisar anotações de ${scored.topic_name} (15 min)`;

        const payload = {
          user_id: userId,
          topic_id: perf.topic_id,
          priority_score: scored.priority_score,
          priority_level: scored.priority_level,
          impact_score: scored.impact_score,
          urgency_score: scored.urgency_score,
          decay_score: scored.decay_score,
          dependency_score: scored.dependency_score,
          reason: scored.reason,
          next_action,
          estimated_minutes: scored.estimated_minutes,
          is_resolved: false,
          last_calculated: new Date().toISOString(),
        };

        const { data: existing } = await supabase
          .from('learning_gaps')
          .select('id')
          .eq('user_id', userId)
          .eq('topic_id', perf.topic_id)
          .maybeSingle();

        if (existing) {
          await supabase.from('learning_gaps').update(payload).eq('id', existing.id);
          summary.updated++;
        } else {
          await supabase.from('learning_gaps').insert(payload);
          summary.created++;
        }
      }
    }

    // 3. Resolver gaps onde a acurácia já atingiu >= 80%
    const { data: resolved } = await supabase
      .from('concept_performance')
      .select('topic_id')
      .eq('user_id', userId)
      .gte('accuracy_percent', 80);

    if (resolved && resolved.length > 0) {
      const ids = resolved.map(r => r.topic_id);
      await supabase
        .from('learning_gaps')
        .update({ is_resolved: true })
        .eq('user_id', userId)
        .in('topic_id', ids)
        .eq('is_resolved', false);
      summary.resolved = resolved.length;
    }

    return res.status(200).json({
      message: 'Gaps detectados e atualizados com sucesso!',
      summary,
    });

  } catch (error: any) {
    console.error('❌ detect-gaps error:', error);
    return res.status(500).json({ error: error.message });
  }
}
