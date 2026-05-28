/**
 * Safely parses JSON from AI responses, handling markdown blocks and common malformations.
 */
export function parseAIJson<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  
  // Remove markdown code blocks if present
  let cleaned = text.trim()
    .replace(/^```[\w]*\n?/, '')
    .replace(/\n?```$/, '')
    .trim();
    
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // If exact parsing fails, try to extract the largest JSON object or array
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch (err) {
        // ignore and fallback
      }
    }
    
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      } catch (err) {
        // ignore and fallback
      }
    }
    
    console.error('AI JSON Parse Error:', e, 'Raw text:', text);
    return fallback;
  }
}
