import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vpjdztxwvjvlhvcakkky.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwamR6dHh3dmp2bGh2Y2Fra2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjQ1MTMsImV4cCI6MjA5MDQwMDUxM30.Rq6YF3QYe0qps_IuTA_6vhEg6KxhR-rO_w7-U6Pxk4A';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkFlowEngineSchema() {
  console.log('\n🔬 VERIFICANDO SCHEMA DO FLOW ENGINE...\n');

  const tables = [
    { name: 'flow_sessions', desc: 'Sessões de Execução Autônoma' },
    { name: 'flow_task_logs', desc: 'Logs Granulares de Tarefas' },
  ];

  let allOk = true;
  
  for (const table of tables) {
    const { error } = await supabase.from(table.name).select('id').limit(1);
    
    if (error && error.code === '42P01') {
      console.log(`  ❌  ${table.name.padEnd(20)} → TABELA NÃO EXISTE — ${table.desc}`);
      allOk = false;
    } else if (error) {
      console.log(`  ⚠️   ${table.name.padEnd(20)} → ERRO: ${error.message}`);
      allOk = false;
    } else {
      console.log(`  ✅  ${table.name.padEnd(20)} → OK — ${table.desc}`);
    }
  }

  if (allOk) {
    console.log('\n✅ SCHEMA DO FLOW ENGINE PRONTO! Iniciando Fase 2.');
  } else {
    console.log('\n⚠️ SCHEMA INCOMPLETO. Por favor, execute o arquivo schema_flow_engine.sql no Supabase.');
  }
}

checkFlowEngineSchema().catch(console.error);
