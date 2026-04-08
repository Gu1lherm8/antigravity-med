import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vpjdztxwvjvlhvcakkky.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwamR6dHh3dmp2bGh2Y2Fra2t5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyNDUxMywiZXhwIjoyMDkwNDAwNTEzfQ.3w4V6R4_2Q31GxjYXNhCqcCwgdb0kdvAXKykmyeljjE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  const email = 'jfernades.guilherme.lima@gmail.com';
  const password = '1125120607';

  console.log(`Tentando criar/autorizar o usuário: ${email}`);

  // Tenta criar o usuário com confirmação automática (usando o Admin API)
  const { data, error } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true // ISSO É O QUE PULA A CONFIRMAÇÃO DE EMAIL
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Usuário já existe. Tentando confirmar o existente...');
      
      // Se já existe, vamos apenas confirmar ele
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      const user = users?.users.find(u => u.email === email);
      
      if (user) {
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
          email_confirm: true
        });
        if (updateError) console.error('Erro ao confirmar:', updateError);
        else console.log('Acesso LIBERADO com sucesso!');
      }
    } else {
      console.error('Erro fatal:', error.message);
    }
  } else {
    console.log('Conta criada e AUTORIZADA com sucesso!');
  }
}

createAdminUser();
