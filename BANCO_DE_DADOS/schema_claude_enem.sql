-- ============================================================
-- PLATAFORMA DE ESTUDOS ENEM
-- Schema completo para Supabase (PostgreSQL)
-- ============================================================

-- Limpeza Limpa antes de Criar
DROP TABLE IF EXISTS simulation_answers CASCADE;
DROP TABLE IF EXISTS simulation_questions CASCADE;
DROP TABLE IF EXISTS simulations CASCADE;
DROP TABLE IF EXISTS summaries CASCADE;
DROP TABLE IF EXISTS review_sessions CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS subtopics CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;

-- ============================================================
-- 1. TAXONOMIA: matérias, assuntos e tópicos
-- ============================================================

CREATE TABLE subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,            -- ex: "Biologia"
  color       TEXT NOT NULL DEFAULT '#6366f1', -- cor hex para UI
  icon        TEXT,                            -- nome do ícone lucide
  front_a     TEXT,                            -- nome temático Frente A
  front_b     TEXT,                            -- nome temático Frente B
  front_c     TEXT,                            -- nome temático Frente C
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE topics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                   -- ex: "Genética"
  front       CHAR(1) CHECK (front IN ('A','B','C')), -- frente de estudo
  priority    INT DEFAULT 3,                   -- 1=alta, 2=média, 3=baixa
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, name)
);

CREATE TABLE subtopics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id    UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                   -- ex: "Leis de Mendel"
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topic_id, name)
);

-- ============================================================
-- 2. RESUMOS
-- ============================================================

CREATE TABLE summaries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  content       TEXT,                          -- texto do resumo (markdown)
  subject_id    UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id      UUID REFERENCES topics(id) ON DELETE SET NULL,
  subtopic_id   UUID REFERENCES subtopics(id) ON DELETE SET NULL,
  front         CHAR(1) CHECK (front IN ('A','B','C')),
  source_type   TEXT CHECK (source_type IN ('manual','pdf')),
  source_file   TEXT,                          -- caminho/URL do PDF original
  tags          TEXT[],                        -- tags livres
  review_dates  TIMESTAMPTZ[],                 -- histórico de revisões
  next_review   TIMESTAMPTZ,                   -- próxima revisão sugerida
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. QUESTÕES
-- ============================================================

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement       TEXT NOT NULL,               -- enunciado
  image_url       TEXT,                        -- imagem da questão (se houver)
  options         JSONB,                       -- [{id:'A', text:'...'}, ...]
  correct_option  TEXT,                        -- 'A', 'B', 'C', 'D' ou 'E'
  explanation     TEXT,                        -- resolução/comentário
  subject_id      UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id        UUID REFERENCES topics(id) ON DELETE SET NULL,
  subtopic_id     UUID REFERENCES subtopics(id) ON DELETE SET NULL,
  front           CHAR(1) CHECK (front IN ('A','B','C')),
  source          TEXT,                        -- ex: "ENEM 2023", "Cursinho Ferreto"
  source_year     INT,
  difficulty      TEXT CHECK (difficulty IN ('easy','medium','hard')),
  source_type     TEXT CHECK (source_type IN ('manual','pdf','image')),
  tags            TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. MATERIAIS (mapas mentais, infográficos, apresentações, eBooks)
-- ============================================================

CREATE TABLE materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL CHECK (type IN (
                  'mind_map',       -- mapa mental
                  'infographic',    -- infográfico
                  'presentation',   -- apresentação (NotebookLM)
                  'ebook',          -- eBook/PDF teórico
                  'pdf',            -- PDF genérico
                  'other'
                )),
  file_url      TEXT,               -- URL do arquivo no Supabase Storage
  thumbnail_url TEXT,               -- imagem de capa/preview
  subject_id    UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id      UUID REFERENCES topics(id) ON DELETE SET NULL,
  subtopic_id   UUID REFERENCES subtopics(id) ON DELETE SET NULL,
  front         CHAR(1) CHECK (front IN ('A','B','C')),
  source        TEXT,               -- origem: "NotebookLM", "Manual", etc.
  tags          TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. SIMULADOS
-- ============================================================

CREATE TABLE simulations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  source        TEXT,               -- ex: "ENEM 2024 - 1ª aplicação"
  total_questions INT,
  date_taken    DATE,
  duration_min  INT,                -- duração em minutos
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE simulation_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id   UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  question_id     UUID REFERENCES questions(id) ON DELETE SET NULL,
  -- se a questão não está cadastrada na plataforma, guardar inline:
  statement_inline  TEXT,
  options_inline    JSONB,
  correct_option    TEXT,
  subject_id        UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id          UUID REFERENCES topics(id) ON DELETE SET NULL,
  order_num         INT,            -- posição da questão no simulado
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE simulation_answers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id         UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  simulation_question_id UUID NOT NULL REFERENCES simulation_questions(id) ON DELETE CASCADE,
  chosen_option         TEXT,        -- resposta do usuário
  is_correct            BOOLEAN,
  time_spent_sec        INT,         -- tempo gasto nessa questão
  blind_spot            BOOLEAN DEFAULT FALSE, -- marcado como ponto cego
  notes                 TEXT,        -- anotação do usuário sobre o erro
  reviewed_at           TIMESTAMPTZ, -- quando revisou esse erro
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. SISTEMA DE REVISÃO ESPAÇADA
-- ============================================================

CREATE TABLE review_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type     TEXT NOT NULL CHECK (item_type IN ('summary','question','material')),
  item_id       UUID NOT NULL,       -- ID do item revisado
  subject_id    UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id      UUID REFERENCES topics(id) ON DELETE SET NULL,
  quality       INT CHECK (quality BETWEEN 0 AND 5), -- qualidade da revisão (0-5)
  ease_factor   FLOAT DEFAULT 2.5,   -- fator de facilidade (SM-2)
  interval_days INT DEFAULT 1,       -- intervalo até próxima revisão
  next_review   TIMESTAMPTZ,
  reviewed_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. SEED: matérias base com frentes e prioridades
-- ============================================================

INSERT INTO subjects (name, color, icon, front_a, front_b, front_c) VALUES
  ('Biologia',    '#22c55e', 'Microscope',  'Bases da Vida: Citologia e Histologia',        'Genética e Evolução',                           'Ecologia, Fisiologia e Saúde'),
  ('Química',     '#f59e0b', 'FlaskConical','Estrutura da Matéria e Ligações',              'Transformações: Reações, Cinética e Equilíbrio', 'Orgânica e Ambiental'),
  ('Física',      '#3b82f6', 'Zap',         'Mecânica: Movimento, Forças e Energia',        'Termologia, Ondulatória e Óptica',               'Eletricidade, Eletromagnetismo e Física Moderna'),
  ('Matemática',  '#8b5cf6', 'Calculator',  'Fundamentos: Números, Álgebra e Geometria',    'Funções, Progressões e Estatística',             'Geometria Espacial, Trigonometria e Financeira'),
  ('História',    '#ef4444', 'Landmark',    'Antiguidade, Medievo e Brasil Colônia',        'Modernidade: Revoluções e Brasil Nacional',       'Contemporaneidade: Guerras e Brasil República'),
  ('Geografia',   '#14b8a6', 'Globe',       'Cartografia, Natureza e Dinâmicas Físicas',   'Espaço Humano: População e Urbanização',         'Globalização e Questões Socioambientais'),
  ('Filosofia',   '#a855f7', 'BookOpen',    'Filosofia Antiga e Medieval',                  'Filosofia Moderna: Razão, Ciência e Política',   'Contemporânea: Marxismo, Existencialismo e Ética'),
  ('Sociologia',  '#f97316', 'Users',       'Fundadores e Conceitos Estruturais',           'Instituições, Estratificação e Dinâmicas',       'Raça, Gênero, Movimentos Sociais e Globalização'),
  ('Literatura',  '#ec4899', 'BookMarked',  'Trovadorismo ao Arcadismo',                    'Romantismo, Realismo e Naturalismo',             'Modernismo, Pós-Modernismo e Interpretação'),
  ('Gramática',   '#64748b', 'Type',        'Fonologia, Morfologia e Estrutura das Palavras','Sintaxe, Concordância e Regência',              'Interpretação, Gêneros e Redação ENEM'),
  ('Inglês',      '#0ea5e9', 'Languages',   'Vocabulário Essencial e Estruturas Básicas',   'Estratégias de Leitura e Gêneros Textuais',      'Temas Recorrentes e Questões ENEM');

-- ============================================================
-- 8. ÍNDICES para performance
-- ============================================================

CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_subtopics_topic ON subtopics(topic_id);
CREATE INDEX idx_summaries_subject ON summaries(subject_id);
CREATE INDEX idx_summaries_topic ON summaries(topic_id);
CREATE INDEX idx_summaries_next_review ON summaries(next_review);
CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_materials_subject ON materials(subject_id);
CREATE INDEX idx_materials_type ON materials(type);
CREATE INDEX idx_simulation_answers_blind ON simulation_answers(blind_spot) WHERE blind_spot = TRUE;
CREATE INDEX idx_review_sessions_next ON review_sessions(next_review);
CREATE INDEX idx_review_sessions_item ON review_sessions(item_type, item_id);

-- ============================================================
-- 9. FUNÇÃO: atualizar updated_at automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER summaries_updated_at
  BEFORE UPDATE ON summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
