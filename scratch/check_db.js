import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log("Checking schema for subjects and topics...");
  
  const { data: subData } = await supabase.from('subjects').select('*').limit(1);
  const { data: topData } = await supabase.from('topics').select('*').limit(1);
  
  console.log("Subjects keys:", subData && subData.length > 0 ? Object.keys(subData[0]) : "No data");
  console.log("Topics keys:", topData && topData.length > 0 ? Object.keys(topData[0]) : "No data");
  
  process.exit(0);
}

checkSchema();
