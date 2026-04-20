import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vpjdztxwvjvlhvcakkky.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwamR6dHh3dmp2bGh2Y2Fra2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjQ1MTMsImV4cCI6MjA5MDQwMDUxM30.Rq6YF3QYe0qps_IuTA_6vhEg6KxhR-rO_w7-U6Pxk4A';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectTables() {
  console.log('Inspecting subjects...');
  const { data: sub, error: subErr } = await supabase.from('subjects').select('*').limit(1);
  if (subErr) console.error('Subjects Error:', subErr);
  else console.log('Subjects Keys:', Object.keys(sub[0] || {}));

  console.log('Inspecting topics...');
  const { data: top, error: topErr } = await supabase.from('topics').select('*').limit(1);
  if (topErr) console.error('Topics Error:', topErr);
  else console.log('Topics Keys:', Object.keys(top[0] || {}));
}

inspectTables();
