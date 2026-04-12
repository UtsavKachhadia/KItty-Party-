import { callLLM } from './llm.js';

const VALID_TYPES = ['SELF', 'THIRD_PARTY', 'AMBIGUOUS'];

const INTENT_SYSTEM_PROMPT = `You are a workflow intent classifier. Given a user's natural language 
workflow instruction, determine who the workflow should execute for.

Return ONLY valid JSON matching this schema exactly:
{
  "executionType": "SELF" | "THIRD_PARTY" | "AMBIGUOUS",
  "targetUsername": "string or null",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explanation"
}

Rules:
- SELF: user wants to run the workflow using their own tool accounts (GitHub, Slack, Jira)
- THIRD_PARTY: user explicitly names another person (by @mention, name, or "for X" phrasing) who should be the actor
- AMBIGUOUS: user mentions another person but it is unclear if they want to send it TO that person or run it FOR that person
- targetUsername: extract only if THIRD_PARTY and clearly mentioned. Strip @ prefix. Return null if SELF or AMBIGUOUS.
- confidence: how confident you are in the classification

Examples:
Input: "Create a GitHub issue for the login bug"
Output: {"executionType":"SELF","targetUsername":null,"confidence":0.97,"reasoning":"No other user mentioned, action is first-person."}

Input: "Create a GitHub issue for @saanvi and notify her on Slack"  
Output: {"executionType":"THIRD_PARTY","targetUsername":"saanvi","confidence":0.93,"reasoning":"Explicit @mention with 'for' preposition indicates acting on behalf of saanvi."}

Input: "Send the Jira ticket to Aarin"
Output: {"executionType":"AMBIGUOUS","targetUsername":null,"confidence":0.61,"reasoning":"'Send to' is ambiguous — could mean notify Aarin or run as Aarin."}`;

/**
 * Classifies whether a user's workflow instruction targets their own accounts
 * (SELF), another user's accounts (THIRD_PARTY), or is unclear (AMBIGUOUS).
 *
 * @param {string} userInput - The raw natural language instruction
 * @returns {Promise<{executionType: string, targetUsername: string|null, confidence: number, reasoning: string}>}
 */
export async function detectIntent(userInput) {
  let raw;
  try {
    raw = await callLLM(INTENT_SYSTEM_PROMPT, userInput, 200);
    const parsed = JSON.parse(raw);

    // Validate executionType
    if (!VALID_TYPES.includes(parsed.executionType)) {
      throw new Error(`Invalid executionType: ${parsed.executionType}`);
    }

    // Normalize targetUsername — strip @ prefix, lowercase, trim
    if (parsed.targetUsername) {
      parsed.targetUsername = parsed.targetUsername.replace(/^@/, '').toLowerCase().trim();
    }

    // If THIRD_PARTY but no username extracted, downgrade to AMBIGUOUS
    if (parsed.executionType === 'THIRD_PARTY' && !parsed.targetUsername) {
      parsed.executionType = 'AMBIGUOUS';
    }

    const result = {
      executionType: parsed.executionType,
      targetUsername: parsed.targetUsername || null,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning || '',
    };

    // Safe logging — never log raw userInput (may contain sensitive context)
    console.log(
      `[intentDetector] type=${result.executionType} target=${result.targetUsername} conf=${result.confidence}`
    );

    return result;
  } catch (err) {
    // Safe fallback — never block the user from running a workflow
    console.warn('[intentDetector] Parse failed, falling back to SELF:', err.message);
    return {
      executionType: 'SELF',
      targetUsername: null,
      confidence: 0.5,
      reasoning: 'Fallback due to parse error',
    };
  }
}
