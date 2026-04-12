// ============================================================
// 🧠 GEMINI CLIENT — Antigravity Med V4 (MODO ALTA DISPONIBILIDADE)
// Cliente serverless para Google Gemini com Fallback de modelos
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Lista de modelos candidatos por ordem de prioridade
// gemini-2.0-flash: O preferencial para contas pagas
// gemini-1.5-flash-latest: O cavalo de batalha super estável
// gemini-2.0-flash-exp: Opção experimental de alto desempenho
const MODELS_FALLBACK = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest', 
  'gemini-1.5-flash',
  'gemini-2.0-flash-exp'
];

export interface GeminiResponse {
  text: string;
  modelUsed: string;
  parsed?: any;
}

/**
 * Chama a API Gemini com fallback automático entre modelos em caso de 404/429.
 */
export async function callGemini(
  prompt: string,
  systemInstruction: string = '',
  expectJSON: boolean = false,
  maxRetries: number = 2
): Promise<GeminiResponse> {
  let lastError: any = null;

  // Tentamos cada modelo da nossa lista de candidatos
  for (const modelId of MODELS_FALLBACK) {
    console.log(`📡 [Gemini] Tentando modelo: ${modelId}...`);
    
    // Para cada modelo, podemos ter retries internos em caso de timeout
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const body: any = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        };

        if (systemInstruction) {
          body.systemInstruction = { parts: [{ text: systemInstruction }] };
        }

        if (expectJSON) {
          body.generationConfig.responseMimeType = 'application/json';
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000); // 45s de fôlego

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Se o erro for 404 (Não encontrado) ou 403 (Permissão), pulamos para o PRÓXIMO modelo da lista
        if (response.status === 404 || response.status === 403) {
          console.warn(`⚠️ [Gemini] Modelo ${modelId} retornou ${response.status}. Tentando próximo da fila...`);
          lastError = new Error(`Status ${response.status}`);
          break; // Sai do loop de retry atual e vai pro próximo modelo
        }

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`API Gemini Error ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!text) throw new Error('Gemini retornou resposta vazia');

        if (expectJSON) {
          const parsed = safeParseJSON(text);
          if (!parsed) throw new Error('JSON Inválido retornado pela IA');
          return { text, parsed, modelUsed: modelId };
        }

        console.log(`✅ [Gemini] Sucesso absoluto com modelo: ${modelId}`);
        return { text, modelUsed: modelId };

      } catch (err: any) {
        lastError = err;
        // Se for erro de rede ou timeout, tentamos o retry interno do mesmo modelo
        if (attempt < maxRetries) {
          console.log(`🔄 [Gemini] Re-tentativa ${attempt}/${maxRetries} para ${modelId} devido a: ${err.message}`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  throw new Error(`O Triturador IA falhou em todas as tentativas (Modelos: ${MODELS_FALLBACK.join(', ')}). Erro final: ${lastError?.message}`);
}

function safeParseJSON(text: string): any | null {
  try { return JSON.parse(text); } catch {}
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) {
    try { return JSON.parse(jsonBlock[1].trim()); } catch {}
  }
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    try { 
      const lastBrace = text.lastIndexOf('}');
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    } catch {}
  }
  return null;
}
