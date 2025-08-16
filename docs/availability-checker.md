# Availability Checker Documentation

## Overview

The Availability Checker analyzes public web pages to detect session availability status using heuristics and pattern matching, without requiring private API access.

## Features

- **Public Heuristics**: Analyzes button text, page content, and visual indicators
- **Pattern Matching**: Uses regex patterns to detect availability signals
- **Evidence Collection**: Stores reasoning behind each availability determination
- **Confidence Scoring**: Provides 0-1 confidence score for each classification
- **Batch Processing**: Handles multiple URLs efficiently with rate limiting

## Availability Status Classification

### Status Types
- **`open`**: Registration actively available
- **`limited`**: Few spots remaining
- **`waitlist`**: Waitlist available or registration not yet open
- **`full`**: Sold out or registration closed  
- **`unknown`**: Unable to determine status

### Detection Patterns

#### FULL / SOLD OUT Indicators
- Text: "sold out", "fully booked", "no spaces available", "registration closed"
- Buttons: Disabled registration buttons
- CSS: Classes like "sold-out", "full", "closed"
- Visual: Strikethrough pricing

#### WAITLIST Indicators
- Text: "join waitlist", "waiting list", "waitlist available"
- Buttons: "Join Waitlist" buttons
- Future dates: "registration opens [date]", "coming soon"

#### LIMITED Indicators  
- Text: "few spots left", "limited spaces", "hurry", "almost full"
- Counts: "5 spots remaining", "only 3 spaces left"

#### OPEN Indicators
- Text: "register now", "sign up now", "spaces available"
- Buttons: Active registration buttons
- Forms: Registration forms present

## Usage

### CLI Commands
```bash
# Check all sessions with signup URLs
npm run check-availability --all

# Check specific source
npm run check-availability --source-id=123e4567-e89b-12d3-a456-426614174000

# Check specific URLs
npm run check-availability --urls="https://camp1.com,https://camp2.com"

# Batch processing
npm run check-availability --all --batch-size=10
```

### Test the System
```bash
node test-availability-checker.js
```

## Detection Algorithm

### 1. Content Analysis
- Remove scripts, styles, and comments
- Extract text content and HTML structure
- Identify buttons, links, and forms

### 2. Pattern Matching
- Apply weighted regex patterns
- Score each availability status (0-1)
- Collect evidence for each match

### 3. Contextual Analysis
- Analyze button states (enabled/disabled)
- Check for registration forms
- Examine pricing information
- Look for date-based signals

### 4. Confidence Calculation
```
confidence = max_status_score / total_scores
```

### 5. Final Classification
- Choose status with highest score (≥0.3 threshold)
- Default to 'unknown' if no clear signals

## Evidence Collection

Each detection includes evidence explaining the reasoning:

```json
{
  "status": "full",
  "evidence": [
    "Explicit 'sold out' text: 'This camp is sold out'",
    "Disabled registration button: 'register now'",
    "CSS class suggests full status"
  ],
  "confidence": 0.92
}
```

## Output Example

```json
{
  "success": true,
  "processed": 10,
  "updated": 8,
  "results": [
    {
      "url": "https://example.com/camp",
      "status": "limited",
      "evidence": [
        "Limited availability warning: 'Few spots left'",
        "Active registration button: 'register now'"
      ],
      "confidence": 0.85,
      "lastChecked": "2024-01-16T10:30:00Z"
    }
  ]
}
```

## Quality Metrics

### Target Performance
- **Classification Rate**: ≥70% non-unknown results
- **High Confidence**: ≥60% results with confidence ≥0.7
- **Accuracy**: Manual validation on sample URLs
- **Processing Speed**: 5-10 URLs per batch with 2s delays

### Common Patterns Detected
- Registration buttons (enabled/disabled)
- Availability messaging
- Waitlist language  
- Date-based availability
- Visual indicators (strikethrough, CSS classes)

## Rate Limiting & Best Practices

- **Batch Size**: 5 URLs per batch (configurable)
- **Delays**: 2 seconds between batches
- **Timeouts**: 15 seconds per URL fetch
- **User Agent**: Identifies as "CampScheduleBot/1.0"
- **Respect robots.txt**: Built-in with existing crawler

## Pattern Customization

New patterns can be added to improve detection:

```typescript
{
  pattern: /\b(new_pattern_here)\b/i,
  status: 'waitlist',
  weight: 0.8,
  description: 'Custom pattern description'
}
```

## Integration with Sessions Table

Updates the following fields:
- `availability_status`: Detected status
- `last_verified_at`: Timestamp of last check

Evidence can be stored in notes or separate table if needed.

## Monitoring & Maintenance

- Review confidence scores regularly
- Add new patterns for unrecognized sites
- Validate accuracy with manual spot checks
- Monitor error rates and timeout issues
- Update patterns as sites change UI