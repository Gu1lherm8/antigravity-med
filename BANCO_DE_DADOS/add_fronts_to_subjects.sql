-- ================================================================
-- 🎯 MIGRAÇÃO: Adicionar Frentes A/B/C na tabela subjects
-- Execute no Supabase > SQL Editor
-- ================================================================
-- Estas colunas permitem o cadastro das divisões temáticas de cada
-- disciplina (Ex: Biologia → Frente A = Citologia, Frente B = Ecologia...)
-- O cerebroEngine já usa esses campos para rotacionar frentes
-- automaticamente no plano semanal.
-- ================================================================

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS front_a TEXT DEFAULT NULL,  -- Ex: "Citologia e Genética"
  ADD COLUMN IF NOT EXISTS front_b TEXT DEFAULT NULL,  -- Ex: "Ecologia e Evolução"
  ADD COLUMN IF NOT EXISTS front_c TEXT DEFAULT NULL;  -- Ex: "Fisiologia Humana"

-- Índice para filtros por frente
CREATE INDEX IF NOT EXISTS idx_topics_front ON public.topics(front);

-- Confirmar estrutura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subjects' 
  AND column_name IN ('front_a', 'front_b', 'front_c');
