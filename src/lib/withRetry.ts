export async function withRetry<T>(
  promiseFn: () => Promise<T>,
  timeoutMs: number,
  retries = 2,
  defaultDelayMs = 15000
): Promise<T> {
  let attempt = 0;
  while (true) {
    let timeoutId: any;
    try {
      return await Promise.race([
        promiseFn(),
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('AI request timed out')), timeoutMs);
        })
      ]);
    } catch (error: any) {
      if (
        attempt < retries &&
        (error?.status === 429 ||
          error?.message?.includes('429') ||
          error?.status === 503 ||
          error?.message?.includes('503') ||
          error?.message?.includes('UNAVAILABLE') ||
          error?.message?.includes('timed out'))
      ) {
        let waitTimeMs = defaultDelayMs;
        const retryMatch = error?.message?.match(/retry in ([\d\.]+)s/);
        if (retryMatch && retryMatch[1]) {
          waitTimeMs = (parseFloat(retryMatch[1]) + 1) * 1000;
        }
        console.warn(`API Error (${error?.status || 503}). Retrying in ${Math.round(waitTimeMs / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTimeMs));
        attempt++;
        continue;
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
