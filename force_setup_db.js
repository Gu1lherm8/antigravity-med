import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const setupSQL = `
-- Limpeza Total
DROP TABLE IF EXISTS failed_diagnostics CASCADE;
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS essays CASCADE;
DROP TABLE IF EXISTS flashcards CASCADE;
DROP TABLE IF EXISTS "tentativas" CASCADE;
DROP TABLE IF EXISTS "ensaios" CASCADE;
DROP TABLE IF EXISTS "diagnóstico_falhou" CASCADE;
DROP TABLE IF EXISTS "cartões de memorização" CASCADE;
DROP TABLE IF EXISTS "questões" CASCADE;

-- Criação da Estrutura Oficial
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer CHAR(1) NOT NULL,
  discipline TEXT NOT NULL,
  topic TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID,
  student_answer CHAR(1),
  is_correct BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE failed_diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES attempts(id) ON DELETE CASCADE,
  user_id UUID,
  discipline TEXT,
  topic TEXT,
  diagnosis_type TEXT,
  summary TEXT,
  full_diagnosis TEXT,
  question_text TEXT,
  correct_answer TEXT,
  student_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- População de Dados
INSERT INTO questions (text, options, correct_answer, discipline, topic)
VALUES 
(
  'Em uma disseccao de cadaver, um estudante de medicina observa uma alteracao na arteria braquial. Qual o nervo que geralmente acompanha esta arteria no terco medio do braco?',
  '{"A": "Nervo Radial", "B": "Nervo Ulnar", "C": "Nervo Mediano", "D": "Nervo Musculocutaneo", "E": "Nervo Axilar"}',
  'C',
  'Biologia',
  'Anatomia Humana'
),
(
  'A heranca ligada ao cromossomo X em humanos apresenta um padrao de transmissao caracteristico. Se um homem afetado por uma doenca recessiva ligada ao X tem filhos com uma mulher normal nao portadora, qual a probabilidade de terem uma filha afetada?',
  '{"A": "0%", "B": "25%", "C": "50%", "D": "75%", "E": "100%"}',
  'A',
  'Biologia',
  'Genetica'
);
`;

async function runSetup() {
  console.log("🛠️ Iniciando reconstrução do banco de dados...");
  
  // Supabase-js doesn't support multi-statement RAW SQL easily via RPC unless defined.
  // We will try to run it via a simple trick or just use the browser one last time with a 'no-translate' approach.
  // WAIT: I can use the Supabase 'rpc' if I create a function, but I can't create a function without SQL.
  
  // SECONDO PLANO: Usar o browser subagent mas COLANDO (Ctrl+V) em vez de DIGITANDO.
  // Eu vou instruir o subagent a usar o atalho de teclado para colar, pois o 'type' é que quebra.
}
runSetup();
