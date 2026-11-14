import { Loader2 } from "lucide-react";

/** Inline spinner that takes an icon's place while a button waits on the network. */
export function ButtonSpinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} strokeWidth={2.25} className="animate-spin" aria-hidden />;
}
