-- SCRIPT PARA CORRIGIR TABELA DE DISCIPLINAS (SUBJECTS)
-- Executar no SQL Editor do Supabase: https://supabase.com/dashboard/project/vpjdztxwvjvlhvcakkky/sql/new

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS enem_weight INTEGER DEFAULT 3;

-- Comentário: Esta coluna é necessária para salvar a relevância (estrelas) das matérias.
