-- ==============================================================
-- 📚 MÓDULO DE MATÉRIAS — Antigravity Med
-- Tabelas para cadastro manual de disciplinas e tópicos
-- Execute no Supabase > SQL Editor
-- ==============================================================

-- 1. DISCIPLINAS (Biologia, Química, etc.)
CREATE TABLE IF NOT EXISTS public.subjects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,       -- "Biologia"
  icon        TEXT DEFAULT '📚',          -- emoji da matéria
  color       TEXT DEFAULT '#4A90D9',     -- cor hex do card
  enem_weight INTEGER DEFAULT 3           -- peso geral ENEM (1–5)
    CHECK (enem_weight >= 1 AND enem_weight <= 5),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TÓPICOS/ASSUNTOS dentro de cada disciplina
CREATE TABLE IF NOT EXISTS public.topics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id      UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,            -- "Genética"
  enem_relevance  INTEGER DEFAULT 3         -- relevância ENEM (1–5)
    CHECK (enem_relevance >= 1 AND enem_relevance <= 5),
  notes           TEXT DEFAULT '',          -- suas anotações pessoais
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subject_id, name)
);

-- 3. Sem RLS — acesso público (igual ao Quiz atual sem login)
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics   DISABLE ROW LEVEL SECURITY;

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_enem_relevance ON public.topics(enem_relevance DESC);
