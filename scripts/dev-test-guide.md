# Dev Mode Testing Guide

## Quick Start - Run All Tests

```bash
# Make scripts executable
chmod +x scripts/test-all.sh scripts/test-readiness-features.sh

# Run everything (takes ~5-10 minutes)
./scripts/test-all.sh

# Run just the new readiness features (takes ~2 minutes)
./scripts/test-readiness-features.sh

# Fast mode for quick validation
./scripts/test-all.sh --fast

# Debug mode - opens Playwright UI on failures
./scripts/test-all.sh --debug
```

## Dev Mode Testing in Lovable

### 1. Enable Dev Mode
- Click the settings/gear icon in Lovable
- Enable "Developer Mode" 
- This gives you access to console, network, and database tabs

### 2. Test Ready for Signup Features

#### Pre-Public Camp Testing:
```javascript
// In console tab, test camp watch creation:
const campWatch = await supabase.functions.invoke('create-camp-watch', {
  body: {
    session_id: 'test-session-id',
    parent_email: 'test@example.com',
    notification_preferences: {
      email: true,
      sms: false,
      days_notice: 7
    }
  }
})
console.log('Camp watch result:', campWatch)
```

#### Payment Authorization Testing:
```javascript
// Test payment setup
const paymentSetup = await supabase.functions.invoke('create-payment-setup', {
  body: {
    return_url: window.location.origin + '/billing-setup-success',
    cancel_url: window.location.origin + '/billing-setup-cancelled'
  }
})
console.log('Payment setup:', paymentSetup)
```

### 3. Database Testing
Use the database tab to:
```sql
-- Check camp watch requests
SELECT * FROM camp_watch_requests ORDER BY created_at DESC LIMIT 5;

-- Check preparation reminders
SELECT * FROM preparation_reminders WHERE sent_at IS NULL;

-- Check user readiness status
SELECT * FROM user_session_readiness WHERE status = 'ready_for_signup';
```

### 4. Network Tab Testing
- Watch for API calls to edge functions
- Check response status codes (200 = success, 402 = payment required)
- Monitor Supabase function invocations

## Fastest Testing Approach

1. **Start with automated tests** (2-3 minutes):
   ```bash
   ./scripts/test-readiness-features.sh
   ```

2. **Manual UI testing** (2-3 minutes):
   - Go to `/sessions` in preview
   - Find pre-public camp, click "Get Ready for Signup"
   - Test Camp Watch Modal
   - Verify Preparation Guide

3. **Debug issues immediately**:
   - Use Dev Mode console for errors
   - Check network tab for failed requests
   - Query database directly for data issues

## Common Issues & Quick Fixes

- **Database errors**: Check if migration ran successfully
- **Payment errors**: Verify Stripe test keys are set
- **Function errors**: Check console for detailed error messages
- **UI issues**: Check React error boundary and component logs

Total testing time: **5-10 minutes** for comprehensive validation.