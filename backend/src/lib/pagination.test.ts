// Tests for pagination utilities
import { describe, it, expect } from 'vitest'
import { buildPaginatedResponse } from './pagination.js'

describe('buildPaginatedResponse', () => {
  const mockData = [1, 2, 3, 4, 5]

  it('should build a paginated response with correct structure', () => {
    const result = buildPaginatedResponse(mockData, 100, 1, 10)

    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('total')
    expect(result).toHaveProperty('page')
    expect(result).toHaveProperty('limit')
    expect(result).toHaveProperty('total_pages')
  })

  it('should return the provided data unchanged', () => {
    const result = buildPaginatedResponse(mockData, 100, 1, 10)
    expect(result.data).toEqual(mockData)
  })

  it('should use provided count for total', () => {
    const result = buildPaginatedResponse(mockData, 100, 1, 10)
    expect(result.total).toBe(100)
  })

  it('should default total to 0 when count is null', () => {
    const result = buildPaginatedResponse(mockData, null, 1, 10)
    expect(result.total).toBe(0)
  })

  it('should calculate total_pages correctly', () => {
    expect(buildPaginatedResponse(mockData, 100, 1, 10).total_pages).toBe(10)
    expect(buildPaginatedResponse(mockData, 95, 1, 10).total_pages).toBe(10)
    expect(buildPaginatedResponse(mockData, 91, 1, 10).total_pages).toBe(10)
    expect(buildPaginatedResponse(mockData, 89, 1, 10).total_pages).toBe(9)
  })

  it('should handle edge case of exact division', () => {
    expect(buildPaginatedResponse(mockData, 100, 1, 10).total_pages).toBe(10)
    expect(buildPaginatedResponse(mockData, 50, 1, 10).total_pages).toBe(5)
    expect(buildPaginatedResponse(mockData, 20, 1, 10).total_pages).toBe(2)
  })

  it('should handle edge case of zero items', () => {
    const result = buildPaginatedResponse([], 0, 1, 10)
    expect(result.total).toBe(0)
    expect(result.total_pages).toBe(0)
    expect(result.data).toEqual([])
  })

  it('should return 0 total_pages when limit is 0', () => {
    const result = buildPaginatedResponse(mockData, 100, 1, 0)
    expect(result.total_pages).toBe(0)
  })

  it('should return 0 total_pages when limit is negative', () => {
    const result = buildPaginatedResponse(mockData, 100, 1, -10)
    expect(result.total_pages).toBe(0)
  })

  it('should preserve the provided page and limit values', () => {
    const result = buildPaginatedResponse(mockData, 100, 3, 25)
    expect(result.page).toBe(3)
    expect(result.limit).toBe(25)
  })

  it('should handle page 1', () => {
    const result = buildPaginatedResponse(mockData, 100, 1, 10)
    expect(result.page).toBe(1)
  })

  it('should handle larger page numbers', () => {
    const result = buildPaginatedResponse(mockData, 100, 10, 10)
    expect(result.page).toBe(10)
  })

  it('should work with custom data types', () => {
    interface User {
      id: number
      name: string
    }

    const users: User[] = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]

    const result = buildPaginatedResponse<User>(users, 50, 1, 10)
    expect(result.data).toEqual(users)
    expect(result.total).toBe(50)
    expect(result.total_pages).toBe(5)
  })
})
