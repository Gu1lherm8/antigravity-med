import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: chaves nao encontradas");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  console.log("Recuperando matérias...");
  const { data: subjects, error: subErr } = await supabase.from('subjects').select('id, name');
  
  if (subErr || !subjects || subjects.length === 0) {
    console.error("Erro ao recuperar matérias ou array vazio.", subErr);
    return;
  }

  console.log("Matérias encontradas:", subjects.length);

  const mockSessions = subjects.flatMap(subject => {
    // Para cada materia, cria 2-3 sessoes antigas
    return [
      {
        subject_id: subject.id,
        topic_id: null,
        session_type: 'questoes',
        total_questions: 20,
        correct_answers: Math.floor(Math.random() * 15) + 5, // 5 a 19 acertos
        completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias atras
        is_revision_done: false,
        next_revision_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // pendente de ontem
      },
      {
        subject_id: subject.id,
        topic_id: null,
        session_type: 'aula',
        total_questions: 0,
        correct_answers: 0,
        completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        is_revision_done: false,
        next_revision_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  });

  console.log("Inserindo", mockSessions.length, "sessões falsas de restauração...");
  
  const { data, error } = await supabase.from('study_sessions').insert(mockSessions);
  if (error) {
    console.error("Erro ao inserir:", error);
  } else {
    console.log("Sucesso! Painel deve voltar a mostrar coisas.");
  }
}

seedData();
