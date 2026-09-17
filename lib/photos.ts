/**
 * Photography mapping.
 *
 * The 726 clubs have no photos of their own, so imagery is keyed to category.
 * Every category resolves to a pool of 2-5 photos rather than one, and each
 * club deterministically picks one member of its pool (hashed from its slug),
 * so the same club always shows the same photo, but a page full of Engineering
 * clubs doesn't show the same picture in every card. The landing page's eight
 * interest tiles and the hero use one fixed photo each, since those are never
 * repeated on screen to begin with.
 *
 * Files live in public/photos and are hand-picked Pexels images, free license.
 */

export type PhotoKey =
  | "hero"
  | "academics"
  | "engineering"
  | "business"
  | "agriculture"
  | "design"
  | "service"
  | "music"
  | "culture"
  | "sports"
  | "veterinary"
  | "leadership"
  | "community"
  | "health";

/**
 * How many photos exist for each pool (variant 1 is "<key>.jpg", not
 * "<key>-1.jpg"). Sized roughly to how many clubs actually land in each
 * pool: "community" is the largest fallback bucket by far (Special Interest,
 * Residence, Greek life, Religious, Programming - around 380 clubs combined)
 * so it gets the most variants; niche pools like veterinary stay small.
 */
const POOL_SIZE: Record<PhotoKey, number> = {
  hero: 1,
  academics: 10,
  engineering: 10,
  business: 8,
  agriculture: 9,
  design: 6,
  service: 9,
  music: 8,
  culture: 4,
  sports: 11,
  veterinary: 2,
  leadership: 7,
  community: 29,
  health: 5,
};

/** Short alt text, written to describe the photo rather than the category. */
const ALT: Record<PhotoKey, string> = {
  hero: "Four Iowa State students walking together outside a campus building, laughing",
  academics: "Students reading and studying together at a table or in a library",
  engineering: "Students building and testing electronics or machinery at a workbench",
  business: "Students or professionals in a meeting, presenting, or shaking hands",
  agriculture: "A cornfield or farmland in Iowa at sunrise or sunset",
  design: "Hands drawing an architectural elevation or reviewing blueprints",
  service: "Volunteers handing out supplies or donations from a table",
  music: "A band or musician performing live on a lit stage",
  culture: "Dancers in regalia performing at an outdoor cultural celebration",
  sports: "Students playing or standing together on an outdoor court",
  veterinary: "A veterinarian examining a dog in a clinic",
  leadership: "Students planning around a whiteboard in a meeting room",
  community: "A small group of students together on campus or in a lounge",
  health: "Healthcare workers in scrubs and white coats together",
};

/**
 * A club's college is the most reliable subject signal in the dataset. The 33
 * clubs carrying a dozen-plus categories (Solar Car is tagged everything from
 * Agriculture to Veterinary Medicine) are only sorted correctly by this.
 */
const COLLEGE_PHOTO: Record<string, PhotoKey> = {
  "College of Engineering": "engineering",
  "College of Agriculture and Life Sciences": "agriculture",
  "College of Liberal Arts and Sciences": "academics",
  "Ivy College of Business": "business",
  "College of Health and Human Sciences": "health",
  "College of Veterinary Medicine": "veterinary",
  "College of Design": "design",
  "Graduate College": "academics",
};

/**
 * Every category in the dataset maps to a photo. Categories that describe a
 * kind of group rather than a subject (Residence, Special Interest, Greek
 * life) share the "community" pool, which is deliberately generic and has the
 * most variants since it is the largest fallback bucket.
 *
 * "Programming" is deliberately generic too: in Iowa State's taxonomy it
 * covers both software clubs (Data Science Club) and event programming
 * (Blood Drive, Dance Marathon), so it cannot assert a subject on its own.
 */
const CATEGORY_PHOTO: Record<string, PhotoKey> = {
  "Agriculture & Life Sciences": "agriculture",
  Business: "business",
  Council: "leadership",
  "Culture & Identity": "culture",
  Design: "design",
  Engineering: "engineering",
  Fraternities: "community",
  "Graduate & Professional": "academics",
  "Health & Human Sciences": "health",
  "Honor Societies": "academics",
  Intercollegiate: "sports",
  Leadership: "leadership",
  "Liberal Arts & Sciences": "academics",
  "Media Production": "design",
  Military: "leadership",
  "Music & Performing Arts": "music",
  "Political & Activism": "leadership",
  "Pre-Professional": "business",
  Programming: "community",
  "Religious & Spiritual": "community",
  Residence: "community",
  "Service & Volunteering": "service",
  Sororities: "community",
  "Special Interest": "community",
  "Sports & Recreation": "sports",
  "Sports Club": "sports",
  "Student Organization": "community",
  "Veterinary Medicine": "veterinary",
};

/** Small deterministic string hash (djb2), used to pick a stable pool index. */
function hash(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return h >>> 0;
}

export function photoSrc(key: PhotoKey, variant = 1): string {
  return variant <= 1 ? `/photos/${key}.jpg` : `/photos/${key}-${variant}.jpg`;
}

export function photoAlt(key: PhotoKey): string {
  return ALT[key];
}

/**
 * Picks the photo key for a club: college first, then the first category with
 * a specific (non-"community") photo, then the generic pool. A club tagged
 * "Special Interest, Engineering" gets engineering, and Solar Car gets
 * engineering rather than the cornfield its first category implies.
 */
function keyForClub(club: { college: string; categories: string[] }): PhotoKey {
  const fromCollege = COLLEGE_PHOTO[club.college];
  if (fromCollege) return fromCollege;

  for (const category of club.categories) {
    const key = CATEGORY_PHOTO[category];
    if (key && key !== "community") return key;
  }

  return "community";
}

/**
 * Full photo pick for a club: which pool, and which member of that pool.
 * The variant is hashed from the slug so it's stable across renders and
 * across pages (a club always shows the same photo everywhere it appears),
 * while different clubs sharing a pool spread across its variants.
 */
export function photoForClub(club: {
  slug: string;
  college: string;
  categories: string[];
}): { key: PhotoKey; variant: number; src: string; alt: string } {
  const key = keyForClub(club);
  const size = POOL_SIZE[key];
  const variant = (hash(club.slug) % size) + 1;
  return { key, variant, src: photoSrc(key, variant), alt: photoAlt(key) };
}

/**
 * The eight interest tiles on the landing page. Each one is a distinct photo,
 * and each links into Explore pre-filtered to that category.
 */
export const INTEREST_TILES: {
  category: string;
  label: string;
  photo: PhotoKey;
}[] = [
  { category: "Engineering", label: "Engineering", photo: "engineering" },
  { category: "Business", label: "Business", photo: "business" },
  {
    category: "Agriculture & Life Sciences",
    label: "Agriculture & life sciences",
    photo: "agriculture",
  },
  { category: "Design", label: "Design", photo: "design" },
  {
    category: "Service & Volunteering",
    label: "Service & volunteering",
    photo: "service",
  },
  {
    category: "Culture & Identity",
    label: "Culture & identity",
    photo: "culture",
  },
  {
    category: "Music & Performing Arts",
    label: "Music & performing arts",
    photo: "music",
  },
  {
    category: "Sports & Recreation",
    label: "Sports & recreation",
    photo: "sports",
  },
];
