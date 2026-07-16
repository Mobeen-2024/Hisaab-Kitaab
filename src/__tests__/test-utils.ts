export async function waitFor(conditionFn: () => boolean | Promise<boolean>, timeoutMs = 2000, intervalMs = 50): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await conditionFn()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

export const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
