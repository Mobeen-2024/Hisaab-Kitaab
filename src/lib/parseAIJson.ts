/**
 * Safely parses JSON from AI responses, handling markdown blocks and common malformations.
 */
export function parseAIJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  
  // Remove markdown code blocks if present
  const cleaned = text.trim()
    .replace(/^```[\w]*\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
    
  try {
    // Try to find the first JSON-like structure (object or array)
    const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('AI JSON Parse Error:', e, 'Raw text:', text);
    return fallback;
  }
}
