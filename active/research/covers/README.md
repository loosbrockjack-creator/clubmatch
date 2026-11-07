# ClubMatch cover images — current status

Updated November 7, 2026.

## Website integration retained

The website uses `lib/approved-covers.ts`, `lib/photos.ts`, and `data/cover-manifest.json` to resolve approved images by stable club ID. The checked-in manifest is empty and `NEXT_PUBLIC_APPROVED_COVERS` defaults off. Greek chapters bypass the generated-cover resolver. Existing photo fallbacks and attribution rendering remain intact.

For an image import, inspect the current branch and manifest first. A folder-to-website handoff should contain explicitly selected image files and an exact club-ID mapping. Do not fabricate reviewer names, quality scores, acknowledgments or user approval to activate the resolver. Preview and production publishing are separate steps.

Run the retained website integration test with `npm run test:cover-manifest`. The test checks flag-off behavior, exact ID matching, Greek exclusions, mock/unapproved rejection, and safe local image paths. It has no dependency on generation tooling or a running server.

## Retired Studio

The local Cover Studio dashboard, HTTP server, generation CLI, mock pilot, paid-provider adapters, preflight code and pipeline-specific tests have been removed from the active branch. Their six `covers:*` package commands are also removed. Do not run or rebuild that dashboard as part of website work.

The complete pre-cleanup implementation is preserved on the GitHub branch [`archive/cover-studio-2026-11-07`](https://github.com/loosbrockjack-creator/clubmatch/tree/archive/cover-studio-2026-11-07), at commit `10783bdacb5ae0bfaa9c81ea77dd3ac1f2a49f2c`. The original setup handoff, curated pilot briefs and audit reports are under [history/](history/README.md); they describe the retired system, not current operating instructions.

`sharp` is retained for image processing and Next.js image optimization. Ignore rules for private cover work remain. Cleanup does not remove private candidates, permission records, photo catalogs, club registers, source photography or the separately prepared 15-image Claude import folder.

## ChatGPT image-production direction

The active creative workflow is chat-based, with actual university stock-photo references and the natural watercolor style established by the Running cover. People should generally look college-aged and engage in plausible activities grounded in each club description. Existing Greek artwork remains protected. Before selecting future new clubs, consult the saved production register and exclude previously generated or reserved stable IDs. The private register and image files are not restored by cloning this repository.

[Visual_Decisions.md](Visual_Decisions.md) preserves the visual direction and decision history. [ChatGPT_Image_Revision_Policy.md](ChatGPT_Image_Revision_Policy.md) sets the user's revision threshold specifically for ChatGPT; it is not a constraint on Claude's website work.

A new 700+ image automation process has not been implemented. That is a separate follow-up after this cleanup is reviewed.
