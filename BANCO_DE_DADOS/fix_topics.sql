-- Script para adicionar as colunas que estão faltando na tabela topics
-- Necessário para o correto salvamento dos Assuntos na aba de Matérias

ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS enem_relevance INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS notes TEXT;
