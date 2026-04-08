-- ============================================================
-- AG MEDICINA — SCHEMA FLOW ENGINE
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- Tabela de Sessões de Flow (Cada vez que o usuário clica em "Começar")
CREATE TABLE IF NOT EXISTS flow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT DEFAULT 'default',
  period TEXT CHECK (period IN ('manha', 'tarde', 'noite')),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'pausado')),
  total_tasks INT DEFAULT 0,
  completed_tasks INT DEFAULT 0,
  accuracy_rate FLOAT DEFAULT 0,
  total_duration_minutes INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  current_task_id TEXT, -- Referência para a tarefa atual na fila (Permite IDs alfanuméricos)
  queue JSONB DEFAULT '[]' -- Armazena a fila de IDs de tarefas ordenadas
);

-- Tabela de Log de Tarefas do Flow (Métrica granular)
CREATE TABLE IF NOT EXISTS flow_task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES flow_sessions(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL, -- 'aula', 'questoes', 'revisao', 'flashcard'
  task_title TEXT NOT NULL,
  subject_name TEXT,
  topic_name TEXT,
  duration_seconds INT DEFAULT 0,
  is_correct BOOLEAN, -- Apenas para questões
  confidence_level INT, -- Apenas para questões
  was_adaptive_insertion BOOLEAN DEFAULT FALSE, -- Se foi inserida pelo motor (revisão forçada)
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE flow_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_task_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_flow_sessions" ON flow_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_flow_logs" ON flow_task_logs FOR ALL USING (true) WITH CHECK (true);
