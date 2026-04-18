-- ==========================================
-- SECRETÁRIO IA (ORQUESTRADOR) - ANTIGRAVITY MED
-- Schema completo para o sistema autônomo de estudo
-- Versão: 2.0 — Sem dependência de IA externa
-- ==========================================

-- 1. SETTINGS DE SINCRONIZAÇÃO DO CURSINHO
-- Armazena as configurações de integração do Moodle por usuário
CREATE TABLE IF NOT EXISTS course_sync_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID DEFAULT auth.uid(),
  platform        TEXT NOT NULL CHECK (platform IN ('moodle', 'blackboard', 'manual')),
  moodle_url      TEXT,                        -- ex: https://meucursinho.com.br/moodle
  moodle_token    TEXT,                        -- Token de API do Moodle (gerado pelo usuário)
  daily_hours     NUMERIC DEFAULT 4.0,
  exam_date       DATE,                        -- Data da prova (ENEM ou vestibular)
  naming_pattern  TEXT DEFAULT 'bio - aula',  -- Padrão de nome das aulas
  last_synced_at  TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. ATIVIDADES EXTERNAS (do Moodle ou inserção manual)
-- Cada linha = uma atividade que o aluno fez no cursinho
CREATE TABLE IF NOT EXISTS external_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID DEFAULT auth.uid(),
  source      TEXT NOT NULL CHECK (source IN ('moodle', 'blackboard', 'scanner', 'manual')),
  type        TEXT NOT NULL CHECK (type IN ('video_lesson', 'quiz', 'pdf', 'assignment', 'manual')),
  title       TEXT NOT NULL,
  subject_id  UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id    UUID REFERENCES topics(id) ON DELETE SET NULL,
  score       NUMERIC,                         -- nota, se houver (ex: 7.5)
  max_score   NUMERIC,                         -- nota máxima (ex: 10)
  completed   BOOLEAN DEFAULT FALSE,
  raw_data    JSONB,                           -- dados brutos da API Moodle
  study_date  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERFORMANCE POR CONCEITO
-- Rastreia o histórico de acertos/erros por tópico
CREATE TABLE IF NOT EXISTS concept_performance (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID DEFAULT auth.uid(),
  topic_id          UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  correct_count     INT DEFAULT 0,
  total_attempts    INT DEFAULT 0,
  accuracy_percent  FLOAT DEFAULT 0,           -- de 0 a 100
  last_attempted    TIMESTAMPTZ,
  last_correct      TIMESTAMPTZ,
  time_spent_total  INT DEFAULT 0,            -- total em segundos
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- 4. DEPENDÊNCIAS ENTRE TÓPICOS
-- Define quais tópicos são pré-requisito de outros
CREATE TABLE IF NOT EXISTS topic_dependencies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id       UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,   -- o dependente
  requires_id    UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,   -- o pré-requisito
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topic_id, requires_id)
);

-- 5. GAPS DE APRENDIZAGEM (O coração do sistema)
-- Calculados automaticamente pelo GapDetector + GapPrioritizer
CREATE TABLE IF NOT EXISTS learning_gaps (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID DEFAULT auth.uid(),
  topic_id         UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  priority_score   FLOAT DEFAULT 0,           -- 0 a 100: o score final ponderado
  priority_level   TEXT CHECK (priority_level IN ('CRÍTICO','ALTO','MÉDIO','BAIXO')),
  impact_score     FLOAT DEFAULT 0,           -- sub-score: impacto (erro × ENEM)
  urgency_score    FLOAT DEFAULT 0,           -- sub-score: urgência (tempo até prova)
  decay_score      FLOAT DEFAULT 0,           -- sub-score: esquecimento (Ebbinghaus)
  dependency_score FLOAT DEFAULT 0,           -- sub-score: pré-requisito de outros
  reason           TEXT,                      -- Texto explicativo para o aluno
  next_action      TEXT,                      -- Ex: "Resolver 5 questões de Meiose"
  estimated_minutes INT DEFAULT 30,
  sequence_order   INT,
  is_resolved      BOOLEAN DEFAULT FALSE,     -- true quando acurácia > 80%
  last_calculated  TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- 6. FILA DE TAREFAS DIÁRIA (Gerada pelo generate-plan)
-- O que o app exibe como "Próxima Missão"
CREATE TABLE IF NOT EXISTS daily_task_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID DEFAULT auth.uid(),
  day_date         DATE NOT NULL,              -- ex: 2025-10-15
  order_num        INT NOT NULL,               -- 1, 2, 3...
  title            TEXT NOT NULL,              -- "Revisar Meiose"
  duration_minutes INT DEFAULT 30,
  reason           TEXT,                       -- "Você errou 60% das questões"
  type             TEXT CHECK (type IN ('theory', 'questions', 'review', 'flashcards')),
  topic_id         UUID REFERENCES topics(id) ON DELETE SET NULL,
  gap_id           UUID REFERENCES learning_gaps(id) ON DELETE SET NULL,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'skipped')),
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES para consultas rápidas
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_gaps_user_score
  ON learning_gaps(user_id, priority_score DESC)
  WHERE is_resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_tasks_user_date
  ON daily_task_queue(user_id, day_date);

CREATE INDEX IF NOT EXISTS idx_concept_perf_user
  ON concept_performance(user_id, accuracy_percent ASC);

CREATE INDEX IF NOT EXISTS idx_ext_activities_user
  ON external_activities(user_id, study_date DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- Garante que cada usuário veja apenas seus dados
-- ==========================================

-- course_sync_settings
ALTER TABLE course_sync_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secretary_sync_user_only" ON course_sync_settings;
CREATE POLICY "secretary_sync_user_only"
  ON course_sync_settings USING (user_id = auth.uid());

-- external_activities
ALTER TABLE external_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secretary_ext_act_user_only" ON external_activities;
CREATE POLICY "secretary_ext_act_user_only"
  ON external_activities USING (user_id = auth.uid());

-- concept_performance
ALTER TABLE concept_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secretary_perf_user_only" ON concept_performance;
CREATE POLICY "secretary_perf_user_only"
  ON concept_performance USING (user_id = auth.uid());

-- learning_gaps
ALTER TABLE learning_gaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secretary_gaps_user_only" ON learning_gaps;
CREATE POLICY "secretary_gaps_user_only"
  ON learning_gaps USING (user_id = auth.uid());

-- daily_task_queue
ALTER TABLE daily_task_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "secretary_tasks_user_only" ON daily_task_queue;
CREATE POLICY "secretary_tasks_user_only"
  ON daily_task_queue USING (user_id = auth.uid());
