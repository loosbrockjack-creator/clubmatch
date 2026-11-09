import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getClubSummary } from "@/lib/clubs";
import { ManagePanel } from "./manage-panel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const club = getClubSummary(slug);
  return { title: club ? `Manage ${club.name}` : "Manage club", robots: { index: false } };
}

export default async function ManagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = getClubSummary(slug);
  if (!club) notFound();
  return (
    <Suspense fallback={<div className="shell py-16"><div className="skeleton h-72 rounded-[14px]" /></div>}>
      <ManagePanel slug={slug} clubName={club.name} />
    </Suspense>
  );
}
