
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vpjdztxwvjvlhvcakkky.supabase.co';
const supabaseKey = 'sb_publishable_zvlftzwREo6yhSGXNFVYtw_Fu0HtCr9';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: subs, error: sErr } = await supabase.from('subjects').select('*');
  if (sErr) console.error('Subjects Error:', sErr);
  else console.log('Subjects count:', subs.length, subs.map(s => s.name));

  const { data: tops, error: tErr } = await supabase.from('topics').select('id, name, subject_id');
  if (tErr) console.error('Topics Error:', tErr);
  else console.log('Topics count:', tops.length);
}

check();
