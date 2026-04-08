import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const envConfig = dotenv.parse(fs.readFileSync('.env', 'utf8'));
for (const k in envConfig) { process.env[k] = envConfig[k]; }

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  console.log("🧐 Verificando nomes das colunas de flashcards...");
  
  // Uma forma simples é tentar um select * limit 0
  const { data, error } = await supabase.from('flashcards').select('*').limit(1);
  if (error) {
    console.error("❌ Erro:", error.message);
  } else {
    console.log("✅ Colunas encontradas:", Object.keys(data[0] || {}));
  }
}
checkColumns();
