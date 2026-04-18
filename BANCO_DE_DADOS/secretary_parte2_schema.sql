-- ==========================================
-- secretary_parte2_schema.sql
-- Tabelas novas para a Parte 2 do Secretário
-- Execute no SQL Editor do Supabase
-- ==========================================

-- 1. Planos diários gerados (histórico e analytics)
CREATE TABLE IF NOT EXISTS daily_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  plan_date    DATE NOT NULL,
  plan_data    JSONB NOT NULL DEFAULT '{}',
  total_tasks  INTEGER DEFAULT 0,
  completed    INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT daily_plans_user_date_unique UNIQUE (user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_user ON daily_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(plan_date);

-- RLS
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_plans_user_select" ON daily_plans;
DROP POLICY IF EXISTS "daily_plans_user_insert" ON daily_plans;
DROP POLICY IF EXISTS "daily_plans_user_update" ON daily_plans;
DROP POLICY IF EXISTS "daily_plans_test_user" ON daily_plans;

CREATE POLICY "daily_plans_user_select" ON daily_plans FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "daily_plans_user_insert" ON daily_plans FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "daily_plans_user_update" ON daily_plans FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- Política para usuário de teste
CREATE POLICY "daily_plans_test_user" ON daily_plans FOR ALL
  USING (user_id = '00000000-0000-0000-0000-000000000000'::UUID)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::UUID);

-- ─────────────────────────────────────────────────────────────────
-- 2. Mapeamento de atividades → Conceitos
--    "Exercício Meiose" → conceito: Meiose, matéria: Biologia
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_concept_mapping (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name  VARCHAR(500) NOT NULL,
  concept_name   VARCHAR(255) NOT NULL,
  subject        VARCHAR(255) NOT NULL,
  is_prerequisite BOOLEAN DEFAULT FALSE,
  related_concepts TEXT[] DEFAULT '{}',
  confidence     DECIMAL(3,2) DEFAULT 0.90,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT activity_concept_name_unique UNIQUE (activity_name)
);

CREATE INDEX IF NOT EXISTS idx_activity_concept_name ON activity_concept_mapping(activity_name);

-- Sem RLS — tabela pública de mapeamento
ALTER TABLE activity_concept_mapping DISABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────
-- 3. Streak diário — rastreia dias consecutivos de estudo
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS study_streaks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  study_date      DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  minutes_studied INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT study_streak_user_date_unique UNIQUE (user_id, study_date)
);

CREATE INDEX IF NOT EXISTS idx_study_streaks_user ON study_streaks(user_id);

ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_streaks_user_all" ON study_streaks;
DROP POLICY IF EXISTS "study_streaks_test_user" ON study_streaks;

CREATE POLICY "study_streaks_user_all" ON study_streaks FOR ALL
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "study_streaks_test_user" ON study_streaks FOR ALL
  USING (user_id = '00000000-0000-0000-0000-000000000000'::UUID)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::UUID);

-- ─────────────────────────────────────────────────────────────────
-- 4. Dados iniciais: mapeamentos de exemplo (Biologia)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO activity_concept_mapping (activity_name, concept_name, subject) VALUES
  ('Meiose', 'Meiose', 'Biologia'),
  ('Mitose', 'Mitose', 'Biologia'),
  ('Genética', 'Genética Mendeliana', 'Biologia'),
  ('Citologia', 'Citologia', 'Biologia'),
  ('Evolução', 'Teoria da Evolução', 'Biologia'),
  ('Fotossíntese', 'Fotossíntese', 'Biologia'),
  ('Ecologia', 'Ecologia', 'Biologia'),
  ('Histologia', 'Histologia', 'Biologia'),
  ('Embriologia', 'Embriologia', 'Biologia'),
  ('Fisiologia Humana', 'Fisiologia Humana', 'Biologia'),
  ('Termodinâmica', 'Termodinâmica', 'Física'),
  ('Eletrostática', 'Eletrostática', 'Física'),
  ('Cinemática', 'Cinemática', 'Física'),
  ('Óptica', 'Óptica Geométrica', 'Física'),
  ('Funções Orgânicas', 'Funções Orgânicas', 'Química'),
  ('Estequiometria', 'Estequiometria', 'Química'),
  ('Eletroquímica', 'Eletroquímica', 'Química'),
  ('Funções Matemáticas', 'Funções', 'Matemática'),
  ('Geometria Analítica', 'Geometria Analítica', 'Matemática'),
  ('Probabilidade', 'Probabilidade e Estatística', 'Matemática')
ON CONFLICT (activity_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- RESUMO DO QUE FOI CRIADO:
-- ✅ daily_plans        — histórico de planos gerados por dia
-- ✅ activity_concept_mapping — "Meiose" → Biologia
-- ✅ study_streaks      — dias consecutivos de estudo
-- ─────────────────────────────────────────────────────────────────
