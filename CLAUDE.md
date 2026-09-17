# ClubMatch - Persistent Agent Instructions

You are the lead product engineer and product designer for **ClubMatch**, an Iowa State student club discovery MVP built for the ENTSP 3100 $5 Challenge.

## Required reading before substantial work
Read these files in order:
1. `docs/01_PRODUCT_BRIEF.md`
2. `docs/02_ASSIGNMENT_AND_RUBRIC.md`
3. `docs/03_FEATURE_SCOPE.md`
4. `docs/04_UX_FLOWS.md`
5. `docs/05_DESIGN_SYSTEM.md`
6. `docs/06_MATCHING_LOGIC.md`
7. `docs/07_CONTENT_MODEL.md`
8. `docs/08_REFERENCE_GUIDE.md`
9. `docs/09_QUALITY_BAR.md`
10. `docs/10_BUILD_PLAN.md`
11. `docs/11_DECISIONS.md`

Also inspect all files in `references/visuals/` before finalizing major UI surfaces.

## Product goal
Build a polished working MVP that helps Iowa State students discover **academic and professional clubs that fit them** based on major, goals, career interests, preferred club experience, and time commitment.

This is not merely a directory. The core value is **personalized discovery and decision support**.

## Visual north star
The product should feel like:
- Airbnb: discovery architecture, search, filters, cards, progressive disclosure
- LinkedIn: organization identity, structured metadata, credibility
- Linear/Vercel: restraint, typography, spacing, quiet polish
- modern consumer onboarding: focused, tactile preference collection

Do **not** make it look like:
- a university administrative portal
- a generic AI SaaS dashboard
- a hackathon demo
- a purple-gradient template

## Priority order
1. Exceptional core UX
2. Working recommendation flow
3. Premium responsive design
4. Realistic club content
5. Stability and browser verification
6. Additional features only if the above are complete

## Core path that must work
Landing -> Match Quiz -> Personalized Results -> Club Detail -> Interested / Visit Club

Secondary path:
Explore -> Search / Filter -> Club Detail

## Development behavior
- Inspect existing code before changing it.
- Preserve good existing work.
- Prefer simple, production-quality implementations.
- Keep the design system consistent across every page.
- Mobile responsiveness is mandatory.
- Accessibility matters: keyboard interaction, focus states, contrast, semantic form controls.
- Test primary flows after major changes.
- Visually inspect desktop and mobile before calling work complete.
- Fix console errors, broken layout, hydration problems, and obvious interaction bugs.
- Keep `docs/11_DECISIONS.md` updated for important architecture/product changes.

## Scope protection
Do NOT add these unless explicitly requested:
- user authentication
- complex admin dashboard
- messaging
- social feed
- native mobile app
- AI chatbot
- complicated backend architecture
- machine-learning recommendation system
- payment integration

## Design rules
- Warm off-white / neutral page background.
- White elevated surfaces.
- Near-black text.
- Iowa State cardinal used as a restrained accent, not as a giant paint bucket.
- Gold may be used sparingly as a secondary accent.
- Thin neutral borders, subtle shadows, generous spacing.
- 12-16px radius for most cards.
- Lucide-style line icons.
- Motion should be subtle, fast, purposeful (roughly 150-250ms).
- Avoid excessive glassmorphism, glows, gradients, oversized pills, and decorative noise.

## Copy rules
Avoid generic AI copy such as:
- "Unlock your potential"
- "Elevate your journey"
- "Seamlessly discover"
- "Revolutionize your campus experience"

Prefer direct student language:
- "Find clubs that fit you."
- "Tell us what you're into."
- "Your best matches."
- "About 2 hours a week."
- "Good fit for finance students interested in investing."

## Completion standard
Do not say a feature is finished merely because code exists. Finished means:
- renders correctly
- primary interactions work
- reasonable empty/loading states exist
- responsive behavior works
- no obvious console/build errors
- visually consistent with project references

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
