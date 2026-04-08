// =====================================================
// 🩺 Verificador do Schema de Inteligência — Nível 2
// =====================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vpjdztxwvjvlhvcakkky.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwamR6dHh3dmp2bGh2Y2Fra2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjQ1MTMsImV4cCI6MjA5MDQwMDUxM30.Rq6YF3QYe0qps_IuTA_6vhEg6KxhR-rO_w7-U6Pxk4A';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
  console.log('\n🔬 VERIFICANDO SCHEMA DE INTELIGÊNCIA DO ANTIGRAVITY MED...\n');

  const tables = [
    { name: 'spaced_repetition', desc: 'Motor SM-2 (Repetição Espaçada)' },
    { name: 'study_plans', desc: 'Receituário Prescrito (Planos Diários)' },
    { name: 'attempts', desc: 'Tentativas do Quiz' },
    { name: 'questions', desc: 'Banco de Questões' },
    { name: 'failed_diagnostics', desc: 'UTI de Ocorrências' },
  ];

  let allOk = true;
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table.name).select('id').limit(1);
    
    if (error && error.code === '42P01') {
      console.log(`  ❌  ${table.name.padEnd(25)} → TABELA NÃO EXISTE — ${table.desc}`);
      allOk = false;
    } else if (error) {
      console.log(`  ⚠️   ${table.name.padEnd(25)} → ERRO: ${error.message}`);
      allOk = false;
    } else {
      console.log(`  ✅  ${table.name.padEnd(25)} → OK — ${table.desc}`);
    }
  }

  // Verificar coluna confidence_level na tabela attempts
  const { data: colData, error: colError } = await supabase
    .from('attempts')
    .select('confidence_level')
    .limit(1);

  if (colError && colError.message?.includes('confidence_level')) {
    console.log(`  ❌  attempts.confidence_level → COLUNA NÃO EXISTE (schema_intelligence.sql não foi rodado)`);
    allOk = false;
  } else if (!colError) {
    console.log(`  ✅  attempts.confidence_level   → OK — Nível de Confiança Clínico`);
  }

  console.log('\n' + '─'.repeat(60));
  if (allOk) {
    console.log('✅ SCHEMA COMPLETO! O banco está pronto para o Nível 2.');
  } else {
    console.log('⚠️  SCHEMA INCOMPLETO. Você precisa rodar o schema_intelligence.sql no Supabase.');
    console.log('\n📋 Como rodar:');
    console.log('   1. Acesse: https://supabase.com/dashboard/project/vpjdztxwvjvlhvcakkky/sql/new');
    console.log('   2. Cole o conteúdo de: projeto-medicina/schema_intelligence.sql');
    console.log('   3. Clique em RUN');
  }
  console.log('─'.repeat(60) + '\n');
}

checkSchema().catch(console.error);
