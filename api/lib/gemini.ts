// ============================================================
// 🧠 GEMINI CLIENT — Antigravity Med V4 (MODO FINAL ESTÁVEL)
// Cliente serverless para Google Gemini com Fallback e Prompt Fusion
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// Modelos estáveis para o canal v1beta (Necessário para Gemini 2.0 Flash em contas pagas)
const MODELS_FALLBACK = [
  'gemini-2.0-flash',        // O modelo que apareceu no seu gráfico do AI Studio
  'gemini-1.5-flash',        // Backup estável
  'gemini-1.5-flash-latest'  // Backup de redundância
];

export interface GeminiResponse {
  text: string;
  modelUsed: string;
  parsed?: any;
}

/**
 * Chama a API Gemini com fusão de prompt (System + User) para máxima compatibilidade.
 */
export async function callGemini(
  prompt: string,
  systemInstruction: string = '',
  expectJSON: boolean = false,
  maxRetries: number = 2
): Promise<GeminiResponse> {
  let lastError: any = null;

  // FUSÃO DE PROMPT: Injeta instruções no início para evitar erros de schema v1/v1beta
  const combinedPrompt = systemInstruction 
    ? `INSTRUÇÕES DE SISTEMA:\n${systemInstruction}\n\n---\n\nUSUÁRIO:\n${prompt}${expectJSON ? '\n\nIMPORTANTE: Responda APENAS com o JSON válido, sem explicações extras.' : ''}`
    : prompt;

  for (const modelId of MODELS_FALLBACK) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const body: any = {
          contents: [{ 
            role: 'user',
            parts: [{ text: combinedPrompt }] 
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        };

        // URL v1beta — O canal onde o Gemini 2.0 opera com todos os recursos
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 50000);

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status === 404 || response.status === 403) {
          lastError = new Error(`Modelo ${modelId} não encontrado (404/403). Tentando backup...`);
          break; 
        }

        if (!response.ok) {
          const errBody = await response.text();
          throw new Error(`Erro ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (!text) throw new Error('Resposta vazia da IA');

        if (expectJSON) {
          const parsed = safeParseJSON(text);
          if (!parsed) throw new Error('Falha ao processar JSON da IA');
          return { text, parsed, modelUsed: modelId };
        }

        return { text, modelUsed: modelId };

      } catch (err: any) {
        lastError = err;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  throw new Error(`O Triturador falhou em todos os caminhos. Motivo: ${lastError?.message}`);
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
