import express from 'express';
import cors from 'cors';
import { OmniRouter } from './router.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const router = new OmniRouter();

// Health Check for Render & uptime monitors
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'noauth-ai-router',
    uptime: process.uptime(),
    gemini_configured: router.gemini.isAvailable()
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Models Catalog (OpenAI Format)
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      { id: 'auto', object: 'model', owned_by: 'router' },
      { id: 'gemini', object: 'model', owned_by: 'google' },
      { id: 'pollinations', object: 'model', owned_by: 'pollinations' },
      { id: 'duckduckgo', object: 'model', owned_by: 'duckduckgo' },
      { id: 'aihorde', object: 'model', owned_by: 'aihorde' }
    ]
  });
});

// Chat Completions (OpenAI Format)
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { messages, model = 'auto', temperature, max_tokens } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: '`messages` must be a non-empty array',
          type: 'invalid_request_error',
          code: 400
        }
      });
    }

    const response = await router.chatComplete({
      messages,
      model,
      temperature,
      max_tokens
    });

    res.json(response);
  } catch (err) {
    console.error('[Server Error]', err);
    res.status(500).json({
      error: {
        message: err?.message || 'Internal Router Error',
        type: 'router_error',
        code: 500
      }
    });
  }
});

const port = process.env.PORT || 10000;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`[Router] OpenAI-Compatible AI Router listening on http://${host}:${port}`);
  console.log(`[Router] Gemini Tier 1: ${router.gemini.isAvailable() ? 'Active' : 'Key not provided (using Keyless Fallbacks)'}`);
});
