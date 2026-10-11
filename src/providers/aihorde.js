export class AIHordeProvider {
  isAvailable() {
    return true;
  }

  async complete({ messages, model = 'koboldcpp/L3-8B-Stheno-v3.2', temperature, max_tokens }) {
    const res = await fetch('https://oai.aihorde.net/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 0000000000',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'koboldcpp/L3-8B-Stheno-v3.2',
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        max_tokens: typeof max_tokens === 'number' ? max_tokens : 1000
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const err = new Error(`AIHorde HTTP ${res.status}: ${errText.substring(0, 200)}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';

    return {
      content,
      provider: 'aihorde',
      model: data?.model || model
    };
  }
}
