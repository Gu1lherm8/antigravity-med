-- ============================================================
-- CHECKLIST ENEM 2025 - Tabela de Progresso do Usuário
-- Armazena quais tópicos do checklist o aluno já marcou como estudados.
-- ============================================================

CREATE TABLE IF NOT EXISTS enem_checklist_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_key TEXT NOT NULL,                        -- Chave única do tópico (ex: "Ciências da Natureza-Biologia-Ecologia: Fluxo de Energia")
  checked BOOLEAN DEFAULT TRUE,                  -- Se o item está marcado (TRUE) ou desmarcado (FALSE)
  checked_at TIMESTAMPTZ DEFAULT NOW(),          -- Data/hora em que foi marcado
  updated_at TIMESTAMPTZ DEFAULT NOW(),          -- Última atualização
  UNIQUE(item_key)                               -- Garante que cada tópico só tenha uma entrada
);

-- Índice para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_checklist_item_key ON enem_checklist_progress(item_key);

-- Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_checklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_checklist_updated_at ON enem_checklist_progress;
CREATE TRIGGER trigger_checklist_updated_at
  BEFORE UPDATE ON enem_checklist_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_checklist_updated_at();

-- Habilitar RLS (Row Level Security) - Desabilitado pois o projeto não usa auth real
ALTER TABLE enem_checklist_progress ENABLE ROW LEVEL SECURITY;

-- Política permissiva (compatível com o padrão do projeto que usa sessão simulada)
CREATE POLICY "Allow all access to enem_checklist_progress"
  ON enem_checklist_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);
