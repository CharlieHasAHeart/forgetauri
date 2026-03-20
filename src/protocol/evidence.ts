// Protocol-layer minimal evidence/reference surface.
// Keep references stable, serializable, and intentionally small.
export const EVIDENCE_REF_KINDS = [
  "capability",
  "review",
  "recovery",
  "effect",
  "failure"
] as const;
export type EvidenceRefKind = (typeof EVIDENCE_REF_KINDS)[number];

export const EVIDENCE_REF_SOURCES = ["shell", "core"] as const;
export type EvidenceRefSource = (typeof EVIDENCE_REF_SOURCES)[number];

export const EVIDENCE_REF_OUTCOMES = [
  "succeeded",
  "contract_refusal",
  "policy_violation",
  "execution_failure",
  "review_continue",
  "review_repair",
  "review_replan",
  "review_stop",
  "repair_recovered",
  "repair_failed",
  "replan_recovered",
  "replan_failed",
  "action_results_succeeded",
  "action_results_failed",
  "invalid_action",
  "unsupported_action"
] as const;
export type EvidenceRefOutcome = (typeof EVIDENCE_REF_OUTCOMES)[number];

export interface EvidenceRef {
  kind: EvidenceRefKind;
  source: EvidenceRefSource;
  outcome: EvidenceRefOutcome;
  capability?: string;
  actionName?: string;
  requestKind?: string;
  targetPath?: string;
  code?: string;
  summary?: string;
}

export function isEvidenceRefKind(value: unknown): value is EvidenceRefKind {
  return (
    typeof value === "string" && EVIDENCE_REF_KINDS.some((kind) => kind === value)
  );
}

export function isEvidenceRefSource(value: unknown): value is EvidenceRefSource {
  return (
    typeof value === "string" && EVIDENCE_REF_SOURCES.some((source) => source === value)
  );
}

export function isEvidenceRefOutcome(value: unknown): value is EvidenceRefOutcome {
  return (
    typeof value === "string" &&
    EVIDENCE_REF_OUTCOMES.some((outcome) => outcome === value)
  );
}

export function isEvidenceRef(value: unknown): value is EvidenceRef {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const kind = Reflect.get(value, "kind");
  const source = Reflect.get(value, "source");
  const outcome = Reflect.get(value, "outcome");
  const capability = Reflect.get(value, "capability");
  const actionName = Reflect.get(value, "actionName");
  const requestKind = Reflect.get(value, "requestKind");
  const targetPath = Reflect.get(value, "targetPath");
  const code = Reflect.get(value, "code");
  const summary = Reflect.get(value, "summary");

  if (!isEvidenceRefKind(kind) || !isEvidenceRefSource(source) || !isEvidenceRefOutcome(outcome)) {
    return false;
  }

  return (
    (capability === undefined || typeof capability === "string") &&
    (actionName === undefined || typeof actionName === "string") &&
    (requestKind === undefined || typeof requestKind === "string") &&
    (targetPath === undefined || typeof targetPath === "string") &&
    (code === undefined || typeof code === "string") &&
    (summary === undefined || typeof summary === "string")
  );
}

export function isEvidenceRefArray(value: unknown): value is EvidenceRef[] {
  return Array.isArray(value) && value.every((entry) => isEvidenceRef(entry));
}
