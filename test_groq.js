import axios from 'axios';
import env from './backend/config/env.js';

const models = [
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
  'mixtral-8x7b-32768', 
  'llama-3.3-70b-specdec'
];

async function test() {
  for (const model of models) {
    try {
      await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: model,
          messages: [{ role: 'user', content: 'hello' }],
          max_tokens: 10
        },
        { headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` } }
      );
      console.log(`[SUCCESS] ${model}`);
    } catch (err) {
      console.log(`[FAILED ] ${model} - ${err.response?.status} : ${err.response?.data?.error?.message}`);
    }
  }
}

test();
