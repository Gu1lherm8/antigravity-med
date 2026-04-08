-- ==============================================================================
-- 🧠 EXPANSÃO ANTIGRAVITY MED (SUPER PROMPT FINAL)
-- ==============================================================================

-- 1. ADICIONANDO O NÍVEL DE CONFIANÇA NA TENTATIVA (Fundamental para o SM-2)
ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 5);

-- 2. TABELA DO MOTOR DE REPETIÇÃO ESPAÇADA (SM-2)
CREATE TABLE IF NOT EXISTS public.spaced_repetition (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
    easiness_factor NUMERIC(5,2) DEFAULT 2.5 NOT NULL,  -- Fator de facilidade inicial do SM-2
    interval_days INTEGER DEFAULT 0 NOT NULL,           -- Quantos dias até a próxima revisão
    repetitions INTEGER DEFAULT 0 NOT NULL,             -- Quantas vezes revisou com acerto seguido
    next_review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativando RLS para segurança
ALTER TABLE public.spaced_repetition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own spaced repetition data" 
ON public.spaced_repetition FOR ALL USING (auth.uid() = user_id);

-- 3. TABELA DE PLANEJAMENTO DIÁRIO (O Receituário Prescrito)
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_date DATE DEFAULT CURRENT_DATE NOT NULL,
    available_time_minutes INTEGER NOT NULL,          -- Tempo injetado pelo aluno no dia (Ex: 10, 60, 120)
    is_shock_therapy BOOLEAN DEFAULT FALSE,           -- Se < 10min, ativa o Bypass "Terapia de Choque"
    priority_score NUMERIC(10,2) DEFAULT 0.0,         -- Score principal calculador
    tasks_json JSONB NOT NULL,                        -- Lista pre-fabricada de revisoes e flashes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativando RLS para segurança
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own study plans" 
ON public.study_plans FOR ALL USING (auth.uid() = user_id);

-- 4. ATUALIZANDO TAREFAS (Função útil para Auto-Update do updated_at)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_spaced_repetition_modtime ON public.spaced_repetition;
CREATE TRIGGER update_spaced_repetition_modtime
    BEFORE UPDATE ON public.spaced_repetition
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
