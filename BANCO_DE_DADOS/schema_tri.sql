-- ==============================================================
-- 📈 MÓDULO TRI (Teoria de Resposta ao Item) — Antigravity Med
-- Tabelas para cálculo de proficiência (Theta) e radar
-- Execute no Supabase > SQL Editor (Nova Aba)
-- ==============================================================

-- 1. Histórico do Theta (Proficiência ENEM simulada por matéria)
CREATE TABLE IF NOT EXISTS public.user_theta_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_name TEXT NOT NULL,         -- 'Biologia', 'Química', etc (Vem text da outra tabela)
    theta_score NUMERIC NOT NULL,       -- Pontuação calculada (Ex: 685.4)
    coherence NUMERIC DEFAULT 100,      -- Coerência de acertos (%) - Acertou fácil e errou difícil?
    total_easy_correct INTEGER DEFAULT 0,
    total_medium_correct INTEGER DEFAULT 0,
    total_hard_correct INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sem RLS 
ALTER TABLE public.user_theta_history DISABLE ROW LEVEL SECURITY;

-- Índice para acelerar busca do frontend do Gráfico de Linha (série histórica)
CREATE INDEX IF NOT EXISTS idx_user_theta_history_subject ON public.user_theta_history(subject_name, created_at);

-- INSERÇÃO DE DADOS MOCKADOS (PARA DEMONSTRAÇÃO DO GRÁFICO TRI DE CARA)
-- Mockando uma subida gradual em 'Biologia' e 'Matemática'
INSERT INTO public.user_theta_history (subject_name, theta_score, coherence, created_at) VALUES
('Biologia', 450.5, 80, NOW() - INTERVAL '5 weeks'),
('Biologia', 475.2, 85, NOW() - INTERVAL '4 weeks'),
('Biologia', 510.0, 88, NOW() - INTERVAL '3 weeks'),
('Biologia', 620.3, 90, NOW() - INTERVAL '2 weeks'),
('Biologia', 645.8, 92, NOW() - INTERVAL '1 weeks'),
('Biologia', 680.0, 95, NOW()),

('Matemática', 600.0, 75, NOW() - INTERVAL '5 weeks'),
('Matemática', 580.4, 70, NOW() - INTERVAL '4 weeks'),
('Matemática', 670.2, 82, NOW() - INTERVAL '3 weeks'),
('Matemática', 710.8, 88, NOW() - INTERVAL '2 weeks'),
('Matemática', 705.5, 86, NOW() - INTERVAL '1 weeks'),
('Matemática', 790.3, 94, NOW());
