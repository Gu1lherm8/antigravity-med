import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Carrega .env manualmente para node
const envValue = fs.readFileSync('.env', 'utf8');
const envConfig = dotenv.parse(envValue);
for (const k in envConfig) { process.env[k] = envConfig[k]; }

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnostic() {
  console.log("🔍 Iniciando Diagnóstico do Triturador...");
  
  try {
    // 1. Checar theory_notes
    const { data: theory, error: errT } = await supabase.from('theory_notes').select('id');
    if (errT) console.error("❌ Erro em theory_notes:", errT.message);
    else console.log("✅ Tabela theory_notes acessível. Registros:", theory.length);

    // 2. Checar flashcards
    const { data: cards, error: errC } = await supabase.from('flashcards').select('id');
    if (errC) console.error("❌ Erro em flashcards:", errC.message);
    else console.log("✅ Tabela flashcards acessível. Registros:", cards.length);

    // 3. Checar subjects (dependência visual)
    const { data: subjects, error: errS } = await supabase.from('subjects').select('name');
    if (errS) console.error("❌ Erro em subjects:", errS.message);
    else console.log("✅ Matérias encontradas:", subjects?.length || 0);
  } catch (e) {
    console.error("💥 Erro catastrófico no diagnóstico:", e.message);
  }
}

diagnostic();
