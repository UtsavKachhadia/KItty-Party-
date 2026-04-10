/**
 * Retries `fn` up to `maxRetries` times with exponential backoff.
 * Delay doubles each attempt starting from `baseDelayMs`.
 * Returns the result of fn or throws the last error.
 */
export async function exponentialBackoff(fn, maxRetries = 3, baseDelayMs = 1000) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `⏳ Retry ${attempt + 1}/${maxRetries} in ${delay}ms — ${err.message}`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}
