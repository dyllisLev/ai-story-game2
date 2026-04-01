// Tests for crypto utilities
import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from './crypto.js'

describe('Crypto Service', () => {
  const testSecret = 'test-encryption-secret-32chars'

  describe('encrypt', () => {
    it('should encrypt plaintext successfully', () => {
      const plaintext = 'Hello, World!'
      const encrypted = encrypt(plaintext, testSecret)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)
      expect(encrypted).not.toContain(plaintext) // Plaintext should not be visible
    })

    it('should produce different outputs for same input (due to random IV)', () => {
      const plaintext = 'Same input'
      const encrypted1 = encrypt(plaintext, testSecret)
      const encrypted2 = encrypt(plaintext, testSecret)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should produce output in correct format (iv:authTag:ciphertext)', () => {
      const plaintext = 'Test'
      const encrypted = encrypt(plaintext, testSecret)

      const parts = encrypted.split(':')
      expect(parts).toHaveLength(3)

      const [iv, authTag, ciphertext] = parts
      expect(iv).toMatch(/^[0-9a-f]+$/) // Hex string
      expect(authTag).toMatch(/^[0-9a-f]+$/) // Hex string
      expect(ciphertext).toMatch(/^[0-9a-f]+$/) // Hex string

      expect(iv.length).toBe(32) // 16 bytes = 32 hex chars
      expect(authTag.length).toBe(32) // 16 bytes = 32 hex chars
    })

    it('should handle empty strings', () => {
      const encrypted = encrypt('', testSecret)
      expect(encrypted).toBeDefined()
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should handle unicode characters', () => {
      const plaintext = '한글テスト🎉'
      const encrypted = encrypt(plaintext, testSecret)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
    })

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
      const encrypted = encrypt(plaintext, testSecret)

      expect(encrypted).toBeDefined()
    })

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000)
      const encrypted = encrypt(plaintext, testSecret)

      expect(encrypted).toBeDefined()
    })
  })

  describe('decrypt', () => {
    it('should decrypt correctly encrypted data', () => {
      const plaintext = 'Hello, World!'
      const encrypted = encrypt(plaintext, testSecret)
      const decrypted = decrypt(encrypted, testSecret)

      expect(decrypted).toBe(plaintext)
    })

    it('should decrypt empty strings', () => {
      const plaintext = ''
      const encrypted = encrypt(plaintext, testSecret)
      const decrypted = decrypt(encrypted, testSecret)

      expect(decrypted).toBe('')
    })

    it('should decrypt unicode characters correctly', () => {
      const plaintext = '한글テスト🎉'
      const encrypted = encrypt(plaintext, testSecret)
      const decrypted = decrypt(encrypted, testSecret)

      expect(decrypted).toBe(plaintext)
    })

    it('should decrypt special characters correctly', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`'
      const encrypted = encrypt(plaintext, testSecret)
      const decrypted = decrypt(encrypted, testSecret)

      expect(decrypted).toBe(plaintext)
    })

    it('should decrypt long strings correctly', () => {
      const plaintext = 'a'.repeat(10000)
      const encrypted = encrypt(plaintext, testSecret)
      const decrypted = decrypt(encrypted, testSecret)

      expect(decrypted).toBe(plaintext)
    })
  })

  describe('encrypt/decrypt round-trip', () => {
    it('should maintain data integrity through encrypt/decrypt cycle', () => {
      const testCases = [
        'Simple text',
        'Text with numbers 12345',
        'Text\nwith\nnewlines',
        'Text\twith\ttabs',
        'Mixed CASE text',
        '',
        ' ',
        'a',
        '0',
      ]

      testCases.forEach((plaintext) => {
        const encrypted = encrypt(plaintext, testSecret)
        const decrypted = decrypt(encrypted, testSecret)
        expect(decrypted).toBe(plaintext)
      })
    })

    it('should work with different secrets', () => {
      const plaintext = 'Secret data'
      const secret1 = 'secret-one-32chars-------------'
      const secret2 = 'secret-two-32chars-------------'

      const encrypted1 = encrypt(plaintext, secret1)
      const encrypted2 = encrypt(plaintext, secret2)

      const decrypted1 = decrypt(encrypted1, secret1)
      const decrypted2 = decrypt(encrypted2, secret2)

      expect(decrypted1).toBe(plaintext)
      expect(decrypted2).toBe(plaintext)
    })
  })

  describe('error handling', () => {
    it('should throw error for invalid ciphertext format (too few parts)', () => {
      expect(() => decrypt('invalid', testSecret)).toThrow('Invalid ciphertext format')
    })

    it('should throw error for invalid ciphertext format (too many parts)', () => {
      expect(() => decrypt('a:b:c:d', testSecret)).toThrow('Invalid ciphertext format')
    })

    it('should throw error for invalid hex in iv', () => {
      const invalidCiphertext = `!@#:abcdef0123456789012345678901:${'a'.repeat(32)}`
      expect(() => decrypt(invalidCiphertext, testSecret)).toThrow()
    })

    it('should throw error for wrong secret (tamper detection)', () => {
      const plaintext = 'Secret data'
      const secret1 = 'secret-one-32chars-------------'
      const secret2 = 'secret-two-32chars-------------'

      const encrypted = encrypt(plaintext, secret1)

      expect(() => decrypt(encrypted, secret2)).toThrow()
    })

    it('should throw error for tampered ciphertext', () => {
      const plaintext = 'Secret data'
      const encrypted = encrypt(plaintext, testSecret)

      // Tamper with the ciphertext
      const parts = encrypted.split(':')
      const tampered = `${parts[0]}:${parts[1]}:${'ff'.repeat(100)}`

      expect(() => decrypt(tampered, testSecret)).toThrow()
    })

    it('should throw error for tampered auth tag', () => {
      const plaintext = 'Secret data'
      const encrypted = encrypt(plaintext, testSecret)

      // Tamper with the auth tag
      const parts = encrypted.split(':')
      const tampered = `${parts[0]}:${'ff'.repeat(16)}:${parts[2]}`

      expect(() => decrypt(tampered, testSecret)).toThrow()
    })
  })

  describe('key derivation', () => {
    it('should derive same key from same secret', () => {
      const plaintext = 'Test data'
      const secret = 'my-secret-32chars------------'

      const encrypted1 = encrypt(plaintext, secret)
      const encrypted2 = encrypt(plaintext, secret)

      // Different outputs due to random IV
      expect(encrypted1).not.toBe(encrypted2)

      // But both decrypt correctly
      expect(decrypt(encrypted1, secret)).toBe(plaintext)
      expect(decrypt(encrypted2, secret)).toBe(plaintext)
    })

    it('should derive different keys from different secrets', () => {
      const plaintext = 'Test data'
      const secret1 = 'secret-one-32chars-------------'
      const secret2 = 'secret-two-32chars-------------'

      const encrypted1 = encrypt(plaintext, secret1)

      expect(() => decrypt(encrypted1, secret2)).toThrow()
    })
  })
})
