# Content Model

## Club object
Recommended fields:

```ts
interface Club {
  id: string
  name: string
  slug: string
  logo?: string
  heroImage?: string
  shortDescription: string
  longDescription?: string

  colleges?: string[]
  majors?: string[]
  categories: string[]
  careerPaths?: string[]
  interests?: string[]
  goalsServed?: string[]
  experienceTypes?: string[]

  commitmentLevel: "casual" | "moderate" | "involved" | "high"
  commitmentText?: string
  meetingFrequency?: string
  beginnerFriendly?: boolean
  freshmenWelcome?: boolean
  applicationRequired?: boolean

  nextMeeting?: string
  meetingLocation?: string

  websiteUrl?: string
  email?: string
  instagram?: string
  verified?: boolean
}
```

## Card content hierarchy
1. logo / optional image
2. club name
3. primary category
4. concise value proposition
5. match score if applicable
6. 2-4 tags
7. commitment or next meeting
8. save / detail action

## Club detail content hierarchy
Avoid dumping database fields. Translate data into student-facing decisions:
- "What you'll actually do"
- "What you'll gain"
- "Best for"
- "Time commitment"
- "Freshmen welcome?"
- "How to get involved"

## Seed-data strategy
For a 24-hour MVP, prefer roughly 20-40 credible academic/professional organizations with useful metadata rather than hundreds of shallow listings.
