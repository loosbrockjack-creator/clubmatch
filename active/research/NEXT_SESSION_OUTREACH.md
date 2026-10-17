# Handoff: ClubMatch exec board outreach

Read this before touching the outreach workstream. It is separate from the app build.
Written 2026-10-17 by the session that ran the pilot and launched the full scrape.

## What this workstream is
Build an Excel contact list of Iowa State club exec boards so the group can reach out
and get clubs onto ClubMatch.

- Rules: `OUTREACH.md` at the repo root. The hard rule is **Iowa State only**, never
  contacts from another university. Treat that as the top constraint.
- Plan: `~/.claude/plans/my-prompt-is-in-mutable-kite.md`
- Full method, defects and decisions: `active/research/outreach/RESEARCH_LOG.md`
- Deliverable: `active/leads/clubmatch_exec_contacts.xlsx`

## Where things stand

**Pilot: complete and reviewer passed.** 25 clubs, 215 verified contacts, 12 quarantined,
94.7% verification rate, all 25 clubs covered, zero non Iowa State contacts. Two fresh
context reviewer rounds both returned PASS. Backup of the pilot output is in
`active/research/outreach/pilot_backup/`.

**Full run: launched 2026-10-17 around 18:03, scope `core` (332 clubs, the 7 colleges).**
It was started detached, so it kept running after that session ended.

### First thing to do: check whether it finished
```bash
cd "~/Desktop/School/Academic Club App (CC)"
tail -16 active/research/outreach/logs/latest.log
```
- A line `=== HH:MM:SS DONE` means all five steps completed.
- A line `=== HH:MM:SS FAILED at <step> (exit N)` means it stopped there.
- Neither, and a `scrape_officers.py` or `verify_directory.py` process still in `ps`,
  means it is still working. Expect about 1 hour end to end.

If it died partway, just run it again. **Every step is resumable** and will skip
completed work:
```bash
nohup bash active/execution/scripts/run_pipeline.sh core > /dev/null 2>&1 &
```

## How the data is obtained (do not re-derive this)
StuOrg officer pages are **public**, no login needed. Each officer's name links to the
ISU directory with their address embedded in the href
(`info.iastate.edu/search?s=<email>`), which is why the emails are obtainable even
though the rendered page shows only names. Every address is then confirmed against the
public ISU directory, and a row counts as verified only when the directory returns a
person whose first and last name match the club's listing.

A login was explored and is **not** required. Do not spend time on NetID, and do not
restart the user's Chrome to attach a debugger.

Read only GETs with a 1 second delay. Nothing is submitted, joined, or messaged. Keep it
that way.

## Pipeline
```
make_target_list.py   ->  target_clubs.json      (--scope core | with-college | all)
scrape_officers.py    ->  officers_raw.json      (resumable, .partial.jsonl checkpoint)
verify_directory.py   ->  directory_verify.json  (resumable, caches every lookup)
normalize_contacts.py ->  contacts_normalized.json
build_workbook.py     ->  ../../leads/clubmatch_exec_contacts.xlsx
```
`run_pipeline.sh <scope>` runs all five and logs to `active/research/outreach/logs/`.

## The remaining task: sharded reviewer loop
The pilot used one reviewer over 215 rows. At roughly 2,850 rows, **shard by college**:
7 reviewers, about 50 clubs each, each returning a short verdict. Reasons: a single
reviewer reading everything gives a vaguer verdict, and the reading cost should stay in
the subagent's context rather than the main one. Maximum 3 rounds, same as the pilot.
Anything still failing after round 3 goes to the `Needs Review` tab, never the main sheet.

Each reviewer must check, for its slice:
1. Iowa State only. Any non ISU contact or any link to another university's domain is a
   critical failure. This has happened once already, see defect 4 in the research log.
2. Minimum row: a name plus at least one channel (email or phone).
3. Every row cites a source URL that actually supports it.
4. No duplicate people within the same club. The same person under two different clubs is
   fine but must be flagged in `other_clubs`.
5. Rows that cannot be verified as a real current ISU person belong in `needs_review`.
Reviewers should independently re-fetch a sample of source pages rather than trust the data.

## Known state and gotchas
- **Context discipline matters here.** Never print the dataset. Inspect with aggregates:
  counts, distributions, failures only, and a small fixed sample. See the "Large datasets
  & long runs" section in `~/.claude/global.md`.
- **LibreOffice is not installed**, so `recalc.py` cannot verify the workbook's formulas.
  The formulas are simple COUNTIF/COUNTA/SUMPRODUCT, ranges were hand checked, and Excel
  recalculates on open. Do not claim a verified recalc.
- **openpyxl** is installed for the system python 3.9 via `pip3 install --user`.
- Some clubs legitimately return 403 or 404 on their officers page, or list no officers.
  Those are logged as failures and end up on the `Clubs` tab with no verified contact.
  That is expected, not a bug.
- Excel's `COUNTIF` treats `*`, `?` and `~` as wildcards. No club name in the core 332
  contains them, but re-check if the scope widens to `all`.
- A few college labels are wrong in the source classifier (the SAE student chapter is
  under Ivy College of Business). Left as given, flagged in the workbook notes.

## Privacy and git
- `active/leads/` and `active/research/outreach/` are gitignored, as are `*.partial.jsonl`
  and the logs directory. **The GitHub repo is public.** Never commit contact data, and
  do not put a real student address in a tracked file.
- These are student addresses that ISU deliberately masks from the public. The clubs
  publish them themselves, so they are public, but keep the file inside the group, include
  an opt out in any outreach, and honor removal requests.
- Scripts are committable and already pushed. Commits so far: `cd4b8cb`, `7c792c5`.
