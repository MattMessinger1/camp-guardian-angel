# VGS Bypass Mode for Development Testing

## ⚠️ SECURITY WARNING
**VGS_BYPASS_MODE should NEVER be used in production environments!**

This mode is designed for development testing only and bypasses all VGS security measures.

## What VGS Bypass Mode Does

When `VGS_BYPASS_MODE=true` is set:

1. **Skips VGS credential retrieval** - No API calls to VGS
2. **Uses mock test credentials** for all provider registrations
3. **Enables full registration flow testing** without VGS setup
4. **Provides clear security warnings** in logs

## Test Credentials Used

```json
{
  "username": "test_user@example.com",
  "password": "test_password_123",
  "payment": {
    "card_number": "4111111111111111",
    "card_exp": "12/25", 
    "card_cvc": "123",
    "card_holder": "Test Parent"
  },
  "payment_type": "credit_card",
  "amount_strategy": "full_amount"
}
```

## How to Enable

1. **Add secret in Supabase:**
   ```
   VGS_BYPASS_MODE=true
   ```

2. **Restart edge functions** (automatic in Lovable)

3. **Look for warning logs:**
   ```
   🚨 VGS_BYPASS_MODE is ACTIVE - Using test credentials
   ⚠️ SECURITY WARNING: This mode should NEVER be used in production!
   ```

## What You Can Test

✅ **Full registration flow** - Submit child registrations
✅ **Provider adapter logic** - Test Jackrabbit, PlayMetrics, etc.
✅ **Payment processing simulation** - Mock card payments
✅ **Error handling and retries** - Test failure scenarios
✅ **User experience workflows** - End-to-end testing
✅ **Database operations** - Registration records, status updates

❌ **Real credential security** - No actual VGS tokenization
❌ **Production payment processing** - Mock payments only
❌ **Live provider integration** - Simulated responses

## Production Migration Checklist

Before going live, you MUST:

- [ ] Set `VGS_BYPASS_MODE=false` (or remove entirely)
- [ ] Configure all VGS routes and credentials
- [ ] Test real credential tokenization
- [ ] Verify no test credentials in logs
- [ ] Confirm all sensitive data is properly secured

## Monitoring Bypass Mode

Watch for these log messages to confirm bypass is active:

```
🚨 [REGISTER-SESSION] VGS_BYPASS_MODE is ACTIVE
⚠️  [REGISTER-SESSION] SECURITY WARNING: Never use in production!
```

If you see these in production logs, immediately disable bypass mode.