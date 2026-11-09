import type { MetadataRoute } from "next";
import { clubs } from "@/lib/clubs";
import { SITE_URL } from "@/lib/club-seo";

/** Public pages only. Student profiles, the admin panel, and the inbox stay out. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/explore` },
    { url: `${SITE_URL}/greek` },
    { url: `${SITE_URL}/match` },
    ...clubs.map((club) => ({ url: `${SITE_URL}/clubs/${club.slug}` })),
  ];
}
