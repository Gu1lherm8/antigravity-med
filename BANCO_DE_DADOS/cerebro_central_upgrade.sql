-- ==========================================
-- CÉREBRO CENTRAL UPGRADE - ANTIGRAVITY MED
-- ==========================================

-- 1. FIX: Criação do Bucket "study-assets" e RLS

insert into storage.buckets (id, name, public)
values ('study-assets', 'study-assets', true)
on conflict (id) do nothing;

DROP POLICY IF EXISTS "Permitir upload geral" ON storage.objects;
create policy "Permitir upload geral"
on storage.objects for insert
with check ( bucket_id = 'study-assets' );

DROP POLICY IF EXISTS "Permitir leitura geral" ON storage.objects;
create policy "Permitir leitura geral"
on storage.objects for select
using ( bucket_id = 'study-assets' );

DROP POLICY IF EXISTS "Permitir delete geral" ON storage.objects;
create policy "Permitir delete geral"
on storage.objects for delete
using ( bucket_id = 'study-assets' );

DROP POLICY IF EXISTS "Permitir update geral" ON storage.objects;
create policy "Permitir update geral"
on storage.objects for update
using ( bucket_id = 'study-assets' );


-- 2. TABELA: user_study_settings
-- Armazena a configuração base do Cérebro (Módulo 2)
create table if not exists user_study_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid(), -- Caso tenha Auth, ou só genérico se for single tenant
  days_per_week int not null default 6,
  hours_per_day numeric not null default 4.0,
  subject_distribution jsonb default '{}'::jsonb, -- Ex: {"matematica": 6, "biologia": 4}
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. TABELA: flashcards_external_log
-- Rastreia o log de uso de flashcards externos (Anki, etc) -> Módulo 6
create table if not exists flashcards_external_log (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  topic text not null,
  study_date timestamp with time zone default timezone('utc'::text, now()),
  confidence_level int check(confidence_level between 1 and 5), -- 1(Errei) a 5(Fácil)
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. TABELA: study_sessions_log
-- Mantém o histórico real do que o motor instruiu e o aluno cumpriu
-- Crucial para recálculo dinâmico (não repetir frente/matéria)
create table if not exists study_sessions_log (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  front text check(front in ('A', 'B', 'C')),
  type text check(type in ('theory', 'questions', 'review_1', 'review_7', 'review_15', 'flashcards')),
  completed_at timestamp with time zone default timezone('utc'::text, now()),
  duration_minutes int,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
