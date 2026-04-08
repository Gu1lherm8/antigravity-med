import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Erro: chaves do Supabase não encontradas no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const questions = [
  {
    text: 'Em uma dissecção de cadáver, um estudante de medicina observa uma alteração na artéria braquial. Qual o nervo que geralmente acompanha esta artéria no terço médio do braço?',
    options: { "A": "Nervo Radial", "B": "Nervo Ulnar", "C": "Nervo Mediano", "D": "Nervo Musculocutâneo", "E": "Nervo Axilar" },
    correct_answer: 'C',
    discipline: 'Biologia',
    topic: 'Anatomia Humana'
  },
  {
    text: 'A herança ligada ao cromossomo X em humanos apresenta um padrão de transmissão característico. Se um homem afetado por uma doença recessiva ligada ao X tem filhos com uma mulher normal não portadora, qual a probabilidade de terem uma filha afetada?',
    options: { "A": "0%", "B": "25%", "C": "50%", "D": "75%", "E": "100%" },
    correct_answer: 'A',
    discipline: 'Biologia',
    topic: 'Genética'
  },
  {
    text: 'Um paciente apresenta quadro de dor abdominal aguda em andar superior, irradiada para o dorso, acompanhada de náuseas e vômitos. Qual enzima laboratorial é mais específica para o diagnóstico de pancreatite aguda?',
    options: { "A": "Amilase", "B": "Lipase", "C": "TGO", "D": "TGP", "E": "GGT" },
    correct_answer: 'B',
    discipline: 'Medicina Clínica',
    topic: 'Gastroenterologia'
  }
];

async function insertQuestions() {
  console.log("🚀 Iniciando inserção de questões...");
  const { data, error } = await supabase
    .from('questions')
    .insert(questions);

  if (error) {
    console.error("❌ Erro ao inserir questões:", error.message);
  } else {
    console.log("✅ Questões inseridas com sucesso!");
  }
}

insertQuestions();
