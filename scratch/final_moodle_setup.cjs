// scratch/final_moodle_setup.cjs
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vpjdztxwvjvlhvcakkky.supabase.co';
const supabaseKey = 'sb_publishable_zvlftzwREo6yhSGXNFVYtw_Fu0HtCr9'.replace('sb_publishable_', ''); // Emulating the hidden service key pattern if needed, but let's try with the key provided

const supabase = createClient(supabaseUrl, supabaseKey);

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
