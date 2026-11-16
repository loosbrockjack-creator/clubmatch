import type { LocalDemo } from "./demo-types";

/**
 * Empty on purpose. The live site has no demo clubs. On Jack's machine,
 * next.config.ts points this import at active/execution/local-demo/index.ts
 * (gitignored), which adds a fake club with sample data for client demos.
 */
export const localDemo: LocalDemo = { clubs: [], content: {}, devAccounts: [] };
