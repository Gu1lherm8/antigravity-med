// ============================================================
// services/studyModulesService.ts
// Lógica de negócio para o Sistema de Revisão Inteligente
// Gerencia aulas, resumos, questões e flashcards por módulo
// ============================================================

import { supabase } from '../lib/supabase'

// ── Tipos ────────────────────────────────────────────────────

export interface StudyModule {
  id: string
  materia: string
  frente: string | null
  aula_numero: number | null
  assunto: string
  descricao: string | null
  data_estudo: string
  created_at: string
  updated_at: string
  // Joins opcionais
  summary?: ModuleSummary | null
  questions?: ModuleQuestions | null
  flashcards?: ModuleFlashcards | null
}

export interface ModuleSummary {
  id: string
  module_id: string
  texto_resumo: string | null
  audio_url: string | null
  audio_duration_sec: number | null
  ultima_revisao: string | null
  proxima_revisao: string | null
}

export interface ModuleQuestions {
  id: string
  module_id: string
  total_questions: number
  correct_answers: number
  data_sessao: string
  ultima_revisao: string | null
  proxima_revisao: string | null
}

export interface ModuleFlashcards {
  id: string
  module_id: string
  total_cards: number
  mastered: number
  learning: number
  not_learned: number
  cards_content: string | null
  data_sessao: string
  ultima_revisao: string | null
  proxima_revisao: string | null
}

export interface RevisionHistoryEntry {
  id: string
  module_id: string
  tipo: 'resumo' | 'questoes' | 'flashcards'
  data_revisao: string
  percentual_acerto: number | null
  tempo_gasto_min: number | null
  notas: string | null
}

export interface ReviewTodayItem {
  moduleId: string
  materia: string
  assunto: string
  frente: string | null
  tipo: 'resumo' | 'questoes' | 'flashcards'
  urgency: 'overdue' | 'today' | 'soon' // vencido, hoje, em breve (3 dias)
  proximaRevisao: string
  ultimaRevisao: string | null
  accuracyPercent: number | null
  estimatedMinutes: number
  recordId: string // id da tabela filho (summary/questions/flashcards)
}

export interface NewModulePayload {
  materia: string
  frente?: string
  aula_numero?: number
  assunto: string
  descricao?: string
  data_estudo: string
  // Resumo
  texto_resumo?: string
  audio_url?: string
  // Questões
  total_questions?: number
  correct_answers?: number
  // Flashcards
  total_cards?: number
  mastered?: number
  learning?: number
  not_learned?: number
  cards_content?: string
}

// ── Algoritmo de Spaced Repetition Simples ───────────────────

export function calcularProximaRevisao(
  taxaAcerto: number, // 0–100
  baseDate: Date = new Date()
): string {
  let diasAte = 1

  if (taxaAcerto >= 90) diasAte = 7
  else if (taxaAcerto >= 75) diasAte = 3
  else if (taxaAcerto >= 60) diasAte = 1
  else diasAte = 0 // urgente — hoje mesmo

  const proxima = new Date(baseDate)
  proxima.setDate(proxima.getDate() + diasAte)
  return proxima.toISOString().split('T')[0]
}

export function calcularTaxaAcerto(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * 100)
}

// Para resumos e flashcards (sem % de acerto), usamos revisão padrão de 1 dia
export function calcularProximaRevisaoPadrao(dias: number = 1): string {
  const proxima = new Date()
  proxima.setDate(proxima.getDate() + dias)
  return proxima.toISOString().split('T')[0]
}

export function getUrgency(proximaRevisao: string | null): 'overdue' | 'today' | 'soon' | 'ok' {
  if (!proximaRevisao) return 'ok'
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const proxima = new Date(proximaRevisao + 'T00:00:00')

  const diffDias = Math.floor((proxima.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDias < 0) return 'overdue'
  if (diffDias === 0) return 'today'
  if (diffDias <= 3) return 'soon'
  return 'ok'
}

// ── CRUD de Módulos ──────────────────────────────────────────

export const studyModulesService = {

  // Buscar todos os módulos com joins
  async getAll(): Promise<StudyModule[]> {
    const { data, error } = await supabase
      .from('study_modules')
      .select(`
        *,
        summary:module_summaries(*),
        questions:module_questions(*),
        flashcards:module_flashcards(*)
      `)
      .order('data_estudo', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('studyModulesService.getAll error:', error.message)
      return []
    }

    // Supabase retorna arrays para joins 1-para-muitos; pegamos o primeiro
    return (data || []).map((m: any) => ({
      ...m,
      summary: Array.isArray(m.summary) ? m.summary[0] ?? null : m.summary,
      questions: Array.isArray(m.questions) ? m.questions[0] ?? null : m.questions,
      flashcards: Array.isArray(m.flashcards) ? m.flashcards[0] ?? null : m.flashcards,
    }))
  },

  // Buscar um módulo por ID
  async getById(id: string): Promise<StudyModule | null> {
    const { data, error } = await supabase
      .from('study_modules')
      .select(`
        *,
        summary:module_summaries(*),
        questions:module_questions(*),
        flashcards:module_flashcards(*)
      `)
      .eq('id', id)
      .single()

    if (error) return null

    return {
      ...data,
      summary: Array.isArray(data.summary) ? data.summary[0] ?? null : data.summary,
      questions: Array.isArray(data.questions) ? data.questions[0] ?? null : data.questions,
      flashcards: Array.isArray(data.flashcards) ? data.flashcards[0] ?? null : data.flashcards,
    }
  },

  // Criar novo módulo completo (aula + resumo + questões + flashcards)
  async create(payload: NewModulePayload): Promise<StudyModule> {
    // 1. Criar módulo principal
    const { data: moduleData, error: moduleError } = await supabase
      .from('study_modules')
      .insert({
        materia: payload.materia,
        frente: payload.frente || null,
        aula_numero: payload.aula_numero || null,
        assunto: payload.assunto,
        descricao: payload.descricao || null,
        data_estudo: payload.data_estudo,
      })
      .select()
      .single()

    if (moduleError) throw moduleError

    const moduleId = moduleData.id
    const promises: Promise<any>[] = []

    // 2. Criar resumo (se tiver conteúdo)
    if (payload.texto_resumo || payload.audio_url) {
      const proximaRevisaoResumo = calcularProximaRevisaoPadrao(7) // revisão de resumo em 7 dias
      promises.push(
        supabase.from('module_summaries').insert({
          module_id: moduleId,
          texto_resumo: payload.texto_resumo || null,
          audio_url: payload.audio_url || null,
          ultima_revisao: payload.data_estudo,
          proxima_revisao: proximaRevisaoResumo,
        })
      )
    }

    // 3. Criar questões (se tiver)
    if (payload.total_questions && payload.total_questions > 0) {
      const taxa = calcularTaxaAcerto(payload.correct_answers || 0, payload.total_questions)
      const proximaRevisaoQuestoes = calcularProximaRevisao(taxa)
      promises.push(
        supabase.from('module_questions').insert({
          module_id: moduleId,
          total_questions: payload.total_questions,
          correct_answers: payload.correct_answers || 0,
          data_sessao: payload.data_estudo,
          ultima_revisao: payload.data_estudo,
          proxima_revisao: proximaRevisaoQuestoes,
        })
      )
    }

    // 4. Criar flashcards (se tiver)
    if (payload.total_cards && payload.total_cards > 0) {
      const masteredPct = Math.round(((payload.mastered || 0) / payload.total_cards) * 100)
      const proximaRevisaoFlash = calcularProximaRevisao(masteredPct)
      promises.push(
        supabase.from('module_flashcards').insert({
          module_id: moduleId,
          total_cards: payload.total_cards,
          mastered: payload.mastered || 0,
          learning: payload.learning || 0,
          not_learned: payload.not_learned || 0,
          cards_content: payload.cards_content || null,
          data_sessao: payload.data_estudo,
          ultima_revisao: payload.data_estudo,
          proxima_revisao: proximaRevisaoFlash,
        })
      )
    }

    await Promise.all(promises)

    // Retornar módulo completo
    return (await this.getById(moduleId))!
  },

  // Deletar módulo (cascata automática nas filhas via FK)
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('study_modules').delete().eq('id', id)
    if (error) throw error
  },

  // ── Registrar conclusão de revisão e recalcular próxima data ──

  async completeReview(
    tipo: 'resumo' | 'questoes' | 'flashcards',
    recordId: string,
    moduleId: string,
    percentualAcerto: number, // 0–100
    tempoGastoMin?: number
  ): Promise<void> {
    const hoje = new Date().toISOString().split('T')[0]
    const proximaRevisao = calcularProximaRevisao(percentualAcerto)

    // Atualizar tabela filha
    const table =
      tipo === 'resumo'
        ? 'module_summaries'
        : tipo === 'questoes'
        ? 'module_questions'
        : 'module_flashcards'

    await supabase
      .from(table)
      .update({
        ultima_revisao: hoje,
        proxima_revisao: proximaRevisao,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)

    // Registrar no histórico
    await supabase.from('module_revision_history').insert({
      module_id: moduleId,
      tipo,
      data_revisao: hoje,
      percentual_acerto: percentualAcerto,
      tempo_gasto_min: tempoGastoMin || null,
    })
  },

  // Atualizar resultado de questões (nova sessão)
  async updateQuestions(
    recordId: string,
    moduleId: string,
    totalQuestions: number,
    correctAnswers: number
  ): Promise<void> {
    const taxa = calcularTaxaAcerto(correctAnswers, totalQuestions)
    const proximaRevisao = calcularProximaRevisao(taxa)
    const hoje = new Date().toISOString().split('T')[0]

    await supabase
      .from('module_questions')
      .update({
        total_questions: totalQuestions,
        correct_answers: correctAnswers,
        data_sessao: hoje,
        ultima_revisao: hoje,
        proxima_revisao: proximaRevisao,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)

    await supabase.from('module_revision_history').insert({
      module_id: moduleId,
      tipo: 'questoes',
      data_revisao: hoje,
      percentual_acerto: taxa,
    })
  },

  // Atualizar flashcards
  async updateFlashcards(
    recordId: string,
    moduleId: string,
    updates: { total_cards: number; mastered: number; learning: number; not_learned: number; cards_content?: string }
  ): Promise<void> {
    const masteredPct = Math.round((updates.mastered / (updates.total_cards || 1)) * 100)
    const proximaRevisao = calcularProximaRevisao(masteredPct)
    const hoje = new Date().toISOString().split('T')[0]

    await supabase
      .from('module_flashcards')
      .update({
        ...updates,
        data_sessao: hoje,
        ultima_revisao: hoje,
        proxima_revisao: proximaRevisao,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId)

    await supabase.from('module_revision_history').insert({
      module_id: moduleId,
      tipo: 'flashcards',
      data_revisao: hoje,
      percentual_acerto: masteredPct,
    })
  },

  // ── Painel "O que revisar hoje?" ─────────────────────────────

  async getReviewsForToday(): Promise<ReviewTodayItem[]> {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const em3Dias = new Date(hoje)
    em3Dias.setDate(em3Dias.getDate() + 3)

    const todayStr = hoje.toISOString().split('T')[0]
    const em3Str = em3Dias.toISOString().split('T')[0]

    const items: ReviewTodayItem[] = []

    // Buscar módulos com resumos/questões/flashcards para revisar em 3 dias
    const [summaries, questions, flashcards] = await Promise.all([
      supabase
        .from('module_summaries')
        .select('*, study_modules(id, materia, assunto, frente)')
        .lte('proxima_revisao', em3Str)
        .not('proxima_revisao', 'is', null),
      supabase
        .from('module_questions')
        .select('*, study_modules(id, materia, assunto, frente)')
        .lte('proxima_revisao', em3Str)
        .not('proxima_revisao', 'is', null),
      supabase
        .from('module_flashcards')
        .select('*, study_modules(id, materia, assunto, frente)')
        .lte('proxima_revisao', em3Str)
        .not('proxima_revisao', 'is', null),
    ])

    const processRows = (
      rows: any[],
      tipo: 'resumo' | 'questoes' | 'flashcards',
      minutos: number
    ) => {
      for (const row of rows || []) {
        const mod = Array.isArray(row.study_modules)
          ? row.study_modules[0]
          : row.study_modules
        if (!mod) continue

        const urgency = getUrgency(row.proxima_revisao)
        if (urgency === 'ok') continue

        let accuracyPercent: number | null = null
        if (tipo === 'questoes') {
          accuracyPercent = calcularTaxaAcerto(row.correct_answers || 0, row.total_questions || 1)
        } else if (tipo === 'flashcards') {
          accuracyPercent = Math.round(((row.mastered || 0) / (row.total_cards || 1)) * 100)
        }

        items.push({
          moduleId: mod.id,
          materia: mod.materia,
          assunto: mod.assunto,
          frente: mod.frente || null,
          tipo,
          urgency,
          proximaRevisao: row.proxima_revisao,
          ultimaRevisao: row.ultima_revisao || null,
          accuracyPercent,
          estimatedMinutes: minutos,
          recordId: row.id,
        })
      }
    }

    processRows(summaries.data || [], 'resumo', 5)
    processRows(questions.data || [], 'questoes', 10)
    processRows(flashcards.data || [], 'flashcards', 3)

    // Ordenar: vencidos primeiro, depois hoje, depois em breve
    const order = { overdue: 0, today: 1, soon: 2, ok: 3 }
    return items.sort((a, b) => order[a.urgency] - order[b.urgency])
  },

  // ── Estatísticas por Matéria ─────────────────────────────────

  async getSubjectStats(): Promise<{
    materia: string
    avgAccuracy: number
    totalModules: number
    totalRevisoes: number
    fraca: boolean
  }[]> {
    const { data: modules } = await supabase
      .from('study_modules')
      .select('id, materia')

    if (!modules || modules.length === 0) return []

    const { data: history } = await supabase
      .from('module_revision_history')
      .select('module_id, percentual_acerto, tipo')
      .not('percentual_acerto', 'is', null)

    const byMateria: Record<string, { ids: string[]; accuracies: number[] }> = {}

    for (const m of modules) {
      if (!byMateria[m.materia]) byMateria[m.materia] = { ids: [], accuracies: [] }
      byMateria[m.materia].ids.push(m.id)
    }

    for (const h of history || []) {
      const mat = modules.find(m => m.id === h.module_id)?.materia
      if (mat && byMateria[mat]) {
        byMateria[mat].accuracies.push(h.percentual_acerto)
      }
    }

    return Object.entries(byMateria)
      .map(([materia, { ids, accuracies }]) => {
        const avg = accuracies.length > 0
          ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length)
          : 0
        return {
          materia,
          avgAccuracy: avg,
          totalModules: ids.length,
          totalRevisoes: accuracies.length,
          fraca: avg < 70 && accuracies.length > 0,
        }
      })
      .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
  },

  // Histórico de revisões de um módulo (para gráfico)
  async getModuleHistory(moduleId: string): Promise<RevisionHistoryEntry[]> {
    const { data, error } = await supabase
      .from('module_revision_history')
      .select('*')
      .eq('module_id', moduleId)
      .order('data_revisao', { ascending: true })

    if (error) return []
    return data || []
  },
}
