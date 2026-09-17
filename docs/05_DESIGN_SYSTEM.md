# Design System

## Design character
Premium, calm, credible, student-friendly. It should feel more like a modern consumer discovery product than a university administrative website.

## Design DNA
- **Airbnb** - discovery, filters, search, card hierarchy, progressive disclosure
- **LinkedIn** - organization identity and structured metadata
- **Linear / Vercel** - restraint, typography, spacing, quiet interaction polish
- **Pinterest / consumer onboarding** - preference collection and personalization

## Palette
Suggested starting point (adjust if implementation calls for it):
- Canvas: `#F7F6F3` or similarly warm near-white
- Surface: `#FFFFFF`
- Primary text: `#171717`
- Secondary text: `#6B6B6B`
- Border: `#E8E6E1`
- Cardinal accent: approximately `#C8102E`
- Cardinal hover/dark: approximately `#A40D26`
- Restrained gold accent: approximately `#F1BE48`

Do not fill large portions of the interface with cardinal.

## Typography
Prefer a clean contemporary grotesk/system family already available in the project. Use strong hierarchy rather than decorative fonts.

Suggested scale:
- display: 48-64 desktop, 36-44 mobile
- page H1: 32-40
- section H2: 24-30
- card title: 17-20
- body: 15-17
- metadata: 13-14

## Layout
- max content width roughly 1180-1280px
- generous page gutters
- 8px spacing base
- sections breathe; avoid cramming

## Cards
- 12-16px radius
- 1px neutral border
- extremely subtle shadow or no shadow at rest
- hover: slight border/elevation change, not dramatic zoom
- consistent internal padding and vertical rhythm

## Buttons
- clear hierarchy
- primary button may use cardinal
- secondary button neutral/outline
- avoid pill shape unless it is a chip/tag/filter

## Chips and tags
Use for:
- academic category
- career area
- club type
- commitment

Selected filter chips can use a soft cardinal tint + cardinal border/icon rather than solid red everywhere.

## Motion
- 150-250ms typical UI transitions
- ease-out
- subtle page/step transitions
- avoid bouncy novelty motion

## Search
Search should feel like a first-class product feature. Give it visual presence on Explore.

## Anti-patterns
Avoid:
- purple/blue AI gradients
- huge glow effects
- glass everywhere
- massive rounded pills for every control
- generic four-stat dashboard cards
- excessive emojis
- five unrelated card styles
- oversized hero with empty space but no utility
- decorative animation that slows task completion
