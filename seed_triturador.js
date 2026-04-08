import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

const envValue = fs.readFileSync('.env', 'utf8');
const envConfig = dotenv.parse(envValue);
for (const k in envConfig) { process.env[k] = envConfig[k]; }

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function seed() {
  console.log("🌱 Semeando dados de Biologia (Água e Sais Minerais)...");

  // 1. Inserir Resumo Teórico
  const { data: note, error: errT } = await supabase.from('theory_notes').insert([
    {
      title: "Bioquímica: O Poder da Água",
      markdown_content: "# Resumo: Água e Sais Minerais\n\nA água é o solvente universal e essencial para a vida. \n\n### Propriedades:\n- **Alto calor específico**: Mantém a temperatura estável.\n- **Coesão e Adesão**: Tensão superficial.\n- **Solvente**: Reações químicas no citoplasma.",
      original_pdf_name: "aula_introducao_bio.pdf"
    }
  ]).select();

  if (errT) console.error("❌ Erro em theory_notes:", errT.message);
  else console.log("✅ Resumo inserido com sucesso!");

  // 2. Inserir Flashcard
  const { data: card, error: errC } = await supabase.from('flashcards').insert([
    {
      front_text: "Qual a propriedade da água que permite a regulação térmica dos seres vivos?",
      back_text: "Alto calor específico.",
      next_review: new Date().toISOString()
    }
  ]);

  if (errC) console.error("❌ Erro em flashcards:", errC.message);
  else console.log("✅ Flashcard inserido com sucesso!");
}

seed();
