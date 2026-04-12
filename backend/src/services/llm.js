import axios from 'axios';
import env from '../../config/env.js';
import { buildPlanningPrompt } from '../utils/promptBuilder.js';
import { buildDAGFromJSON } from '../utils/dagUtils.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const FALLBACK_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

/**
 * Helper to make a POST request with model fallback and exponential backoff for 429 errors.
 * Groq applies rate-limits per model. If one hits 429, we seamlessly fall back to another.
 */
async function axiosPostWithRetry(url, data, config) {
  for (const model of FALLBACK_MODELS) {
    data.model = model; // Swap the model dynamically
    let internalAttempt = 0;
    
    while (internalAttempt < 2) {
      try {
        return await axios.post(url, data, config);
      } catch (err) {
        if (err.response?.status === 429) {
          internalAttempt++;
          if (internalAttempt < 2) {
            const delayMs = 2000; 
            console.warn(`[LLM Rate Limit] 429 for ${model}. Retrying in ${delayMs/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            console.warn(`[LLM Rate Limit] Exhausted retries for ${model}. Falling back to next model...`);
          }
        } else {
          throw err;
        }
      }
    }
  }

  const rateLimitErr = new Error('Groq rate limit exceeded across all fallback models after multiple retries.');
  rateLimitErr.status = 429;
  throw rateLimitErr;
}

/**
 * Calls Groq LLM with a planning prompt and returns a parsed DAG object.
 */
export async function planWorkflow(userInput) {
  try {
    const { systemPrompt, userPrompt } = buildPlanningPrompt(userInput);

    const response = await axiosPostWithRetry(
      GROQ_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
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
      // Fallback: try to extract the first JSON object from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error(
            `Failed to parse LLM response as JSON: ${parseErr.message}\nRaw content: ${content.substring(0, 500)}`
          );
        }
      } else {
        throw new Error(
          `Failed to parse LLM response as JSON: ${parseErr.message}\nRaw content: ${content.substring(0, 500)}`
        );
      }
    }

    const dag = buildDAGFromJSON(parsed);
    return dag;
  } catch (err) {
    if (err.response?.status === 429) {
      const rateLimitErr = new Error('Groq rate limit exceeded after multiple retries.');
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

    const response = await axiosPostWithRetry(
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
export async function callLLM(systemPrompt, userPrompt, maxTokens = 1000) {
  const response = await axiosPostWithRetry(
    GROQ_URL,
    {
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: maxTokens,
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
  if (!content) throw new Error("Empty response from Groq");
  return content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}
