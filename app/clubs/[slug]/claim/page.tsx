import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getClubSummary } from "@/lib/clubs";
import { ClaimView } from "./claim-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const club = getClubSummary(slug);
  return {
    title: club ? `Claim ${club.name}` : "Claim a club",
    robots: { index: false },
  };
}

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = getClubSummary(slug);
  if (!club) notFound();
  return (
    <Suspense fallback={<div className="shell py-16"><div className="skeleton h-72 rounded-[14px]" /></div>}>
      <ClaimView slug={slug} clubName={club.name} />
    </Suspense>
  );
}
