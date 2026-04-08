-- ============================================================
-- 🚀 ANTIGRAVITY MED V3 — CORE SCHEMA
-- Execute este SQL no Supabase para ativar a infraestrutura V3
-- ============================================================

-- 1. EXTENSÕES PARA O PERFIL (PROFILES)
-- Adicionando campos faltantes para o Progress Engine V3
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cognitive_load INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_cognitive_load INT DEFAULT 100,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS freeze_count INT DEFAULT 2, -- Proteção de Streak
ADD COLUMN IF NOT EXISTS total_study_time_seconds BIGINT DEFAULT 0;

-- 2. TABELA DE CONQUISTAS (ACHIEVEMENTS)
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Emoji ou nome de ícone lucide
    category TEXT CHECK (category IN ('consistencia', 'dificuldade', 'evolucao', 'especial')),
    requirement_type TEXT, -- 'xp', 'streak', 'correct_answers', 'study_time'
    requirement_value INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE CONQUISTAS DESBLOQUEADAS
CREATE TABLE IF NOT EXISTS public.achievement_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- 4. TABELA DE MAESTRIA POR MATÉRIA (SUBJECT MASTERY)
-- Concentra o "Domínio" calculado periodicamente ou por evento
CREATE TABLE IF NOT EXISTS public.subject_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    mastery_score FLOAT DEFAULT 0, -- -100 a 100 ou 0 a 100
    recent_correct_count INT DEFAULT 0,
    recent_error_count INT DEFAULT 0,
    corrected_errors_count INT DEFAULT 0,
    last_decay_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, subject_id)
);

-- 5. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_mastery_user_subject ON public.subject_mastery(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_unlocks_user ON public.achievement_unlocks(user_id);

-- 6. HABILITAR RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_mastery ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS DE ACESSO
CREATE POLICY "allow_read_achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "allow_user_unlocks" ON public.achievement_unlocks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "allow_user_mastery" ON public.subject_mastery FOR ALL USING (auth.uid() = user_id);

-- 8. DADOS INICIAIS: CONQUISTAS BÁSICAS
INSERT INTO public.achievements (name, description, icon, category, requirement_type, requirement_value) VALUES
('Primeiro Passo', 'Iniciou sua jornada na V3', '🚀', 'consistencia', 'xp', 100),
('Fogo nos Olhos', 'Atingiu uma sequência de 7 dias', '🔥', 'consistencia', 'streak', 7),
('Cirurgião de Elite', 'Acertou 100 questões', '🏥', 'evolucao', 'correct_answers', 100),
('Resiliência Pura', 'Estudou por 10 horas totais', '⏳', 'consistencia', 'study_time', 36000)
ON CONFLICT DO NOTHING;
