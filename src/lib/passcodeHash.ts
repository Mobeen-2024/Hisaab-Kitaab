/**
 * Passcode hashing and verification utility using Web Crypto PBKDF2.
 * Uses PBKDF2 with SHA-256 and 100,000 iterations for high security.
 */

export function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPasscode(pin: string, salt: string): Promise<string> {
  const pinBytes = new TextEncoder().encode(pin);
  const saltBytes = new TextEncoder().encode(salt);
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const derivedKeyBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256 // 256 bits = 32 bytes
  );
  
  const hashArray = Array.from(new Uint8Array(derivedKeyBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPasscode(pin: string, salt: string, hash: string): Promise<boolean> {
  const derived = await hashPasscode(pin, salt);
  return derived === hash;
}
