import type { Metadata } from "next";

// Profiles are only for signed-in students, never search engines.
export const metadata: Metadata = {
  title: "Student profile",
  robots: { index: false, follow: false },
};

export default function StudentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
