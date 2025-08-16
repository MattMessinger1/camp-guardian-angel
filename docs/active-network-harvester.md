# Active Network Camp Data Harvester

## Overview

The Active Network harvester (`ingest-active-search`) is a Supabase Edge Function that ingests public camp listings from the Activity Search API and normalizes them into the sessions database.

## Features

- ✅ **Read-only API access** - No registration/write operations
- ✅ **24-hour caching** - Reduces API quota usage
- ✅ **Deduplication** - By (provider_name, session_name, start_date, city)
- ✅ **Rate limiting** - Respects Active Network API quotas
- ✅ **Normalization** - Maps to standard session schema
- ✅ **Auto-signup URLs** - Points to activecommunities.com/active.com

## Setup

1. **Add API Key**: The `ACTIVE_NETWORK_API_KEY` secret has been configured
2. **Edge Function**: Deployed at `/functions/v1/ingest-active-search`

## Usage

### CLI Command
```bash
# Run the harvester script
node scripts/ingest-active.js Madison,WI

# With additional parameters
node scripts/ingest-active.js "Chicago,IL" --keywords="summer camp"
node scripts/ingest-active.js "Austin,TX" --category="sports" --keywords="youth"
```

### Direct API Call
```bash
curl -X POST https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/ingest-active-search \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI" \
  -H "Content-Type: application/json" \
  -d '{"city": "Madison", "state": "WI", "keywords": "camp youth summer"}'
```

## API Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `city` | string | "Madison" | Target city |
| `state` | string | "WI" | Target state |
| `keywords` | string | "camp youth summer" | Search keywords |
| `category` | string | "sports" | Activity category |

## Data Flow

```
Active Network API → session_candidates → sessions
```

1. **Fetch**: Query Activity Search API with location/keywords
2. **Cache**: Store responses for 24 hours
3. **Extract**: Convert API response to session candidates
4. **Dedupe**: Check for existing sessions
5. **Normalize**: Create sessions with signup URLs

## Deduplication Key

Sessions are deduplicated using:
```
{provider_name}_{session_name}_{start_date}_{city}
```

## Expected Output

For `Madison,WI`, the harvester should populate ≥20 sessions with:
- ✅ Signup URLs pointing to active.com/activecommunities.com
- ✅ Normalized session data (name, dates, location, pricing)
- ✅ Provider information
- ✅ Age restrictions and capacity data

## Rate Limiting

- **4-second delays** between API requests
- **Maximum 5 pages** per harvest (250 activities max)
- **24-hour caching** to minimize API calls
- **1000 requests/hour** Active Network limit respected

## Monitoring

Check the function logs:
```bash
# View recent logs
supabase functions logs ingest-active-search

# Real-time logs
supabase functions logs ingest-active-search --follow
```

## Troubleshooting

### Common Issues

1. **API Key Error**: Verify `ACTIVE_NETWORK_API_KEY` is set
2. **Rate Limiting**: Wait between requests if hitting limits
3. **No Results**: Try different keywords/locations
4. **Duplicates**: Check deduplication logic

### Debug Mode

Enable detailed logging by adding `?debug=true` to function calls.

## Scheduled Execution

To run automatically, set up a cron job:

```sql
SELECT cron.schedule(
  'harvest-active-network-daily',
  '0 6 * * *', -- 6 AM daily
  $$
  SELECT net.http_post(
    url := 'https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/ingest-active-search',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{"city": "Madison", "state": "WI"}'::jsonb
  );
  $$
);
```