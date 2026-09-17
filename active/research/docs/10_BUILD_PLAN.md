# MVP Build Plan

Update this file as work progresses.

## P0
- [x] Audit existing repository
- [x] Establish design tokens / app shell
- [x] Landing page
- [x] Match quiz shell + state
- [x] Major selection
- [x] Goal selection
- [x] Career-interest selection
- [x] Time-commitment selection
- [x] Experience-type selection
- [x] Matching function
- [x] Match results page
- [x] Club card component
- [x] Club detail page
- [x] Explore page
- [x] Search
- [x] Core filters
- [x] Seed club data (32 organizations)
- [x] Empty states
- [x] Loading/skeleton states
- [ ] Desktop visual QA
- [ ] Mobile visual QA
- [x] Route + matching QA (see verification notes)
- [x] Build/type/lint sanity check

## P1 - only after P0
- [x] Save clubs via local storage
- [x] Interested CTA (local only, no lead capture backend)
- [ ] Share action
- [x] Personalized involvement stack ("A balanced start")
- [x] Extra transition polish

## Verification notes (2026-09-16, first prototype)
Confirmed by running the app:
- `npm run build` passes; all 32 club pages prerender.
- `npm run lint` passes with no warnings.
- All routes return 200, unknown club slugs return the 404 page.
- Matching was exercised against five student profiles (business/finance,
  hands-on engineering, undecided freshman, pre-health, cybersecurity). Rankings
  were sensible and clearly differentiated between profiles.
- No errors in the dev server log.

Not yet confirmed, and the next thing to do:
- Clicking the quiz end to end in a browser.
- Visual QA at 1440px, 1024px, and 390px.
- Browser console check on each route.

## Known gaps
- Club content is compiled for the prototype and has not been confirmed with
  each organization. The footer says so.
- No contact links, meeting times, or officer information, because inventing
  them would breach the content rules in `09_QUALITY_BAR.md`.
- "I'm interested" stores intent on the device only. It does not capture a lead,
  so it produces no demand evidence for rubric item 5 yet.
