# CGA Reservation System - QA Testing Checklist

## Pre-Test Setup ✅
- [ ] Ensure STRIPE_SECRET_KEY is configured in test mode
- [ ] Verify AUTOMATION_CALLBACK_SECRET is set: `cga_callback_2024_x9K2mP8nQ7wE5rY3vL6zF4jH1sA9dG8bN5cM`
- [ ] Confirm RECAPTCHA_SECRET_KEY is configured
- [ ] Check Twilio credentials are set for SMS testing
- [ ] Verify database has seeded sessions available

## Test Flow 1: API Platform (Immediate Success) 🚀

### Step 1: Initiate Reservation
- [ ] Navigate to search results page
- [ ] Pick a session with `platform = "jackrabbit_class"` or similar API platform
- [ ] Click **Reserve** button
- [ ] Verify ReserveModal opens correctly

### Step 2: Complete Reservation Form
- [ ] Fill in parent details:
  - [ ] Name: "Test Parent"
  - [ ] Email: "test@example.com" 
  - [ ] Phone: "+15551234567"
- [ ] Fill in child details:
  - [ ] Name: "Test Child"
  - [ ] DOB: Valid date
- [ ] Click **Reserve** button

### Step 3: Stripe Payment Authorization
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Complete Stripe payment form
- [ ] Verify authorization succeeds
- [ ] Check that reCAPTCHA v3 executes automatically

### Step 4: Verify Immediate Success
- [ ] Expect alert: "Success! Your spot is reserved."
- [ ] Modal should close automatically

### Step 5: Database Verification
- [ ] Check `reservations` table:
  - [ ] Status = "confirmed"
  - [ ] `stripe_payment_intent_id` populated
  - [ ] `provider_response` contains success data
- [ ] Check `parents` table has new entry
- [ ] Check `children` table has new entry
- [ ] Verify RLS: Try accessing other users' data (should fail)

### Step 6: Stripe Dashboard Verification
- [ ] Login to Stripe test dashboard
- [ ] Find the PaymentIntent
- [ ] Verify status = "succeeded" (captured)
- [ ] Verify amount = $20.00

## Test Flow 2: Non-API Platform (SMS Fallback) 📱

### Step 1: Initiate Reservation
- [ ] Pick a session with `platform = "daysmart_recreation"` or non-API platform
- [ ] Complete reservation form (same as above)
- [ ] Use Stripe test card: `4242 4242 4242 4242`

### Step 2: Verify Needs User Action
- [ ] Expect alert: "Quick verification sent via SMS..."
- [ ] Modal should close
- [ ] Check your phone for SMS message

### Step 3: SMS Verification Flow
- [ ] Receive SMS with 6-digit code and /verify link
- [ ] Navigate to `/verify?rid=<reservation_id>` (from SMS link)
- [ ] Enter the 6-digit code from SMS
- [ ] Click **Submit**
- [ ] Verify success message: "Verified! We're finalizing your signup."

### Step 4: Database Verification  
- [ ] Check `reservations` table:
  - [ ] Status = "pending" 
  - [ ] `stripe_payment_intent_id` populated but not captured yet
- [ ] Check `sms_verifications` table:
  - [ ] Entry exists for reservation
  - [ ] `used_at` timestamp populated after verification
  - [ ] `code_hash` stored (not plain text)

### Step 5: Stripe Verification
- [ ] Check Stripe dashboard
- [ ] PaymentIntent status = "requires_capture" (authorized but not captured)

## Test Flow 3: Automation Callback Success ✅

### Step 1: Simulate Successful Callback
```bash
curl -X POST https://your-project.supabase.co/functions/v1/reserve-callback \
  -H "Content-Type: application/json" \
  -H "x-cga-callback-secret: cga_callback_2024_x9K2mP8nQ7wE5rY3vL6zF4jH1sA9dG8bN5cM" \
  -d '{
    "reservation_id": "<your-reservation-id>",
    "success": true,
    "provider_response": {"confirmation": "ABC123"}
  }'
```

### Step 2: Verify Success Outcome
- [ ] API returns `{"ok": true, "status": "confirmed"}`
- [ ] Check `reservations` table: status = "confirmed"
- [ ] Check Stripe: PaymentIntent captured (status = "succeeded")

## Test Flow 4: Automation Callback Failure ❌

### Step 1: Simulate Failed Callback
```bash
curl -X POST https://your-project.supabase.co/functions/v1/reserve-callback \
  -H "Content-Type: application/json" \
  -H "x-cga-callback-secret: cga_callback_2024_x9K2mP8nQ7wE5rY3vL6zF4jH1sA9dG8bN5cM" \
  -d '{
    "reservation_id": "<your-reservation-id>",
    "success": false,
    "provider_response": {"error": "Session full"}
  }'
```

### Step 2: Verify Failure Outcome
- [ ] API returns `{"ok": true, "status": "failed"}`
- [ ] Check `reservations` table: status = "failed"
- [ ] Check Stripe: PaymentIntent canceled
- [ ] Verify refund issued (if applicable)

## Security & RLS Testing 🔒

### Step 1: PII Protection Verification
- [ ] Open browser dev tools → Network tab
- [ ] Complete a reservation flow
- [ ] Verify NO PII visible in client-side requests/responses
- [ ] Check that only reservation IDs and public data are exposed

### Step 2: RLS Policy Testing
- [ ] Create test reservations for different users
- [ ] Try to query other users' data via Supabase client
- [ ] Verify access denied (RLS working correctly)
- [ ] Test `parents` and `children` tables are properly protected

### Step 3: Authentication Testing
- [ ] Test reservation flow without authentication (should work - guest reservations)
- [ ] Verify proper data isolation

## Logging & Observability 📊

### Step 1: Check Function Logs
- [ ] **reserve-init**: Verify structured logging with session_id, parent_email, reservation_id, PI id
- [ ] **reserve-execute**: Check platform, mode, result logging
- [ ] **reserve-callback**: Verify success/failure logging
- [ ] **sms-send**: Check send success/failure logs
- [ ] **sms-verify**: Verify verification attempt logs

### Step 2: Error Scenarios
- [ ] Test invalid reservation_id → proper error logging
- [ ] Test expired SMS codes → proper error handling
- [ ] Test invalid reCAPTCHA → proper rejection
- [ ] Test missing required fields → validation errors

## Success Criteria Summary ✨

### ✅ **Core Functionality**
- [ ] End-to-end reservation flow completes successfully
- [ ] Manual payment capture only on confirmed reservations
- [ ] Automatic payment cancellation on failures

### ✅ **Security & Privacy**
- [ ] reCAPTCHA v3 verification working on execute
- [ ] No PII exposed client-side beyond user input
- [ ] RLS policies properly protecting sensitive data

### ✅ **SMS Fallback System**
- [ ] SMS verification flow working end-to-end
- [ ] Code generation, delivery, and verification functional
- [ ] Proper expiration and single-use enforcement

### ✅ **Automation Integration**
- [ ] Callback authentication working
- [ ] Status transitions updating correctly
- [ ] Stripe capture/cancel triggered appropriately

### ✅ **Observability**
- [ ] Comprehensive structured logging in place
- [ ] Error scenarios properly logged and handled
- [ ] Ready for monitoring and alerts

---

## Known Issues & TODOs 🚧
- [ ] TODO: Implement PI timeout alerts (7 days)
- [ ] TODO: Add repeated failure alerts per platform
- [ ] TODO: Set up AUTOMATION_WEBHOOK_URL for live automation testing

---

**Testing Complete**: Date: _______ | Tester: _______ | Status: PASS/FAIL