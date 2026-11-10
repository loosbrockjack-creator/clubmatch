import { ResultsView } from "@/components/results-view";
import { aiEnabled } from "@/lib/ai";

export default function ResultsPage() {
  return <ResultsView ai={aiEnabled()} />;
}
