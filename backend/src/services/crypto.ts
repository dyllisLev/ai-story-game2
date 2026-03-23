// backend/src/services/crypto.ts
// AES-256-GCM symmetric encryption for API key storage
// Format: <iv-hex>:<authTag-hex>:<ciphertext-hex>
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

const ALGORITHM      = 'aes-256-gcm';
const KEY_LENGTH     = 32;  // bytes
const IV_LENGTH      = 16;  // bytes
const AUTH_TAG_LEN   = 16;  // bytes
const SCRYPT_SALT    = 'story-game-api-key-v1'; // static salt (non-secret)

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, SCRYPT_SALT, KEY_LENGTH);
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns a colon-separated hex string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv  = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LEN,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * Throws if tampering is detected (GCM auth tag mismatch).
 */
export function decrypt(ciphertext: string, secret: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }
  const [ivHex, authTagHex, encryptedHex] = parts;

  const key      = deriveKey(secret);
  const iv       = Buffer.from(ivHex, 'hex');
  const authTag  = Buffer.from(authTagHex, 'hex');
  const data     = Buffer.from(encryptedHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LEN,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}
