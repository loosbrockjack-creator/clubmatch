# Feature Scope

## P0 - Must ship

### 1. Landing page
- clear value proposition
- `Find My Clubs` primary CTA
- `Explore Clubs` secondary CTA
- premium visual polish

### 2. Match quiz
Collect enough data to produce differentiated results:
- major / academic area
- goals (career, networking, friends/community, leadership, hands-on experience, skill building, entrepreneurship)
- career interests
- preferred time commitment
- club experience/type preference

Requirements:
- visible progress
- back navigation without losing state
- clear selected states
- mobile-friendly

### 3. Matching engine
- deterministic weighted scoring
- explainable reasons for each match
- no ML needed

### 4. Match results
- ordered recommendations
- match percentage / fit score
- short "Why it fits" explanation
- high-value metadata
- club tags
- save/interested UI only if trivial to implement

### 5. Club detail page
- identity and logo/visual
- concise value proposition
- who it is good for
- what students gain
- time commitment
- meeting cadence / upcoming meeting if data exists
- eligibility / freshman friendliness
- relevant career paths / majors
- primary next-step CTA

### 6. Explore page
- search
- a small set of meaningful filters
- responsive club grid/list

### 7. Responsive + reliability pass
- desktop
- mobile
- loading/empty states
- no obvious broken routes or console errors

## P1 - Add only if P0 is excellent
- save/favorite clubs (local storage is fine)
- `I'm Interested` action
- share club
- involvement stack / recommended combination of clubs
- subtle animation polish

## Explicitly out of scope
- authentication
- messaging
- club admin console
- payments
- social feed
- native mobile app
- recommendation ML
- complex analytics
- notification system
