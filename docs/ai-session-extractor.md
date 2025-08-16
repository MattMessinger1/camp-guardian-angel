# AI Session Extractor Documentation

## Overview

The AI Session Extractor converts HTML pages into structured session data using OpenAI's GPT-4.1 with function calling and strict JSON schemas.

## Features

- **LLM-Powered Extraction**: Uses OpenAI GPT-4.1 with function calling for reliable parsing
- **Strict JSON Schema**: Enforces consistent data structure
- **Confidence Scoring**: Assigns 0-1 confidence scores, filters out low-quality extractions
- **Data Normalization**: Standardizes dates, times, prices, ages, and locations
- **Geocoding**: Uses Nominatim for free location geocoding
- **Fallback Handling**: Graceful error handling with partial data recovery

## Usage

### CLI Command
```bash
npm run parse --url=https://example.com/page.html --confidence=0.7
```

### Test with Sample Data
```bash
node test-sessions-parser.js
```

## Extraction Schema

The AI extracts these fields per session:
- **Basic Info**: title, name, description, provider, category
- **Timing**: startDate, endDate, startTime, endTime, daysOfWeek
- **Demographics**: ageMin, ageMax, capacity, requirements
- **Pricing**: priceMin, priceMax
- **Location**: location, city, state, address (with geocoding)
- **Registration**: signupUrl, platform
- **Quality**: confidence score (0-1), extractionNotes

## Confidence Scoring

- **0.8-1.0**: High confidence - Complete, clear program listings
- **0.6-0.8**: Medium confidence - Partial but useful information  
- **0.3-0.6**: Low confidence - Unclear or incomplete data
- **<0.3**: Rejected - Not stored in database

## Output Example

```json
{
  "success": true,
  "totalExtracted": 8,
  "validCandidates": 5,
  "storedCandidates": 5,
  "candidates": [
    {
      "title": "Adventure Camp",
      "confidence": 0.92,
      "startDate": "2024-06-10",
      "endDate": "2024-07-15", 
      "ageRange": "8-12",
      "priceRange": "$185-$185",
      "location": "Olin Park, Madison, WI"
    }
  ]
}
```