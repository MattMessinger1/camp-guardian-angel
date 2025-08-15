# Search UI Brief

## Overview
Design brief for the camp/activity search interface, including search bar, results cards, and empty states.

## 1. Sticky Search Bar

**Layout**: Horizontal sticky bar at top of search results
**Components**:
- **Query input**: Primary search field (2 columns on md+), placeholder: "Search camps or activities"
- **City input**: Location filter, placeholder: "City (e.g., Madison)"
- **Date inputs**: Start/end date pickers (type="date")
- **Platform dropdown**: Filter by provider (Active, Sawyer, CampMinder, UltraCamp, "Any platform")
- **Search button**: Primary CTA, right-aligned

**Responsive**: Stack vertically on mobile, search button spans full width

## 2. Result Cards

**Card Structure**:
- **Activity Header**: Activity name (prominent), city/state subtitle
- **Sessions Section**: Up to 3 upcoming sessions displayed
- **Session Row**: Start/end time, availability count, price, platform badge, "Reserve" button
- **Overflow Indicator**: "X more upcoming sessions" when > 3 available

**Visual Hierarchy**:
- Activity name: Large, bold typography
- Location: Muted secondary text
- Sessions: Structured list with clear visual separation
- Reserve buttons: Secondary style, consistent sizing

## 3. Empty State & Modal

**"No Results" State**:
- Empty state illustration/icon
- "No matching activities found" heading
- "Try adjusting your search filters" subtext
- **"Add a session" button**: Primary CTA to suggest missing content

**Add Session Modal**:
- **Camp Name**: Text input, required
- **Date**: Date picker, required  
- **Provider Link**: URL input, placeholder for camp website/registration link
- **Notes**: Textarea for additional details
- **Submit/Cancel**: Standard modal actions

## Design Tokens
- Use semantic color tokens from design system
- Consistent spacing and typography scale
- Responsive breakpoints for mobile/tablet/desktop
- Accessible contrast ratios and focus states

## Technical Notes
- Modal state managed in Results.tsx
- Form data console.logged on submit (backend integration pending)
- Search filters update URL params for bookmarkable searches