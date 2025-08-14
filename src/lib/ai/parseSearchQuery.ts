/**
 * Parse search query to extract camp information
 * 
 * TODO: integrate OpenAI for advanced natural language processing
 * Current implementation uses simple string parsing
 */

export interface ParsedSearchQuery {
  campName?: string
  location?: string
  timeframe?: string
  ageGroup?: string
  campType?: string
  confidence: number
}

/**
 * Parse a search query and extract relevant camp information
 */
export async function parseSearchQuery(query: string): Promise<ParsedSearchQuery> {
  if (!query.trim()) {
    throw new Error('Search query cannot be empty')
  }

  // Simulate async processing delay
  await new Promise(resolve => setTimeout(resolve, 500))

  const lowerQuery = query.toLowerCase().trim()
  const result: ParsedSearchQuery = {
    confidence: 0.7 // Default confidence for string parsing
  }

  // Extract camp type (sports, art, tech, etc.)
  const campTypes = [
    'soccer', 'basketball', 'baseball', 'football', 'tennis', 'swim',
    'art', 'music', 'dance', 'theater', 'coding', 'tech', 'science',
    'outdoor', 'adventure', 'nature', 'academic', 'math'
  ]
  
  for (const type of campTypes) {
    if (lowerQuery.includes(type)) {
      result.campType = type
      break
    }
  }

  // Extract location patterns
  // Look for "in [city]", "near [city]", "[city], [state]"
  const locationPatterns = [
    /(?:in|near|at)\s+([a-zA-Z\s]+?)(?:,|\s+for|\s+summer|\s+\d{4}|$)/i,
    /([a-zA-Z\s]+?),\s*([A-Z]{2})/i, // City, State
    /([a-zA-Z\s]+?)\s+(?:area|region)/i
  ]

  for (const pattern of locationPatterns) {
    const match = query.match(pattern)
    if (match) {
      result.location = match[1].trim()
      if (match[2]) {
        result.location += `, ${match[2]}`
      }
      break
    }
  }

  // Extract timeframe
  const timePatterns = [
    /(?:for\s+)?(\w+\s+\d{4})/i, // "July 2024"
    /(summer|fall|winter|spring)\s*(?:session|camp|\d{4})?/i,
    /(\d{4})/i, // Just year
    /(june|july|august|september|october|november|december)\s*(?:\d{4})?/i
  ]

  for (const pattern of timePatterns) {
    const match = query.match(pattern)
    if (match) {
      result.timeframe = match[1]
      break
    }
  }

  // Extract age group
  const agePatterns = [
    /(?:ages?\s+)(\d+)(?:\s*-\s*(\d+))?/i,
    /(\d+)(?:\s*-\s*(\d+))?\s*years?\s*old/i,
    /(elementary|middle|high)\s*school/i,
    /(toddler|preschool|kindergarten)/i
  ]

  for (const pattern of agePatterns) {
    const match = query.match(pattern)
    if (match) {
      if (match[2]) {
        result.ageGroup = `${match[1]}-${match[2]} years`
      } else {
        result.ageGroup = match[1]
      }
      break
    }
  }

  // Extract camp name (anything not captured by other patterns)
  // This is a simple heuristic - look for capitalized words at the beginning
  const namePattern = /^([A-Z][a-zA-Z\s]+?)(?:\s+(?:in|near|for|camp|at))/i
  const nameMatch = query.match(namePattern)
  if (nameMatch) {
    result.campName = nameMatch[1].trim()
  }

  // Adjust confidence based on what we found
  let foundElements = 0
  if (result.campName) foundElements++
  if (result.location) foundElements++
  if (result.timeframe) foundElements++
  if (result.campType) foundElements++
  if (result.ageGroup) foundElements++

  result.confidence = Math.min(0.9, 0.3 + (foundElements * 0.15))

  // If we couldn't parse anything meaningful, throw an error
  if (foundElements === 0) {
    throw new Error('Could not understand your search. Please try including camp type, location, or timeframe.')
  }

  return result
}

/**
 * Format parsed query data for display
 */
export function formatParsedQuery(parsed: ParsedSearchQuery): string {
  const parts: string[] = []
  
  if (parsed.campType) {
    parts.push(`${parsed.campType} camp`)
  }
  
  if (parsed.location) {
    parts.push(`in ${parsed.location}`)
  }
  
  if (parsed.timeframe) {
    parts.push(`for ${parsed.timeframe}`)
  }
  
  if (parsed.ageGroup) {
    parts.push(`(ages ${parsed.ageGroup})`)
  }

  return parts.join(' ') || 'Camp search'
}