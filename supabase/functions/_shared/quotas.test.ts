import { describe, it, expect, beforeEach } from 'vitest';
import { checkUserQuotas, checkChildQuotas, checkIPQuotas, checkUserSessionQuotas } from '../_shared/quotas';

// Mock Supabase client
const mockSupabaseClient = {
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        gte: () => ({
          count: 'exact',
          then: (fn: Function) => fn({ count: 0, error: null })
        })
      })
    })
  })
};

describe('quotas', () => {
  beforeEach(() => {
    // Reset any quota state between tests
  });

  describe('checkUserQuotas', () => {
    it('should allow user within daily limits', async () => {
      const mockClient = {
        ...mockSupabaseClient,
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                count: 'exact',
                then: (fn: Function) => fn({ count: 5, error: null }) // Under limit
              })
            })
          })
        })
      };

      const result = await checkUserQuotas(mockClient as any, 'user123');
      expect(result.allowed).toBe(true);
      expect(result.quota_code).toBeUndefined();
    });

    it('should block user exceeding daily limits', async () => {
      const mockClient = {
        ...mockSupabaseClient,
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                count: 'exact',
                then: (fn: Function) => fn({ count: 25, error: null }) // Over limit
              })
            })
          })
        })
      };

      const result = await checkUserQuotas(mockClient as any, 'user123');
      expect(result.allowed).toBe(false);
      expect(result.quota_code).toBe('USER_DAILY_EXCEEDED');
      expect(result.message).toContain('daily limit');
    });

    it('should handle database errors gracefully', async () => {
      const mockClient = {
        ...mockSupabaseClient,
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                count: 'exact',
                then: (fn: Function) => fn({ count: null, error: new Error('DB error') })
              })
            })
          })
        })
      };

      const result = await checkUserQuotas(mockClient as any, 'user123');
      expect(result.allowed).toBe(false);
      expect(result.quota_code).toBe('QUOTA_CHECK_FAILED');
    });
  });

  describe('checkChildQuotas', () => {
    it('should allow child within weekly limits', async () => {
      const mockClient = {
        ...mockSupabaseClient,
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                count: 'exact',
                then: (fn: Function) => fn({ count: 2, error: null }) // Under limit
              })
            })
          })
        })
      };

      const result = await checkChildQuotas(mockClient as any, 'child123');
      expect(result.allowed).toBe(true);
    });

    it('should block child exceeding weekly limits', async () => {
      const mockClient = {
        ...mockSupabaseClient,
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                count: 'exact',
                then: (fn: Function) => fn({ count: 8, error: null }) // Over limit
              })
            })
          })
        })
      };

      const result = await checkChildQuotas(mockClient as any, 'child123');
      expect(result.allowed).toBe(false);
      expect(result.quota_code).toBe('CHILD_WEEKLY_EXCEEDED');
    });
  });

  describe('checkIPQuotas', () => {
    it('should allow IP within hourly limits', async () => {
      const mockClient = {
        ...mockSupabaseClient,
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                count: 'exact',
                then: (fn: Function) => fn({ count: 5, error: null })
              })
            })
          })
        })
      };

      const result = await checkIPQuotas(mockClient as any, '192.168.1.1');
      expect(result.allowed).toBe(true);
    });

    it('should block IP exceeding hourly limits', async () => {
      const mockClient = {
        ...mockSupabaseClient,
        from: () => ({
          select: () => ({
            eq: () => ({
              gte: () => ({
                count: 'exact',
                then: (fn: Function) => fn({ count: 15, error: null }) // Over limit
              })
            })
          })
        })
      };

      const result = await checkIPQuotas(mockClient as any, '192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.quota_code).toBe('IP_HOURLY_EXCEEDED');
    });

    it('should handle missing IP address', async () => {
      const result = await checkIPQuotas(mockSupabaseClient as any, null);
      expect(result.allowed).toBe(true); // Allow if no IP to check
    });
  });

  describe('checkUserSessionQuotas', () => {
    it('should allow user with under 2 children per session', async () => {
      const mockClient = {
        ...mockSupabaseClient,
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                neq: () => ({
                  count: 'exact',
                  then: (fn: Function) => fn({ count: 1, error: null })
                })
              })
            })
          })
        })
      };

      const result = await checkUserSessionQuotas(mockClient as any, 'user123', 'session456');
      expect(result.allowed).toBe(true);
    });

    it('should block user with 2 or more children per session', async () => {
      const mockClient = {
        ...mockSupabaseClient,
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                neq: () => ({
                  count: 'exact',
                  then: (fn: Function) => fn({ count: 2, error: null }) // At limit
                })
              })
            })
          })
        })
      };

      const result = await checkUserSessionQuotas(mockClient as any, 'user123', 'session456');
      expect(result.allowed).toBe(false);
      expect(result.quota_code).toBe('USER_SESSION_CAP');
      expect(result.message).toContain('at most two children per session');
    });

    it('should handle edge case of exactly 2 registrations', async () => {
      const mockClient = {
        ...mockSupabaseClient,
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                neq: () => ({
                  count: 'exact',
                  then: (fn: Function) => fn({ count: 2, error: null })
                })
              })
            })
          })
        })
      };

      const result = await checkUserSessionQuotas(mockClient as any, 'user123', 'session456');
      expect(result.allowed).toBe(false);
      expect(result.quota_code).toBe('USER_SESSION_CAP');
    });
  });

  describe('quota integration', () => {
    it('should handle multiple quota checks', async () => {
      // Test scenario where user passes some checks but fails others
      const mockClientUserOk = {
        ...mockSupabaseClient,
        from: (table: string) => {
          if (table === 'reservations') {
            return {
              select: () => ({
                eq: () => ({
                  gte: () => ({
                    count: 'exact',
                    then: (fn: Function) => fn({ count: 5, error: null }) // Under user limit
                  }),
                  eq: () => ({
                    neq: () => ({
                      count: 'exact', 
                      then: (fn: Function) => fn({ count: 2, error: null }) // At session limit
                    })
                  })
                })
              })
            };
          }
          return mockSupabaseClient.from(table);
        }
      };

      const userResult = await checkUserQuotas(mockClientUserOk as any, 'user123');
      const sessionResult = await checkUserSessionQuotas(mockClientUserOk as any, 'user123', 'session456');

      expect(userResult.allowed).toBe(true);
      expect(sessionResult.allowed).toBe(false);
    });

    it('should provide meaningful error messages', async () => {
      const checks = [
        { fn: checkUserQuotas, args: ['user123'], expectedCode: 'USER_DAILY_EXCEEDED' },
        { fn: checkChildQuotas, args: ['child123'], expectedCode: 'CHILD_WEEKLY_EXCEEDED' },
        { fn: checkIPQuotas, args: ['192.168.1.1'], expectedCode: 'IP_HOURLY_EXCEEDED' },
        { fn: checkUserSessionQuotas, args: ['user123', 'session456'], expectedCode: 'USER_SESSION_CAP' }
      ];

      for (const check of checks) {
        const mockClient = {
          ...mockSupabaseClient,
          from: () => ({
            select: () => ({
              eq: () => ({
                gte: () => ({
                  count: 'exact',
                  then: (fn: Function) => fn({ count: 999, error: null }),
                  eq: () => ({
                    neq: () => ({
                      count: 'exact',
                      then: (fn: Function) => fn({ count: 999, error: null })
                    })
                  })
                })
              })
            })
          })
        };

        const result = await check.fn(mockClient as any, ...check.args);
        expect(result.allowed).toBe(false);
        expect(result.quota_code).toBe(check.expectedCode);
        expect(result.message).toBeTruthy();
      }
    });
  });
});