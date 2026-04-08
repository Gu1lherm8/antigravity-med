import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("🚀 Iniciando configuração rápida...");
  
  // 1. Inserir Questão
  const { data: q, error: eq } = await supabase.from('questions').insert({
    text: 'Em uma dissecção de cadáver, um estudante de medicina observa uma alteração na artéria braquial. Qual o nervo que geralmente acompanha esta artéria no terço médio do braço?',
    options: { "A": "Nervo Radial", "B": "Nervo Ulnar", "C": "Nervo Mediano", "D": "Nervo Musculocutâneo", "E": "Nervo Axilar" },
    correct_answer: 'C',
    discipline: 'Anatomia',
    topic: 'Sistema Cardiovascular'
  }).select().single();

  if (eq) return console.error("Erro questão:", eq.message);
  console.log("✅ Questão inserida:", q.id);

  // 2. Inserir Tentativa Errada (Simulando o estudante)
  const { data: att, error: ea } = await supabase.from('attempts').insert({
    question_id: q.id,
    student_answer: 'A',
    is_correct: false
  }).select().single();

  if (ea) return console.error("Erro tentativa:", ea.message);
  console.log("❌ Tentativa errada (Bomba) inserida:", att.id);
  console.log("⏳ Aguardando a Junta Médica (n8n) processar o diagnóstico...");
}

run();
