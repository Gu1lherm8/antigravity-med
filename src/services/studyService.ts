// ============================================================
// services/studyService.ts
// Todas as queries Supabase para a plataforma de estudos
// ============================================================

import { supabase } from '../lib/supabase'
import type {
  Subject, Topic, Subtopic,
  Summary, SummaryInsert,
  Question, QuestionInsert,
  Material, MaterialInsert,
  Simulation, SimulationQuestion, SimulationAnswer,
  ReviewSession, StudyFilters
} from '../types/study'

export { supabase }

// ── TAXONOMIA ────────────────────────────────────────────────

export const subjectService = {
  async getAll(): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name')
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Subject | null> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }
}

export const topicService = {
  async getBySubject(subjectId: string): Promise<Topic[]> {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('subject_id', subjectId)
      .order('priority')
      .order('name')
    if (error) throw error
    return data ?? []
  },

  async create(topic: Omit<Topic, 'id' | 'created_at'>): Promise<Topic> {
    const { data, error } = await supabase
      .from('topics')
      .insert(topic)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

export const subtopicService = {
  async getByTopic(topicId: string): Promise<Subtopic[]> {
    const { data, error } = await supabase
      .from('subtopics')
      .select('*')
      .eq('topic_id', topicId)
      .order('name')
    if (error) throw error
    return data ?? []
  },

  async create(subtopic: Omit<Subtopic, 'id' | 'created_at'>): Promise<Subtopic> {
    const { data, error } = await supabase
      .from('subtopics')
      .insert(subtopic)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ── RESUMOS ──────────────────────────────────────────────────

export const summaryService = {
  async getAll(filters?: StudyFilters): Promise<Summary[]> {
    let query = supabase
      .from('summaries')
      .select(`
        *,
        subject:subjects(id,name,color,icon),
        topic:topics(id,name,front),
        subtopic:subtopics(id,name)
      `)
      .order('created_at', { ascending: false })

    if (filters?.subject_id) query = query.eq('subject_id', filters.subject_id)
    if (filters?.topic_id)   query = query.eq('topic_id', filters.topic_id)
    if (filters?.subtopic_id) query = query.eq('subtopic_id', filters.subtopic_id)
    if (filters?.front)      query = query.eq('front', filters.front)
    if (filters?.search)     query = query.ilike('title', `%${filters.search}%`)

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Summary | null> {
    const { data, error } = await supabase
      .from('summaries')
      .select(`*, subject:subjects(*), topic:topics(*), subtopic:subtopics(*)`)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async getDueForReview(): Promise<Summary[]> {
    const { data, error } = await supabase
      .from('summaries')
      .select(`*, subject:subjects(id,name,color), topic:topics(id,name)`)
      .lte('next_review', new Date().toISOString())
      .order('next_review')
    if (error) throw error
    return data ?? []
  },

  async create(summary: SummaryInsert): Promise<Summary> {
    const { data, error } = await supabase
      .from('summaries')
      .insert(summary)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<SummaryInsert>): Promise<Summary> {
    const { data, error } = await supabase
      .from('summaries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('summaries').delete().eq('id', id)
    if (error) throw error
  },

  // Agenda próxima revisão usando algoritmo SM-2 simplificado
  scheduleNextReview(quality: number, intervalDays: number, easeFactor: number) {
    const newEF = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    let newInterval: number
    if (quality < 3) {
      newInterval = 1
    } else if (intervalDays === 1) {
      newInterval = 6
    } else {
      newInterval = Math.round(intervalDays * newEF)
    }
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + newInterval)
    return { newInterval, newEF, nextReview: nextReview.toISOString() }
  }
}

// ── QUESTÕES ─────────────────────────────────────────────────

export const questionService = {
  async getAll(filters?: StudyFilters & { difficulty?: string; source?: string }): Promise<Question[]> {
    let query = supabase
      .from('questions')
      .select(`
        *,
        subject:subjects(id,name,color,icon),
        topic:topics(id,name,front),
        subtopic:subtopics(id,name)
      `)
      .order('created_at', { ascending: false })

    if (filters?.subject_id)  query = query.eq('subject_id', filters.subject_id)
    if (filters?.topic_id)    query = query.eq('topic_id', filters.topic_id)
    if (filters?.subtopic_id) query = query.eq('subtopic_id', filters.subtopic_id)
    if (filters?.front)       query = query.eq('front', filters.front)
    if (filters?.difficulty)  query = query.eq('difficulty', filters.difficulty)
    if (filters?.search)      query = query.ilike('statement', `%${filters.search}%`)

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Question | null> {
    const { data, error } = await supabase
      .from('questions')
      .select(`*, subject:subjects(*), topic:topics(*), subtopic:subtopics(*)`)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(question: QuestionInsert): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .insert(question)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<QuestionInsert>): Promise<Question> {
    const { data, error } = await supabase
      .from('questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('questions').delete().eq('id', id)
    if (error) throw error
  },

  // Upload de imagem para Supabase Storage
  async uploadImage(file: File): Promise<string> {
    const fileName = `questions/${Date.now()}-${file.name}`
    const { error } = await supabase.storage
      .from('study-assets')
      .upload(fileName, file)
    if (error) throw error
    const { data } = supabase.storage.from('study-assets').getPublicUrl(fileName)
    return data.publicUrl
  }
}

// ── MATERIAIS ─────────────────────────────────────────────────

export const materialService = {
  async getAll(filters?: StudyFilters & { type?: string }): Promise<Material[]> {
    let query = supabase
      .from('materials')
      .select(`
        *,
        subject:subjects(id,name,color,icon),
        topic:topics(id,name,front),
        subtopic:subtopics(id,name)
      `)
      .order('created_at', { ascending: false })

    if (filters?.subject_id)  query = query.eq('subject_id', filters.subject_id)
    if (filters?.topic_id)    query = query.eq('topic_id', filters.topic_id)
    if (filters?.front)       query = query.eq('front', filters.front)
    if (filters?.type)        query = query.eq('type', filters.type)
    if (filters?.search)      query = query.ilike('title', `%${filters.search}%`)

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async create(material: MaterialInsert): Promise<Material> {
    const { data, error } = await supabase
      .from('materials')
      .insert(material)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<MaterialInsert>): Promise<Material> {
    const { data, error } = await supabase
      .from('materials')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('materials').delete().eq('id', id)
    if (error) throw error
  },

  async uploadFile(file: File, folder: string = 'materials'): Promise<string> {
    const fileName = `${folder}/${Date.now()}-${file.name}`
    const { error } = await supabase.storage
      .from('study-assets')
      .upload(fileName, file)
    if (error) throw error
    const { data } = supabase.storage.from('study-assets').getPublicUrl(fileName)
    return data.publicUrl
  }
}

// ── SIMULADOS ─────────────────────────────────────────────────

export const simulationService = {
  async getAll(): Promise<Simulation[]> {
    const { data, error } = await supabase
      .from('simulations')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getById(id: string): Promise<Simulation | null> {
    const { data, error } = await supabase
      .from('simulations')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(sim: Omit<Simulation, 'id' | 'created_at'>): Promise<Simulation> {
    const { data, error } = await supabase
      .from('simulations')
      .insert(sim)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getQuestions(simulationId: string): Promise<SimulationQuestion[]> {
    const { data, error } = await supabase
      .from('simulation_questions')
      .select(`
        *,
        question:questions(*),
        subject:subjects(id,name,color),
        topic:topics(id,name)
      `)
      .eq('simulation_id', simulationId)
      .order('order_num')
    if (error) throw error
    return data ?? []
  },

  async addQuestion(q: Omit<SimulationQuestion, 'id' | 'created_at'>): Promise<SimulationQuestion> {
    const { data, error } = await supabase
      .from('simulation_questions')
      .insert(q)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async saveAnswer(answer: Omit<SimulationAnswer, 'id' | 'created_at'>): Promise<SimulationAnswer> {
    const { data, error } = await supabase
      .from('simulation_answers')
      .upsert(answer, { onConflict: 'simulation_question_id' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getAnswers(simulationId: string): Promise<SimulationAnswer[]> {
    const { data, error } = await supabase
      .from('simulation_answers')
      .select('*')
      .eq('simulation_id', simulationId)
    if (error) throw error
    return data ?? []
  },

  async getBlindSpots(): Promise<SimulationAnswer[]> {
    const { data, error } = await supabase
      .from('simulation_answers')
      .select(`
        *,
        simulation_question:simulation_questions(
          *,
          subject:subjects(id,name,color),
          topic:topics(id,name)
        )
      `)
      .eq('blind_spot', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  // Estatísticas de desempenho por matéria
  async getPerformanceBySubject(simulationId: string) {
    const { data, error } = await supabase
      .from('simulation_answers')
      .select(`
        is_correct,
        simulation_question:simulation_questions(
          subject:subjects(id,name,color)
        )
      `)
      .eq('simulation_id', simulationId)
    if (error) throw error
    return data ?? []
  }
}

// ── REVISÃO ESPAÇADA ──────────────────────────────────────────

export const reviewService = {
  async getDueToday(): Promise<ReviewSession[]> {
    const { data, error } = await supabase
      .from('review_sessions')
      .select('*')
      .lte('next_review', new Date().toISOString())
      .order('next_review')
    if (error) throw error
    return data ?? []
  },

  async create(session: Omit<ReviewSession, 'id' | 'reviewed_at'>): Promise<ReviewSession> {
    const { data, error } = await supabase
      .from('review_sessions')
      .insert(session)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
