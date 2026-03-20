import { isEvidenceRefArray, type EvidenceRef } from "./evidence.js";
import { isRequestRef, type RequestRef } from "./request-ref.js";

// Protocol-layer standardized failure signal; keep it serializable across boundaries.
export const FAILURE_CATEGORIES = ["action", "review", "runtime"] as const;
export type FailureCategory = (typeof FAILURE_CATEGORIES)[number];

export const FAILURE_SOURCES = ["core", "shell", "external"] as const;
export type FailureSource = (typeof FAILURE_SOURCES)[number];

export interface FailureSignal {
  category: FailureCategory;
  source: FailureSource;
  terminal: boolean;
  message?: string;
  summary?: string;
  request_ref?: RequestRef;
  evidence_refs?: EvidenceRef[];
}

export function isFailureCategory(value: unknown): value is FailureCategory {
  return (
    typeof value === "string" &&
    FAILURE_CATEGORIES.some((category) => category === value)
  );
}

export function isFailureSource(value: unknown): value is FailureSource {
  return (
    typeof value === "string" &&
    FAILURE_SOURCES.some((source) => source === value)
  );
}

export function isFailureSignal(value: unknown): value is FailureSignal {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const category = Reflect.get(value, "category");
  const source = Reflect.get(value, "source");
  const terminal = Reflect.get(value, "terminal");
  const message = Reflect.get(value, "message");
  const summary = Reflect.get(value, "summary");
  const requestRef = Reflect.get(value, "request_ref");
  const evidenceRefs = Reflect.get(value, "evidence_refs");

  if (
    !isFailureCategory(category) ||
    !isFailureSource(source) ||
    typeof terminal !== "boolean"
  ) {
    return false;
  }

  return (
    (message === undefined || typeof message === "string") &&
    (summary === undefined || typeof summary === "string") &&
    (requestRef === undefined || isRequestRef(requestRef)) &&
    (evidenceRefs === undefined || isEvidenceRefArray(evidenceRefs))
  );
}

export function isTerminalFailureSignal(signal: FailureSignal): boolean {
  return signal.terminal;
}
