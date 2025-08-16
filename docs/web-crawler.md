# Web Crawler Documentation

## Overview

The web crawler is designed to discover and fetch public camp/program pages from provider websites. It respects robots.txt, parses sitemaps, and intelligently filters for relevant content.

## Features

- **Robots.txt Compliance**: Checks and respects robots.txt directives
- **Sitemap Discovery**: Automatically finds and parses sitemap.xml files
- **Keyword Filtering**: Only crawls pages matching camp-related keywords
- **Rate Limiting**: Respects server load with configurable delays
- **Concurrency Control**: Limits concurrent requests per host
- **Deduplication**: Avoids re-crawling recently fetched pages

## Usage

### CLI Command
```bash
npm run crawl --base=https://example.com --max-pages=50
```

### Parameters
- `--base`: Base URL to crawl (required)
- `--max-pages`: Maximum number of pages to crawl (default: 50)

### Examples
```bash
# Crawl Madison Parks & Recreation
npm run crawl --base=https://www.cityofmadison.com --max-pages=100

# Crawl local YMCA
npm run crawl --base=https://ymcadane.org --max-pages=25
```

## How It Works

### 1. Source Creation
Creates or reuses a source record in the `sources` table to track the crawl.

### 2. Robots.txt Check
- Fetches `/robots.txt` from the target domain
- Caches results for 1 hour per hostname
- Respects User-Agent specific and wildcard rules
- Conservative approach: if robots.txt forbids crawling, stops immediately

### 3. Sitemap Discovery
Attempts to find sitemaps in this order:
- `/sitemap.xml`
- `/sitemap_index.xml` 
- `/sitemaps.xml`

If no sitemap is found, falls back to common paths:
- `/programs`, `/camps`, `/summer`, `/youth`, `/register`, `/activities`, `/classes`, `/sessions`

### 4. Content Filtering
Only crawls URLs containing these keywords:
- camp
- session
- summer
- program
- register
- youth

### 5. Rate Limiting
- Minimum 1 second delay between requests to same host
- Gradually increases delay for repeated requests
- Maximum 5 second delay per host
- Concurrent request limit: 2 per host

### 6. Data Storage
Crawled pages are stored in the `raw_pages` table with:
- Full HTML content
- Metadata (content type, length, HTTP status)
- SHA-256 hash for deduplication
- Source reference and timestamps

## Configuration

### Environment Variables
No additional environment variables required - uses existing Supabase configuration.

### Rate Limiting Settings
- Initial delay: 1 second
- Delay multiplier: 1.1x per request
- Maximum delay: 5 seconds
- Concurrency: 2 requests per host

### Content Filtering
Keywords are defined in the edge function and can be modified by editing:
```typescript
const CAMP_KEYWORDS = ['camp', 'session', 'summer', 'program', 'register', 'youth'];
```

## Database Schema

### Sources Table
```sql
CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_url text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'active',
  notes text,
  last_crawled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Raw Pages Table
```sql
CREATE TABLE raw_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES sources(id),
  url text NOT NULL,
  html text,
  content_type text,
  content_length integer,
  http_status integer,
  hash text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

## Output Example

```
🕷️  Starting website crawl...
   Base URL: https://madisonparks.org
   Max pages: 50

✅ Crawl completed successfully!
   Duration: 45.2s
   Pages crawled: 23
   Parse jobs queued: 23
   Source ID: 123e4567-e89b-12d3-a456-426614174000
   Errors: 2
     ⚠️  https://madisonparks.org/old-programs: 404 Not Found
     ⚠️  https://madisonparks.org/temp: Robots.txt disallows
```

## Error Handling

- **Network errors**: Logged and continue with other URLs
- **Robots.txt violations**: Skip URL and log warning
- **Rate limiting**: Automatic backoff and retry
- **Invalid HTML**: Stored as-is for potential future parsing
- **Database errors**: Logged and continue crawling

## Integration with Processing Pipeline

Crawled pages in `raw_pages` are ready for:
1. Content parsing to extract session information
2. Conversion to `session_candidates`
3. Normalization into the `sessions` table

## Performance Considerations

- Memory usage scales with page size and concurrency
- Large sitemaps may require pagination (not yet implemented)
- Consider implementing disk caching for very large crawls
- Monitor database storage growth for HTML content

## Future Enhancements

- **Nested sitemap support**: Parse sitemap index files recursively
- **Content compression**: Store gzipped HTML to save space
- **Incremental crawling**: Only fetch pages modified since last crawl
- **JavaScript rendering**: Support for SPA applications
- **Custom user agents**: Per-provider user agent configuration