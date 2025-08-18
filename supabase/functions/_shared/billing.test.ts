import { describe, it, expect, beforeEach, vi } from 'vitest';
import { captureSuccessFeeOrThrow } from '../_shared/billing';

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    create: vi.fn(),
    retrieve: vi.fn()
  }
};

// Mock Supabase client
const mockSupabaseClient = {
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
        maybeSingle: () => Promise.resolve({ data: null, error: null })
      })
    }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({
      eq: () => Promise.resolve({ data: null, error: null })
    })
  })
};

describe('billing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('captureSuccessFeeOrThrow', () => {
    it('should capture success fee on first call', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 2000 // $20.00
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const mockClientFirstCall = {
        ...mockSupabaseClient,
        from: (table: string) => {
          if (table === 'success_fee_captures') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }) // No existing capture
                })
              }),
              insert: () => Promise.resolve({ data: { id: 'capture123' }, error: null })
            };
          }
          return mockSupabaseClient.from(table);
        }
      };

      const result = await captureSuccessFeeOrThrow(
        mockClientFirstCall as any,
        mockStripe as any,
        'reservation123',
        'customer_test',
        2000
      );

      expect(result.captured).toBe(true);
      expect(result.payment_intent_id).toBe('pi_test123');
      expect(result.already_captured).toBe(false);
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 2000,
        currency: 'usd',
        customer: 'customer_test',
        metadata: {
          type: 'success_fee',
          reservation_id: 'reservation123'
        },
        description: 'Success fee for reservation reservation123'
      });
    });

    it('should return existing capture on second call (idempotent)', async () => {
      const existingCapture = {
        id: 'existing_capture',
        reservation_id: 'reservation123',
        stripe_payment_intent_id: 'pi_existing123',
        amount_cents: 2000,
        status: 'succeeded',
        created_at: new Date().toISOString()
      };

      const mockClientSecondCall = {
        ...mockSupabaseClient,
        from: (table: string) => {
          if (table === 'success_fee_captures') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: existingCapture, error: null })
                })
              })
            };
          }
          return mockSupabaseClient.from(table);
        }
      };

      const result = await captureSuccessFeeOrThrow(
        mockClientSecondCall as any,
        mockStripe as any,
        'reservation123',
        'customer_test',
        2000
      );

      expect(result.captured).toBe(true);
      expect(result.payment_intent_id).toBe('pi_existing123');
      expect(result.already_captured).toBe(true);
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
    });

    it('should handle Stripe payment failures', async () => {
      const stripeError = new Error('Card declined');
      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      const mockClientFailure = {
        ...mockSupabaseClient,
        from: (table: string) => {
          if (table === 'success_fee_captures') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null })
                })
              }),
              insert: () => Promise.resolve({ data: null, error: null })
            };
          }
          return mockSupabaseClient.from(table);
        }
      };

      await expect(captureSuccessFeeOrThrow(
        mockClientFailure as any,
        mockStripe as any,
        'reservation123',
        'customer_test',
        2000
      )).rejects.toThrow('Card declined');
    });

    it('should handle database insertion failures', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 2000
      };

      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const mockClientDbError = {
        ...mockSupabaseClient,
        from: (table: string) => {
          if (table === 'success_fee_captures') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null })
                })
              }),
              insert: () => Promise.resolve({ 
                data: null, 
                error: new Error('Database constraint violation') 
              })
            };
          }
          return mockSupabaseClient.from(table);
        }
      };

      await expect(captureSuccessFeeOrThrow(
        mockClientDbError as any,
        mockStripe as any,
        'reservation123',
        'customer_test',
        2000
      )).rejects.toThrow('Database constraint violation');
    });

    it('should handle concurrent calls gracefully', async () => {
      // Simulate race condition where two calls happen simultaneously
      const mockPaymentIntent = {
        id: 'pi_test123',
        status: 'succeeded',
        amount: 2000
      };

      let callCount = 0;
      mockStripe.paymentIntents.create.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(mockPaymentIntent);
        } else {
          // Second call should see existing record
          throw new Error('Should not create second payment');
        }
      });

      const existingCapture = {
        id: 'existing_capture',
        reservation_id: 'reservation123',
        stripe_payment_intent_id: 'pi_test123',
        amount_cents: 2000,
        status: 'succeeded'
      };

      let dbCallCount = 0;
      const mockClientRace = {
        ...mockSupabaseClient,
        from: (table: string) => {
          if (table === 'success_fee_captures') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: () => {
                    dbCallCount++;
                    if (dbCallCount === 1) {
                      return Promise.resolve({ data: null, error: null }); // First call: no existing
                    } else {
                      return Promise.resolve({ data: existingCapture, error: null }); // Second call: existing
                    }
                  }
                })
              }),
              insert: () => Promise.resolve({ data: { id: 'capture123' }, error: null })
            };
          }
          return mockSupabaseClient.from(table);
        }
      };

      // First call should create
      const result1 = await captureSuccessFeeOrThrow(
        mockClientRace as any,
        mockStripe as any,
        'reservation123',
        'customer_test',
        2000
      );

      // Second call should return existing
      const result2 = await captureSuccessFeeOrThrow(
        mockClientRace as any,
        mockStripe as any,
        'reservation123',
        'customer_test',
        2000
      );

      expect(result1.captured).toBe(true);
      expect(result1.already_captured).toBe(false);
      expect(result2.captured).toBe(true);
      expect(result2.already_captured).toBe(true);
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledTimes(1);
    });

    it('should validate input parameters', async () => {
      await expect(captureSuccessFeeOrThrow(
        mockSupabaseClient as any,
        mockStripe as any,
        '', // Invalid reservation_id
        'customer_test',
        2000
      )).rejects.toThrow();

      await expect(captureSuccessFeeOrThrow(
        mockSupabaseClient as any,
        mockStripe as any,
        'reservation123',
        '', // Invalid customer_id
        2000
      )).rejects.toThrow();

      await expect(captureSuccessFeeOrThrow(
        mockSupabaseClient as any,
        mockStripe as any,
        'reservation123',
        'customer_test',
        0 // Invalid amount
      )).rejects.toThrow();
    });

    it('should handle different payment statuses correctly', async () => {
      const scenarios = [
        { status: 'succeeded', shouldSucceed: true },
        { status: 'requires_action', shouldSucceed: false },
        { status: 'processing', shouldSucceed: false },
        { status: 'failed', shouldSucceed: false }
      ];

      for (const scenario of scenarios) {
        const mockPaymentIntent = {
          id: 'pi_test123',
          status: scenario.status,
          amount: 2000
        };

        mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

        const mockClientStatus = {
          ...mockSupabaseClient,
          from: (table: string) => {
            if (table === 'success_fee_captures') {
              return {
                select: () => ({
                  eq: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null })
                  })
                }),
                insert: () => Promise.resolve({ data: { id: 'capture123' }, error: null })
              };
            }
            return mockSupabaseClient.from(table);
          }
        };

        if (scenario.shouldSucceed) {
          const result = await captureSuccessFeeOrThrow(
            mockClientStatus as any,
            mockStripe as any,
            'reservation123',
            'customer_test',
            2000
          );
          expect(result.captured).toBe(true);
        } else {
          await expect(captureSuccessFeeOrThrow(
            mockClientStatus as any,
            mockStripe as any,
            'reservation123',
            'customer_test',
            2000
          )).rejects.toThrow();
        }
      }
    });
  });
});