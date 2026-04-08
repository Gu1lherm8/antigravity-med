import pg from 'pg';
const { Client } = pg;

const config = {
  host: 'db.vpjdztxwvjvlhvcakkky.supabase.co',
  user: 'postgres',
  password: '11251207St',
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

const sql = `
-- Limpeza Total
DROP TABLE IF EXISTS failed_diagnostics CASCADE;
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS essays CASCADE;
DROP TABLE IF EXISTS flashcards CASCADE;

-- Tabelas Criadas por Tradução Automática (Remover)
DROP TABLE IF EXISTS "tentativas" CASCADE;
DROP TABLE IF EXISTS "ensaios" CASCADE;
DROP TABLE IF EXISTS "diagnóstico_falhou" CASCADE;
DROP TABLE IF EXISTS "cartões de memorização" CASCADE;
DROP TABLE IF EXISTS "questões" CASCADE;

-- Estrutura Oficial para o n8n
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

-- População Inicial
INSERT INTO questions (text, options, correct_answer, discipline, topic)
VALUES 
(
  'Qual é a principal função das válvulas cardíacas durante o ciclo cardíaco?',
  '{"A": "Bombear sangue", "B": "Impedir o refluxo sanguíneo", "C": "Filtrar oxigênio", "D": "Regular a pressão"}',
  'B',
  'Anatomia',
  'Cardiovascular'
),
(
  'O que caracteriza um gene recessivo em termos de expressão fenotípica?',
  '{"A": "Sempre se expressa", "B": "Expressa-se apenas em homozigose", "C": "Inibe o dominante", "D": "É uma mutação aleatória"}',
  'B',
  'Genética',
  'Leis de Mendel'
);
`;

async function repair() {
  const client = new Client(config);
  try {
    await client.connect();
    console.log("🏥 Conectado ao banco de dados do Hospital...");
    await client.query(sql);
    console.log("✅ Cirurgia concluída! Tabelas limpas e recriadas com sucesso.");
  } catch (err) {
    console.error("❌ Complicação na cirurgia:", err.message);
  } finally {
    await client.end();
  }
}

repair();
