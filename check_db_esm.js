import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY nao encontrados no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("Verificando dados no Supabase...");
  
  const { count: sessionsCount, error: error1 } = await supabase.from('study_sessions').select('*', { count: 'exact', head: true });
  const { count: subjectsCount, error: error2 } = await supabase.from('subjects').select('*', { count: 'exact', head: true });
  
  if (error1 || error2) {
    console.error("Erro ao buscar dados:", error1 || error2);
  } else {
    console.log(`Study Sessions: ${sessionsCount || 0}`);
    console.log(`Subjects: ${subjectsCount || 0}`);
  }
}

checkData();
