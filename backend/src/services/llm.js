import axios from 'axios';
import env from '../../config/env.js';
import { buildPlanningPrompt } from '../utils/promptBuilder.js';
import { buildDAGFromJSON } from '../utils/dagUtils.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

/**
 * Calls Groq LLM with a planning prompt and returns a parsed DAG object.
 */
export async function planWorkflow(userInput) {
  try {
    const { systemPrompt, userPrompt } = buildPlanningPrompt(userInput);

    const response = await axios.post(
      GROQ_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    let content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned empty response');
    }

    // Strip markdown fences if present
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      throw new Error(
        `Failed to parse LLM response as JSON: ${parseErr.message}\nRaw content: ${content.substring(0, 500)}`
      );
    }

    const dag = buildDAGFromJSON(parsed);
    return dag;
  } catch (err) {
    if (err.response?.status === 429) {
      const rateLimitErr = new Error('Groq rate limit exceeded — please wait a few seconds before retrying.');
      rateLimitErr.status = 429;
      throw rateLimitErr;
    }
    throw new Error(`LLM planning failed: ${err.message}`);
  }
}

/**
 * Sends a diagnosis request to Groq for IFR failure analysis.
 */
export async function diagnoseError(error, stepContext) {
  try {
    const { buildDiagnosisPrompt } = await import('../utils/promptBuilder.js');
    const { systemPrompt, userPrompt } = buildDiagnosisPrompt(error, stepContext);

    const response = await axios.post(
      GROQ_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 512,
      },
      {
        headers: {
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    let content = response.data.choices?.[0]?.message?.content;
    if (!content) return { rootCause: 'Unknown', suggestion: 'Check logs' };

    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    try {
      return JSON.parse(content);
    } catch {
      return { rootCause: content, suggestion: 'See raw diagnosis above' };
    }
  } catch (err) {
    return {
      rootCause: `Diagnosis call failed: ${err.message}`,
      suggestion: 'Manual investigation required',
    };
  }
}
