import { Router } from 'express';
import env from '../../config/env.js';

const router = Router();

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

router.post('/', async (req, res, next) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'You are the official MCP Gateway AI technical assistant. You are concise, helpful, and friendly. Answer questions related to DevOps, workflows, API integrations, and the Agentic MCP Gateway.' },
          ...messages
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chatbot API error from Groq:', errorText);
      return res.status(502).json({ error: 'Failed to communicate with LLM provider.' });
    }

    const data = await response.json();
    return res.json({ reply: data.choices[0].message.content });
  } catch (err) {
    next(err);
  }
});

export default router;
