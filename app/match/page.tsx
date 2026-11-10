import { MatchQuiz } from "@/components/match-quiz";
import { aiEnabled } from "@/lib/ai";

/**
 * The resume upload and "Anything specific?" box only render when the server
 * has an Anthropic key. Without one the quiz is the plain six questions.
 */
export default function MatchPage() {
  return <MatchQuiz ai={aiEnabled()} />;
}
