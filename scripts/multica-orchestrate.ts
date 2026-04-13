#!/usr/bin/env bun

type ObservedState =
  | "no_run_yet"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "poll_error";

type StageName = "plan" | "build" | "review";

type ValidatorStatus = "pending" | "passed" | "failed";

type OrchestratorKind = "reschedule" | "handoff" | "done" | "blocked" | "needs_human";

interface StageHistoryEntry {
  stage: StageName;
  issue_id: string;
  task_id: string | null;
  observed_state: ObservedState;
  validator_status: ValidatorStatus;
  outcome: OrchestratorKind;
  summary: string;
  recorded_at: string;
}

interface OrchestratorContext {
  workflow: "multica_orchestrator";
  root_issue_id: string;
  current_stage: StageName;
  current_issue_id: string;
  next_stage: StageName | "done" | null;
  attempt: number;
  last_task_id: string | null;
  last_observed_status: ObservedState | null;
  validator_status: ValidatorStatus;
  handoff_ready: boolean;
  escalation_count: number;
  max_stage_attempts: number;
  history: StageHistoryEntry[];
}

interface ArtifactInput {
  stage?: string;
  verdict?: string | null;
  fields?: Record<string, unknown>;
}

interface EvaluateInput {
  context: OrchestratorContext;
  observed_state: ObservedState;
  task_id?: string | null;
  artifact?: ArtifactInput | null;
  summary?: string | null;
  now?: string | null;
}

interface ValidationResult {
  ok: boolean;
  stage: StageName;
  missing_fields: string[];
  invalid_fields: string[];
  summary: string;
  next_recommendation: OrchestratorKind;
}

interface EvaluateResult {
  ok: boolean;
  terminal: boolean;
  kind: OrchestratorKind;
  current_stage: StageName;
  current_issue_id: string;
  next_stage: StageName | "done" | null;
  task_id: string | null;
  validator_status: ValidatorStatus;
  handoff_ready: boolean;
  summary: string;
  validation: ValidationResult | null;
  next_context: OrchestratorContext | null;
  schedule_message: string | null;
  exit_code: number;
}

const REQUIRED_FIELDS: Record<StageName, string[]> = {
  plan: [
    "observed_problem",
    "evidence",
    "root_cause",
    "affected_surface",
    "implementation_shape",
    "acceptance_criteria",
    "risks",
  ],
  build: [
    "branch",
    "commit_sha",
    "changed_files",
    "commands_run",
    "test_results",
    "risks",
  ],
  review: [
    "verdict",
    "evidence",
    "risks",
    "next_action",
  ],
};

function printUsage(): never {
  console.error(`Usage:
  bun scripts/multica-orchestrate.ts init --root-issue-id ISSUE-100 --current-stage plan --current-issue-id ISSUE-101 [--next-stage build] [--max-stage-attempts 2]
  bun scripts/multica-orchestrate.ts evaluate --context-json '{...}' --observed-state completed [--task-id TASK-1] [--artifact-json '{...}'] [--summary '...'] [--now ISO]
  bun scripts/multica-orchestrate.ts schedule-message --context-json '{...}'
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

function parseJson<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

function parseIntSafe(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

function nowIso(): string {
  return new Date().toISOString();
}

function isStageName(value: string | null | undefined): value is StageName {
  return value === "plan" || value === "build" || value === "review";
}

function normalizeNextStage(value: string | null | undefined): StageName | "done" | null {
  if (!value) return null;
  if (value === "done") return "done";
  if (isStageName(value)) return value;
  throw new Error(`invalid next stage: ${value}`);
}

function validateContext(ctx: Partial<OrchestratorContext>): OrchestratorContext {
  if (ctx.workflow !== "multica_orchestrator") {
    throw new Error("context.workflow must be 'multica_orchestrator'");
  }
  if (!ctx.root_issue_id) throw new Error("context.root_issue_id is required");
  if (!isStageName(ctx.current_stage)) throw new Error("context.current_stage must be plan/build/review");
  if (!ctx.current_issue_id) throw new Error("context.current_issue_id is required");

  return {
    workflow: "multica_orchestrator",
    root_issue_id: ctx.root_issue_id,
    current_stage: ctx.current_stage,
    current_issue_id: ctx.current_issue_id,
    next_stage: normalizeNextStage(ctx.next_stage),
    attempt: Number(ctx.attempt ?? 1),
    last_task_id: ctx.last_task_id ?? null,
    last_observed_status: (ctx.last_observed_status ?? null) as ObservedState | null,
    validator_status: (ctx.validator_status ?? "pending") as ValidatorStatus,
    handoff_ready: Boolean(ctx.handoff_ready ?? false),
    escalation_count: Number(ctx.escalation_count ?? 0),
    max_stage_attempts: Number(ctx.max_stage_attempts ?? 2),
    history: Array.isArray(ctx.history) ? ctx.history : [],
  };
}

function buildScheduleMessage(context: OrchestratorContext): string {
  return [
    "Continue Multica stage orchestration for this workflow.",
    "",
    "Context:",
    JSON.stringify(context, null, 2),
    "",
    "Instructions:",
    "1. Inspect the current issue/task execution state.",
    "2. If execution is non-terminal, reschedule.",
    "3. If execution is terminal, parse the stage artifact.",
    "4. Validate the artifact for the current stage.",
    "5. If validation passes, hand off to the next stage or finish the workflow.",
    "6. If validation fails, issue a corrective follow-up or escalate according to attempt budget.",
  ].join("\n");
}

function initContext(): OrchestratorContext {
  const currentStage = requireArg("--current-stage");
  if (!isStageName(currentStage)) {
    throw new Error("--current-stage must be one of: plan, build, review");
  }

  return validateContext({
    workflow: "multica_orchestrator",
    root_issue_id: requireArg("--root-issue-id"),
    current_stage: currentStage,
    current_issue_id: requireArg("--current-issue-id"),
    next_stage: normalizeNextStage(getArg("--next-stage")),
    attempt: 1,
    last_task_id: null,
    last_observed_status: null,
    validator_status: "pending",
    handoff_ready: false,
    escalation_count: 0,
    max_stage_attempts: parseIntSafe(getArg("--max-stage-attempts"), 2),
    history: [],
  });
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function artifactFields(artifact: ArtifactInput | null | undefined): Record<string, unknown> {
  return artifact?.fields && typeof artifact.fields === "object" ? artifact.fields : {};
}

function validateArtifact(stage: StageName, artifact: ArtifactInput | null | undefined): ValidationResult {
  const fields = artifactFields(artifact);
  const required = REQUIRED_FIELDS[stage];
  const missing_fields: string[] = [];
  const invalid_fields: string[] = [];

  for (const key of required) {
    const value = key === "verdict" ? (artifact?.verdict ?? fields[key]) : fields[key];
    if (!asNonEmptyString(value)) {
      missing_fields.push(key);
    }
  }

  if (artifact?.stage && artifact.stage !== stage) {
    invalid_fields.push(`stage:${artifact.stage}`);
  }

  if (stage === "review") {
    const verdict = asNonEmptyString(artifact?.verdict ?? fields.verdict);
    if (verdict && verdict !== "GO" && verdict !== "NO_GO") {
      invalid_fields.push("verdict");
    }
  }

  const ok = missing_fields.length === 0 && invalid_fields.length === 0;
  const next_recommendation: OrchestratorKind = ok
    ? stage === "review"
      ? asNonEmptyString(artifact?.verdict ?? fields.verdict) === "GO"
        ? "done"
        : "blocked"
      : "handoff"
    : "reschedule";

  let summary = `${stage} artifact validation passed.`;
  if (!ok) {
    const parts: string[] = [];
    if (missing_fields.length > 0) parts.push(`missing: ${missing_fields.join(", ")}`);
    if (invalid_fields.length > 0) parts.push(`invalid: ${invalid_fields.join(", ")}`);
    summary = `${stage} artifact validation failed (${parts.join("; ")}).`;
  }

  return {
    ok,
    stage,
    missing_fields,
    invalid_fields,
    summary,
    next_recommendation,
  };
}

function pushHistory(
  context: OrchestratorContext,
  observedState: ObservedState,
  taskId: string | null,
  validatorStatus: ValidatorStatus,
  outcome: OrchestratorKind,
  summary: string,
  recordedAt: string,
): StageHistoryEntry[] {
  return [
    ...context.history,
    {
      stage: context.current_stage,
      issue_id: context.current_issue_id,
      task_id: taskId,
      observed_state: observedState,
      validator_status: validatorStatus,
      outcome,
      summary,
      recorded_at: recordedAt,
    },
  ];
}

function evaluate(input: EvaluateInput): EvaluateResult {
  const context = validateContext(input.context);
  const observedState = input.observed_state;
  const now = input.now || nowIso();
  const taskId = input.task_id ?? context.last_task_id ?? null;

  if (observedState === "no_run_yet" || observedState === "queued" || observedState === "running") {
    const nextContext = validateContext({
      ...context,
      last_task_id: taskId,
      last_observed_status: observedState,
      validator_status: "pending",
      handoff_ready: false,
    });

    return {
      ok: true,
      terminal: false,
      kind: "reschedule",
      current_stage: context.current_stage,
      current_issue_id: context.current_issue_id,
      next_stage: context.next_stage,
      task_id: taskId,
      validator_status: "pending",
      handoff_ready: false,
      summary: input.summary || `Stage ${context.current_stage} is still ${observedState}; orchestration will continue.`,
      validation: null,
      next_context: nextContext,
      schedule_message: buildScheduleMessage(nextContext),
      exit_code: 10,
    };
  }

  if (observedState === "poll_error") {
    const nextEscalationCount = context.escalation_count + 1;
    if (nextEscalationCount >= context.max_stage_attempts) {
      const nextContext = validateContext({
        ...context,
        last_task_id: taskId,
        last_observed_status: observedState,
        validator_status: context.validator_status,
        handoff_ready: false,
        escalation_count: nextEscalationCount,
        history: pushHistory(
          context,
          observedState,
          taskId,
          context.validator_status,
          "needs_human",
          input.summary || `Observation failed repeatedly for stage ${context.current_stage}.`,
          now,
        ),
      });

      return {
        ok: false,
        terminal: true,
        kind: "needs_human",
        current_stage: context.current_stage,
        current_issue_id: context.current_issue_id,
        next_stage: context.next_stage,
        task_id: taskId,
        validator_status: context.validator_status,
        handoff_ready: false,
        summary: input.summary || `Observation failed repeatedly for stage ${context.current_stage}; human intervention required.`,
        validation: null,
        next_context: nextContext,
        schedule_message: null,
        exit_code: 40,
      };
    }

    const nextContext = validateContext({
      ...context,
      last_task_id: taskId,
      last_observed_status: observedState,
      handoff_ready: false,
      escalation_count: nextEscalationCount,
    });

    return {
      ok: true,
      terminal: false,
      kind: "reschedule",
      current_stage: context.current_stage,
      current_issue_id: context.current_issue_id,
      next_stage: context.next_stage,
      task_id: taskId,
      validator_status: context.validator_status,
      handoff_ready: false,
      summary: input.summary || `Observation failed for stage ${context.current_stage}; retrying with bounded budget.`,
      validation: null,
      next_context: nextContext,
      schedule_message: buildScheduleMessage(nextContext),
      exit_code: 11,
    };
  }

  if (observedState === "failed" || observedState === "cancelled") {
    const nextContext = validateContext({
      ...context,
      last_task_id: taskId,
      last_observed_status: observedState,
      validator_status: "failed",
      handoff_ready: false,
      history: pushHistory(
        context,
        observedState,
        taskId,
        "failed",
        "blocked",
        input.summary || `Stage ${context.current_stage} execution ended as ${observedState}.`,
        now,
      ),
    });

    return {
      ok: false,
      terminal: true,
      kind: "blocked",
      current_stage: context.current_stage,
      current_issue_id: context.current_issue_id,
      next_stage: context.next_stage,
      task_id: taskId,
      validator_status: "failed",
      handoff_ready: false,
      summary: input.summary || `Stage ${context.current_stage} execution ended as ${observedState}; automatic handoff stopped.`,
      validation: null,
      next_context: nextContext,
      schedule_message: null,
      exit_code: 20,
    };
  }

  const validation = validateArtifact(context.current_stage, input.artifact);
  if (!validation.ok) {
    const nextAttempt = context.attempt + 1;
    const exhausted = nextAttempt > context.max_stage_attempts;
    const outcome: OrchestratorKind = exhausted ? "needs_human" : "reschedule";
    const nextContext = validateContext({
      ...context,
      attempt: nextAttempt,
      last_task_id: taskId,
      last_observed_status: observedState,
      validator_status: "failed",
      handoff_ready: false,
      escalation_count: exhausted ? context.escalation_count + 1 : context.escalation_count,
      history: pushHistory(context, observedState, taskId, "failed", outcome, validation.summary, now),
    });

    return {
      ok: !exhausted,
      terminal: exhausted,
      kind: outcome,
      current_stage: context.current_stage,
      current_issue_id: context.current_issue_id,
      next_stage: context.next_stage,
      task_id: taskId,
      validator_status: "failed",
      handoff_ready: false,
      summary: exhausted
        ? `${validation.summary} Automatic stage retries are exhausted.`
        : `${validation.summary} A corrective follow-up should be issued for the same stage.`,
      validation,
      next_context: nextContext,
      schedule_message: exhausted ? null : buildScheduleMessage(nextContext),
      exit_code: exhausted ? 41 : 12,
    };
  }

  const terminalKind: OrchestratorKind = validation.next_recommendation;
  const nextContext = validateContext({
    ...context,
    last_task_id: taskId,
    last_observed_status: observedState,
    validator_status: "passed",
    handoff_ready: terminalKind === "handoff" || terminalKind === "done",
    history: pushHistory(context, observedState, taskId, "passed", terminalKind, validation.summary, now),
  });

  if (terminalKind === "done") {
    return {
      ok: true,
      terminal: true,
      kind: "done",
      current_stage: context.current_stage,
      current_issue_id: context.current_issue_id,
      next_stage: "done",
      task_id: taskId,
      validator_status: "passed",
      handoff_ready: true,
      summary: input.summary || `Stage ${context.current_stage} passed validation and the workflow is complete.`,
      validation,
      next_context: nextContext,
      schedule_message: null,
      exit_code: 0,
    };
  }

  if (terminalKind === "blocked") {
    return {
      ok: false,
      terminal: true,
      kind: "blocked",
      current_stage: context.current_stage,
      current_issue_id: context.current_issue_id,
      next_stage: context.next_stage,
      task_id: taskId,
      validator_status: "passed",
      handoff_ready: false,
      summary: input.summary || `Stage ${context.current_stage} validated but recommended a blocking verdict.`,
      validation,
      next_context: nextContext,
      schedule_message: null,
      exit_code: 21,
    };
  }

  return {
    ok: true,
    terminal: true,
    kind: "handoff",
    current_stage: context.current_stage,
    current_issue_id: context.current_issue_id,
    next_stage: context.next_stage,
    task_id: taskId,
    validator_status: "passed",
    handoff_ready: true,
    summary: input.summary || `Stage ${context.current_stage} passed validation and is ready for handoff to ${context.next_stage}.`,
    validation,
    next_context: nextContext,
    schedule_message: null,
    exit_code: 30,
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
    const context = validateContext(parseJson<OrchestratorContext>(requireArg("--context-json")));
    console.log(buildScheduleMessage(context));
    process.exit(0);
  }

  if (command === "evaluate") {
    const input: EvaluateInput = {
      context: parseJson<OrchestratorContext>(requireArg("--context-json")),
      observed_state: requireArg("--observed-state") as ObservedState,
      task_id: getArg("--task-id"),
      artifact: getArg("--artifact-json") ? parseJson<ArtifactInput>(requireArg("--artifact-json")) : null,
      summary: getArg("--summary"),
      now: getArg("--now"),
    };
    const result = evaluate(input);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.exit_code);
  }

  printUsage();
}

main();
