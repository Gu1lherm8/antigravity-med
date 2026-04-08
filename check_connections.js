
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function checkConnections() {
    console.log('🔍 INICIANDO CHECK-UP DE CONEXÃO...');

    // Lendo .env
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ ERRO: Arquivo .env não encontrado no diretório atual!');
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

    if (!urlMatch || !keyMatch) {
        console.error('❌ ERRO: Chaves VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no .env');
        return;
    }

    const supabaseUrl = urlMatch[1].trim();
    const supabaseKey = keyMatch[1].trim();

    console.log(`📡 Conectando ao host: ${supabaseUrl.substring(0, 20)}...`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Testando acesso a tabela questions
        const { data, error } = await supabase
            .from('questions')
            .select('id')
            .limit(1);

        if (error) throw error;

        console.log('✅ SUCESSO: Conexão com Supabase está ativa e autorizada!');
        console.log('🤖 Seu n8n agora só precisa das mesmas credenciais para funcionar.');

    } catch (err) {
        console.error('❌ FALHA NA CONEXÃO:', err.message);
        console.log('\nDica: Verifique se a tabela "questions" existe no seu banco de dados.');
    }
}

checkConnections();
