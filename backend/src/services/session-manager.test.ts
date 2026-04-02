// Tests for session-manager service
import { describe, it, expect, vi } from 'vitest'
import {
  applySlidingWindow,
  prepareContents,
  shouldGenerateMemory,
  detectChapterLabel,
} from './session-manager.js'
import type { SessionMessage, GameplayConfig } from '@story-game/shared'

// Helper to create mock messages with timestamps
function createMockMessages(count: number, startIndex = 0): SessionMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'model',
    content: `Message ${i}`,
    timestamp: Date.now() + (i * 1000),
  }))
}

// Minimal GameplayConfig fixture for tests
const mockGameplayConfig: GameplayConfig = {
  default_narrative_length: 2000,
  narrative_length_min: 500,
  narrative_length_max: 5000,
  sliding_window_size: 10,
  max_history: 100,
  message_limit: 1000,
  message_warning_threshold: 900,
  memory_short_term_max: 20,
  auto_save_interval_ms: 30000,
  max_session_list: 50,
  available_models: [],
  input_modes: [],
  status_attribute_types: [],
  default_suggestions: [],
  character_relations: [],
  story_icons: [],
  character_icons: [],
  memory_categories: [],
  editor_defaults: {
    icon: '📖',
    aiModel: 'gemini-2.5-flash',
    narrativeLength: 2000,
    useLatex: false,
    useCache: true,
    useStatusWindow: false,
    isPublic: false,
  },
  default_labels: {
    new_session: 'New Session',
    untitled_story: 'Untitled Story',
  },
}

describe('Session Manager Service', () => {
  describe('applySlidingWindow', () => {
    const mockMessages = createMockMessages(20)

    it('should return all messages when within window size', () => {
      const result = applySlidingWindow(mockMessages, 25)

      expect(result).toHaveLength(20)
      expect(result).toEqual(mockMessages)
    })

    it('should return last N messages when exceeding window size', () => {
      const result = applySlidingWindow(mockMessages, 10)

      expect(result).toHaveLength(10)
      expect(result[0]).toEqual(mockMessages[10])
      expect(result[9]).toEqual(mockMessages[19])
    })

    it('should handle empty array', () => {
      const result = applySlidingWindow([], 10)

      expect(result).toEqual([])
    })

    it('should handle window size of 0', () => {
      const result = applySlidingWindow(mockMessages, 0)

      expect(result).toEqual([])
    })

    it('should handle window size equal to array length', () => {
      const result = applySlidingWindow(mockMessages, 20)

      expect(result).toHaveLength(20)
      expect(result).toEqual(mockMessages)
    })

    it('should handle window size of 1', () => {
      const result = applySlidingWindow(mockMessages, 1)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(mockMessages[19])
    })

    it('should not mutate original array', () => {
      const originalLength = mockMessages.length
      applySlidingWindow(mockMessages, 5)

      expect(mockMessages).toHaveLength(originalLength)
    })
  })

  describe('prepareContents', () => {
    it('should convert messages to Gemini format', () => {
      const messages: SessionMessage[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
        { role: 'model', content: 'Hi there', timestamp: Date.now() + 1000 },
      ]

      const result = prepareContents(messages)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ role: 'user', parts: [{ text: 'Hello' }] })
      expect(result[1]).toEqual({ role: 'model', parts: [{ text: 'Hi there' }] })
    })

    it('should handle empty array', () => {
      const result = prepareContents([])

      expect(result).toEqual([])
    })

    it('should handle single message', () => {
      const messages: SessionMessage[] = [
        { role: 'user', content: 'Single message', timestamp: Date.now() },
      ]

      const result = prepareContents(messages)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        role: 'user',
        parts: [{ text: 'Single message' }],
      })
    })

    it('should handle long messages with special characters', () => {
      const messages: SessionMessage[] = [
        { role: 'user', content: 'Message with\nnewlines and\ttabs', timestamp: Date.now() },
      ]

      const result = prepareContents(messages)

      expect(result[0].parts[0].text).toBe('Message with\nnewlines and\ttabs')
    })

    it('should handle unicode characters', () => {
      const messages: SessionMessage[] = [
        { role: 'user', content: '한글 메시지 🎉', timestamp: Date.now() },
      ]

      const result = prepareContents(messages)

      expect(result[0].parts[0].text).toBe('한글 메시지 🎉')
    })

    it('should handle very long messages', () => {
      const longContent = 'a'.repeat(10000)
      const messages: SessionMessage[] = [
        { role: 'user', content: longContent, timestamp: Date.now() },
      ]

      const result = prepareContents(messages)

      expect(result[0].parts[0].text).toHaveLength(10000)
    })
  })

  describe('shouldGenerateMemory', () => {
    it('should return false when messages within window size', () => {
      const messages = createMockMessages(8)

      const result = shouldGenerateMemory(messages, 0, mockGameplayConfig)

      expect(result).toBe(false)
    })

    it('should return true when messages exceed window size', () => {
      const messages = createMockMessages(15)

      const result = shouldGenerateMemory(messages, 0, mockGameplayConfig)

      expect(result).toBe(true)
    })

    it('should return false when recent summary exists', () => {
      const messages = createMockMessages(15)

      const result = shouldGenerateMemory(messages, 8, mockGameplayConfig)

      expect(result).toBe(false)
    })

    it('should return true when enough messages since summary', () => {
      const messages = createMockMessages(20)

      const result = shouldGenerateMemory(messages, 5, mockGameplayConfig)

      expect(result).toBe(true)
    })

    it('should handle boundary condition (exactly at window size)', () => {
      const messages = createMockMessages(10)

      const result = shouldGenerateMemory(messages, 0, mockGameplayConfig)

      expect(result).toBe(false)
    })

    it('should handle boundary condition (one over window size)', () => {
      const messages = createMockMessages(11)

      const result = shouldGenerateMemory(messages, 0, mockGameplayConfig)

      expect(result).toBe(true)
    })

    it('should handle empty message array', () => {
      const result = shouldGenerateMemory([], 0, mockGameplayConfig)

      expect(result).toBe(false)
    })

    it('should handle summary index greater than message count', () => {
      const messages: SessionMessage[] = [
        { role: 'user', content: 'Message 0', timestamp: Date.now() },
        { role: 'user', content: 'Message 1', timestamp: Date.now() + 1000 },
      ]

      const result = shouldGenerateMemory(messages, 10, mockGameplayConfig)

      expect(result).toBe(false)
    })
  })

  describe('detectChapterLabel', () => {
    it('should detect Korean chapter format', () => {
      const text = '제 1장: 시작'

      const result = detectChapterLabel(text)

      expect(result).toBe('제 1장: 시작')
    })

    it('should detect Korean chapter format without space', () => {
      const text = '제1장 — 어둠 속으로'

      const result = detectChapterLabel(text)

      expect(result).toBe('제1장 — 어둠 속으로')
    })

    it('should detect English chapter format', () => {
      const text = 'Chapter 3: The Beginning'

      const result = detectChapterLabel(text)

      expect(result).toBe('Chapter 3: The Beginning')
    })

    it('should detect English chapter format with dash', () => {
      const text = 'Chapter 3 - Into Darkness'

      const result = detectChapterLabel(text)

      expect(result).toBe('Chapter 3 - Into Darkness')
    })

    it('should detect chapter in mixed content', () => {
      const text = 'The hero continued their journey. Chapter 5: The Final Battle began.'

      const result = detectChapterLabel(text)

      // The regex is greedy and captures up to 60 chars
      expect(result).toBe('Chapter 5: The Final Battle began.')
    })

    it('should return null when no chapter label found', () => {
      const text = 'The hero continued their journey without any chapter markers.'

      const result = detectChapterLabel(text)

      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = detectChapterLabel('')

      expect(result).toBeNull()
    })

    it('should handle chapter numbers beyond single digits', () => {
      const text = 'Chapter 12: The Epic Conclusion'

      const result = detectChapterLabel(text)

      expect(result).toBe('Chapter 12: The Epic Conclusion')
    })

    it('should handle large Korean chapter numbers', () => {
      const text = '제 100장: 최후의 결전'

      const result = detectChapterLabel(text)

      expect(result).toBe('제 100장: 최후의 결전')
    })

    it('should limit chapter label to 60 characters in description part', () => {
      const longText = 'Chapter 1: ' + 'a'.repeat(100)

      const result = detectChapterLabel(longText)

      // Pattern matches "Chapter 1:" + up to 60 non-newline chars
      if (result) {
        expect(result.length).toBeGreaterThan(60)
        expect(result.length).toBeLessThan(80)
        expect(result).toMatch(/^Chapter 1: a+$/)
      }
    })

    it('should handle mixed script chapter labels', () => {
      const text = '제2장 — Chapter 2: The Beginning'

      const result = detectChapterLabel(text)

      expect(result).toBe('제2장 — Chapter 2: The Beginning')
    })

    it('should handle chapter labels with special characters', () => {
      const text = 'Chapter 7: The "Awakening" & New Beginnings'

      const result = detectChapterLabel(text)

      expect(result).toBe('Chapter 7: The "Awakening" & New Beginnings')
    })

    it('should be case insensitive for English chapter', () => {
      const text = 'CHAPTER 5: The Beginning'

      const result = detectChapterLabel(text)

      expect(result).toBe('CHAPTER 5: The Beginning')
    })

    it('should handle em dash separator', () => {
      const text = '제3장 — 새로운 시작'

      const result = detectChapterLabel(text)

      expect(result).toBe('제3장 — 새로운 시작')
    })

    it('should handle regular colon separator', () => {
      const text = '제3장: 새로운 시작'

      const result = detectChapterLabel(text)

      expect(result).toBe('제3장: 새로운 시작')
    })
  })
})
