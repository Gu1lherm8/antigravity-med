// ============================================================
// 🧠 GEMINI CLIENT — Antigravity Med V4
// Cliente serverless para Google Gemini com retry + validação
// ============================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export interface GeminiResponse {
  text: string;
  parsed?: any;
}

/**
 * Chama a API Gemini com retry automático e validação de JSON.
 * @param prompt - O prompt para a IA
 * @param systemInstruction - Instrução de sistema (papel da IA)
 * @param expectJSON - Se true, força parsing de JSON na resposta
 * @param maxRetries - Número máximo de tentativas (default: 3)
 */
export async function callGemini(
  prompt: string,
  systemInstruction: string = '',
  expectJSON: boolean = false,
  maxRetries: number = 3
): Promise<GeminiResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      };

      // Adicionar instrução de sistema se fornecida
      if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
      }

      // Se espera JSON, forçar na configuração
      if (expectJSON) {
        body.generationConfig.responseMimeType = 'application/json';
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Gemini API ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!text) {
        throw new Error('Gemini retornou resposta vazia');
      }

      // Se espera JSON, tentar parsear
      if (expectJSON) {
        const parsed = safeParseJSON(text);
        if (!parsed) {
          throw new Error(`Gemini retornou JSON inválido: ${text.substring(0, 200)}`);
        }
        return { text, parsed };
      }

      return { text };
    } catch (err: any) {
      lastError = err;
      console.error(`❌ Gemini tentativa ${attempt}/${maxRetries}:`, err.message);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000));
      }
    }
  }

  throw new Error(`Gemini falhou após ${maxRetries} tentativas: ${lastError?.message}`);
}

/**
 * Parse seguro de JSON — trata casos onde a IA envolve em ```json``` ou adiciona texto extra
 */
function safeParseJSON(text: string): any | null {
  // Tenta parse direto
  try { return JSON.parse(text); } catch {}

  // Remove blocos ```json ... ```
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) {
    try { return JSON.parse(jsonBlock[1].trim()); } catch {}
  }

  // Tenta encontrar o primeiro { ou [ e parsear a partir daí
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const start = Math.min(
    firstBrace >= 0 ? firstBrace : Infinity,
    firstBracket >= 0 ? firstBracket : Infinity
  );

  if (start !== Infinity) {
    const isArray = text[start] === '[';
    const closer = isArray ? ']' : '}';
    let depth = 0;

    for (let i = start; i < text.length; i++) {
      if (text[i] === text[start]) depth++;
      if (text[i] === closer) depth--;
      if (depth === 0) {
        try { return JSON.parse(text.substring(start, i + 1)); } catch {}
        break;
      }
    }
  }

  return null;
}
