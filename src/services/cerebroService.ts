// ============================================================
// services/cerebroService.ts
// CÉREBRO CENTRAL: Algoritmo unificado de planejamento ENEM
// Engine 100% Local baseada no log de revisões e pesos
// ============================================================

import { supabase } from '../lib/supabase'
import { intentionService } from './intentionService'

// ── Tipos do Cérebro ──────────────────────────────────────────

export interface DayConfig {
  active: boolean
  hours: number
  start_time: string
}

export interface UserStudySettings {
  id: string
  days_per_week: number
  hours_per_day: number
  subject_distribution: Record<string, number> // subject_id -> horas na semana
  day_configs?: Record<string, DayConfig> // "0" to "6"
}

export interface StudySessionLog {
  id: string
  subject_id: string
  front: 'A' | 'B' | 'C'
  type: 'theory' | 'questions' | 'review_1' | 'review_7' | 'review_15' | 'flashcards'
  completed_at: string
  duration_minutes: number
}

export interface GeneratedPlanItem {
  id: string // id gerado localmente pra UI ('temp-XXX')
  subject_id: string
  subject_name: string
  front?: 'A' | 'B' | 'C'
  type: string
  priority: number
  reason: string
  duration_minutes: number
  reference_id?: string // ex: id do resumo/tópico para revisão
}

// ── 1. CONFIGURAÇÕES (Módulo 2) ───────────────────────────────

export const cerebroConfigService = {
  async getSettings(): Promise<UserStudySettings | null> {
    const { data, error } = await supabase
      .from('user_study_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      
    if (error && error.code !== 'PGRST116') throw error // ignora not found
    
    if (!data) {
      // INJEÇÃO AUTOMÁTICA DE TESTE (Fallback Inicial sem loop)
      console.log("Nenhuma configuração achada. Injetando mock padrão de 6 dias, 4 hrs/dia...");
      const mockSettings = {
        days_per_week: 6,
        hours_per_day: 4,
        subject_distribution: { 'mock_bio_id': 4, 'mock_mat_id': 6 }
      };
      
      const { data: newData, error: insErr } = await supabase
        .from('user_study_settings')
        .insert(mockSettings)
        .select()
        .single();
        
      if (insErr) throw insErr;
      return newData;
    }

    return data
  },

  async saveSettings(settings: Partial<UserStudySettings>): Promise<UserStudySettings> {
    const { data: current } = await supabase
      .from('user_study_settings')
      .select('id')
      .limit(1)
      .single();
    if (current) {
      const { data, error } = await supabase
        .from('user_study_settings')
        .update(settings)
        .eq('id', current.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('user_study_settings')
        .insert(settings)
        .select()
        .single()
      if (error) throw error
      return data
    }
  }
}

// ── 2. LOGS E ERROS (Módulos 5 e 6) ───────────────────────────

export const cerebroLogService = {
  async registerSession(log: Omit<StudySessionLog, 'id' | 'completed_at'>) {
    const { error } = await supabase.from('study_sessions_log').insert(log)
    if (error) throw error
  },

  async logFlashcard(subject_id: string, topic: string, confidence_level: number) {
    const { error } = await supabase.from('flashcards_external_log').insert({
      subject_id, topic, confidence_level
    })
    if (error) throw error
  },

  async getRecentErrors(): Promise<Record<string, number>> {
    // Pega erros das simulações cruzando com a matéria
    const { data: simErrors } = await supabase
      .from('simulation_answers')
      .select('is_correct, simulation_questions(subject_id)')
      .eq('is_correct', false)
      .order('created_at', { ascending: false })
      .limit(200);

    const errorCounts: Record<string, number> = {};
    if (simErrors) {
      simErrors.forEach(err => {
        // simulation_questions pode vir como array ou objeto dependendo do relational map
        const q = Array.isArray(err.simulation_questions) ? err.simulation_questions[0] : err.simulation_questions;
        const subjId = q?.subject_id;
        if (subjId) {
          errorCounts[subjId] = (errorCounts[subjId] || 0) + 1;
        }
      });
    }
    return errorCounts;
  }
}

// ── 3. MOTOR INTELIGENTE (Módulos 3, 4, 7, 8, 9) ──────────────

export const cerebroEngine = {

  // Módulo 8: Prioridade do ENEM + Erros
  calculateEnemPriority(subject_id: string, errorCount: number, enemWeight: number = 1.0): number {
    let priority = 10;
    // Multiplicador de recorrência ENEM (Ex: Natureza tem pesos altos)
    priority *= enemWeight;
    // Peso máximo para erros frequentes (Modificador agressivo)
    if (errorCount > 0) {
      priority += (errorCount * 5); // Errou 3x = +15 de prioridade
    }
    return priority;
  },

  // Busca sumários cujas idades batam com os spikes de revisão (1, 7, 15 dias)
  async getPendingRevisions(): Promise<GeneratedPlanItem[]> {
    const { data: summaries } = await supabase
      .from('summaries')
      .select('*, subject:subjects(name)')
      
    if (!summaries) return []

    const now = new Date().getTime()
    const msInDay = 1000 * 60 * 60 * 24
    const items: GeneratedPlanItem[] = []

    summaries.forEach(s => {
      const createdTime = new Date(s.created_at).getTime()
      const daysDiff = Math.floor((now - createdTime) / msInDay)

      let revType: string | null = null
      let priority = 50 // revisões têm alta prioridade natural

      // Lógica exata: se passou N dias E ainda não tem log desse tipo de revisão...
      // Simplificando o trigger para hoje
      if (daysDiff === 1) { revType = 'review_1'; priority = 60 }
      else if (daysDiff === 7) { revType = 'review_7'; priority = 55 }
      else if (daysDiff >= 15 && daysDiff <= 17) { revType = 'review_15'; priority = 50 }

      if (revType) {
        items.push({
          id: `rev-${s.id}-${revType}`,
          subject_id: s.subject_id,
          subject_name: s.subject?.name || 'Materia',
          front: s.front as 'A'|'B'|'C',
          type: revType,
          priority,
          reason: `Revisão Programada (${daysDiff} dia${daysDiff > 1?'s':''}) - ${s.title}`,
          duration_minutes: 20, // Tempo curto por revisão
          reference_id: s.id
        })
      }
    })

    return items
  },

  // Gerador Diário (Dinâmico com Limites Semanais e Feedback de Erros)
  async generateDailyPlan(): Promise<GeneratedPlanItem[]> {
    const settings = await cerebroConfigService.getSettings()
    if (!settings) throw new Error("Cérebro não configurado: Defina os dias e horas de estudo.")

    const [
      { data: subjects },
      { data: logs },
      errorCounts
    ] = await Promise.all([
      supabase.from('subjects').select('*'),
      supabase.from('study_sessions_log').select('*').order('completed_at', { ascending: false }).limit(200),
      cerebroLogService.getRecentErrors()
    ])

    const plan: GeneratedPlanItem[] = []
    let totalMinutesAllocated = 0
    
    const day = new Date().getDay(); // 0-6
    const dayConfig = settings.day_configs?.[String(day)] || { active: true, hours: settings.hours_per_day, start_time: "08:00" };
    
    if (!dayConfig.active) return []; // Retorna plano vazio se for dia de folga
    
    const targetMinutes = dayConfig.hours * 60

    // 1. Injetar Revisões Pendentes primeiro (NÃO BLOQUEIAM E NÃO CONTAM COMO AVANÇO TEÓRICO)
    const revisions = await this.getPendingRevisions()
    for (const rev of revisions) {
      if (totalMinutesAllocated + rev.duration_minutes <= targetMinutes) {
        plan.push(rev)
        totalMinutesAllocated += rev.duration_minutes
      }
    }

    // 2. Determinar o Avanço de Frentes com base no Teto Semanal
    const distribution = settings.subject_distribution || {}
    const subsArray = subjects || []
    
    // Calcular quanto tempo de cada matéria já foi estudado "nesta semana"
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Define Domingo como início da semana

    const weeklyLogs = logs?.filter(l => new Date(l.completed_at) >= weekStart) || []
    const studiedWeekly: Record<string, number> = {}
    weeklyLogs.forEach(l => {
       studiedWeekly[l.subject_id] = (studiedWeekly[l.subject_id] || 0) + (l.duration_minutes || 0)
    })

    // Avaliar apenas as matérias que receberam alocação de horas e ainda não bateram a meta na semana
    const candidates = subsArray.filter(sub => {
       const targetWeeklyMinutes = (distribution[sub.id] || 0) * 60
       const studiedMinutes = studiedWeekly[sub.id] || 0
       return targetWeeklyMinutes > 0 && studiedMinutes < targetWeeklyMinutes
    })

    // Calcular prioridade Preditiva (considerando peso ENEM original + picos de erros mapeados no caderno)
    const prioritizedCandidates = candidates.map(sub => {
       const errCount = errorCounts[sub.id] || 0
       const priority = this.calculateEnemPriority(sub.id, errCount, sub.enem_weight || 1.0)
       return { sub, priority, errCount }
    }).sort((a, b) => b.priority - a.priority)

    // Alocar as próximas sessões preenchendo as horas diárias exigidas
    for (const { sub, errCount } of prioritizedCandidates) {
      if (totalMinutesAllocated >= targetMinutes) break;

      const hasFrontB = !!sub.front_b
      const hasFrontC = !!sub.front_c

      const subLogs = logs?.filter(l => l.subject_id === sub.id) || []
      const aCount = subLogs.filter(l => l.front === 'A').length
      const bCount = subLogs.filter(l => l.front === 'B').length

      let targetFront: 'A'|'B'|'C' = 'A'
      if (hasFrontC && bCount > 5 && aCount > 5) targetFront = 'C'
      else if (hasFrontB && aCount > 3 && bCount < aCount) targetFront = 'B'

      const item: GeneratedPlanItem = {
        id: `study-${sub.id}-${Date.now()}`,
        subject_id: sub.id,
        subject_name: sub.name,
        front: targetFront,
        type: 'theory',
        priority: this.calculateEnemPriority(sub.id, errCount, sub.enem_weight || 1.0),
        reason: errCount > 2 ? 'Alerta Crítico de Erros - Reforço Imediato' : 'Avanço de Cronograma Padrão',
        duration_minutes: 60
      }

      if (totalMinutesAllocated + item.duration_minutes <= targetMinutes) {
        plan.push(item)
        totalMinutesAllocated += item.duration_minutes
      }
    }

    // Fallback Inteligente: Se as metas já foram batidas mas ainda há horas de estudo NO DIA de hoje,
    // o Cérebro cria simulados focados especificamente na área de maior deficiência!
    if (totalMinutesAllocated < targetMinutes) {
      const fallbackSub = subsArray.sort((a, b) => (errorCounts[b.id]||0) - (errorCounts[a.id]||0))[0];
      if (fallbackSub && totalMinutesAllocated + 60 <= targetMinutes) {
        plan.push({
           id: `study-${fallbackSub.id}-fallback`,
           subject_id: fallbackSub.id,
           subject_name: fallbackSub.name,
           type: 'questions',
           priority: 200,
           reason: 'Meta Semanal Atingida. Reforço Ativo de Fraquezas.',
           duration_minutes: 60
        });
      }
    }

    return plan.sort((a, b) => b.priority - a.priority)
  },

  // Módulo 9: Gerador Semanal (O Coração do Cronograma)
  async generateWeeklyPlan(weekStart: string, mode: 'overwrite' | 'merge' = 'overwrite'): Promise<any[]> {
    const settings = await cerebroConfigService.getSettings()
    if (!settings) throw new Error("Cérebro não configurado.")

    const [
      { data: subjects },
      { data: logs },
      revisions,
      errorCounts,
      intentions
    ] = await Promise.all([
      supabase.from('subjects').select('*'),
      supabase.from('study_sessions_log').select('*').order('completed_at', { ascending: false }).limit(500),
      this.getPendingRevisions(),
      cerebroLogService.getRecentErrors(),
      intentionService.getByWeek(weekStart)
    ])

    const subsArray = subjects || []
    let weekEntries: any[] = []
    
    // Se for merge, carregar o que já existe
    if (mode === 'merge') {
      const { data } = await supabase
        .from('weekly_schedule')
        .select('*')
        .eq('week_start', weekStart);
      if (data) weekEntries = [...data];
    }

    const targetDays = settings.days_per_week
    const hoursPerDay = settings.hours_per_day
    const distribution = settings.subject_distribution || {}

    // Sort subjects by priority/weight
    const prioritizedSubs = subsArray
      .filter(s => (distribution[s.id] || 0) > 0)
      .map(s => {
        const errCount = errorCounts[s.id] || 0
        const priority = this.calculateEnemPriority(s.id, errCount, s.enem_weight || 1.0)
        return { ...s, priority, errCount, targetMinutes: (distribution[s.id] || 0) * 60, allocatedMinutes: 0 }
      })
      .sort((a, b) => b.priority - a.priority)

    // Helper para verificar se um slot está livre
    const isSlotFree = (day: number, start: string, duration: number) => {
      const startMinutes = (parseInt(start.split(':')[0]) * 60) + parseInt(start.split(':')[1])
      const endMinutes = startMinutes + duration
      
      return !weekEntries.some(e => {
        if (e.day_of_week !== day) return false
        const eStart = (parseInt(e.start_time.split(':')[0]) * 60) + parseInt(e.start_time.split(':')[1])
        const eEnd = eStart + e.duration_minutes
        return (startMinutes < eEnd && endMinutes > eStart)
      })
    }

    // 1. Alocar Intenções (Prescritor de Elite) - PRIORIDADE MÁXIMA
    for (const intent of intentions) {
      let allocated = false
      for (let dayOffset = 1; dayOffset <= targetDays && !allocated; dayOffset++) {
        const day = dayOffset % 7
        // Tentar encaixar em horários nobres (09:00 ou 14:00)
        const possibleStarts = ['09:00', '14:00', '10:30', '15:30', '08:00']
        for (const start of possibleStarts) {
          if (isSlotFree(day, start, intent.duration_minutes)) {
            const entry = {
              week_start: weekStart,
              day_of_week: day,
              activity_type: 'aula',
              title: `🎯 AULA: ${intent.topics?.name}`,
              subject_name: intent.subjects?.name,
              duration_minutes: intent.duration_minutes,
              start_time: start,
              color: intent.subjects?.color || '#3b82f6',
              status: 'pendente',
              notes: `Prescrito via Elite. Frente: ${intent.topics?.front || 'A'}`
            }
            weekEntries.push(entry)
            allocated = true
            // Marcar como adicionada para não buscar novamente se rodar de novo (opcional, aqui cuidamos via transaction no calendar)
            break
          }
        }
      }
    }

    // 2. Preencher o restante (Lógica padrão de preenchimento)
    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const day = dayOffset % 7
      const dayConfig = settings.day_configs?.[String(day)] || { active: day !== 0, hours: settings.hours_per_day, start_time: "08:00" }

      if (!dayConfig.active) continue

      const startHourStr = dayConfig.start_time || "08:00"
      const startHour = parseInt(startHourStr.split(':')[0]) + (parseInt(startHourStr.split(':')[1]) / 60)
      const targetDailyMinutes = dayConfig.hours * 60
      
      // Calcular quanto já foi alocado hoje (incluindo manuais e intenções)
      let dailyAllocated = weekEntries
        .filter(e => e.day_of_week === day)
        .reduce((sum, e) => sum + e.duration_minutes, 0)

      // 1. Inserir Flashcards (Daily Maintenance) se houver espaço no início
      if (isSlotFree(day, startHourStr, 30) && dailyAllocated + 30 <= targetDailyMinutes) {
        weekEntries.push({
          week_start: weekStart,
          day_of_week: day,
          activity_type: 'flashcard',
          title: '🃏 Flashcards: Manutenção Global',
          subject_name: 'Geral',
          duration_minutes: 30,
          start_time: startHourStr,
          color: '#8b5cf6',
          status: 'pendente'
        })
        dailyAllocated += 30
      }

      // 2. Alocar Matérias (Rotação) preenchendo buracos
      for (const sub of prioritizedSubs) {
        if (dailyAllocated >= targetDailyMinutes) break
        if (sub.allocatedMinutes >= sub.targetMinutes) continue

        const sessionDuration = 90
        
        // Tentar achar um horário livre para esse dia
        let foundSlot = false
        // Procurar a partir do startHour definido para o dia até 6h depois do limite de estudo
        for (let h = startHour; h <= startHour + (targetDailyMinutes/60) + 4 && !foundSlot; h += 0.5) {
          const startTime = `${String(Math.floor(h)).padStart(2, '0')}:${(h % 1) * 60 === 0 ? '00' : '30'}`
          if (isSlotFree(day, startTime, sessionDuration) && dailyAllocated + sessionDuration <= targetDailyMinutes) {
             
            // Determinar Frente
            const subLogs = [
              ...logs?.filter(l => l.subject_id === sub.id) || [],
              ...weekEntries.filter(e => e.subject_name === sub.name).map(e => ({ front: e.notes?.includes('Frente: B') ? 'B' : e.notes?.includes('Frente: C') ? 'C' : 'A' }))
            ]
            const countA = subLogs.filter(l => l.front === 'A').length
            const countB = subLogs.filter(l => l.front === 'B').length
            const countC = subLogs.filter(l => l.front === 'C').length
            let nextFront: 'A' | 'B' | 'C' = 'A'
            if (sub.front_c && countB > countC && countA > countC) nextFront = 'C'
            else if (sub.front_b && countA > countB) nextFront = 'B'

            weekEntries.push({
              week_start: weekStart,
              day_of_week: day,
              activity_type: 'aula',
              title: `📡 ${sub.name} - Frente ${nextFront}`,
              subject_name: sub.name,
              duration_minutes: sessionDuration,
              start_time: startTime,
              color: sub.color || '#3b82f6',
              status: 'pendente',
              notes: `Frente: ${nextFront}`
            })

            dailyAllocated += sessionDuration
            sub.allocatedMinutes += sessionDuration
            foundSlot = true
          }
        }
      }
    }

    return weekEntries
  }
}
