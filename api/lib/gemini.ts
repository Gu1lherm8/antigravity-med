// ============================================================
// 🧠 GEMINI CLIENT — Antigravity Med V4 (MODO RESILIÊNCIA TOTAL)
// Cliente serverless com busca exaustiva de modelos compatíveis
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Lista expandida de modelos candidatos. 
 * Inclui versões estáveis, experimentais e específicas por versão.
 */
const MODELS_FALLBACK = [
  'gemini-2.0-flash',          // Preferencial (Visto no Dashboard)
  'gemini-2.0-flash-001',      // Versão específica 2.0
  'gemini-2.0-flash-exp',      // Versão experimental
  'gemini-1.5-flash',          // Estável 1.5
  'gemini-1.5-flash-002',      // Estável atualizada
  'gemini-1.5-flash-latest',   // Alias estável
  'gemini-1.5-pro',            // Modelo inteligente de backup
  'gemini-1.5-pro-latest'      // Backup inteligente
];

export interface GeminiResponse {
  text: string;
  modelUsed: string;
  parsed?: any;
}

/**
 * Chama a API Gemini tentando múltiplos modelos até obter sucesso.
 */
export async function callGemini(
  prompt: string,
  systemInstruction: string = '',
  expectJSON: boolean = false,
  maxRetries: number = 1
): Promise<GeminiResponse> {
  let lastError: any = null;

  // Prompt Fusion para evitar erros de campo systemInstruction em certas APIs
  const combinedPrompt = systemInstruction 
    ? `PAPEL DO SISTEMA: ${systemInstruction}\n\n---\n\nSOLICITAÇÃO: ${prompt}${expectJSON ? '\n\nResponda estritamente em JSON.' : ''}`
    : prompt;

  for (const modelId of MODELS_FALLBACK) {
    console.log(`📡 [Triturador] Tentando modelo: ${modelId}`);
    
    try {
      const body: any = {
        contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      };

      // Tenta endpoint v1beta primeiro pela maior compatibilidade de modelos
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000); // 55s para não dar timeout no Vercel

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Se o erro for 404, 403 ou 400 (Bad Format), tentamos o PRÓXIMO modelo
      if (response.status === 404 || response.status === 403 || response.status === 400) {
        const errText = await response.text();
        console.warn(`⚠️ [Triturador] Modelo ${modelId} recusado (${response.status}): ${errText.substring(0, 100)}`);
        lastError = new Error(`Modelo ${modelId} -> ${response.status}`);
        continue; 
      }

      if (!response.ok) {
        throw new Error(`Erro API ${response.status}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) continue;

      if (expectJSON) {
        const parsed = safeParseJSON(text);
        if (!parsed) {
          console.warn(`🔍 [Triturador] ${modelId} retornou texto, mas JSON era inválido. Tentando próximo...`);
          continue;
        }
        return { text, parsed, modelUsed: modelId };
      }

      console.log(`✅ [Triturador] Sucesso com: ${modelId}`);
      return { text, modelUsed: modelId };

    } catch (err: any) {
      console.error(`❌ [Triturador] Falha crítica em ${modelId}:`, err.message);
      lastError = err;
    }
  }

  throw new Error(`O Triturador IA esgotou todos os ${MODELS_FALLBACK.length} modelos disponíveis e nenhum respondeu. Verifique sua chave API e o status do faturamento no Google AI Studio. ÚLTIMO ERRO: ${lastError?.message}`);
}

/**
 * Chama o Gemini com suporte a IMAGEM (Vision).
 */
export async function callGeminiVision(
  prompt: string,
  base64Image: string,
  mimeType: string = 'image/jpeg',
  systemInstruction: string = ''
): Promise<GeminiResponse> {
  const modelId = 'gemini-1.5-flash'; // Modelo preferencial para Vision/Velocidade
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      parts: [
        { text: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt },
        { inlineData: { mimeType, data: base64Image } }
      ]
    }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 2048 }
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini Vision Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return { 
    text, 
    modelUsed: modelId,
    parsed: safeParseJSON(text) 
  };
}

function safeParseJSON(text: string): any | null {
  try { return JSON.parse(text); } catch {}
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) {
    try { return JSON.parse(jsonBlock[1].trim()); } catch {}
  }
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const start = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket) ? firstBrace : firstBracket;
  if (start !== -1) {
    const closer = text[start] === '[' ? ']' : '}';
    const end = text.lastIndexOf(closer);
    if (end !== -1) {
      try { return JSON.parse(text.substring(start, end + 1)); } catch {}
    }
  }
  return null;
}
