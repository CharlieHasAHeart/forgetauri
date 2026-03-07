// Protocol-layer standardized failure signal; keep it serializable across boundaries.
export const FAILURE_KINDS = [
  "transient",
  "repairable",
  "replan_required",
  "fatal"
] as const;

export type FailureKind = (typeof FAILURE_KINDS)[number];

export interface FailureSignal {
  kind: FailureKind;
  reason: string;
  retryable?: boolean;
}

export function isFailureKind(value: unknown): value is FailureKind {
  return typeof value === "string" && FAILURE_KINDS.some((kind) => kind === value);
}

export function isFailureSignal(value: unknown): value is FailureSignal {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const kind = Reflect.get(value, "kind");
  const reason = Reflect.get(value, "reason");
  const retryable = Reflect.get(value, "retryable");

  if (!isFailureKind(kind) || typeof reason !== "string") {
    return false;
  }

  return retryable === undefined || typeof retryable === "boolean";
}

export function isTerminalFailureKind(kind: FailureKind): boolean {
  return kind === "fatal";
}
