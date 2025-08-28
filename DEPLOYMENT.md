# Edge Functions Deployment Guide

This guide provides step-by-step instructions for deploying the vision analysis and screenshot capture Edge Functions to Supabase.

## Prerequisites

- Node.js 16+ installed
- A Supabase project (this guide uses project ID: `ezvwyfqtyanwnoyymhav`)
- OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Basic terminal/command line knowledge

## 1. Setting up Supabase CLI

### Install Supabase CLI

```bash
# Using npm
npm install -g supabase

# Using homebrew (macOS)
brew install supabase/tap/supabase

# Using scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Verify Installation

```bash
supabase --version
```

### Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate with Supabase.

### Link Your Project

```bash
# Initialize Supabase in your project directory
supabase init

# Link to your existing Supabase project
supabase link --project-ref ezvwyfqtyanwnoyymhav
```

## 2. Setting Up Environment Secrets

### Set OpenAI API Key

```bash
# Replace sk-xxx with your actual OpenAI API key
supabase secrets set OPENAI_API_KEY=sk-proj-your-actual-api-key-here
```

### Verify Secrets

```bash
supabase secrets list
```

You should see:
```
OPENAI_API_KEY | ************************
```

## 3. Deploying Edge Functions

### Deploy Vision Analysis Function

```bash
supabase functions deploy test-vision-analysis
```

Expected output:
```
Deploying function test-vision-analysis...
Function test-vision-analysis deployed successfully.
```

### Deploy Screenshot Capture Function

```bash
supabase functions deploy capture-website-screenshot
```

Expected output:
```
Deploying function capture-website-screenshot...
Function capture-website-screenshot deployed successfully.
```

### Deploy All Functions at Once

```bash
# Deploy all functions in the supabase/functions directory
supabase functions deploy
```

## 4. Testing the Deployed Functions

### Test Vision Analysis Function

```bash
curl -X POST 'https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/test-vision-analysis' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI' \
  -H 'Content-Type: application/json' \
  -d '{
    "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77mgAAAABJRU5ErkJggg==",
    "sessionId": "test-deployment",
    "model": "gpt-4o"
  }'
```

Expected response:
```json
{
  "success": true,
  "analysis": "This appears to be a very small image...",
  "model": "gpt-4o",
  "sessionId": "test-deployment",
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 45,
    "total_tokens": 168
  }
}
```

### Test Screenshot Capture Function

```bash
curl -X POST 'https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/capture-website-screenshot' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6dnd5ZnF0eWFud25veXltaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjY5MjQsImV4cCI6MjA3MDQ0MjkyNH0.FxQZcpBxYVmnUI-yyE15N7y-ai6ADPiQV9X8szQtIjI' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://www.example.com",
    "sessionId": "test-screenshot"
  }'
```

Expected response:
```json
{
  "success": true,
  "screenshot": "data:image/png;base64,iVBORw0KGgo...",
  "url": "https://www.example.com",
  "sessionId": "test-screenshot",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "simulated": true,
  "note": "This is a simulated screenshot for testing purposes"
}
```

### Test CORS Preflight Requests

```bash
curl -X OPTIONS 'https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/test-vision-analysis' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type' \
  -H 'Origin: http://localhost:8080'
```

Expected response headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Access-Control-Allow-Methods: POST, OPTIONS
```

## 5. Monitoring and Logs

### View Function Logs

```bash
# View logs for a specific function
supabase functions logs test-vision-analysis

# Follow logs in real-time
supabase functions logs test-vision-analysis --follow
```

### Supabase Dashboard

You can also monitor your functions through the Supabase Dashboard:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions**
4. Click on a function to view logs, metrics, and settings

**Direct links for this project:**
- [Edge Functions Overview](https://supabase.com/dashboard/project/ezvwyfqtyanwnoyymhav/functions)
- [test-vision-analysis Logs](https://supabase.com/dashboard/project/ezvwyfqtyanwnoyymhav/functions/test-vision-analysis/logs)
- [capture-website-screenshot Logs](https://supabase.com/dashboard/project/ezvwyfqtyanwnoyymhav/functions/capture-website-screenshot/logs)
- [Edge Function Secrets](https://supabase.com/dashboard/project/ezvwyfqtyanwnoyymhav/settings/functions)

## 6. Troubleshooting Common Issues

### Issue: "Function not found" (404 Error)

**Symptoms:**
```json
{
  "message": "Function not found"
}
```

**Solutions:**
1. Ensure the function is deployed:
   ```bash
   supabase functions list
   ```
2. Check the function name in your URL matches exactly
3. Redeploy the function:
   ```bash
   supabase functions deploy test-vision-analysis
   ```

### Issue: "Invalid API Key" or OpenAI Authentication Errors

**Symptoms:**
```json
{
  "error": "Invalid OpenAI API Key",
  "details": "The OpenAI API key is invalid or expired. Status: 401"
}
```

**Solutions:**
1. Verify your OpenAI API key is valid at [OpenAI Platform](https://platform.openai.com/api-keys)
2. Check the secret is set correctly:
   ```bash
   supabase secrets list
   ```
3. Update the secret:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-new-key-here
   ```
4. Redeploy the function after updating secrets:
   ```bash
   supabase functions deploy test-vision-analysis
   ```

### Issue: CORS Errors in Browser

**Symptoms:**
```
Access to fetch at 'https://ezvwyfqtyanwnoyymhav.supabase.co/functions/v1/test-vision-analysis' 
from origin 'http://localhost:8080' has been blocked by CORS policy
```

**Solutions:**
1. Ensure your Edge Functions include proper CORS headers (already implemented)
2. Test CORS with curl (see testing section above)
3. Check the browser's developer console for specific CORS error details

### Issue: Rate Limiting from OpenAI

**Symptoms:**
```json
{
  "error": "Rate limiting",
  "details": "Too many requests. Wait before retrying or upgrade OpenAI plan."
}
```

**Solutions:**
1. Check your OpenAI usage at [OpenAI Platform Usage](https://platform.openai.com/usage)
2. Wait before retrying (OpenAI has per-minute and per-day limits)
3. Consider upgrading your OpenAI plan for higher limits
4. Implement request queuing in your application

### Issue: Large Screenshot/Image Errors

**Symptoms:**
```json
{
  "error": "Request entity too large"
}
```

**Solutions:**
1. Ensure images are under 50MB (Edge Functions limit)
2. Compress images before sending to the API
3. Use image compression utilities in your application
4. Consider using image URLs instead of base64 data for large images

### Issue: Function Timeout

**Symptoms:**
```json
{
  "error": "Function timeout"
}
```

**Solutions:**
1. Edge Functions have a 150-second timeout limit (for Pro+ plans)
2. Optimize your function code for performance
3. Consider breaking large operations into smaller chunks
4. Use faster OpenAI models (e.g., `gpt-4o-mini` instead of `gpt-4o`)

### Issue: Environment Variable Not Found

**Symptoms:**
```json
{
  "error": "Configuration Error",
  "details": "OPENAI_API_KEY is not configured"
}
```

**Solutions:**
1. Set the environment variable:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-api-key
   ```
2. Verify it's set:
   ```bash
   supabase secrets list
   ```
3. Redeploy the function:
   ```bash
   supabase functions deploy test-vision-analysis
   ```

## 7. Production Considerations

### Screenshot Capture in Production

The current `capture-website-screenshot` function returns mock data. For production use, consider integrating with:

- **ScreenshotAPI.net**: `https://screenshotapi.net/`
- **Browserless.io**: `https://browserless.io/`
- **Puppeteer/Playwright**: Run your own browser service
- **Browserbase**: `https://browserbase.com/` (API-based browser automation)

### Performance Optimization

1. **Use appropriate OpenAI models:**
   - `gpt-4o-mini`: Faster and cheaper for simple tasks
   - `gpt-4o`: More accurate for complex analysis

2. **Implement caching:**
   - Cache vision analysis results for identical images
   - Use Supabase database for caching

3. **Image optimization:**
   - Compress images before sending to OpenAI
   - Use appropriate image formats (PNG for screenshots, JPEG for photos)

### Security Best Practices

1. **API Key Management:**
   - Rotate OpenAI API keys regularly
   - Monitor API usage for anomalies
   - Set up billing alerts

2. **Access Control:**
   - Implement proper authentication in your application
   - Use Row Level Security (RLS) in Supabase
   - Rate limit requests from your application

3. **Error Handling:**
   - Don't expose sensitive information in error messages
   - Log errors for monitoring but sanitize logs
   - Implement proper retry logic with exponential backoff

## 8. Updating Functions

### Update Function Code

1. Modify the function code in `supabase/functions/[function-name]/index.ts`
2. Redeploy the function:
   ```bash
   supabase functions deploy [function-name]
   ```

### Update Environment Variables

```bash
# Update a secret
supabase secrets set OPENAI_API_KEY=sk-new-key

# Remove a secret
supabase secrets unset SECRET_NAME
```

### Rollback Changes

If you need to rollback a function deployment:

1. Check your git history for the previous version
2. Restore the previous code
3. Redeploy the function

```bash
git checkout HEAD~1 -- supabase/functions/test-vision-analysis/index.ts
supabase functions deploy test-vision-analysis
```

## Support Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Project Edge Functions Dashboard](https://supabase.com/dashboard/project/ezvwyfqtyanwnoyymhav/functions)

---

**Last updated:** January 2024  
**Project ID:** `ezvwyfqtyanwnoyymhav`