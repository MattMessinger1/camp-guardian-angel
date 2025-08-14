import { describe, it, expect } from 'vitest'
import { parseSearchQuery, formatParsedQuery } from './parseSearchQuery'

describe('parseSearchQuery', () => {
  it('should parse camp type and location', async () => {
    const result = await parseSearchQuery('Soccer camp in Austin, TX for July 2024')
    
    expect(result.campType).toBe('soccer')
    expect(result.location).toBe('Austin, TX')
    expect(result.timeframe).toBe('July 2024')
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should parse location with near keyword', async () => {
    const result = await parseSearchQuery('Basketball camp near Seattle summer session')
    
    expect(result.campType).toBe('basketball')
    expect(result.location).toBe('Seattle')
    expect(result.timeframe).toBe('summer')
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should parse age group information', async () => {
    const result = await parseSearchQuery('Art camp in Los Angeles for ages 8-12')
    
    expect(result.campType).toBe('art')
    expect(result.location).toBe('Los Angeles')
    expect(result.ageGroup).toBe('8-12 years')
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should handle single age', async () => {
    const result = await parseSearchQuery('Coding camp ages 10')
    
    expect(result.campType).toBe('coding')
    expect(result.ageGroup).toBe('10')
  })

  it('should parse various timeframe formats', async () => {
    const queries = [
      { query: 'Camp for summer 2024', expected: 'summer' },
      { query: 'Camp in 2024', expected: '2024' },
      { query: 'Camp for July', expected: 'July' },
      { query: 'Swimming camp August 2024', expected: 'August 2024' }
    ]

    for (const { query, expected } of queries) {
      const result = await parseSearchQuery(query)
      expect(result.timeframe).toBe(expected)
    }
  })

  it('should throw error for empty query', async () => {
    await expect(parseSearchQuery('')).rejects.toThrow('Search query cannot be empty')
    await expect(parseSearchQuery('   ')).rejects.toThrow('Search query cannot be empty')
  })

  it('should throw error for unparseable query', async () => {
    await expect(parseSearchQuery('xyz abc 123')).rejects.toThrow('Could not understand your search')
  })

  it('should parse complex query with all elements', async () => {
    const result = await parseSearchQuery('YMCA Soccer camp in Austin, TX for July 2024 ages 8-12')
    
    expect(result.campName).toBe('YMCA')
    expect(result.campType).toBe('soccer')
    expect(result.location).toBe('Austin, TX')
    expect(result.timeframe).toBe('July 2024')
    expect(result.ageGroup).toBe('8-12 years')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('should handle different location formats', async () => {
    const queries = [
      { query: 'Camp in New York City', expected: 'New York City' },
      { query: 'Camp near Dallas area', expected: 'Dallas' },
      { query: 'Camp at San Francisco, CA', expected: 'San Francisco, CA' }
    ]

    for (const { query, expected } of queries) {
      const result = await parseSearchQuery(query)
      expect(result.location).toBe(expected)
    }
  })

  it('should identify multiple camp types', async () => {
    const queries = [
      { query: 'Tennis camp', expected: 'tennis' },
      { query: 'Science camp', expected: 'science' },
      { query: 'Theater camp', expected: 'theater' },
      { query: 'Outdoor adventure camp', expected: 'outdoor' }
    ]

    for (const { query, expected } of queries) {
      const result = await parseSearchQuery(query)
      expect(result.campType).toBe(expected)
    }
  })
})

describe('formatParsedQuery', () => {
  it('should format query with all fields', () => {
    const parsed = {
      campType: 'soccer',
      location: 'Austin, TX',
      timeframe: 'July 2024',
      ageGroup: '8-12 years',
      confidence: 0.9
    }

    const result = formatParsedQuery(parsed)
    expect(result).toBe('soccer camp in Austin, TX for July 2024 (ages 8-12 years)')
  })

  it('should format query with partial fields', () => {
    const parsed = {
      campType: 'basketball',
      location: 'Seattle',
      confidence: 0.7
    }

    const result = formatParsedQuery(parsed)
    expect(result).toBe('basketball camp in Seattle')
  })

  it('should return default for empty query', () => {
    const parsed = { confidence: 0.1 }
    const result = formatParsedQuery(parsed)
    expect(result).toBe('Camp search')
  })
})