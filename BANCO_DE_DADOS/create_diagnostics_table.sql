-- 🚀 TABELA DE DIAGNÓSTICOS (UTI DE OCORRÊNCIAS)
-- Esta tabela armazena as análises feitas pela IA para cada erro do aluno.

create table public.failed_diagnostics (
  id uuid default gen_random_uuid() primary key,
  attempt_id uuid references public.attempts(id) on delete cascade,
  user_id uuid references public.profiles(id),
  discipline text not null,
  topic text not null,
  diagnosis_type text check (diagnosis_type in ('Falta de Atenção', 'Conceitual', 'Interpretação', 'Base Teórica')),
  summary text, -- Resumo curto do erro (ex: "Troca de Mitocôndria por Ribossomo")
  full_diagnosis text, -- Explicação detalhada da IA
  question_text text, -- Cópia do enunciado para facilitar o front
  correct_answer text, -- Letra ou texto da resposta certa
  student_answer text, -- O que o aluno marcou
  created_at timestamp with time zone default now()
);

-- Ativar RLS
alter table public.failed_diagnostics enable row level security;

-- Política: Usuário só vê seus próprios diagnósticos
create policy "Users can see their own diagnostics" 
on public.failed_diagnostics 
for select 
using (auth.uid() = user_id);

-- Permitir que o n8n (com service_role ou anon se configurado) insira dados
-- Nota: O n8n geralmente usa a service_role para automações de backend.
