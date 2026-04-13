import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://vpjdztxwvjvlhvcakkky.supabase.co', 'sb_publishable_zvlftzwREo6yhSGXNFVYtw_Fu0HtCr9');

async function checkSchema() {
  console.log("Checking schema for subjects and topics...");
  
  const { data: subData } = await supabase.from('subjects').select('*').limit(1);
  const { data: topData } = await supabase.from('topics').select('*').limit(1);
  
  console.log("Subjects keys:", subData && subData.length > 0 ? Object.keys(subData[0]) : "No data or empty subjects");
  console.log("Topics keys:", topData && topData.length > 0 ? Object.keys(topData[0]) : "No data or empty topics");
  
  process.exit(0);
}

checkSchema();
