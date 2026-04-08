-- ============================================================
-- AG MEDICINA — SCHEMA MÓDULOS 16-24
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- MÓDULO 16: AULAS (Matéria → Assunto → Aulas)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  level TEXT DEFAULT 'medio' CHECK (level IN ('basico', 'medio', 'avancado')),
  duration_minutes INT DEFAULT 60,
  status TEXT DEFAULT 'nao_iniciado' CHECK (status IN ('nao_iniciado', 'em_andamento', 'concluido')),
  order_index INT DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MÓDULO 17/23: CALENDÁRIO SEMANAL EDITÁVEL
CREATE TABLE IF NOT EXISTS weekly_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default',
  week_start DATE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  activity_type TEXT DEFAULT 'estudo' CHECK (activity_type IN ('aula', 'questoes', 'revisao', 'flashcard', 'estudo')),
  title TEXT NOT NULL,
  subject_name TEXT DEFAULT '',
  duration_minutes INT DEFAULT 60,
  start_time TIME DEFAULT '08:00',
  color TEXT DEFAULT '#6366f1',
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MÓDULO 19: CADERNO INTELIGENTE DE ERROS
CREATE TABLE IF NOT EXISTS error_notebook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  discipline TEXT DEFAULT 'Geral',
  topic TEXT DEFAULT 'Geral',
  wrong_answer TEXT DEFAULT '',
  correct_answer TEXT DEFAULT '',
  error_reason TEXT DEFAULT '',
  simple_explanation TEXT DEFAULT '',
  recommended_action TEXT DEFAULT '',
  times_reviewed INT DEFAULT 0,
  times_correct_after INT DEFAULT 0,
  mastered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- MÓDULO 20/22: MISSÕES DIÁRIAS
CREATE TABLE IF NOT EXISTS daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  period TEXT DEFAULT 'manha' CHECK (period IN ('manha', 'tarde', 'noite')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  activity_type TEXT DEFAULT 'estudo',
  duration_minutes INT DEFAULT 30,
  completed BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_notebook ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;

-- Policies permissivas para uso individual
CREATE POLICY "allow_all_lessons" ON lessons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_schedule" ON weekly_schedule FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_errors" ON error_notebook FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_missions" ON daily_missions FOR ALL USING (true) WITH CHECK (true);

-- Dados de exemplo para Missões
INSERT INTO daily_missions (date, period, title, description, activity_type, duration_minutes, order_index, color) VALUES
  (CURRENT_DATE, 'manha', 'Ver plano do dia', 'Analisar o calendário e as missões', 'revisao', 10, 1, '#6366f1'),
  (CURRENT_DATE, 'manha', 'Aula de Genética', 'Assistir aula do cursinho', 'aula', 60, 2, '#3b82f6'),
  (CURRENT_DATE, 'tarde', '10 Questões de Biologia', 'Praticar questões do Receituário', 'questoes', 30, 3, '#10b981'),
  (CURRENT_DATE, 'noite', 'Revisão de Flashcards', 'Revisar cartões de memória', 'flashcard', 20, 4, '#f59e0b')
ON CONFLICT DO NOTHING;
