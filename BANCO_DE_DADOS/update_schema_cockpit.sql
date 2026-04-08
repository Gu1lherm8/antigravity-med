-- 🚀 MIGRAÇÃO: COCKPIT DE VOO (USER TOPIC PROGRESS)
-- Esta tabela armazena o "ficha técnica" de cada assunto para o usuário.

CREATE TABLE IF NOT EXISTS public.user_topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- Referenciando opcionalmente se houver auth
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    difficulty TEXT DEFAULT 'Médio',
    theory_status TEXT DEFAULT 'pendente',
    exercises_finished_at TIMESTAMP WITH TIME ZONE,
    total_questions INT DEFAULT 0,
    correct_answers INT DEFAULT 0,
    revision_1_date DATE,
    revision_2_date DATE,
    revision_1_done BOOLEAN DEFAULT FALSE,
    revision_2_done BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(topic_id) -- Por enquanto um registro por tópico (sistema single user ou isolado por RLS)
);
