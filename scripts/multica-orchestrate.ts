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
type WorkflowTerminalStage = StageName | "done";
type ValidatorStatus = "pending" | "passed" | "failed";
type OrchestratorKind = "reschedule" | "handoff" | "done" | "blocked" | "needs_human";
type DeliveryMode =
  | "commit+push"
  | "commit+push+pr"
  | "local-artifact"
  | "issue-comment"
  | "artifact+comment";

type DeliveryStatus = "satisfied" | "fallback_used" | "missing" | "not_applicable";

interface WorkflowStageSpec {
  issue_id: string;
  assignee_label?: string | null;
}

interface WorkflowGraph {
  plan: WorkflowStageSpec;
  build: WorkflowStageSpec;
  review: WorkflowStageSpec;
}

interface StageHistoryEntry {
  stage: StageName;
  issue_id: string;
  task_id: string | null;
  observed_state: ObservedState;
  validator_status: ValidatorStatus;
  outcome: OrchestratorKind;
  summary: string;
  recorded_at: string;
  artifact_comment_id?: string | null;
}

interface TransitionAudit {
  recorded_at: string;
  stage: StageName;
  issue_id: string;
  task_id: string | null;
  observed_state: ObservedState;
  artifact_comment_id: string | null;
  artifact_sha256: string | null;
  validation_ok: boolean;
  validator_status: ValidatorStatus;
  decision: OrchestratorKind;
  next_stage: WorkflowTerminalStage | null;
  summary: string;
}

interface OrchestratorContext {
  workflow: "multica_orchestrator";
  schema_version: 2;
  root_issue_id: string;
  workflow_graph: WorkflowGraph;
  current_stage: StageName;
  current_issue_id: string;
  next_stage: WorkflowTerminalStage | null;
  attempt: number;
  last_task_id: string | null;
  last_observed_status: ObservedState | null;
  validator_status: ValidatorStatus;
  handoff_ready: boolean;
  escalation_count: number;
  max_stage_attempts: number;
  expected_delivery_mode: DeliveryMode | null;
  history: StageHistoryEntry[];
  last_transition_audit: TransitionAudit | null;
}

interface DeliveryEvidence {
  mode?: string | null;
  status?: string | null;
  branch?: string | null;
  commit_sha?: string | null;
  pr_url?: string | null;
  artifact_path?: string | null;
  comment_ref?: string | null;
}

interface ArtifactInput {
  schema_version?: number | null;
  stage?: string;
  status?: string | null;
  summary?: string | null;
  verdict?: string | null;
  next_recommendation?: string | null;
  comment_id?: string | null;
  source?: string | null;
  fields?: Record<string, unknown>;
  delivery?: DeliveryEvidence | null;
}

interface ParseArtifactResult {
  ok: boolean;
  artifact: ArtifactInput | null;
  summary: string;
  source: "json" | "fenced_json" | "none";
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
  delivery_check: {
    required: boolean;
    expected_mode: DeliveryMode | null;
    status: DeliveryStatus;
    summary: string;
  };
}

interface EvaluateResult {
  ok: boolean;
  terminal: boolean;
  kind: OrchestratorKind;
  current_stage: StageName;
  current_issue_id: string;
  next_stage: WorkflowTerminalStage | null;
  task_id: string | null;
  validator_status: ValidatorStatus;
  handoff_ready: boolean;
  summary: string;
  validation: ValidationResult | null;
  next_context: OrchestratorContext | null;
  transition_audit: TransitionAudit | null;
  authoritative_comment: string | null;
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

const STAGE_ORDER: StageName[] = ["plan", "build", "review"];

function printUsage(): never {
  console.error(`Usage:
  bun scripts/multica-orchestrate.ts init --root-issue-id ISSUE-100 --plan-issue-id ISSUE-101 --build-issue-id ISSUE-102 --review-issue-id ISSUE-103 [--current-stage plan] [--max-stage-attempts 2] [--expected-delivery-mode commit+push]
  bun scripts/multica-orchestrate.ts evaluate --context-json '{...}' --observed-state completed [--task-id TASK-1] [--artifact-json '{...}'] [--summary '...'] [--now ISO]
  bun scripts/multica-orchestrate.ts parse-artifact --text-file ./comment.md
  bun scripts/multica-orchestrate.ts render-handoff-comment --context-json '{...}' --decision-json '{...}'
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

function isDeliveryMode(value: string | null | undefined): value is DeliveryMode {
  return value === "commit+push"
    || value === "commit+push+pr"
    || value === "local-artifact"
    || value === "issue-comment"
    || value === "artifact+comment";
}

function normalizeNextStage(value: string | null | undefined): WorkflowTerminalStage | null {
  if (!value) return null;
  if (value === "done") return "done";
  if (isStageName(value)) return value;
  throw new Error(`invalid next stage: ${value}`);
}

function nextStageFor(stage: StageName): WorkflowTerminalStage {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx >= 0 && idx < STAGE_ORDER.length - 1 ? STAGE_ORDER[idx + 1]! : "done";
}

function normalizeWorkflowGraph(raw: Partial<WorkflowGraph> | undefined, fallbackCurrentIssueId?: string): WorkflowGraph {
  const planIssue = raw?.plan?.issue_id ?? fallbackCurrentIssueId;
  if (!planIssue || !raw?.build?.issue_id || !raw?.review?.issue_id) {
    throw new Error("workflow_graph requires plan/build/review issue_id values");
  }
  return {
    plan: { issue_id: planIssue, assignee_label: raw?.plan?.assignee_label ?? null },
    build: { issue_id: raw.build.issue_id, assignee_label: raw.build.assignee_label ?? null },
    review: { issue_id: raw.review.issue_id, assignee_label: raw.review.assignee_label ?? null },
  };
}

function validateContext(ctx: Partial<OrchestratorContext>): OrchestratorContext {
  if (ctx.workflow !== "multica_orchestrator") {
    throw new Error("context.workflow must be 'multica_orchestrator'");
  }
  if (!ctx.root_issue_id) throw new Error("context.root_issue_id is required");
  if (!isStageName(ctx.current_stage)) throw new Error("context.current_stage must be plan/build/review");

  const workflowGraph = normalizeWorkflowGraph(ctx.workflow_graph, ctx.current_issue_id);
  const currentIssueId = ctx.current_issue_id ?? workflowGraph[ctx.current_stage].issue_id;
  if (!currentIssueId) throw new Error("context.current_issue_id is required");

  return {
    workflow: "multica_orchestrator",
    schema_version: 2,
    root_issue_id: ctx.root_issue_id,
    workflow_graph: workflowGraph,
    current_stage: ctx.current_stage,
    current_issue_id: currentIssueId,
    next_stage: normalizeNextStage(ctx.next_stage ?? nextStageFor(ctx.current_stage)),
    attempt: Number(ctx.attempt ?? 1),
    last_task_id: ctx.last_task_id ?? null,
    last_observed_status: (ctx.last_observed_status ?? null) as ObservedState | null,
    validator_status: (ctx.validator_status ?? "pending") as ValidatorStatus,
    handoff_ready: Boolean(ctx.handoff_ready ?? false),
    escalation_count: Number(ctx.escalation_count ?? 0),
    max_stage_attempts: Number(ctx.max_stage_attempts ?? 2),
    expected_delivery_mode: isDeliveryMode(ctx.expected_delivery_mode ?? null) ? ctx.expected_delivery_mode! : null,
    history: Array.isArray(ctx.history) ? ctx.history : [],
    last_transition_audit: ctx.last_transition_audit ?? null,
  };
}

function buildScheduleMessage(context: OrchestratorContext): string {
  return [
    "Continue Multica workflow control for this staged issue tree.",
    "",
    "Context:",
    JSON.stringify(context, null, 2),
    "",
    "Controller rules:",
    "1. Inspect the current issue/task execution state.",
    "2. If execution is non-terminal, reschedule without changing stage ownership.",
    "3. If execution is terminal, parse only the canonical STAGE_RESULT artifact.",
    "4. Validate required stage fields and delivery-mode evidence.",
    "5. Only after validator pass may you post an authoritative handoff note and reassign the next-stage issue.",
    "6. Keep task failure, poller failure, and validator failure separate in reporting.",
    "7. Persist the updated context and transition audit into the next scheduled message.",
  ].join("\n");
}

function initContext(): OrchestratorContext {
  const currentStage = getArg("--current-stage") || "plan";
  if (!isStageName(currentStage)) {
    throw new Error("--current-stage must be one of: plan, build, review");
  }

  const workflowGraph = normalizeWorkflowGraph({
    plan: {
      issue_id: requireArg("--plan-issue-id"),
      assignee_label: getArg("--plan-assignee-label"),
    },
    build: {
      issue_id: requireArg("--build-issue-id"),
      assignee_label: getArg("--build-assignee-label"),
    },
    review: {
      issue_id: requireArg("--review-issue-id"),
      assignee_label: getArg("--review-assignee-label"),
    },
  });

  return validateContext({
    workflow: "multica_orchestrator",
    schema_version: 2,
    root_issue_id: requireArg("--root-issue-id"),
    workflow_graph: workflowGraph,
    current_stage: currentStage,
    current_issue_id: workflowGraph[currentStage].issue_id,
    next_stage: nextStageFor(currentStage),
    attempt: 1,
    last_task_id: null,
    last_observed_status: null,
    validator_status: "pending",
    handoff_ready: false,
    escalation_count: 0,
    max_stage_attempts: parseIntSafe(getArg("--max-stage-attempts"), 2),
    expected_delivery_mode: isDeliveryMode(getArg("--expected-delivery-mode"))
      ? (getArg("--expected-delivery-mode") as DeliveryMode)
      : null,
    history: [],
    last_transition_audit: null,
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

async function readTextFile(filePath: string): Promise<string> {
  return await Bun.file(filePath).text();
}

function tryParseArtifactFromText(text: string): ParseArtifactResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, artifact: null, summary: "No artifact text provided.", source: "none" };
  }

  try {
    const direct = JSON.parse(trimmed) as ArtifactInput;
    return { ok: true, artifact: direct, summary: "Parsed artifact from raw JSON.", source: "json" };
  } catch {
    // ignore
  }

  const fencedMatches = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)];
  for (const match of fencedMatches) {
    const payload = match[1]?.trim();
    if (!payload) continue;
    try {
      const parsed = JSON.parse(payload) as ArtifactInput;
      if (parsed && typeof parsed === "object" && parsed.stage) {
        return {
          ok: true,
          artifact: parsed,
          summary: "Parsed artifact from fenced JSON block.",
          source: "fenced_json",
        };
      }
    } catch {
      // continue
    }
  }

  return {
    ok: false,
    artifact: null,
    summary: "No canonical JSON STAGE_RESULT artifact found.",
    source: "none",
  };
}

function normalizeDeliveryStatus(value: string | null | undefined): DeliveryStatus {
  if (value === "satisfied" || value === "fallback_used" || value === "missing" || value === "not_applicable") {
    return value;
  }
  return "missing";
}

async function sha256Hex(input: string | null | undefined): Promise<string | null> {
  const raw = asNonEmptyString(input);
  if (!raw) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function deliveryCheck(
  stage: StageName,
  expectedMode: DeliveryMode | null,
  artifact: ArtifactInput | null | undefined,
): ValidationResult["delivery_check"] {
  if (stage !== "build") {
    return {
      required: false,
      expected_mode: expectedMode,
      status: "not_applicable",
      summary: "Delivery-mode gate is only enforced on build stage.",
    };
  }

  const delivery = artifact?.delivery ?? null;
  const observedMode = asNonEmptyString(delivery?.mode);
  const status = normalizeDeliveryStatus(asNonEmptyString(delivery?.status));

  if (!expectedMode) {
    return {
      required: true,
      expected_mode: null,
      status,
      summary: "Build delivery-mode gate cannot be verified because expected_delivery_mode is missing from controller context.",
    };
  }

  if (observedMode !== expectedMode) {
    return {
      required: true,
      expected_mode: expectedMode,
      status: "missing",
      summary: `Build delivery mode mismatch: expected ${expectedMode}, observed ${observedMode ?? "none"}.`,
    };
  }

  if (status !== "satisfied" && status !== "fallback_used") {
    return {
      required: true,
      expected_mode: expectedMode,
      status,
      summary: `Build delivery mode ${expectedMode} is not yet satisfied.` ,
    };
  }

  return {
    required: true,
    expected_mode: expectedMode,
    status,
    summary: `Build delivery mode ${expectedMode} verified as ${status}.`,
  };
}

function validateArtifact(
  stage: StageName,
  artifact: ArtifactInput | null | undefined,
  expectedDeliveryMode: DeliveryMode | null,
): ValidationResult {
  const fields = artifactFields(artifact);
  const required = REQUIRED_FIELDS[stage];
  const missing_fields: string[] = [];
  const invalid_fields: string[] = [];

  if (artifact?.schema_version !== 1) {
    invalid_fields.push("schema_version");
  }

  if (asNonEmptyString(artifact?.status) !== "ready_for_handoff") {
    invalid_fields.push("status");
  }

  if (!asNonEmptyString(artifact?.summary)) {
    missing_fields.push("summary");
  }

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

  const delivery = deliveryCheck(stage, expectedDeliveryMode, artifact);
  if (delivery.required && delivery.status !== "satisfied" && delivery.status !== "fallback_used") {
    invalid_fields.push("delivery");
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
    parts.push(delivery.summary);
    summary = `${stage} artifact validation failed (${parts.join("; ")}).`;
  }

  return {
    ok,
    stage,
    missing_fields,
    invalid_fields,
    summary,
    next_recommendation,
    delivery_check: delivery,
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
  artifactCommentId: string | null,
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
      artifact_comment_id: artifactCommentId,
    },
  ];
}

function buildTransitionAudit(args: {
  context: OrchestratorContext;
  observedState: ObservedState;
  taskId: string | null;
  artifact: ArtifactInput | null | undefined;
  artifactSha: string | null;
  validationOk: boolean;
  validatorStatus: ValidatorStatus;
  decision: OrchestratorKind;
  nextStage: WorkflowTerminalStage | null;
  summary: string;
  now: string;
}): TransitionAudit {
  return {
    recorded_at: args.now,
    stage: args.context.current_stage,
    issue_id: args.context.current_issue_id,
    task_id: args.taskId,
    observed_state: args.observedState,
    artifact_comment_id: args.artifact?.comment_id ?? null,
    artifact_sha256: args.artifactSha,
    validation_ok: args.validationOk,
    validator_status: args.validatorStatus,
    decision: args.decision,
    next_stage: args.nextStage,
    summary: args.summary,
  };
}

function renderAuthoritativeComment(context: OrchestratorContext, result: EvaluateResult): string | null {
  if (!result.transition_audit) return null;
  const audit = result.transition_audit;
  const lines = [
    "## WORKFLOW_CONTROLLER_DECISION",
    `stage: ${audit.stage}`,
    `issue_id: ${audit.issue_id}`,
    `task_id: ${audit.task_id ?? "n/a"}`,
    `observed_state: ${audit.observed_state}`,
    `validator_status: ${audit.validator_status}`,
    `decision: ${audit.decision}`,
    `next_stage: ${audit.next_stage ?? "n/a"}`,
    `artifact_comment_id: ${audit.artifact_comment_id ?? "n/a"}`,
    `artifact_sha256: ${audit.artifact_sha256 ?? "n/a"}`,
    "",
    "## SUMMARY",
    result.summary,
  ];

  if (result.validation) {
    lines.push(
      "",
      "## VALIDATION",
      `summary: ${result.validation.summary}`,
      `delivery_check: ${result.validation.delivery_check.summary}`,
    );
  }

  if (result.kind === "handoff" && result.next_stage && result.next_stage !== "done") {
    const nextSpec = context.workflow_graph[result.next_stage];
    lines.push(
      "",
      "## NEXT_ACTION",
      `Post this as the authoritative handoff note, then assign ${nextSpec.issue_id} to ${nextSpec.assignee_label ?? "the configured next-stage agent"}.`,
    );
  }

  return lines.join("\n");
}

async function evaluate(input: EvaluateInput): Promise<EvaluateResult> {
  const context = validateContext(input.context);
  const observedState = input.observed_state;
  const now = input.now || nowIso();
  const taskId = input.task_id ?? context.last_task_id ?? null;
  const artifactSha = await sha256Hex(input.artifact ? JSON.stringify(input.artifact) : null);

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
      summary: input.summary || `Stage ${context.current_stage} is still ${observedState}; controller will continue waiting.`,
      validation: null,
      next_context: nextContext,
      transition_audit: null,
      authoritative_comment: null,
      schedule_message: buildScheduleMessage(nextContext),
      exit_code: 10,
    };
  }

  if (observedState === "poll_error") {
    const nextEscalationCount = context.escalation_count + 1;
    if (nextEscalationCount >= context.max_stage_attempts) {
      const summary = input.summary || `Observation failed repeatedly for stage ${context.current_stage}; human intervention required.`;
      const audit = buildTransitionAudit({
        context,
        observedState,
        taskId,
        artifact: input.artifact,
        artifactSha,
        validationOk: false,
        validatorStatus: context.validator_status,
        decision: "needs_human",
        nextStage: context.next_stage,
        summary,
        now,
      });
      const nextContext = validateContext({
        ...context,
        last_task_id: taskId,
        last_observed_status: observedState,
        handoff_ready: false,
        escalation_count: nextEscalationCount,
        history: pushHistory(context, observedState, taskId, context.validator_status, "needs_human", summary, now, input.artifact?.comment_id ?? null),
        last_transition_audit: audit,
      });

      const result: EvaluateResult = {
        ok: false,
        terminal: true,
        kind: "needs_human",
        current_stage: context.current_stage,
        current_issue_id: context.current_issue_id,
        next_stage: context.next_stage,
        task_id: taskId,
        validator_status: context.validator_status,
        handoff_ready: false,
        summary,
        validation: null,
        next_context: nextContext,
        transition_audit: audit,
        authoritative_comment: null,
        schedule_message: null,
        exit_code: 40,
      };
      result.authoritative_comment = renderAuthoritativeComment(context, result);
      return result;
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
      summary: input.summary || `Observation failed for stage ${context.current_stage}; bounded retry will continue.`,
      validation: null,
      next_context: nextContext,
      transition_audit: null,
      authoritative_comment: null,
      schedule_message: buildScheduleMessage(nextContext),
      exit_code: 11,
    };
  }

  if (observedState === "failed" || observedState === "cancelled") {
    const summary = input.summary || `Stage ${context.current_stage} execution ended as ${observedState}; automatic handoff stopped.`;
    const audit = buildTransitionAudit({
      context,
      observedState,
      taskId,
      artifact: input.artifact,
      artifactSha,
      validationOk: false,
      validatorStatus: "failed",
      decision: "blocked",
      nextStage: context.next_stage,
      summary,
      now,
    });
    const nextContext = validateContext({
      ...context,
      last_task_id: taskId,
      last_observed_status: observedState,
      validator_status: "failed",
      handoff_ready: false,
      history: pushHistory(context, observedState, taskId, "failed", "blocked", summary, now, input.artifact?.comment_id ?? null),
      last_transition_audit: audit,
    });

    const result: EvaluateResult = {
      ok: false,
      terminal: true,
      kind: "blocked",
      current_stage: context.current_stage,
      current_issue_id: context.current_issue_id,
      next_stage: context.next_stage,
      task_id: taskId,
      validator_status: "failed",
      handoff_ready: false,
      summary,
      validation: null,
      next_context: nextContext,
      transition_audit: audit,
      authoritative_comment: null,
      schedule_message: null,
      exit_code: 20,
    };
    result.authoritative_comment = renderAuthoritativeComment(context, result);
    return result;
  }

  const validation = validateArtifact(context.current_stage, input.artifact, context.expected_delivery_mode);
  if (!validation.ok) {
    const nextAttempt = context.attempt + 1;
    const exhausted = nextAttempt > context.max_stage_attempts;
    const outcome: OrchestratorKind = exhausted ? "needs_human" : "reschedule";
    const summary = exhausted
      ? `${validation.summary} Automatic stage retries are exhausted.`
      : `${validation.summary} A corrective follow-up should be issued for the same stage.`;
    const audit = buildTransitionAudit({
      context,
      observedState,
      taskId,
      artifact: input.artifact,
      artifactSha,
      validationOk: false,
      validatorStatus: "failed",
      decision: outcome,
      nextStage: context.next_stage,
      summary,
      now,
    });
    const nextContext = validateContext({
      ...context,
      attempt: nextAttempt,
      last_task_id: taskId,
      last_observed_status: observedState,
      validator_status: "failed",
      handoff_ready: false,
      escalation_count: exhausted ? context.escalation_count + 1 : context.escalation_count,
      history: pushHistory(context, observedState, taskId, "failed", outcome, validation.summary, now, input.artifact?.comment_id ?? null),
      last_transition_audit: audit,
    });

    const result: EvaluateResult = {
      ok: !exhausted,
      terminal: exhausted,
      kind: outcome,
      current_stage: context.current_stage,
      current_issue_id: context.current_issue_id,
      next_stage: context.next_stage,
      task_id: taskId,
      validator_status: "failed",
      handoff_ready: false,
      summary,
      validation,
      next_context: nextContext,
      transition_audit: audit,
      authoritative_comment: null,
      schedule_message: exhausted ? null : buildScheduleMessage(nextContext),
      exit_code: exhausted ? 41 : 12,
    };
    result.authoritative_comment = renderAuthoritativeComment(context, result);
    return result;
  }

  const terminalKind: OrchestratorKind = validation.next_recommendation;
  const resolvedNextStage: WorkflowTerminalStage | null = terminalKind === "done"
    ? "done"
    : terminalKind === "handoff"
      ? context.next_stage
      : context.next_stage;
  const summary = input.summary || (
    terminalKind === "done"
      ? `Stage ${context.current_stage} passed validation and the workflow is complete.`
      : terminalKind === "blocked"
        ? `Stage ${context.current_stage} validated but recommended a blocking verdict.`
        : `Stage ${context.current_stage} passed validation and is ready for handoff to ${context.next_stage}.`
  );
  const audit = buildTransitionAudit({
    context,
    observedState,
    taskId,
    artifact: input.artifact,
    artifactSha,
    validationOk: true,
    validatorStatus: "passed",
    decision: terminalKind,
    nextStage: resolvedNextStage,
    summary,
    now,
  });
  const nextContext = validateContext({
    ...context,
    last_task_id: taskId,
    last_observed_status: observedState,
    validator_status: "passed",
    handoff_ready: terminalKind === "handoff" || terminalKind === "done",
    history: pushHistory(context, observedState, taskId, "passed", terminalKind, validation.summary, now, input.artifact?.comment_id ?? null),
    last_transition_audit: audit,
  });

  const result: EvaluateResult = {
    ok: terminalKind !== "blocked",
    terminal: true,
    kind: terminalKind,
    current_stage: context.current_stage,
    current_issue_id: context.current_issue_id,
    next_stage: terminalKind === "done" ? "done" : context.next_stage,
    task_id: taskId,
    validator_status: "passed",
    handoff_ready: terminalKind === "handoff" || terminalKind === "done",
    summary,
    validation,
    next_context: nextContext,
    transition_audit: audit,
    authoritative_comment: null,
    schedule_message: null,
    exit_code: terminalKind === "done" ? 0 : terminalKind === "blocked" ? 21 : 30,
  };
  result.authoritative_comment = renderAuthoritativeComment(context, result);
  return result;
}

async function main() {
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

  if (command === "parse-artifact") {
    const filePath = requireArg("--text-file");
    const text = await readTextFile(filePath);
    const result = tryParseArtifactFromText(text);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 22);
  }

  if (command === "render-handoff-comment") {
    const context = validateContext(parseJson<OrchestratorContext>(requireArg("--context-json")));
    const decision = parseJson<EvaluateResult>(requireArg("--decision-json"));
    const comment = renderAuthoritativeComment(context, decision);
    if (!comment) {
      console.error("Decision does not contain transition_audit; cannot render authoritative comment.");
      process.exit(23);
    }
    console.log(comment);
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
    const result = await evaluate(input);
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.exit_code);
  }

  printUsage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
