# MVP E2E Checklist (Living Doc)

How to run:
- All MVP tests: `npm run test:mvp`
- Single file: `npx playwright test tests/<file>.spec.ts`
- Debug a failure: `npx playwright test tests/<file>.spec.ts --debug`
- HTML report: `npx playwright show-report`

## Current test files & status
- [x] `tests/smoke.spec.ts` — homepage loads
- [x] `tests/session-cards.spec.ts` — session list/search visible
- [x] `tests/reservation-form.spec.ts` — reservation form visible
- [x] `tests/stripe-payment-flow.spec.ts` — saved payment UI visible (mock ok)
- [x] `tests/manual-backup.spec.ts` — manual-backup page visible

## Minimal test IDs to add
- Session list: `data-testid="session-card"`
- Reservation form (/reservation-holds): `reserve-session-id`, `reserve-email`, `reserve-age`, `reserve-submit`, success `reserve-success`
- Payment (mock ok): `billing-setup-cta`, `saved-pm-badge`
- Manual backup (/manual-backup/:id): `failure-reason`, `manual-backup-link`

## Unskip strategy
1. Implement page/IDs.
2. Debug with `--debug`.
3. When green, unskip in `tests/mvp-workflow.spec.ts`.
