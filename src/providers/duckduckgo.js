import vm from 'node:vm';

export class DuckDuckGoProvider {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
  }

  isAvailable() {
    return true;
  }

  async getVqd() {
    const res = await fetch('https://duck.ai/duckchat/v1/status', {
      headers: {
        'x-vqd-accept': '1',
        'User-Agent': this.userAgent,
        'Accept': '*/*',
        'Origin': 'https://duck.ai',
        'Referer': 'https://duck.ai/'
      },
      signal: AbortSignal.timeout(10000)
    });

    const vqd = res.headers.get('x-vqd-4');
    if (vqd) return vqd;

    const hash = res.headers.get('x-vqd-hash-1');
    if (hash) {
      return this.solveHash(hash);
    }

    throw new Error('No VQD token returned from DuckDuckGo');
  }

  solveHash(challengeBase64) {
    try {
      const code = Buffer.from(challengeBase64, 'base64').toString('utf8');
      const sandbox = {
        result: null,
        navigator: { userAgent: this.userAgent },
        document: {
          createElement: () => ({ setAttribute: () => {}, appendChild: () => {} }),
          body: { appendChild: () => {}, removeChild: () => {} }
        },
        window: {}
      };
      vm.createContext(sandbox);
      const res = vm.runInContext(`(function() { try { ${code}; return typeof result !== 'undefined' ? result : null; } catch(e) { return null; } })()`, sandbox, { timeout: 3000 });
      return res || '1';
    } catch {
      return '1';
    }
  }

  async complete({ messages, model = 'gpt-4o-mini' }) {
    const vqd = await this.getVqd();

    const ddgMessages = messages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content
    }));

    const res = await fetch('https://duck.ai/duckchat/v1/chat', {
      method: 'POST',
      headers: {
        'x-vqd-4': vqd,
        'Content-Type': 'application/json',
        'User-Agent': this.userAgent,
        'Origin': 'https://duck.ai',
        'Referer': 'https://duck.ai/',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: ddgMessages
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      throw new Error(`DuckDuckGo HTTP ${res.status}`);
    }

    const text = await res.text();
    let content = '';

    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.message) content += parsed.message;
        } catch {
          // ignore stream parse errors
        }
      }
    }

    if (!content.trim()) {
      throw new Error('DuckDuckGo returned empty message');
    }

    return {
      content: content.trim(),
      provider: 'duckduckgo',
      model: 'gpt-4o-mini'
    };
  }
}
