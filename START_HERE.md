# ClubMatch Claude Agent Pack - START HERE

This folder is designed to be dropped directly into the root of the ClubMatch codebase before Claude Code / Claude Opus 5 begins building.

## Easiest workflow
1. Download and unzip this pack.
2. Put the contents in the root of your ClubMatch repository.
3. Open Claude Code in that repository.
4. Paste the contents of `FIRST_PROMPT.md` as your first instruction.
5. Let Claude read `CLAUDE.md` and the referenced files before it touches code.

## What is included
- `CLAUDE.md` - persistent operating instructions for the coding agent.
- `FIRST_PROMPT.md` - one prompt to kick off autonomous implementation.
- `docs/` - product, UX, design, scope, matching, quality, and rubric context.
- `references/visuals/` - original visual reference boards created specifically for ClubMatch.
- `references/external/` - curated premium design resources and links.
- `source_materials/` - the original $5 Challenge assignment and grading rubric.
- `data/club-schema.example.json` - recommended club-data shape.

The pack intentionally prioritizes a polished, demonstrable MVP over unnecessary backend complexity.
