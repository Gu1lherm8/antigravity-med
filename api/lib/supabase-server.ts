// ============================================================
// 🔌 SUPABASE SERVER CLIENT — Para uso em API Routes Vercel
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase env vars não encontradas no servidor');
}

export const supabaseServer = createClient(supabaseUrl, supabaseKey);
