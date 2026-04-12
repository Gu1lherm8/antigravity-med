
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Script de Diagnóstico para o Triturador IA
 * Testa a rota de processamento localmente
 */

const TEST_TEXT = `
A Primeira Lei de Mendel, também chamada de Lei da Segregação dos Fatores, 
diz que cada característica é determinada por um par de fatores que se separam 
na formação dos gametas. Mendel chegou a essa conclusão cruzando ervilhas puras.
`;

async function testTriturador() {
  console.log('🚀 Iniciando diagnóstico do Triturador IA...');

  const body = {
    text: TEST_TEXT,
    fileName: 'teste-mendel.pdf',
    subject: 'Biologia',
    topic: 'Genética'
  };

  try {
    console.log('📡 Chamando API local /api/process-pdf...');
    // Como estamos no ambiente local mas a API está em /api (Vercel), 
    // precisamos rodar o server.js ou testar a lógica da função diretamente.
    // Vou simular chamando o handler da API se possível, ou testar a lógica do Gemini.
    
    console.log('🔑 Verificando GEMINI_API_KEY...');
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ ERRO: GEMINI_API_KEY não encontrada no .env');
      return;
    }
    console.log('✅ Chave encontrada.');

    // Simulação da lógica da API
    const { default: handler } = await import('./api/process-pdf.js');
    
    // Mock do request/response do Vercel
    const req = {
      body,
      method: 'POST',
      headers: {}
    };
    
    const res = {
      status: (code) => {
        console.log(`📡 Status da Resposta: ${code}`);
        return res;
      },
      json: (data) => {
        console.log('📦 Dados Recebidos:', JSON.stringify(data, null, 2));
        return res;
      },
      setHeader: () => {}
    };

    await handler(req, res);

  } catch (err) {
    console.error('💥 Erro fatal no diagnóstico:', err);
  }
}

testTriturador();
