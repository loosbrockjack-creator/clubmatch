#!/usr/bin/env bash
# Run the full exec-board pipeline unattended, logging to a file.
#
# Launch it detached so it survives this terminal and does not stream thousands
# of lines anywhere:
#
#   nohup bash active/execution/scripts/run_pipeline.sh core > /dev/null 2>&1 &
#
# Then check on it with:
#   tail -5 active/research/outreach/logs/latest.log
#
# Every step is resumable, so re-running after an interruption continues from
# the checkpoints rather than refetching.
set -uo pipefail

SCOPE="${1:-core}"
cd "$(dirname "$0")/../../.." || exit 1

LOGDIR="active/research/outreach/logs"
mkdir -p "$LOGDIR"
LOG="$LOGDIR/run_$(date +%Y%m%d_%H%M%S)_${SCOPE}.log"
ln -sf "$(basename "$LOG")" "$LOGDIR/latest.log"

S=active/execution/scripts
step() { echo "=== $(date '+%H:%M:%S') $1" >>"$LOG"; }
fail() { echo "=== $(date '+%H:%M:%S') FAILED at $1 (exit $2)" >>"$LOG"; exit "$2"; }

step "build target list (scope=$SCOPE)"
python3 "$S/make_target_list.py" --scope "$SCOPE" >>"$LOG" 2>&1 || fail "make_target_list" $?

step "scrape officers"
python3 "$S/scrape_officers.py" \
  --input active/research/outreach/target_clubs.json \
  --progress-every 25 >>"$LOG" 2>&1 || fail "scrape_officers" $?

step "verify against ISU directory"
python3 "$S/verify_directory.py" --progress-every 50 >>"$LOG" 2>&1 || fail "verify_directory" $?

step "normalize"
python3 "$S/normalize_contacts.py" >>"$LOG" 2>&1 || fail "normalize_contacts" $?

step "build workbook"
python3 "$S/build_workbook.py" >>"$LOG" 2>&1 || fail "build_workbook" $?

step "DONE"
tail -14 "$LOG"
