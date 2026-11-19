import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPanel } from "./admin-panel";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/** Jack's owner dashboard. Access is checked by every /api/admin call, not by this page. */
export default function AdminPage() {
  return (
    <Suspense fallback={<div className="shell py-16"><div className="skeleton h-72 rounded-[14px]" /></div>}>
      <AdminPanel />
    </Suspense>
  );
}
