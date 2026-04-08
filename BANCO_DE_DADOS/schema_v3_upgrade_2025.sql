-- ============================================================
-- 🚀 ANTIGRAVITY MED V3 — UPGRADE 2025
-- Tabelas de Estudo Autônomo e Critérios de Redação 2025
-- ============================================================

-- 1. TABELA DE PLANOS DE ESTUDO DIÁRIOS
CREATE TABLE IF NOT EXISTS public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    available_time_minutes INT DEFAULT 60,
    status TEXT CHECK (status IN ('pendente', 'em_progresso', 'concluido')) DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 2. TABELA DE TAREFAS DO PLANO
CREATE TABLE IF NOT EXISTS public.study_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.study_plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('QUESTOES', 'REVISAO_TEORICA', 'FLASHCARDS', 'REDACAO')),
    subject TEXT,
    topic TEXT,
    duration_minutes INT,
    order_index INT,
    status TEXT CHECK (status IN ('pendente', 'concluido')) DEFAULT 'pendente',
    metadata JSONB DEFAULT '{}'::jsonb, -- Para armazenar IDs de questões ou referências
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. UPGRADE NA TABELA DE TENTATIVAS (Para Classificação de Erros)
ALTER TABLE public.attempts 
ADD COLUMN IF NOT EXISTS error_type TEXT CHECK (error_type IN ('Teoria', 'Interpretação', 'Cálculo', 'N/A')),
ADD COLUMN IF NOT EXISTS student_answer TEXT; -- Registro da resposta dada

-- 4. UPGRADE NA TABELA DE REDAÇÕES (Critérios 2025)
ALTER TABLE public.essays
ADD COLUMN IF NOT EXISTS c1_detail TEXT,
ADD COLUMN IF NOT EXISTS c2_detail TEXT,
ADD COLUMN IF NOT EXISTS c3_detail TEXT,
ADD COLUMN IF NOT EXISTS c4_detail TEXT,
ADD COLUMN IF NOT EXISTS c5_detail TEXT,
ADD COLUMN IF NOT EXISTS c2_c3_penalty BOOLEAN DEFAULT FALSE, -- Flag de Penalidade Dupla
ADD COLUMN IF NOT EXISTS c5_elements_count INT DEFAULT 0; -- Contador de elementos (0-5)

-- 5. HABILITAR RLS
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_tasks ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS
CREATE POLICY "Users can manage their own study plans" ON public.study_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own study tasks" ON public.study_tasks FOR ALL USING (plan_id IN (SELECT id FROM public.study_plans WHERE user_id = auth.uid()));

-- 7. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_tasks_plan ON public.study_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_plans_user_date ON public.study_plans(user_id, date);
