# Pull Request Checklist

## Code Reuse Requirements ✅

**MANDATORY**: All boxes must be checked before merge. Build will fail if any are unchecked.

### Existing Component Reuse
- [ ] **Fetching**: Reused existing `publicDataFetcher` or `enhanced-fetch` function instead of creating new HTTP clients
- [ ] **Logging**: Reused existing logging utilities instead of creating new console.log patterns  
- [ ] **Cards**: Reused existing Card components from `src/components/ui/card.tsx` for any UI cards
- [ ] **Environment**: Reused existing env utilities from `supabase/functions/_shared/env.ts` for feature flags
- [ ] **Session Extraction**: Reused existing `useSessionExtraction` hook or `extract-session` function
- [ ] **Rate Limiting**: Reused existing `rateLimiter` from `src/lib/fetcher/rateLimiter.ts`
- [ ] **Robots.txt**: Reused existing `robotsChecker` from `src/lib/fetcher/robotsChecker.ts`

### Anti-Duplication Verification  
- [ ] **No Duplicate Helpers**: Confirmed no new files duplicate existing helper functions by name or purpose
- [ ] **No Parallel Implementations**: No creation of `_v2`, `_new`, or similar suffixed versions of existing functionality
- [ ] **Symbol Uniqueness**: No export symbol names conflict with existing exports across the codebase
- [ ] **Pre-commit Passed**: The `scripts/check-duplicates.js` pre-commit hook passes successfully

### Architecture Cleanliness
- [ ] **Single Responsibility**: Each new file/function has a single, clear responsibility
- [ ] **Proper Imports**: All imports use existing barrel exports (`src/lib/fetcher/index.ts`, etc.)
- [ ] **Consistent Patterns**: New code follows existing patterns for similar functionality
- [ ] **No Dead Code**: Removed any unused imports, functions, or files

## Functional Requirements
- [ ] **Feature Works**: The primary feature/fix works as intended
- [ ] **Tests Pass**: All existing tests continue to pass
- [ ] **No Breaking Changes**: Existing functionality is not broken by changes
- [ ] **Error Handling**: Proper error handling is implemented for new code paths

## Security & Quality
- [ ] **Security Review**: No new security vulnerabilities introduced
- [ ] **Performance**: No obvious performance regressions
- [ ] **Accessibility**: UI changes maintain accessibility standards
- [ ] **Mobile Responsive**: UI changes work on mobile devices

---

**⚠️ CRITICAL**: This checklist is validated by automated tools. Merging without completing these items will result in build failures and potential rollback.

**🔄 REUSE FIRST**: Before writing new code, always check if existing components can be extended or configured to meet your needs.