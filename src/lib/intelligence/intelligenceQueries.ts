// =====================================================
// 🔌 Queries de Inteligência — Supabase + IA
// =====================================================
// Funções reutilizáveis para buscar e salvar dados
// do sistema de inteligência (SM-2 + study_plans)

import { supabase } from '../supabase';
import { DecisionEngine } from './DecisionEngine';
import { calculateSM2, confidenceToQuality } from './SM2Engine';

export interface BlindSpot {
  topic: string;
  discipline: string;
  priorityScore: number;
  errorCount: number;
  daysSinceReview: number;
  urgencyLevel: 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA';
  taskType: 'Correção de Erro' | 'Dose de Reforço' | 'Diagnóstico Inicial' | 'Check-up Geral';
}

export interface PrescriptionTask {
  order: number;
  discipline: string;
  topic: string;
  estimatedMinutes: number;
  urgencyLevel: 'CRÍTICA' | 'ALTA' | 'MÉDIA' | 'BAIXA';
  taskType: string;
  priorityScore: number;
  isShockTherapy?: boolean;
}

// -------------------------------------------------------
// Busca os pontos cegos via attempts + DecisionEngine
// -------------------------------------------------------
export async function fetchBlindSpots(): Promise<BlindSpot[]> {
  const { data: attempts, error } = await supabase
    .from('attempts')
    .select(`
      question_id,
      is_correct,
      confidence_level,
      created_at,
      questions ( discipline, topic )
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !attempts) return [];

  // Agrupa por disciplina+tópico
  const grouped: Record<string, {
    discipline: string;
    topic: string;
    errors: number;
    total: number;
    lastAttempt: Date;
    hasRecentError: boolean;
  }> = {};

  for (const attempt of attempts) {
    const q = attempt.questions as any;
    if (!q) continue;
    const key = `${q.discipline}|${q.topic}`;
    if (!grouped[key]) {
      grouped[key] = {
        discipline: q.discipline,
        topic: q.topic,
        errors: 0,
        total: 0,
        lastAttempt: new Date(attempt.created_at),
        hasRecentError: false,
      };
    }
    grouped[key].total++;
    if (!attempt.is_correct) {
      grouped[key].errors++;
      // Se errou nas últimas 24h
      const hoursAgo = (Date.now() - new Date(attempt.created_at).getTime()) / 3600000;
      if (hoursAgo < 24) grouped[key].hasRecentError = true;
    }
  }

  // Busca pesos dinâmicos do banco (subjects + topics cadastrados pelo usuário)
  const { data: subjectsData } = await supabase.from('subjects').select('name, enem_weight');
  const { data: topicsData }   = await supabase.from('topics').select('name, enem_relevance, subjects(name)');

  // Monta lookup de pesos: disciplina → peso
  const subjectWeightMap: Record<string, number> = { default: 2 };
  for (const s of subjectsData ?? []) {
    subjectWeightMap[s.name] = s.enem_weight;
  }

  // Mapa de relevância por tópico: "Disciplina|Tópico" → relevância
  const topicRelevanceMap: Record<string, number> = {};
  for (const t of topicsData ?? []) {
    const subName = (t.subjects as any)?.name ?? '';
    topicRelevanceMap[`${subName}|${t.name}`] = t.enem_relevance;
  }

  const now = new Date();
  const blindSpots: BlindSpot[] = Object.values(grouped)
    .filter(g => g.errors > 0)
    .map(g => {
      const daysSince = Math.floor((now.getTime() - g.lastAttempt.getTime()) / 86400000);

      // Peso da disciplina (vem do banco, fallback 3)
      const disciplinePeso = subjectWeightMap[g.discipline] ?? subjectWeightMap['default'];

      // Relevância específica do tópico (vem do banco, fallback = peso da disciplina)
      const topicKey = `${g.discipline}|${g.topic}`;
      const topicPeso = topicRelevanceMap[topicKey] ?? disciplinePeso;

      // Usa a média entre peso da disciplina e relevância do tópico
      const peso = Math.round((disciplinePeso + topicPeso) / 2);

      // Mapeamento de Disciplina para Área do ENEM (Subject V3)
      let area: any = 'Natureza';
      const d = g.discipline.toLowerCase();
      if (d.includes('hist') || d.includes('geo') || d.includes('socio') || d.includes('filo')) area = 'Humanas';
      else if (d.includes('mat')) area = 'Matemática';
      else if (d.includes('port') || d.includes('ling') || d.includes('artes') || d.includes('lite')) area = 'Linguagens';
      else if (d.includes('reda')) area = 'Redação';

      // Normalização para o Motor V3 (0 a 1)
      const normErrorFreq = g.errors / g.total;
      const normTimeSince = Math.min(daysSince / 30, 1);
      const mockDifficulty = 2; // Nível médio padrão

      const score = DecisionEngine.calculatePriorityScore(
        area,
        normErrorFreq,
        normTimeSince,
        mockDifficulty
      );

      let urgency: BlindSpot['urgencyLevel'] = 'BAIXA';
      if (score >= 70) urgency = 'CRÍTICA';
      else if (score >= 50) urgency = 'ALTA';
      else if (score >= 30) urgency = 'MÉDIA';

      let taskType: BlindSpot['taskType'] = 'Check-up Geral';
      if (g.hasRecentError) taskType = 'Correção de Erro';
      else if (g.errors >= 3) taskType = 'Dose de Reforço';
      else if (g.total < 3) taskType = 'Diagnóstico Inicial';

      return {
        topic: g.topic,
        discipline: g.discipline,
        priorityScore: score,
        errorCount: g.errors,
        daysSinceReview: daysSince,
        urgencyLevel: urgency,
        taskType,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return blindSpots;
}

import { Planner } from './Planner';
import type { StudyPlan } from './Planner';

// -------------------------------------------------------
// Gera a prescrição baseada no tempo disponível (Receituário)
// -------------------------------------------------------
export async function generatePrescription(availableMinutes: number): Promise<PrescriptionTask[]> {
  const blindSpots = await fetchBlindSpots();
  let remainingTime = availableMinutes;
  const tasks: PrescriptionTask[] = [];

  const isShock = availableMinutes < 10;

  for (let i = 0; i < blindSpots.length; i++) {
    if (remainingTime <= 0) break;
    const spot = blindSpots[i];

    // Se é terapia de choque, só a mais crítica de todas
    const duration = isShock ? Math.min(remainingTime, 10) : Math.min(15, remainingTime);

    tasks.push({
      order: i + 1,
      discipline: spot.discipline,
      topic: spot.topic,
      estimatedMinutes: duration,
      urgencyLevel: spot.urgencyLevel,
      taskType: spot.taskType,
      priorityScore: spot.priorityScore,
      isShockTherapy: isShock
    });

    remainingTime -= duration;
    if (isShock) break; 
  }

  return tasks;
}

// -------------------------------------------------------
// Gera o Plano de Elite (Piloto Automático)
// -------------------------------------------------------
export async function getPilotPlan(availableMinutes: number): Promise<StudyPlan> {
  const blindSpots = await fetchBlindSpots();
  return Planner.buildDailyExecutionPlan(availableMinutes, blindSpots);
}

// -------------------------------------------------------
// Tradutor de Métricas (Humano)
// -------------------------------------------------------
export function translateMetrics(theta: number, coherence: number) {
  let status: 'BOM' | 'MÉDIO' | 'CRÍTICO' = 'MÉDIO';
  let color = 'text-yellow-500';
  let message = 'Desempenho estável. Mantenha o ritmo.';

  if (theta >= 750 && coherence >= 85) {
    status = 'BOM';
    color = 'text-emerald-500';
    message = 'Evolução excelente! Você está no caminho dos 800+';
  } else if (theta < 600 || coherence < 75) {
    status = 'CRÍTICO';
    color = 'text-red-500';
    message = 'Atenção necessária: Lacunas graves detectadas na base.';
  }

  return { status, color, message, indicator: status === 'BOM' ? '🟢' : status === 'CRÍTICO' ? '🔴' : '🟡' };
}

// -------------------------------------------------------
// Salva a prescrição gerada no banco (study_plans)
// -------------------------------------------------------
export async function savePrescription(
  availableMinutes: number,
  tasks: PrescriptionTask[],
  priorityScore: number
): Promise<void> {
  await supabase.from('study_plans').insert({
    user_id: null, // auth futura
    plan_date: new Date().toISOString().split('T')[0],
    available_time_minutes: availableMinutes,
    is_shock_therapy: availableMinutes < 10,
    priority_score: priorityScore,
    tasks_json: tasks,
  });
}

// -------------------------------------------------------
// Atualiza SM-2 após resposta do estudante
// -------------------------------------------------------
export async function updateSM2AfterAttempt(
  questionId: string,
  userId: string | null,
  confidenceLevel: number,
  isCorrect: boolean
): Promise<void> {
  // Busca registro atual de SM-2 para essa questão
  const { data: existing } = await supabase
    .from('spaced_repetition')
    .select('*')
    .eq('question_id', questionId)
    .maybeSingle();

  const quality = confidenceToQuality(confidenceLevel, isCorrect);
  const sm2Input = {
    quality,
    easinessFactor: existing?.easiness_factor ?? 2.5,
    interval: existing?.interval_days ?? 0,
    repetitions: existing?.repetitions ?? 0,
  };

  const result = calculateSM2(sm2Input);

  if (existing) {
    await supabase.from('spaced_repetition').update({
      easiness_factor: result.newEasinessFactor,
      interval_days: result.newInterval,
      repetitions: result.newRepetitions,
      next_review_date: result.nextReviewDate.toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id);
  } else {
    await supabase.from('spaced_repetition').insert({
      user_id: userId,
      question_id: questionId,
      easiness_factor: result.newEasinessFactor,
      interval_days: result.newInterval,
      repetitions: result.newRepetitions,
      next_review_date: result.nextReviewDate.toISOString(),
    });
  }
}
