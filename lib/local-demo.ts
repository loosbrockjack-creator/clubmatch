import { DEMO_SLUG, demoClub, demoContent } from "./demo-clubs-data";
import type { LocalDemo } from "./demo-types";

/**
 * Demo clubs on the live site: Product Management Collective, unlisted. On
 * Jack's machine, next.config.ts points this import at the gitignored
 * active/execution/local-demo/index.ts, which lists the club everywhere and
 * adds his localhost sign-in.
 */
export const localDemo: LocalDemo = {
  clubs: [demoClub],
  content: { [DEMO_SLUG]: demoContent },
  devAccounts: [],
  listed: false,
};
