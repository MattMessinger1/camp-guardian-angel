# Figma Design Brief — Search & Reserve (MVP)
**Project:** Camp Guardian Angel (CGA)  
**Date:** 2025-08-15  
**Scope:** End-to-end **Search → Reserve** experience, including minimal component library, states, accessibility, and responsive behavior. This brief consolidates all prior search and /reserve briefs into one source of truth.

---

## 1) Objectives
- Make camp discovery and signup feel **instant**: minimal inputs, clear progress, and zero dead-ends.
- **Search** should return scannable, grouped results with strong semantics (date, availability, price, platform), and offer a graceful "Add a session" fallback.
- **Reserve** should finish with **$20 hold only captured on success**, and handle three outcomes cleanly: **confirmed**, **pending (automation)**, **needs user action (SMS/OTP)**.
- Align with engineering spec: sticky bar, grouped cards, Stripe manual capture, reCAPTCHA v3, SMS fallback, API-first with automation fallback.

---

## 2) User Flows (MVP)
1) **Search** → Type query, refine (city/dates/platform), scan grouped cards, click **Reserve**.  
2) **Reserve, Step 1 (Details)** → Parent & child minimal info; fee policy visible.  
3) **Step 2 (Payment Auth)** → Card/wallet authorize (manual capture).  
4) **Execute** → Booking in background → one of: **Confirmed** | **Pending** | **Needs user action**.  
5) **Needs user action** → SMS link or **Verify** page (OTP).  
6) **Success** → Confirmation, provider ref (if available), add to calendar, share.

---

## 3) Frames to Deliver (MVP)

### 3.1 Search
**S1 — Search Results (Default)**
- Sticky search bar (below existing step 1-2-3 section).
- Inputs: Query, City, Start date, End date, Platform select; "Search" button.
- Cards **grouped by Activity**; each card shows up to 3 upcoming **Session rows**.
- Each Session row shows: **Start date/time**, **Availability**, **Price**, **Platform badge**, **Reserve** CTA.
- Filter **chips** appear when filters are active; "Clear all" control.
- **Skeleton loaders** for card/row while fetching; empty vs error state patterns.

**S2 — Empty State (No results)**
- Friendly message + **"Add a session"** CTA.  
- Explain we can attempt reservations from a provider link.

**S3 — Add-a-Session Modal**
- Fields: Camp/Activity name, Session date(s), Provider link (URL), Notes.  
- Primary: **Submit** (sends to CGA to attempt). Secondary: Cancel.

**S4 — Result Variants**
- Availability tokens: **Open**, **Waitlist** ("Join waitlist" CTA), **Full** (disabled with tooltip).  
- Price display rules: single price, range, unknown ("—").

### 3.2 Reserve
**R1 — Reserve Modal (Step 1: Details)**
- Fields: Parent {Name, Email, Phone}, Child {Name, DOB}.  
- Copy: "**You'll only be charged if we secure your spot.**" (short fee policy).  
- Footer: Primary **Reserve**, Secondary Cancel; small links: Privacy, Terms.  
- Validation hints inline; keep form minimal and stacked.

**R2 — Payment Authorization (Step 2)**
- Stripe Payment Element or card fields; **Apple Pay / Google Pay** badges when available.  
- Copy: "**$20 hold; captured only on success.**"  
- 3DS challenge state (modal/redirect) with return success/error variants.

**R3 — Execute / In-Progress**
- Inline progress ("We're booking your spot…").  
- Variants:  
  - **Confirmed:** Success check + session details + provider ref (if available).  
  - **Pending:** Info state ("Finishing up in the background; we'll notify you").  
  - **Needs user action:** Banner explaining SMS sent with link/code; **Open Verify** CTA.

**R4 — Needs User Action (Banner/Modal)**
- Explainer: "Quick verification to finish."  
- Buttons: **Open Verify**, **Resend SMS**; note TCPA consent: "One-time verification text; msg/data rates may apply."  
- reCAPTCHA notice ("Protected by reCAPTCHA") + Privacy/Terms links (small, subtle).

**R5 — SMS Verify Page**
- 6-digit OTP input (6 boxes, auto-advance, paste entire code).  
- States: idle, invalid/expired (error messaging), success.  
- Help: "Didn't get a code? **Resend** · **Change number**."

**R6 — Success Screen**
- Clear success with: Session title, dates, location, platform.  
- Actions: **Add to Calendar**, **Share**, **Find more sessions**.  
- Small print: "$20 captured · Receipt emailed."

**R7 — Error States**
- Provider down, timeout, card declined.  
- Recovery CTAs: **Try another date**, **Retry**, **Contact support**.

---

## 4) Components & Tokens (MVP)
- **Buttons:** Primary / Secondary / Destructive; sizes (md, lg); states (default, hover, focus, loading, disabled).  
- **Inputs:** Text, Email, Phone, Date; inline validation; `aria-describedby` for errors.  
- **Select / Chips:** Platform select; filter chips with close "×"; "Clear all" pattern.  
- **Badges:** Platform (Active, Sawyer, CampMinder), Availability (Open/Waitlist/Full).  
- **Toasts:** success / info / error; auto-dismiss 3–5s; live-region friendly.  
- **Modal/Sheet:** Reserve modal as desktop dialog; mobile bottom sheet variant.  
- **Skeletons:** Card and row skeletons for Search results.  
- **Icons:** check, info, warning, spinner (use existing icon set).  
- **Motion:** 150–200ms ease-in-out; provide reduced-motion variants.  
- **Design Tokens:**  
  - Spacing scale (4, 8, 12, 16, 24, 32).  
  - Type scale (caption, body, body-strong, h3, h2).  
  - Border radius **2xl** for cards/buttons; subtle shadow on cards.  
  - Color semantics: Availability (Open=positive, Waitlist=warning, Full=neutral/disabled).  
  - Avoid third-party logos on badges (generic label styling only).

---

## 5) Microcopy Pack (ready-to-use)
- **Fee policy (short):** "You'll only be charged if we secure your spot."  
- **Execute:** "We're booking your spot… this usually takes a few seconds."  
- **Success:** "You're in! We reserved your spot."  
- **Pending:** "Almost done—finishing your signup in the background."  
- **Needs action:** "We texted you a 6-digit code to finish. Tap the link or enter the code."  
- **Verify help:** "Didn't get it? Resend SMS · Check number."  
- **Error (generic):** "Something went wrong. Please try again or pick another date."  
- **Empty Search:** "No results yet—try broader filters, or 'Add a session' and we'll attempt it for you."  
- **reCAPTCHA disclosure:** "Protected by reCAPTCHA · Google Privacy · Terms" (small footer text).

---

## 6) Accessibility
- **Contrast:** WCAG AA or better on text/controls; badges readable on all backgrounds.  
- **Focus:** Visible focus rings; **focus trap** in modals; ESC to close; return focus on close.  
- **Semantics:** Labeled inputs; errors tied via `aria-describedby`; toasts use `role="status"` / live regions.  
- **Keyboard:** All actions reachable via keyboard; tab order logical.  
- **Motion:** Respect reduced-motion; avoid large parallax/movement.

---

## 7) Responsive & Layout
- **Mobile (≈390×844):** Search bar compact; results in single column; Reserve is a full-height **bottom sheet**; keyboard avoidance spacing for inputs.  
- **Desktop (≥1280):** Results grid max-width 960–1140px; sticky search bar ≤64px; Reserve modal width 640–720px.  
- **Density:** Comfortable spacing for scanning; consistent card gutters; avoid long truncation.

---

## 8) Analytics Markers (optional but helpful)
Mark where engineering will fire events (names are illustrative):
- `search_submitted`, `search_results_loaded`, `search_no_results`, `add_session_opened`.  
- `reserve_opened`, `reserve_details_submitted`, `pi_created`, `payment_authorized`.  
- `reserve_execute_started`, `reserve_confirmed`, `reserve_pending`, `reserve_needs_user_action`.  
- `sms_sent`, `sms_verified_success`, `sms_retry`.  
- `error_provider_down`, `error_card_declined`, `error_timeout`.

---

## 9) Handoff Checklist
- Provide **frames** for S1–S4 and R1–R7 (mobile + desktop key variants).  
- Export **components** with names: `Button/Primary`, `Input/Text`, `Badge/Platform`, `Badge/Availability`, `Modal/Reserve`, `Toast`, `Skeleton/Card`, `Skeleton/Row`.  
- Include **redlines** (spacing, sizing, states).  
- Add **prototypes**: Search → Reserve → Payment → Execute → (Confirmed|Pending|Needs Action) → Verify → Success.  
- Note any deviations from brand tokens.

---

## 10) Out of Scope (for MVP)
- Virtual queue visuals for high-demand drops (future).  
- Real-time status stream UI via WebSocket (future).  
- Advanced personalization and auto-complete AI visuals (future).

---

## Appendix — States, Edge Cases, and UX Details

### A. Component States
- Buttons, inputs, selects, date pickers, badges, toasts: default/hover/focus/disabled/loading.  
- Reserve CTA variants: **Open** / **Waitlist** ("Join waitlist") / **Full** (disabled with tooltip).

### B. Results UX Details
- Card/row **skeleton loaders**; **pagination vs infinite scroll** decision; filter chips with "Clear all".

### C. Pricing & Availability
- Display rules: **unknown**, **range**, **strike-through promos**; color semantics for **Open/Waitlist/Full**.

### D. Payment & 3DS
- Stripe **3DS challenge** flow and return states; wallet button placement and fallback.  
- Microcopy for **authorization vs capture** (hold now; capture on success).

### E. CAPTCHA & SMS
- reCAPTCHA disclosure placement (footer of modal/payment step).  
- Needs-action banner: **Open Verify**, **Resend SMS**.  
- OTP behaviors: auto-advance, paste-6, invalid/expired help.  
- TCPA consent line for SMS.

### F. Success & Pending
- Confirmed: provider ref, **Add to Calendar**, **Share**.  
- Pending: reassurance copy + what to expect (SMS/email).

### G. Empty & Error
- Search empty → "Add a session" flow.  
- Reservation errors: provider-down, timeout, card-declined; actionable CTAs.

### H. Multi-child & Repeat
- "Save child profile" checkbox; **switch child** dropdown; "Reserve for another child".

### I. Responsive Details
- Mobile bottom sheet for Reserve; keyboard avoidance; desktop modal width; sticky header height cap.

### J. Brand & Tokens
- Spacing/type scale, border radius (2xl), shadows; generic platform badges (no third-party logos).

### K. Legal
- Links: Privacy, Terms, Refunds/Fees at Reserve/Payment; reCAPTCHA disclosure.