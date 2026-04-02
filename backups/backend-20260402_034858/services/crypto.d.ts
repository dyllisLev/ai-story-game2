/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns a colon-separated hex string: iv:authTag:ciphertext
 */
export declare function encrypt(plaintext: string, secret: string): string;
/**
 * Decrypt a ciphertext string produced by encrypt().
 * Throws if tampering is detected (GCM auth tag mismatch).
 */
export declare function decrypt(ciphertext: string, secret: string): string;
