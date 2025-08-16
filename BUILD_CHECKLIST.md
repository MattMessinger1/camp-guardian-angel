# Build Validation Checklist

This checklist is automatically validated during CI/CD. **Build will fail if any items are not met.**

## Pre-Commit Validation ✅

- [ ] **Duplicate Detection**: `scripts/check-duplicates.js` passes without errors
- [ ] **PR Checklist**: All mandatory items in `PR_CHECKLIST.md` are checked
- [ ] **Component Reuse**: No new helpers duplicate existing functionality
- [ ] **Symbol Uniqueness**: No conflicting export names across modules

## Architecture Standards ✅

- [ ] **Fetching**: Uses `publicDataFetcher` or `enhanced-fetch` (not custom fetch)
- [ ] **Logging**: Uses centralized logging from `_shared/logging.ts`
- [ ] **Cards**: Uses existing Card components from `src/components/ui/card.tsx`
- [ ] **Environment**: Uses `getConfig()` from `supabase/functions/_shared/env.ts`
- [ ] **Rate Limiting**: Uses `rateLimiter` from `src/lib/fetcher/rateLimiter.ts`
- [ ] **Robots.txt**: Uses `robotsChecker` from `src/lib/fetcher/robotsChecker.ts`

## Automated Checks ✅

- [ ] **Linting**: ESLint passes without errors
- [ ] **Type Checking**: TypeScript compilation succeeds
- [ ] **Test Suite**: All existing tests continue to pass
- [ ] **Security Scan**: No new security vulnerabilities introduced

---

**⚠️ CRITICAL**: These checks are enforced by automation. Manual bypassing will result in immediate rollback.

**🔄 FIRST RULE**: Always check existing components before writing new ones.