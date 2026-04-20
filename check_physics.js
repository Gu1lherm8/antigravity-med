import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vpjdztxwvjvlhvcakkky.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwamR6dHh3dmp2bGh2Y2Fra2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjQ1MTMsImV4cCI6MjA5MDQwMDUxM30.Rq6YF3QYe0qps_IuTA_6vhEg6KxhR-rO_w7-U6Pxk4A';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPhysics() {
  const { data, error } = await supabase.from('subjects').select('*').ilike('name', 'física');
  if (error) console.error(error);
  else console.log('Physics Subject:', data);
  
  if (data && data.length > 0) {
    const { data: topics, error: topErr } = await supabase.from('topics').select('*').eq('subject_id', data[0].id);
    console.log('Physics Topics Count:', topics?.length || 0);
  }
}

checkPhysics();
