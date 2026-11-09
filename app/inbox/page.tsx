import type { Metadata } from "next";
import { InboxView } from "./inbox-view";

export const metadata: Metadata = {
  title: "Inbox",
  description: "Messages from the clubs you're in and interested in.",
  robots: { index: false },
};

export default function InboxPage() {
  return <InboxView />;
}
