// ============================================================
// types/study.ts
// Tipos TypeScript — espelham o schema do Supabase
// ============================================================

export type Front = 'A' | 'B' | 'C'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type SourceType = 'manual' | 'pdf' | 'image'
export type MaterialType = 'mind_map' | 'infographic' | 'presentation' | 'ebook' | 'pdf' | 'other'
export type SimulationStatus = 'pending' | 'in_progress' | 'completed'
export type ReviewItemType = 'summary' | 'question' | 'material'

// ── Taxonomia ────────────────────────────────────────────────

export interface Subject {
  id: string
  name: string
  color: string
  icon?: string
  front_a?: string
  front_b?: string
  front_c?: string
  created_at: string
}

export interface Topic {
  id: string
  subject_id: string
  name: string
  front?: Front
  priority: 1 | 2 | 3
  created_at: string
  // joins
  subject?: Subject
}

export interface Subtopic {
  id: string
  topic_id: string
  name: string
  created_at: string
  // joins
  topic?: Topic
}

// ── Resumos ──────────────────────────────────────────────────

export interface Summary {
  id: string
  title: string
  content?: string
  subject_id?: string
  topic_id?: string
  subtopic_id?: string
  front?: Front
  source_type?: SourceType
  source_file?: string
  tags: string[]
  review_dates: string[]
  next_review?: string
  created_at: string
  updated_at: string
  // joins
  subject?: Subject
  topic?: Topic
  subtopic?: Subtopic
}

export type SummaryInsert = Omit<Summary, 'id' | 'created_at' | 'updated_at' | 'subject' | 'topic' | 'subtopic'>

// ── Questões ─────────────────────────────────────────────────

export interface QuestionOption {
  id: string   // 'A' | 'B' | 'C' | 'D' | 'E'
  text: string
}

export interface Question {
  id: string
  statement: string
  image_url?: string
  options?: QuestionOption[]
  correct_option?: string
  explanation?: string
  subject_id?: string
  topic_id?: string
  subtopic_id?: string
  front?: Front
  source?: string
  source_year?: number
  difficulty?: Difficulty
  source_type?: SourceType
  tags: string[]
  created_at: string
  // joins
  subject?: Subject
  topic?: Topic
  subtopic?: Subtopic
}

export type QuestionInsert = Omit<Question, 'id' | 'created_at' | 'subject' | 'topic' | 'subtopic'>

// ── Materiais ─────────────────────────────────────────────────

export interface Material {
  id: string
  title: string
  description?: string
  type: MaterialType
  file_url?: string
  thumbnail_url?: string
  subject_id?: string
  topic_id?: string
  subtopic_id?: string
  front?: Front
  source?: string
  tags: string[]
  created_at: string
  // joins
  subject?: Subject
  topic?: Topic
  subtopic?: Subtopic
}

export type MaterialInsert = Omit<Material, 'id' | 'created_at' | 'subject' | 'topic' | 'subtopic'>

// ── Simulados ─────────────────────────────────────────────────

export interface Simulation {
  id: string
  title: string
  description?: string
  source?: string
  total_questions?: number
  date_taken?: string
  duration_min?: number
  status: SimulationStatus
  created_at: string
}

export interface SimulationQuestion {
  id: string
  simulation_id: string
  question_id?: string
  statement_inline?: string
  options_inline?: QuestionOption[]
  correct_option?: string
  subject_id?: string
  topic_id?: string
  order_num?: number
  created_at: string
  // joins
  question?: Question
  subject?: Subject
  topic?: Topic
}

export interface SimulationAnswer {
  id: string
  simulation_id: string
  simulation_question_id: string
  chosen_option?: string
  is_correct?: boolean
  time_spent_sec?: number
  blind_spot: boolean
  notes?: string
  reviewed_at?: string
  created_at: string
}

// ── Revisão espaçada ──────────────────────────────────────────

export interface ReviewSession {
  id: string
  item_type: ReviewItemType
  item_id: string
  subject_id?: string
  topic_id?: string
  quality?: number   // 0–5
  ease_factor: number
  interval_days: number
  next_review?: string
  reviewed_at: string
}

// ── Filtros compartilhados ────────────────────────────────────

export interface StudyFilters {
  subject_id?: string
  topic_id?: string
  subtopic_id?: string
  front?: Front
  tags?: string[]
  search?: string
}

// ── Secretário IA & Gaps ──────────────────────────────────────

export interface ExternalActivity {
  id: string
  user_id?: string
  source: 'moodle' | 'blackboard' | 'scanner'
  type: 'video_lesson' | 'quiz' | 'pdf'
  title: string
  subject_id?: string
  topic_id?: string
  completed: boolean
  raw_data?: any
  study_date: string
  created_at: string
}

export interface ConceptPerformance {
  id: string
  user_id?: string
  topic_id: string
  correct_count: number
  total_attempts: number
  accuracy_percent: number
  last_attempted?: string
  time_spent_total: number
  updated_at: string
}

export interface LearningGap {
  id: string
  user_id?: string
  topic_id: string
  priority_score: number
  priority_level: 'CRÍTICO' | 'ALTO' | 'MÉDIO' | 'BAIXO'
  impact_score: number
  urgency_score: number
  decay_score: number
  dependency_score: number
  reason?: string
  sequence_order?: number
  next_action?: string
  last_calculated: string
  // joins
  topic?: Topic
}

export interface SecretaryDailyPlanTask {
  order: number
  action: string
  duration: number
  reason: string
  concept_id: string
  priority: 'CRÍTICO' | 'ALTO' | 'MÉDIO'
  type: 'question' | 'summary' | 'review'
}
