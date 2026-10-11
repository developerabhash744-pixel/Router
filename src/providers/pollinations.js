export class PollinationsProvider {
  isAvailable() {
    return true; // 100% keyless / anonymous
  }

  async complete({ messages, model = 'openai-fast', temperature, max_tokens }) {
    const res = await fetch('https://text.pollinations.ai/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai-fast',
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 2048
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const err = new Error(`Pollinations HTTP ${res.status}: ${errText.substring(0, 200)}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';

    return {
      content,
      provider: 'pollinations',
      model: data?.model || 'openai-fast'
    };
  }
}
