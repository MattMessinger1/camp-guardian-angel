# Session Merger & Deduplication Documentation

## Overview

The Session Merger converts session_candidates into canonical sessions in the main sessions table, using fuzzy matching to prevent duplicates and handle conflicting data.

## Features

- **Fuzzy Matching**: Uses Jaro-Winkler algorithm with 0.85 threshold
- **Conflict Resolution**: Preserves conflicting values in notes and marks for review
- **Provenance Tracking**: Maintains source_url and last_verified_at timestamps
- **Update-on-Change**: Updates existing sessions when new data is available
- **Dry Run Mode**: Preview changes without applying them

## Usage

### CLI Commands
```bash
# Process all pending candidates (dry run)
npm run merge --all --dry-run

# Process candidates from specific source
npm run merge --source-id=123e4567-e89b-12d3-a456-426614174000

# Process high-confidence candidates only
npm run merge --all --confidence=0.8 --threshold=0.9

# Process specific candidates
npm run merge --candidates=abc-123,def-456
```

### Test the Merger
```bash
node test-session-merger.js
```

## Fuzzy Matching Algorithm

Uses Jaro-Winkler similarity on three key fields:

1. **Name Matching** (50% weight): title/name field similarity
2. **Date Matching** (30% weight): exact start_date match
3. **City Matching** (20% weight): location_city similarity

**Threshold**: 0.85 (configurable)
- Scores ≥0.85: Merge with existing session
- Scores <0.85: Create new session

## Conflict Resolution

When merging sessions with conflicting data:

1. **Preserve Both Values**: Add conflict note to description
2. **Mark for Review**: Set needs_review flag (if implemented)
3. **Update Provenance**: Append new source_url
4. **Track Changes**: Update last_verified_at timestamp

Example conflict note:
```
[CONFLICT from https://source.com/page]: minimum age: 8 vs 6; price: $100 vs $120
```

## Session Fields Mapping

| Candidate Field | Session Field | Merge Strategy |
|----------------|---------------|----------------|
| title/name | title/name | Keep existing, update if empty |
| description | description | Append conflicts if any |
| startDate | start_date | Exact match for dedup |
| endDate | end_date | Update if more complete |
| ageMin/Max | age_min/max | Conflict detection |
| priceMin/Max | price_min/max | Conflict detection |
| city | location_city | Used for fuzzy matching |
| signupUrl | signup_url | Update if candidate has value |
| platform | platform | Update if candidate has value |

## Output Example

```json
{
  "success": true,
  "processed": 25,
  "merged": 18,
  "created": 7,
  "conflicts": 3,
  "details": [
    {
      "candidateId": "abc-123",
      "action": "merged",
      "sessionId": "def-456",
      "conflicts": ["minimum age: 8 vs 6"]
    },
    {
      "candidateId": "ghi-789",
      "action": "created",
      "sessionId": "jkl-012"
    }
  ]
}
```

## Re-run Safety

The system is designed to handle re-processing safely:

1. **Candidates marked as processed** won't be re-processed
2. **Same source URL** updates existing session instead of creating duplicate
3. **Fuzzy matching** catches minor variations in same program
4. **Last_verified_at** tracks when session was last updated

## Performance Considerations

- **Fuzzy matching** limited to 100 sessions per candidate for performance
- **City-based filtering** reduces comparison set
- **Batch processing** handles multiple candidates efficiently
- **Conflict detection** uses field-level comparison

## Quality Metrics

- **Deduplication Rate**: % of candidates merged vs created new
- **Conflict Rate**: % of merged sessions with conflicts
- **Processing Speed**: Candidates per second
- **Error Rate**: % of candidates that failed processing

Target metrics:
- Deduplication Rate: >50%
- Conflict Rate: <20%
- Error Rate: <5%