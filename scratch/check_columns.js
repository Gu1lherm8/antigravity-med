const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkColumns() {
  console.log("Checking columns for subjects and topics...");
  
  const { data: colsSub, error: errSub } = await supabase.rpc('get_column_info', { table_name: 'subjects' });
  const { data: colsTop, error: errTop } = await supabase.rpc('get_column_info', { table_name: 'topics' });

  if (errSub || errTop) {
    // Fallsback to direct query if RPC doesn't exist
    const { data: subData } = await supabase.from('subjects').select('*').limit(1);
    const { data: topData } = await supabase.from('topics').select('*').limit(1);
    
    console.log("Subjects keys:", subData ? Object.keys(subData[0] || {}) : "No data");
    console.log("Topics keys:", topData ? Object.keys(topData[0] || {}) : "No data");
  } else {
    console.log("Subjects Columns:", colsSub);
    console.log("Topics Columns:", colsTop);
  }
}

checkColumns();
