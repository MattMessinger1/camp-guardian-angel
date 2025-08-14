# Integration Checklists

Quick setup guides for external services. Copy/paste friendly format.

## 📱 Twilio (SMS)

**Required for phone verification and notifications**

1. **Create Messaging Service** → Add your From number
2. **Copy Messaging Service SID** → Set `TWILIO_MESSAGING_SERVICE_SID` secret
3. **Set required secrets:**
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
4. **Test:** Call `notify-parent('otp_required')` to your phone

## 📧 SendGrid (Email)

**Required for email notifications**

1. **Create API Key** (Mail Send permission) → Set `SENDGRID_API_KEY` secret
2. **Verify Single Sender** (for development)
3. **Set required secrets:**
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`
4. **Test:** Send success email from `notify-parent`

## 💳 Stripe (Payments)

**Only required if charging service fees**

1. **Get test secret key** → Set `STRIPE_SECRET_KEY` secret
2. **Optional:** Webhook endpoint → Set `STRIPE_WEBHOOK_SECRET` secret
3. **Test:** Create $1 test payment using `4242 4242 4242 4242`

## 🔒 VGS (Credential Security)

**Required for secure credential handling**

1. **Inbound Route:** 
   - Method: `POST /post`
   - Action: "Secure this payload" (redact & store fields)
   - Optional: Forward to your Edge endpoint

2. **Outbound Route:**
   - Upstream: Camp/processor host
   - Filters: REVEAL aliases server-side only

3. **Set required secrets:**
   - `VGS_VAULT_ID`
   - `VGS_ENV` (sandbox/live)
   - `VGS_COLLECT_PUBLIC_KEY`

4. **Test:** Collect dummy credentials → Verify DB has aliases, not raw data

## 🚀 Quick Test Commands

```bash
# Test SMS
curl -X POST [your-edge-function-url]/notify-parent \
  -H "Content-Type: application/json" \
  -d '{"type": "otp_required", "phone": "+1234567890"}'

# Test Email  
curl -X POST [your-edge-function-url]/notify-parent \
  -H "Content-Type: application/json" \
  -d '{"type": "success", "email": "test@example.com"}'
```

## 📋 Production Checklist

- [ ] All secrets configured in Supabase Edge Functions
- [ ] Twilio messaging service active
- [ ] SendGrid domain verified
- [ ] Stripe webhooks configured (if using payments)
- [ ] VGS routes tested and active
- [ ] Test transactions completed successfully
- [ ] Rate limiting configured
- [ ] Security audit logs enabled