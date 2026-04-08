-- SCHEMA AG MEDICINA - JUNTA MÉDICA
-- Ativação de tabelas para os especialistas: Médico Legista, TRI, Cirurgião, Paramédico e Neurologista.

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE QUESTÕES (Especialista TRI)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  options JSONB NOT NULL, -- Formato: {"A": "Texto", "B": "Texto", ...}
  correct_answer CHAR(1) NOT NULL,
  discipline TEXT NOT NULL,
  topic TEXT NOT NULL,
  tri_difficulty TEXT, -- Fácil, Média, Difícil (IA preenche)
  tri_skill TEXT,      -- Habilidade (ex: H14) (IA preenche)
  tri_competence TEXT, -- Competência (ex: C4) (IA preenche)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE TENTATIVAS (Médico Legista)
CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID,
  student_answer CHAR(1),
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE DIAGNÓSTICOS (UTI de Ocorrências)
CREATE TABLE IF NOT EXISTS failed_diagnostics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
  user_id UUID,
  discipline TEXT,
  topic TEXT,
  diagnosis_type TEXT, -- Falta de Atenção, Conceitual, Interpretação
  summary TEXT,
  full_diagnosis TEXT,
  question_text TEXT,
  correct_answer TEXT,
  student_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABELA DE REDAÇÕES (Cirurgião Plástico)
CREATE TABLE IF NOT EXISTS essays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  title TEXT,
  content TEXT NOT NULL,
  score_total INTEGER,
  feedback_json JSONB, -- Notas das 5 competências do ENEM
  status TEXT DEFAULT 'pending', -- pending, analyzed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABELA DE FLASHCARDS (Neurologista)
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  question_id UUID REFERENCES questions(id),
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  interval_days INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. INSERÇÃO DE QUESTÕES EXEMPLO (Para o primeiro teste)
INSERT INTO questions (text, options, correct_answer, discipline, topic)
VALUES 
(
  'Em uma dissecção de cadáver, um estudante de medicina observa uma alteração na artéria braquial. Qual o nervo que geralmente acompanha esta artéria no terço médio do braço?',
  '{"A": "Nervo Radial", "B": "Nervo Ulnar", "C": "Nervo Mediano", "D": "Nervo Musculocutâneo", "E": "Nervo Axilar"}',
  'C',
  'Biologia',
  'Anatomia Humana'
),
(
  'A herança ligada ao cromossomo X em humanos apresenta um padrão de transmissão característico. Se um homem afetado por uma doença recessiva ligada ao X tem filhos com uma mulher normal não portadora, qual a probabilidade de terem uma filha afetada?',
  '{"A": "0%", "B": "25%", "C": "50%", "D": "75%", "E": "100%"}',
  'A',
  'Biologia',
  'Genética'
);
