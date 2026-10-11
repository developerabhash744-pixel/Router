import { GeminiProvider } from './providers/gemini.js';
import { PollinationsProvider } from './providers/pollinations.js';
import { DuckDuckGoProvider } from './providers/duckduckgo.js';
import { AIHordeProvider } from './providers/aihorde.js';

export class OmniRouter {
  constructor() {
    this.gemini = new GeminiProvider();
    this.pollinations = new PollinationsProvider();
    this.duckduckgo = new DuckDuckGoProvider();
    this.aihorde = new AIHordeProvider();

    // Map provider names to instances
    this.providers = {
      gemini: this.gemini,
      pollinations: this.pollinations,
      duckduckgo: this.duckduckgo,
      aihorde: this.aihorde
    };

    // Cooldown timestamps
    this.cooldowns = new Map();
  }

  isCoolingDown(providerName) {
    const until = this.cooldowns.get(providerName);
    if (!until) return false;
    if (Date.now() > until) {
      this.cooldowns.delete(providerName);
      return false;
    }
    return true;
  }

  setCooldown(providerName, durationMs = 60000) {
    this.cooldowns.set(providerName, Date.now() + durationMs);
    console.warn(`[Router] Provider '${providerName}' placed on cooldown for ${Math.round(durationMs / 1000)}s`);
  }

  clearCooldown(providerName) {
    this.cooldowns.delete(providerName);
  }

  async chatComplete({ messages, model = 'auto', temperature, max_tokens }) {
    // If specific provider requested (e.g. "gemini" or "pollinations")
    if (model && model !== 'auto' && this.providers[model]) {
      const provider = this.providers[model];
      const res = await provider.complete({ messages, temperature, max_tokens });
      return this.formatResponse(res);
    }

    // Default cascade ladder
    const ladder = [];
    if (this.gemini.isAvailable()) {
      ladder.push({ name: 'gemini', provider: this.gemini, defaultModel: 'gemini-3.5-flash' });
    }
    ladder.push({ name: 'pollinations', provider: this.pollinations, defaultModel: 'openai-fast' });
    ladder.push({ name: 'duckduckgo', provider: this.duckduckgo, defaultModel: 'gpt-4o-mini' });
    ladder.push({ name: 'aihorde', provider: this.aihorde, defaultModel: 'koboldcpp/L3-8B-Stheno-v3.2' });

    let lastError = null;

    for (const step of ladder) {
      if (this.isCoolingDown(step.name)) {
        console.log(`[Router] Skipping '${step.name}' (in cooldown)...`);
        continue;
      }

      try {
        console.log(`[Router] Attempting '${step.name}'...`);
        const result = await step.provider.complete({
          messages,
          model: step.defaultModel,
          temperature,
          max_tokens
        });

        this.clearCooldown(step.name);
        console.log(`[Router] Success via '${step.name}' (${result.model})`);
        return this.formatResponse(result);
      } catch (err) {
        lastError = err;
        const msg = String(err?.message || err);
        console.warn(`[Router] Provider '${step.name}' failed: ${msg.substring(0, 120)}`);

        // If rate limit or server error, cool down for 60s
        if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota') || msg.includes('503')) {
          this.setCooldown(step.name, 60000);
        } else {
          this.setCooldown(step.name, 15000);
        }
      }
    }

    throw lastError || new Error('All providers in router cascade failed');
  }

  formatResponse({ content, provider, model }) {
    const id = `chatcmpl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    return {
      id,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: `${provider}/${model}`,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: content
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };
  }
}
