# No-Auth AI Router (OmniRoute Style)

An OpenAI-compatible AI Gateway aggregating Google Gemini and Keyless (No-Auth) AI providers with automatic failover and rate-limit cooldown tracking.

## Features

- **Tier 1 (High Quality)**: Google Gemini (`gemini-3.5-flash`, `gemini-3.5-flash-lite`, `gemini-3.7-flash`) via `GEMINI_API_KEY`.
- **Tier 2 (No-Auth)**: Pollinations Anonymous Gateway (`openai-fast` / GPT-OSS 20B reasoning model).
- **Tier 3 (No-Auth)**: DuckDuckGo AI Chat (Claude Haiku / GPT-4o-mini).
- **Tier 4 (No-Auth)**: AI Horde community distributed inference (`0000000000` anonymous key).
- **OpenAI-Compatible**: Drop-in replacement for OpenAI API (`/v1/chat/completions`, `/v1/models`).
- **Zero Rate Limits**: When Gemini hits `429: Quota Exceeded`, seamlessly cascades to No-Auth providers with a 60-second recovery cooldown.

## Quick Start

### 1. Run with Node.js
```bash
npm install
npm start
```

### 2. Run with Docker
```bash
docker build -t noauth-ai-router .
docker run -p 10000:10000 -e GEMINI_API_KEY="your-key-here" noauth-ai-router
```

## API Usage

### Chat Completions
```bash
curl http://localhost:10000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```
