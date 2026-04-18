
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração de ambiente
const supabaseUrl = 'https://vpjdztxwvjvlhvcakkky.supabase.co';
const supabaseKey = 'sb_publishable_zvlftzwREo6yhSGXNFVYtw_Fu0HtCr9';
const supabase = createClient(supabaseUrl, supabaseKey);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../src/data/ferretto_curriculum_extensivo.json');

async function sync() {
  console.log('🚀 Iniciando sincronização Ferretto -> Supabase...');

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  for (const subjectData of data.subjects) {
    console.log(`\n📦 Processando Disciplina: ${subjectData.name}`);

    // 1. Upsert Subject
    const { data: subject, error: sError } = await supabase
      .from('subjects')
      .upsert({
        name: subjectData.name,
        icon: subjectData.icon,
        color: subjectData.color
      }, { onConflict: 'name' })
      .select()
      .single();

    if (sError) {
      console.error(`❌ Erro na disciplina ${subjectData.name}:`, sError.message);
      continue;
    }

    console.log(`✅ Disciplina sincronizada: ${subject.id}`);

    // 2. Upsert Topics (Modules)
    for (const moduleData of subjectData.modules) {
      const { error: tError } = await supabase
        .from('topics')
        .upsert({
          subject_id: subject.id,
          name: moduleData.name,
          enem_relevance: moduleData.relevance,
          notes: 'Importado de Professor Ferretto'
        }, { onConflict: 'subject_id,name' });

      if (tError) {
        console.error(`   ❌ Erro no módulo ${moduleData.name}:`, tError.message);
      } else {
        console.log(`   🔸 Módulo: ${moduleData.name} [Relevância: ${moduleData.relevance}]`);
      }
    }
  }

  console.log('\n✨ Sincronização concluída com sucesso!');
}

sync().catch(console.error);
