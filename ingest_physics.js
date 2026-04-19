import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vpjdztxwvjvlhvcakkky.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwamR6dHh3dmp2bGh2Y2Fra2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjQ1MTMsImV4cCI6MjA5MDQwMDUxM30.Rq6YF3QYe0qps_IuTA_6vhEg6KxhR-rO_w7-U6Pxk4A';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PHYSICS_ID = '1e24b99f-f821-450a-aae3-c25a6f339dd3';

const topics = [
  // Frente A (Mecânica)
  { subject_id: PHYSICS_ID, front: 'A', name: 'Movimento Uniforme', enem_relevance: 5, notes: 'Frequência muito alta' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'MRUV', enem_relevance: 3, notes: 'Aceleração constante' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Queda Livre e Lançamento Vertical', enem_relevance: 2, notes: 'Gravidade' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Composição de Movimentos', enem_relevance: 3, notes: 'Vetores' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'MCU', enem_relevance: 2, notes: 'Movimento circular' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Fundamentos da Mecânica', enem_relevance: 2, notes: 'Conceitos base' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Leis de Newton', enem_relevance: 2, notes: 'Inércia, F=ma, Ação/Reação' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Aplicações das Leis de Newton', enem_relevance: 2, notes: 'Planos inclinados, polias' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Força de Atrito', enem_relevance: 5, notes: 'Estático e Cinético' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Sistema de Corpos', enem_relevance: 1, notes: 'Blocos acoplados' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Dinâmica no Movimento Circular', enem_relevance: 1, notes: 'Força centrípeta' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Trabalho, Energia e Potência', enem_relevance: 4, notes: 'Teorema da Energia Cinética' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Conservação da Energia Mecânica', enem_relevance: 5, notes: 'Sistemas conservativos/dissipativos' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Impulso e Quantidade de Movimento', enem_relevance: 1, notes: 'Teorema do Impulso' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Conservação da Quantidade de Movimento', enem_relevance: 2, notes: 'Colisões' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Torricelli e Stevin', enem_relevance: 5, notes: 'Hidrostática fundamental' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Pascal e Arquimedes', enem_relevance: 4, notes: 'Empuxo e prensas' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Estática de Corpos Extensos', enem_relevance: 3, notes: 'Momento de força (Torque)' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Leis de Kepler', enem_relevance: 1, notes: 'Órbitas' },
  { subject_id: PHYSICS_ID, front: 'A', name: 'Gravitação Universal', enem_relevance: 3, notes: 'Lei da atração' },

  // Frente B (Termo, Óptica, Ondas)
  { subject_id: PHYSICS_ID, front: 'B', name: 'Termometria', enem_relevance: 2, notes: 'Escalas de temperatura' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Dilatometria', enem_relevance: 3, notes: 'Linear, superficial, volumétrica' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Propagação de Calor', enem_relevance: 4, notes: 'Condução, convecção, irradiação' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Calorimetria', enem_relevance: 5, notes: 'Q = mcΔT' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Gases Ideais', enem_relevance: 2, notes: 'PV = nRT' },
  { subject_id: PHYSICS_ID, front: 'B', name: '1ª Lei da Termodinâmica', enem_relevance: 3, notes: 'ΔU = Q - W' },
  { subject_id: PHYSICS_ID, front: 'B', name: '2ª Lei da Termodinâmica', enem_relevance: 3, notes: 'Entropia e Ciclo de Carnot' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Fundamentos da Óptica Geométrica', enem_relevance: 2, notes: 'Meios e princípios' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Reflexão da Luz e Espelhos Planos', enem_relevance: 3, notes: 'Simetria' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Espelhos Esféricos', enem_relevance: 2, notes: 'Côncavo e Convexo' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Refração da Luz', enem_relevance: 4, notes: 'Lei de Snell-Descartes' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Lentes Esféricas', enem_relevance: 2, notes: 'Convergente e Divergente' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Instrumentos Ópticos', enem_relevance: 3, notes: 'Olho humano, lupa, microscópio' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Movimento Harmônico Simples', enem_relevance: 2, notes: 'Pêndulo e mola' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Introdução à Ondulatória', enem_relevance: 5, notes: 'v = λf' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Qualidades Fisiológicas do Som', enem_relevance: 4, notes: 'Altura, intensidade, timbre' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Reflexão e Refração de Ondas', enem_relevance: 4, notes: 'Leis gerais' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Difração e Interferência', enem_relevance: 4, notes: 'Efeitos ondulatórios' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Ressonância, Polarização e Doppler', enem_relevance: 4, notes: 'Fenômenos importantes' },
  { subject_id: PHYSICS_ID, front: 'B', name: 'Ondas Estacionárias', enem_relevance: 3, notes: 'Cordas e tubos' },

  // Frente C (Eletricidade e Moderna)
  { subject_id: PHYSICS_ID, front: 'C', name: 'Eletrização', enem_relevance: 2, notes: 'Atrito, contato e indução' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Força Elétrica', enem_relevance: 3, notes: 'Lei de Coulomb' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Campo Elétrico', enem_relevance: 2, notes: 'Linhas de força' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Potencial Elétrico', enem_relevance: 2, notes: 'Trabalho da força elétrica' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Condutores em Equilíbrio', enem_relevance: 3, notes: 'Blindagem eletrostática' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Corrente Elétrica', enem_relevance: 3, notes: 'v = i/A' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Resistores e Efeito Joule', enem_relevance: 5, notes: 'P = Ri²' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Associação de Resistores', enem_relevance: 5, notes: 'Série e paralelo' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Circuitos no Cotidiano', enem_relevance: 4, notes: 'Dimensionamento de rede' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Instrumentos de Medidas Elétricas', enem_relevance: 3, notes: 'Amperímetro e Voltímetro' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Geradores e Receptores Elétricos', enem_relevance: 4, notes: 'Equação do gerador' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Capacitores', enem_relevance: 2, notes: 'Cozimento de carga' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Introdução ao Magnetismo', enem_relevance: 2, notes: 'Polos magnéticos' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Regra da Mão Direita', enem_relevance: 3, notes: 'Campo gerado por corrente' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Força Magnética em Cargas', enem_relevance: 2, notes: 'F = qvB senθ' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Força Magnética em Fios', enem_relevance: 3, notes: 'F = BiL senθ' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Indução Eletromagnética', enem_relevance: 3, notes: 'Lei de Faraday' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Efeito Fotoelétrico', enem_relevance: 2, notes: 'Natureza da luz' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Modelo Atômico de Bohr', enem_relevance: 2, notes: 'Níveis de energia' },
  { subject_id: PHYSICS_ID, front: 'C', name: 'Teoria da Relatividade', enem_relevance: 1, notes: 'E = mc²' },
];

async function ingest() {
  console.log('Clearing existing topics for Physics (ID:', PHYSICS_ID, ')...');
  const { error: delErr } = await supabase.from('topics').delete().eq('subject_id', PHYSICS_ID);
  if (delErr) {
    console.error('Error clearing topics:', delErr);
    return;
  }

  console.log('Ingesting', topics.length, 'topics...');
  const { error: insErr } = await supabase.from('topics').insert(topics);
  
  if (insErr) {
    console.error('Error ingesting topics:', insErr);
  } else {
    console.log('Ingestion completed successfully!');
  }
}

ingest();
