-- ==============================================================
-- 📚 O TRITURADOR UNIVERSAL & ANKI - Antigravity Med
-- Tabelas para receber resumos teóricos e flashcards vindos do n8n
-- ==============================================================

-- 1. NOTAS TEÓRICAS (Resumo Mastigado pela IA do PDF)
CREATE TABLE IF NOT EXISTS public.theory_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    markdown_content TEXT NOT NULL,
    original_pdf_name TEXT, -- nome do arquivo que vc mandou
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. FLASHCARDS (Seu Anki Privado das Entranhas do Texto)
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE,
    front_text TEXT NOT NULL, 
    back_text TEXT NOT NULL,
    source_pdf TEXT,        -- Rastrear de onde veio
    sm2_easiness NUMERIC DEFAULT 2.5,  -- Sistema de retenção (Inicia normal)
    sm2_interval INTEGER DEFAULT 0,    -- Dias para a próxima repetição
    sm2_repetitions INTEGER DEFAULT 0, -- Vezes que repetiu com sucesso
    next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HABILITAR SUPABASE ABERTO (S/ LOGIN OBRIGATÓRIO NA HOME)
ALTER TABLE public.theory_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards DISABLE ROW LEVEL SECURITY;

-- ÍNDICES - Filtros poderosos para sua interface puxar muito rápido
CREATE INDEX IF NOT EXISTS idx_theory_topic ON public.theory_notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON public.flashcards(topic_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_reviews ON public.flashcards(next_review);
