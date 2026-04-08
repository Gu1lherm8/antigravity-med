const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
const envPath = path.resolve(__dirname, '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const SUPABASE_URL = envConfig.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERRO: Chaves do Supabase não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function resetEverything() {
  console.log('🚀 INICIANDO LIMPEZA TOTAL (RESET V3)...');

  const tablesToClear = [
    'achievement_unlocks',
    'attempts',
    'spaced_repetition',
    'study_sessions',
    'study_plans',
    'subject_mastery',
    'diagnostics',
    'flashcards',
    'theory_notes',
    'essays',
    'questions', // Como pedido pelo usuário: Apagando o banco fictício
    'skills',
    'topics'
  ];

  for (const table of tablesToClear) {
    console.log(`🧹 Limpando tabela: ${table}...`);
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) {
      console.warn(`⚠️ Aviso ao limpar ${table}:`, error.message);
    }
  }

  console.log('💎 Resetando Perfil do Usuário (XP, Nível, Streak)...');
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      xp: 0, 
      level: 1, 
      streak: 0, 
      energy: 100, 
      cognitive_load: 0, 
      total_study_time_seconds: 0,
      target_score: 735 // Fixando na meta sugerida (Cota V3)
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Update everyone (assuming single user demo)

  if (profileError) {
    console.error('❌ Erro ao resetar perfil:', profileError.message);
  }

  console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO!');
  console.log('📅 Sistema pronto para receber seus dados reais para AMANHÃ.');
}

resetEverything();
