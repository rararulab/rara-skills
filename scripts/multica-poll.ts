#!/usr/bin/env bun

interface PollContext {
  workflow: "multica_poll";
  issue_id: string;
  dispatched_at: string;
  check_count: number;
  last_task_id: string | null;
  last_status: string | null;
  last_message_seq?: number | null;
  error_retry_count: number;
  timeout_seconds: number;
  max_error_retries: number;
}

type ObservedState =
  | "no_run_yet"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "poll_error";

interface EvaluateInput {
  context: PollContext;
  observed_state: ObservedState;
  task_id?: string | null;
  latest_message_seq?: number | null;
  summary?: string | null;
  error_detail?: string | null;
  now?: string | null;
}

interface Result {
  ok: boolean;
  terminal: boolean;
  kind:
    | "success"
    | "task_failure"
    | "timeout"
    | "poller_failure"
    | "reschedule";
  normalized_state: ObservedState | "timeout";
  issue_id: string;
  task_id: string | null;
  summary: string;
  next_delay_seconds: number | null;
  next_context: PollContext | null;
  schedule_message: string | null;
  exit_code: number;
}

function printUsage(): never {
  console.error(`Usage:
  bun scripts/multica-poll.ts init --issue-id ISSUE-123 [--dispatched-at ISO] [--timeout-seconds 7200] [--max-error-retries 3]
  bun scripts/multica-poll.ts evaluate --context-json '{...}' --observed-state running [--task-id TASK-1] [--latest-message-seq 42] [--summary '...'] [--error-detail '...'] [--now ISO]
  bun scripts/multica-poll.ts schedule-message --context-json '{...}'
`);
  process.exit(2);
}

function getArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function requireArg(name: string): string {
  const value = getArg(name);
  if (!value) {
    console.error(`Missing required argument: ${name}`);
    process.exit(2);
  }
  return value;
}

function parseIntSafe(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseJson<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function secondsSince(iso: string, now: string): number {
  const start = Date.parse(iso);
  const end = Date.parse(now);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

function validateContext(ctx: Partial<PollContext>): PollContext {
  if (ctx.workflow !== "multica_poll") throw new Error("context.workflow must be 'multica_poll'");
  if (!ctx.issue_id) throw new Error("context.issue_id is required");
  if (!ctx.dispatched_at) throw new Error("context.dispatched_at is required");
  return {
    workflow: "multica_poll",
    issue_id: ctx.issue_id,
    dispatched_at: ctx.dispatched_at,
    check_count: Number(ctx.check_count ?? 0),
    last_task_id: ctx.last_task_id ?? null,
    last_status: ctx.last_status ?? null,
    last_message_seq:
      ctx.last_message_seq === undefined ? null : (ctx.last_message_seq ?? null),
    error_retry_count: Number(ctx.error_retry_count ?? 0),
    timeout_seconds: Number(ctx.timeout_seconds ?? 7200),
    max_error_retries: Number(ctx.max_error_retries ?? 3),
  };
}

function normalDelay(checkCount: number, elapsedSeconds: number, status: ObservedState): number {
  if (status === "no_run_yet" && checkCount < 3) return 15;
  if (elapsedSeconds < 300) return 30;
  if (elapsedSeconds < 1800) return 60;
  return 120;
}

function errorDelay(errorRetryCount: number): number {
  const schedule = [30, 60, 180];
  return schedule[Math.max(0, Math.min(errorRetryCount - 1, schedule.length - 1))] ?? 180;
}

function buildScheduleMessage(context: PollContext): string {
  return [
    "Continue Multica polling for this issue.",
    "",
    "Context:",
    JSON.stringify(context, null, 2),
    "",
    "Instructions:",
    "1. Check the current Multica run state for the issue.",
    "2. If the run is not terminal, update the context and schedule the next check.",
    "3. If the run completed successfully, summarize the result and stop scheduling.",
    "4. If the run failed or was cancelled, summarize the failure and stop scheduling.",
    "5. If polling itself errors, apply bounded retry with backoff.",
  ].join("\n");
}

function initContext(): PollContext {
  const issueId = requireArg("--issue-id");
  const dispatchedAt = getArg("--dispatched-at") || nowIso();
  return validateContext({
    workflow: "multica_poll",
    issue_id: issueId,
    dispatched_at: dispatchedAt,
    check_count: 0,
    last_task_id: null,
    last_status: null,
    last_message_seq: null,
    error_retry_count: 0,
    timeout_seconds: parseIntSafe(getArg("--timeout-seconds"), 7200),
    max_error_retries: parseIntSafe(getArg("--max-error-retries"), 3),
  });
}

function evaluate(input: EvaluateInput): Result {
  const context = validateContext(input.context);
  const state = input.observed_state;
  const now = input.now || nowIso();
  const elapsed = secondsSince(context.dispatched_at, now);
  const observedTaskId = input.task_id ?? context.last_task_id ?? null;

  if (elapsed > context.timeout_seconds) {
    return {
      ok: false,
      terminal: true,
      kind: "timeout",
      normalized_state: "timeout",
      issue_id: context.issue_id,
      task_id: observedTaskId,
      summary: `Polling timed out after ${elapsed}s for issue ${context.issue_id}.`,
      next_delay_seconds: null,
      next_context: null,
      schedule_message: null,
      exit_code: 21,
    };
  }

  if (state === "completed") {
    return {
      ok: true,
      terminal: true,
      kind: "success",
      normalized_state: state,
      issue_id: context.issue_id,
      task_id: observedTaskId,
      summary: input.summary || `Multica run completed for issue ${context.issue_id}.`,
      next_delay_seconds: null,
      next_context: null,
      schedule_message: null,
      exit_code: 0,
    };
  }

  if (state === "failed" || state === "cancelled") {
    return {
      ok: false,
      terminal: true,
      kind: "task_failure",
      normalized_state: state,
      issue_id: context.issue_id,
      task_id: observedTaskId,
      summary:
        input.summary ||
        `Multica run ended with state '${state}' for issue ${context.issue_id}.`,
      next_delay_seconds: null,
      next_context: null,
      schedule_message: null,
      exit_code: 20,
    };
  }

  if (state === "poll_error") {
    const nextRetryCount = context.error_retry_count + 1;
    if (nextRetryCount > context.max_error_retries) {
      return {
        ok: false,
        terminal: true,
        kind: "poller_failure",
        normalized_state: state,
        issue_id: context.issue_id,
        task_id: observedTaskId,
        summary:
          input.error_detail ||
          `Polling failed ${nextRetryCount} times for issue ${context.issue_id}.`,
        next_delay_seconds: null,
        next_context: null,
        schedule_message: null,
        exit_code: 40,
      };
    }

    const nextContext: PollContext = {
      ...context,
      check_count: context.check_count + 1,
      last_task_id: observedTaskId,
      last_status: state,
      error_retry_count: nextRetryCount,
    };

    return {
      ok: true,
      terminal: false,
      kind: "reschedule",
      normalized_state: state,
      issue_id: context.issue_id,
      task_id: observedTaskId,
      summary:
        input.error_detail ||
        `Polling error for issue ${context.issue_id}; retry ${nextRetryCount}/${context.max_error_retries}.`,
      next_delay_seconds: errorDelay(nextRetryCount),
      next_context: nextContext,
      schedule_message: buildScheduleMessage(nextContext),
      exit_code: 10,
    };
  }

  const taskChanged = observedTaskId && observedTaskId !== context.last_task_id;
  const nextContext: PollContext = {
    ...context,
    check_count: context.check_count + 1,
    last_task_id: observedTaskId,
    last_status: state,
    last_message_seq: taskChanged
      ? input.latest_message_seq ?? null
      : (input.latest_message_seq ?? context.last_message_seq ?? null),
    error_retry_count: 0,
  };

  return {
    ok: true,
    terminal: false,
    kind: "reschedule",
    normalized_state: state,
    issue_id: context.issue_id,
    task_id: observedTaskId,
    summary:
      input.summary ||
      `Multica run for issue ${context.issue_id} is '${state}'; polling will continue.`,
    next_delay_seconds: normalDelay(context.check_count, elapsed, state),
    next_context: nextContext,
    schedule_message: buildScheduleMessage(nextContext),
    exit_code: state === "no_run_yet" ? 30 : 10,
  };
}

function main() {
  const command = process.argv[2];
  if (!command) printUsage();

  if (command === "init") {
    const context = initContext();
    console.log(JSON.stringify({
      context,
      first_delay_seconds: 30,
      schedule_message: buildScheduleMessage(context),
    }, null, 2));
    process.exit(0);
  }

  if (command === "schedule-message") {
    const context = validateContext(parseJson<PollContext>(requireArg("--context-json")));
    console.log(buildScheduleMessage(context));
    process.exit(0);
  }

  if (command === "evaluate") {
    const input: EvaluateInput = {
      context: parseJson<PollContext>(requireArg("--context-json")),
      observed_state: requireArg("--observed-state") as ObservedState,
      task_id: getArg("--task-id"),
      latest_message_seq: getArg("--latest-message-seq")
        ? parseIntSafe(getArg("--latest-message-seq"), 0)
        : null,
      summary: getArg("--summary"),
      error_detail: getArg("--error-detail"),
      now: getArg("--now"),
    };
    const result = evaluate(input);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.exit_code);
  }

  printUsage();
}

main();
