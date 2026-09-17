/**
 * Photography mapping.
 *
 * The 726 clubs have no photos of their own, so imagery is keyed to category.
 * That only reads well where a viewer sees one photo at a time: the landing
 * page interest tiles (eight distinct categories, side by side) and the club
 * detail banner. Dense grids (Explore, Results) deliberately stay typographic,
 * because one photo repeated four times on a screen looks broken.
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
  | "technology"
  | "veterinary"
  | "leadership"
  | "community"
  | "health"
  | "science";

/** Short alt text, written to describe the photo rather than the category. */
const ALT: Record<PhotoKey, string> = {
  hero: "Four Iowa State students walking together outside a campus building, laughing",
  academics: "Three students reading and taking notes at a table in a library",
  engineering: "Two students assembling electronics at a workbench",
  business: "Students presenting at a flip chart during a team meeting",
  agriculture: "Rows of young corn in an Iowa field at sunrise",
  design: "Hands drawing an architectural elevation at a drafting table",
  service: "Volunteers handing out supplies from a table on the street",
  music: "A band performing live on a lit stage",
  culture: "Dancers in regalia performing at an outdoor cultural celebration",
  sports: "Students on an outdoor basketball court with a ball",
  technology: "Two students reading code together on a laptop",
  veterinary: "A veterinarian and a volunteer examining a dog in a clinic",
  leadership: "Students planning around a whiteboard in a meeting room",
  community: "Students working together on couches in a shared campus lounge",
  health: "Two researchers in protective gear working at a lab whiteboard",
  science: "A student testing a robot in a laboratory",
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
 * life) share the "community" photo, which is deliberately generic.
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

export function photoSrc(key: PhotoKey): string {
  return `/photos/${key}.jpg`;
}

export function photoAlt(key: PhotoKey): string {
  return ALT[key];
}

/**
 * Picks the photo for a club: college first, then the first category with a
 * specific (non-"community") photo, then the generic shot. A club tagged
 * "Special Interest, Engineering" gets the engineering photo, and Solar Car
 * gets engineering rather than the cornfield its first category implies.
 */
export function photoForClub(club: {
  college: string;
  categories: string[];
}): PhotoKey {
  const fromCollege = COLLEGE_PHOTO[club.college];
  if (fromCollege) return fromCollege;

  for (const category of club.categories) {
    const key = CATEGORY_PHOTO[category];
    if (key && key !== "community") return key;
  }

  return "community";
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
