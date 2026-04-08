-- ============================================================
-- AG MEDICINA — GERADOR DE SEMANA V2 (PREFERÊNCIAS)
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_study_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE, -- Se houver auth real, senão use o ID fixo
    hours_per_day INT DEFAULT 4,
    days_per_week INT DEFAULT 5,
    intensity TEXT CHECK (intensity IN ('Leve', 'Moderada', 'Hardcore')) DEFAULT 'Moderada',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.user_study_preferences ENABLE ROW LEVEL SECURITY;

-- Política de acesso total (uso individual)
CREATE POLICY "manage_own_preferences" ON public.user_study_preferences FOR ALL USING (true) WITH CHECK (true);

-- Inserir dados padrão se não existirem
INSERT INTO public.user_study_preferences (hours_per_day, days_per_week, intensity)
VALUES (4, 5, 'Moderada')
ON CONFLICT (user_id) DO NOTHING;
