-- 🚀 SCHEMA ANTIGRAVITY MED (POSTGRESQL - SUPABASE)

-- 1. TABELA DE USUÁRIOS (Sincronizada com o Auth do Supabase)
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  avatar_url text,
  xp bigint default 0,
  level int default 1,
  energy int default 100,
  streak int default 0,
  last_streak_date date,
  target_score int default 800, -- Meta ENEM
  updated_at timestamp with time zone default now()
);

-- 2. TABELA DE MATÉRIAS
create table public.subjects (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  color text, -- Ex: #3B82F6
  icon text,  -- Ex: "microscope"
  area text check (area in ('Linguagens', 'Matemática', 'Natureza', 'Humanas'))
);

-- 3. TABELA DE TÓPICOS (Assuntos)
create table public.topics (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references public.subjects not null,
  name text not null,
  enem_weight int default 1 -- 1 a 5 (Importância no ENEM)
);

-- 4. TABELA DE HABILIDADES (A Matriz de Referência)
create table public.skills (
  id uuid default gen_random_uuid() primary key,
  code text not null, -- Ex: H1, H2..H30
  description text not null,
  axis int check (axis between 1 and 5), -- Eixos Cognitivos
  topic_id uuid references public.topics
);

-- 5. TABELA DE QUESTÕES
create table public.questions (
  id uuid default gen_random_uuid() primary key,
  text text not null,
  image_url text,
  correct_answer text not null,
  explanation text,
  skill_id uuid references public.skills,
  difficulty text check (difficulty in ('Fácil', 'Médio', 'Difícil')),
  source text -- Ex: ENEM 2023
);

-- 6. TABELA DE TENTATIVAS (Tracking de Questões)
create table public.attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  question_id uuid references public.questions not null,
  is_correct boolean not null,
  time_spent int, -- em segundos
  confidence int check (confidence between 1 and 5),
  created_at timestamp with time zone default now()
);

-- 7. TABELA DE FLASHCARDS (Algoritmo SM-2)
create table public.flashcards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  topic_id uuid references public.topics,
  front text not null,
  back text not null,
  next_review timestamp with time zone default now(),
  interval int default 0, -- dias até a próxima revisão
  ease_factor float default 2.5, -- Fator de facilidade SM-2
  reps int default 0, -- número de revisões feitas
  last_reviewed timestamp with time zone
);

-- 8. REDAÇÕES
create table public.essays (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  title text,
  body text not null,
  score_c1 int, score_c2 int, score_c3 int, score_c4 int, score_c5 int,
  total_score int,
  ia_feedback text,
  created_at timestamp with time zone default now()
);

-- 🛡️ ATIVAR RLS (ROW LEVEL SECURITY)
alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.flashcards enable row level security;
alter table public.essays enable row level security;

-- POLÍTICAS BÁSICAS (Usuário só vê os próprios dados)
create policy "Users can see their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can see their own attempts" on public.attempts for select using (auth.uid() = user_id);
create policy "Users can insert their own attempts" on public.attempts for insert with check (auth.uid() = user_id);
create policy "Users can manage their own flashcards" on public.flashcards for all using (auth.uid() = user_id);

-- DADOS INICIAIS (Matérias)
insert into public.subjects (name, color, icon, area) values
('Biologia', '#10B981', 'dna', 'Natureza'),
('Química', '#3B82F6', 'flask', 'Natureza'),
('Física', '#F59E0B', 'atom', 'Natureza'),
('Matemática', '#EF4444', 'plus', 'Matemática');
