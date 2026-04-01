// Tests for sanitization utilities
import { describe, it, expect } from 'vitest'
import { sanitizeLikePattern } from './sanitization.js'

describe('sanitizeLikePattern', () => {
  it('should escape percentage signs', () => {
    expect(sanitizeLikePattern('100% fun')).toBe('100\\% fun')
    expect(sanitizeLikePattern('%')).toBe('\\%')
    expect(sanitizeLikePattern('%%%')).toBe('\\%\\%\\%')
  })

  it('should escape underscores', () => {
    expect(sanitizeLikePattern('hello_world')).toBe('hello\\_world')
    expect(sanitizeLikePattern('_')).toBe('\\_')
    expect(sanitizeLikePattern('___')).toBe('\\_\\_\\_')
  })

  it('should escape both percentage signs and underscores', () => {
    expect(sanitizeLikePattern('100%_fun')).toBe('100\\%\\_fun')
    expect(sanitizeLikePattern('_test%')).toBe('\\_test\\%')
    expect(sanitizeLikePattern('%_%')).toBe('\\%\\_\\%')
  })

  it('should handle empty strings', () => {
    expect(sanitizeLikePattern('')).toBe('')
  })

  it('should not escape other special characters', () => {
    expect(sanitizeLikePattern('hello-world')).toBe('hello-world')
    expect(sanitizeLikePattern('test.file')).toBe('test.file')
    expect(sanitizeLikePattern('user@example')).toBe('user@example')
  })

  it('should handle mixed content with wildcards', () => {
    expect(sanitizeLikePattern('This is 100% awesome_test')).toBe('This is 100\\% awesome\\_test')
    expect(sanitizeLikePattern('__init__% method')).toBe('\\_\\_init\\_\\_\\% method')
  })

  it('should handle strings with only wildcards', () => {
    expect(sanitizeLikePattern('%_')).toBe('\\%\\_')
    expect(sanitizeLikePattern('_%')).toBe('\\_\\%')
  })

  it('should handle unicode characters', () => {
    expect(sanitizeLikePattern('한글_test%')).toBe('한글\\_test\\%')
    expect(sanitizeLikePattern('テスト_%')).toBe('テスト\\_\\%')
  })
})
