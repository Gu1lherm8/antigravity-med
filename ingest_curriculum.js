import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vpjdztxwvjvlhvcakkky.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwamR6dHh3dmp2bGh2Y2Fra2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjQ1MTMsImV4cCI6MjA5MDQwMDUxM30.Rq6YF3QYe0qps_IuTA_6vhEg6KxhR-rO_w7-U6Pxk4A';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SUBJECT_IDS = {
  MATEMATICA: '9f9bb44b-ab85-4e32-b932-bcaf359ef40f',
  BIOLOGIA: '531b41cc-4626-435a-8d69-2082a20ef703',
  QUIMICA: '5bfa7c84-2d30-4b17-bd0a-15098bd9e32b'
};

const fullTopics = [
  // BIOLOGIA
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'A', name: 'Bioquímica Celular', enem_relevance: 4, notes: 'Água, Sais, Carboidratos e Proteínas' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'A', name: 'Citologia: Organelas', enem_relevance: 4, notes: 'Funções citoplasmáticas' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'A', name: 'Metabolismo Energético', enem_relevance: 5, notes: 'Respiração e Fotossíntese' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'A', name: 'Núcleo e Divisão Celular', enem_relevance: 3, notes: 'Mitose e Meiose' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'B', name: 'Genética Mendeliana', enem_relevance: 5, notes: '1ª e 2ª leis' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'B', name: 'Genética Molecular', enem_relevance: 4, notes: 'DNA e Síntese Proteica' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'B', name: 'Biotecnologia', enem_relevance: 5, notes: 'Transgênicos e PCR' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'B', name: 'Evolução Biológica', enem_relevance: 5, notes: 'Darwinismo e Especiação' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'C', name: 'Fundamentos de Ecologia', enem_relevance: 5, notes: 'Cadeias e Teias' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'C', name: 'Ciclos Biogeoquímicos', enem_relevance: 4, notes: 'Carbono, Nitrogênio' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'C', name: 'Impactos Ambientais', enem_relevance: 5, notes: 'Poluição e Efeito Estufa' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'C', name: 'Fisiologia: Digestão e Respiração', enem_relevance: 4, notes: 'Sistemas do corpo' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'C', name: 'Fisiologia: Circulação e Excreção', enem_relevance: 4, notes: 'Sistemas do corpo' },
  { subject_id: SUBJECT_IDS.BIOLOGIA, front: 'C', name: 'Microbiologia e Saúde', enem_relevance: 5, notes: 'Vírus, Bactérias e Vacinas' },

  // QUIMICA
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'A', name: 'Modelos Atômicos', enem_relevance: 3, notes: 'Dalton, Thomson, Rutherford, Bohr' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'A', name: 'Tabela Periódica e Ligações', enem_relevance: 4, notes: 'Propriedades periódicas' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'A', name: 'Química Inorgânica', enem_relevance: 5, notes: 'Ácidos, Bases, Sais e Óxidos' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'A', name: 'Cálculo Estequiométrico', enem_relevance: 5, notes: 'Rendimento e Pureza' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'B', name: 'Termoquímica', enem_relevance: 4, notes: 'Lei de Hess e Entalpia' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'B', name: 'Cinética Química', enem_relevance: 4, notes: 'Velocidade das reações' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'B', name: 'Equilíbrio Químico', enem_relevance: 5, notes: 'Kc, Kp e Deslocamento' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'B', name: 'Eletroquímica', enem_relevance: 5, notes: 'Pilhas e Eletrólise' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'B', name: 'Soluções e Misturas', enem_relevance: 4, notes: 'Concentrações' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'C', name: 'Introdução à Química Orgânica', enem_relevance: 5, notes: 'Classificação de cadeias' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'C', name: 'Funções Orgânicas', enem_relevance: 5, notes: 'Identificação de funções' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'C', name: 'Reações Orgânicas', enem_relevance: 4, notes: 'Substituição, Adição, Eliminação' },
  { subject_id: SUBJECT_IDS.QUIMICA, front: 'C', name: 'Meio Ambiente e Química Verde', enem_relevance: 4, notes: 'Sustentabilidade' },

  // MATEMATICA
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'A', name: 'Razão, Proporção e Regra de Três', enem_relevance: 5, notes: 'Base da prova' },
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'A', name: 'Porcentagem e Matemática Financeira', enem_relevance: 5, notes: 'Aumentos e descontos' },
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'A', name: 'Funções de 1º e 2º Grau', enem_relevance: 5, notes: 'Gráficos e interpretação' },
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'A', name: 'Logaritmos e Exponenciais', enem_relevance: 3, notes: 'Modelagem' },
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'A', name: 'Estatística: Medidas de Centralidade', enem_relevance: 5, notes: 'Média, Moda e Mediana' },
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'B', name: 'Geometria Plana: Áreas', enem_relevance: 5, notes: 'Triângulos, Quadriláteros e Círculos' },
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'B', name: 'Geometria Espacial: Sólidos', enem_relevance: 5, notes: 'Volumes' },
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'B', name: 'Trigonometria no Triângulo Retângulo', enem_relevance: 4, notes: 'Seno, Cosseno e Tangente' },
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'C', name: 'Probabilidade', enem_relevance: 5, notes: 'Eventos dependentes/independentes' },
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'C', name: 'Análise Combinatória', enem_relevance: 4, notes: 'Permutação, Arranjo e Combinação' },
  { subject_id: SUBJECT_IDS.MATEMATICA, front: 'C', name: 'Interpretação de Gráficos e Tabelas', enem_relevance: 5, notes: 'Habilidade recorrente' },
];

async function ingest() {
  console.log('Clearing existing topics for core subjects...');
  await supabase.from('topics').delete().in('subject_id', Object.values(SUBJECT_IDS));

  console.log('Ingesting core curriculum topics...');
  const { error } = await supabase.from('topics').insert(fullTopics);
  
  if (error) {
    console.error('Error ingesting curriculum:', error);
  } else {
    console.log('Core curriculum ingested successfully!');
  }
}

ingest();
