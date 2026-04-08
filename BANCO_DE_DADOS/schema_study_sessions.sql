-- 🚀 MIGRAÇÃO: SISTEMA DE SESSÕES DE ESTUDO (1 para N) E DASHBOARD GLOBAL
-- Esta tabela substitui o rastreio simples por um histórico completo de rodadas e aulas.

CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Referenciando opcionalmente se houver auth
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
    
    session_type TEXT CHECK (session_type IN ('aula', 'questoes', 'revisao', 'simulado', 'global')) DEFAULT 'questoes',
    total_questions INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    difficulty TEXT CHECK (difficulty IN ('Fácil', 'Médio', 'Difícil')) DEFAULT 'Médio',
    
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    -- Automação de Revisão Espaçada (SM-2 Simplificado ou Cronograma Fixo)
    next_revision_date DATE,
    revision_count INT DEFAULT 0,
    is_revision_done BOOLEAN DEFAULT FALSE,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS se necessário
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can manage their own study sessions" 
ON public.study_sessions 
FOR ALL 
USING (true); -- Permitindo acesso global ou por user_id se implementado

-- Índice para performance no Dashboard Global
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON public.study_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON public.study_sessions(completed_at);
