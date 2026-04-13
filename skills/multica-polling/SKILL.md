---
name: multica-polling
description: >
  Use when rara needs to track a Multica-dispatched coding issue to completion
  through her own scheduler. This skill uses the bundled polling script,
  persists polling context in the scheduled message, and follows a standard
  GitHub PR flow for changes to the skill itself.
---

Use this skill after rara has dispatched coding work to Multica and needs to
monitor it through Rara's scheduler until it reaches a terminal state.

This skill is not just a prose guideline.
The fixed state transition logic lives in:
- `scripts/multica-poll.ts`

The skill defines when and how to call that script.

This skill complements `multica-team` and `multica-orchestrator`.
- `multica-team` decides what to dispatch, how to structure issues, and how to verify work
- this skill defines the tracking contract after dispatch
- `multica-orchestrator` consumes polling results plus stage artifacts to decide whether automatic handoff is safe

## Files

- Skill instructions: `skills/multica-polling/SKILL.md`
- Polling logic: `scripts/multica-poll.ts`

## Core rule

For single-issue lifecycle tracking:
- prefer `schedule-once` chaining
- do not default to `schedule-interval`

Reason:
- cadence changes over time
- timeout and retry budget are per issue
- terminal states should naturally stop scheduling

## Script contract

The polling script exposes three commands.

### 1. Initialize context

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-poll.ts" init \
  --issue-id ISSUE-123 \
  --timeout-seconds 7200 \
  --max-error-retries 3
```

Output:
- `context`
- `first_delay_seconds`
- `schedule_message`

Use this right after dispatch.

### 2. Evaluate one observed poll result

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-poll.ts" evaluate \
  --context-json '<json>' \
  --observed-state running \
  --task-id TASK-456 \
  --latest-message-seq 42 \
  --summary 'Agent is still working'
```

Supported `--observed-state` values:
- `no_run_yet`
- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`
- `poll_error`

Output JSON contains:
- `terminal`
- `kind`
- `normalized_state`
- `summary`
- `next_delay_seconds`
- `next_context`
- `schedule_message`
- `exit_code`

### 3. Rebuild the future scheduled message

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-poll.ts" schedule-message \
  --context-json '<json>'
```

Use this when the context was updated elsewhere but the standard scheduled
message format should stay consistent.

## Exit code contract

The script returns stable meanings:
- `0` = success terminal (`completed`)
- `10` = reschedule normal (`queued`, `running`, `poll_error` with retry left)
- `20` = terminal task failure (`failed`, `cancelled`)
- `21` = terminal timeout
- `30` = reschedule soon (`no_run_yet`)
- `40` = terminal poller failure (retry budget exhausted)

Treat these as orchestration signals.
Do not reinterpret `40` as task failure.

## Required persisted context

The script expects this shape:

```json
{
  "workflow": "multica_poll",
  "issue_id": "ISSUE-123",
  "dispatched_at": "2026-04-12T10:30:00Z",
  "check_count": 0,
  "last_task_id": null,
  "last_status": null,
  "last_message_seq": null,
  "error_retry_count": 0,
  "timeout_seconds": 7200,
  "max_error_retries": 3
}
```

Minimum required fields in practice:
- `workflow`
- `issue_id`
- `dispatched_at`
- `check_count`
- `last_task_id`
- `last_status`
- `error_retry_count`
- `timeout_seconds`
- `max_error_retries`

## Polling workflow

### Step 1. Dispatch through Multica
Do that with `multica-team`.
Only start this skill after the issue has been assigned or otherwise dispatched.

### Step 2. Initialize poll context
Run:

```bash
bun "${CLAUDE_PLUGIN_ROOT}/scripts/multica-poll.ts" init --issue-id ISSUE-123
```

Then schedule the first future turn using:
- returned `first_delay_seconds`
- returned `schedule_message`

### Step 3. On each future turn, inspect Multica
Use issue-native observability:
- active-task
- task-runs
- task messages
- CLI or wrapper over those APIs

Normalize the observation into one script state:
- `no_run_yet`
- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`
- `poll_error`

### Step 4. Feed the observation into the script
Run `evaluate` with:
- prior context JSON
- normalized state
- current task ID if any
- latest message sequence if any
- summary or error detail if helpful

The script decides:
- whether this is terminal
- whether to reschedule
- what delay to use
- how to update context
- whether the outcome is success, task failure, timeout, or poller failure

### Step 5. Branch by script result

#### If terminal success
- stop scheduling
- summarize completion
- continue with verification / PR / ship flow as appropriate

#### If terminal task failure
- stop scheduling
- summarize the failure
- decide whether to follow up in the same issue, split, or reassign

#### If terminal timeout
- stop scheduling
- report timeout explicitly
- investigate whether the task stalled or the tracking budget was too small

#### If terminal poller failure
- stop scheduling
- report that the tracker failed, not necessarily the Multica task
- repair observability before claiming anything about the task outcome

#### If reschedule
- take `next_delay_seconds`
- schedule the next turn with `schedule_message`

## Distinction that must never be lost

### Task failure
Examples:
- Multica reports `failed`
- run was cancelled

Meaning:
- the work failed

### Poller failure
Examples:
- local CLI failed
- parser crashed
- wrapper script errored
- auth or environment issue broke inspection

Meaning:
- tracking failed
- the work may still be running or may already be done

This boundary is encoded in the script output and must remain intact.

## Default timing policy

The bundled script currently uses this default policy:
- `no_run_yet` and very early checks: 15s
- first 5 minutes: 30s
- next 25 minutes: 60s
- after that: 120s
- error retry delays: 30s, 60s, 180s
- total timeout: 2h by default
- max poller error retries: 3 by default

## Standard GitHub PR flow for this skill

When modifying this skill or its script in the `rara-skills` repo, use the normal
GitHub branch/commit/PR flow.

Checklist:
- [ ] edit `skills/multica-polling/SKILL.md` and/or `scripts/multica-poll.ts`
- [ ] sanity-check the script locally
- [ ] update README if the new skill should be listed
- [ ] `git status`
- [ ] `git add ...`
- [ ] `git commit -m "feat(multica-polling): add polling script contract"`
- [ ] `git push origin <branch>`
- [ ] open PR with clear summary and verification notes

Recommended verification for script changes:

```bash
bun "./scripts/multica-poll.ts" init --issue-id ISSUE-123
bun "./scripts/multica-poll.ts" evaluate \
  --context-json '{"workflow":"multica_poll","issue_id":"ISSUE-123","dispatched_at":"2026-04-12T10:30:00Z","check_count":0,"last_task_id":null,"last_status":null,"last_message_seq":null,"error_retry_count":0,"timeout_seconds":7200,"max_error_retries":3}' \
  --observed-state no_run_yet
```

Add one more check for each of these whenever changing state logic:
- `running`
- `completed`
- `failed`
- `poll_error`

## Anti-patterns

Do not:
- treat this skill as prose only while duplicating the same branching logic manually every time
- use `schedule-interval` as the default for one issue
- schedule the next turn without embedding updated context
- treat `no_run_yet` as immediate failure
- treat poller failure as proof that the task failed
- reschedule forever without timeout or retry budget
- lose task identity when a new task run appears

## Pre-flight checklist

Before using this skill, verify:
- [ ] the issue was already dispatched into Multica
- [ ] the poll context was created through `scripts/multica-poll.ts init` or an equivalent compatible shape
- [ ] timeout and retry budgets are present
- [ ] future turns will call the script again rather than reimplementing branching ad hoc
- [ ] task failure and poller failure remain separate in reporting
