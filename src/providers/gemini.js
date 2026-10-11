import { GoogleGenAI } from '@google/genai';

export class GeminiProvider {
  constructor(apiKey = process.env.GEMINI_API_KEY) {
    this.apiKey = apiKey;
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  isAvailable() {
    return Boolean(this.apiKey && this.ai);
  }

  async complete({ messages, model = 'gemini-3.5-flash', temperature, max_tokens }) {
    if (!this.isAvailable()) {
      const err = new Error('GEMINI_API_KEY is not configured');
      err.status = 401;
      throw err;
    }

    let systemInstruction = '';
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction += (systemInstruction ? '\n\n' : '') + msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content || '' }]
        });
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const modelsToTry = [
      model,
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite'
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

    let lastError = null;
    for (const currentModel of modelsToTry) {
      try {
        const response = await this.ai.models.generateContent({
          model: currentModel,
          contents,
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature: typeof temperature === 'number' ? temperature : undefined,
            maxOutputTokens: typeof max_tokens === 'number' ? max_tokens : undefined
          }
        });

        const text = response.text || '';
        return {
          content: text,
          provider: 'google',
          model: currentModel
        };
      } catch (err) {
        lastError = err;
        const msg = String(err?.message || err);
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('404')) {
          console.warn(`[Gemini] Model ${currentModel} returned ${msg.substring(0, 100)}, trying next...`);
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  }
}
