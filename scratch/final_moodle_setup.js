// scratch/final_moodle_setup.js
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY.replace('sb_publishable_', '') // Simple fix for the anon key if needed, or just use as is
);

const userId = '00000000-0000-0000-0000-000000000000';
const moodleUrl = 'https://sandbox.moodledemo.net/';
const token = '7caa0c990a166d5b12f232304afb7ecf';

async function setup() {
  console.log('🚀 Configurando Secretário para o usuário:', userId);
  
  const { data, error } = await supabase
    .from('course_sync_settings')
    .upsert({
      user_id: userId,
      platform: 'moodle',
      moodle_url: moodleUrl,
      moodle_token: token,
      daily_hours: 4,
      exam_date: '2025-11-01',
      is_active: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('❌ Erro ao configurar:', error.message);
  } else {
    console.log('✅ Configuração concluída com sucesso!');
    console.log('🔗 URL:', moodleUrl);
    console.log('🔑 Token:', token);
  }
}

setup();
