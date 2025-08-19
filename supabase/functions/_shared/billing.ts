/**
 * Centralized Billing Helper
 * 
 * Handles all Stripe operations for payment method requirements and success fees.
 * Single source of truth for billing logic - no Stripe calls should be duplicated elsewhere.
 */

import Stripe from "https://esm.sh/stripe@14.21.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") as string, {
  apiVersion: "2023-10-16",
});

/**
 * Get or create a Stripe customer for a user
 * @param userId The Supabase user ID
 * @param email The user's email address
 * @returns Promise<{ customerId: string }>
 */
export async function getOrCreateCustomer(userId: string, email: string): Promise<{ customerId: string }> {
  console.log(`[BILLING] Getting or creating customer for user ${userId}`);
  
  // First, try to find existing customer by email
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1
  });

  if (existingCustomers.data.length > 0) {
    const customerId = existingCustomers.data[0].id;
    console.log(`[BILLING] Found existing customer: ${customerId}`);
    return { customerId };
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: email,
    metadata: {
      supabase_user_id: userId
    }
  });

  console.log(`[BILLING] Created new customer: ${customer.id}`);
  return { customerId: customer.id };
}

/**
 * Require that a user has a saved payment method, throw if not
 * @param userId The Supabase user ID
 * @param email The user's email address
 * @throws Error with code 'NO_PM' if no default payment method found
 */
export async function requirePaymentMethodOrThrow(userId: string, email: string): Promise<void> {
  console.log(`[BILLING] Checking payment method requirement for user ${userId}`);
  
  const { customerId } = await getOrCreateCustomer(userId, email);
  
  // Get customer with default payment method
  const customer = await stripe.customers.retrieve(customerId);
  
  if (!customer.invoice_settings?.default_payment_method) {
    console.log(`[BILLING] No default payment method found for customer ${customerId}`);
    const error = new Error("Payment method required");
    (error as any).code = 'NO_PM';
    throw error;
  }

  console.log(`[BILLING] Payment method verified for customer ${customerId}`);
}

/**
 * Capture a $20 success fee (idempotent)
 * @param params Object with reservationId, customerId, and optional amountCents
 * @throws Error if capture fails
 */
export async function captureSuccessFeeOrThrow({
  reservationId,
  customerId,
  amountCents = 2000
}: {
  reservationId: string;
  customerId: string;
  amountCents?: number;
}): Promise<{ paymentIntentId: string }> {
  console.log(`[BILLING] Capturing success fee for reservation ${reservationId}, customer ${customerId}, amount ${amountCents}`);
  
  const idempotencyKey = `success-fee:${reservationId}`;
  
  try {
    // Create payment intent with idempotency key
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      payment_method: undefined, // Will use customer's default
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      description: `Success fee for reservation ${reservationId}`,
      metadata: {
        reservation_id: reservationId,
        fee_type: 'success_fee'
      }
    }, {
      idempotencyKey: idempotencyKey
    });

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment intent status: ${paymentIntent.status}`);
    }

    console.log(`[BILLING] Success fee captured: ${paymentIntent.id}`);
    return { paymentIntentId: paymentIntent.id };
    
  } catch (error) {
    console.error(`[BILLING] Failed to capture success fee for reservation ${reservationId}:`, error);
    throw error;
  }
}

/**
 * Create a Setup Intent for adding a payment method
 * @param customerId The Stripe customer ID
 * @returns Promise<{ clientSecret: string }>
 */
export async function createSetupIntent(customerId: string): Promise<{ clientSecret: string }> {
  console.log(`[BILLING] Creating setup intent for customer ${customerId}`);
  
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session'
  });

  console.log(`[BILLING] Setup intent created: ${setupIntent.id}`);
  return { clientSecret: setupIntent.client_secret! };
}

/**
 * Validate billing configuration
 * @throws Error if Stripe key is missing
 */
export function validateBillingConfig(): void {
  if (!Deno.env.get("STRIPE_SECRET_KEY")) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }
}