import manifest from "@/data/cover-manifest.json";

type ApprovedCover = {
  clubId: string;
  src: string;
  alt: string;
  type: "generated_illustration" | "official_photo";
  approved: boolean;
  mock: boolean;
  review: { action: string; reviewer: string; acknowledged: boolean };
  rights: { referencesChecked: boolean };
  attributions?: string[];
};

/** Staging opt-in only. The pilot never writes this manifest automatically. */
export function approvedCoverForClub(club: {
  id?: string;
  greek?: unknown;
  categories?: string[];
}): ApprovedCover | undefined {
  if (
    process.env.NEXT_PUBLIC_APPROVED_COVERS !== "true" ||
    club.greek ||
    !club.id ||
    club.categories?.some((x) => x === "Fraternities" || x === "Sororities")
  )
    return;
  return (manifest as ApprovedCover[]).find(
    (cover) =>
      cover.clubId === club.id &&
      cover.approved &&
      !cover.mock &&
      cover.review?.action === "approve" &&
      cover.review.acknowledged &&
      cover.review.reviewer &&
      cover.rights?.referencesChecked &&
      /^\/covers\/[a-z0-9-]+\.webp$/.test(cover.src),
  );
}
