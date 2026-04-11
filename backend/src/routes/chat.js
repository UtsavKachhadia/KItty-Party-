import { Router } from 'express';
import env from '../../config/env.js';

const router = Router();

/**
 * POST /api/chat
 * Conversational AI endpoint powered by Groq (Llama-3.3-70b).
 * Accepts { message, history? } and returns { reply }.
 */
router.post('/', async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required.',
      });
    }

    // Build conversation messages with system prompt
    const messages = [
      {
        role: 'system',
        content: `You are the MCP Gateway AI Assistant — a helpful, concise assistant embedded in an agentic workflow management dashboard.

You help users with:
- Understanding how to create and run workflows
- Explaining what GitHub, Slack, and Jira connectors do
- Troubleshooting failed workflow steps
- General questions about the platform

Keep responses short (2-4 sentences max) and actionable. Use markdown formatting when helpful.
If you don't know something, say so honestly.`,
      },
      ...history.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Call Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', response.status, errText);
      return res.json({
        success: true,
        reply: "I'm having trouble connecting to my AI backend right now. Please try again in a moment.",
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

    return res.json({ success: true, reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    // Graceful fallback — never show raw errors to the user
    return res.json({
      success: true,
      reply: "I'm temporarily unavailable. Please try again shortly.",
    });
  }
});

export default router;
