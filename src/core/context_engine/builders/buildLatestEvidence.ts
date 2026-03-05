import type { Evidence } from "../../contracts/context.js";

const truncate = (value: string, max: number): string => (value.length > max ? `${value.slice(0, max)}...<truncated>` : value);

export const buildLatestEvidence = (args: { evidence?: Evidence; maxChars: number }): string => {
  if (!args.evidence) {
    return "No verification evidence available in current turn history.";
  }
  return truncate(
    JSON.stringify(
      {
        command: args.evidence.command,
        exitCode: args.evidence.exitCode,
        ok: args.evidence.ok,
        parsedErrors: args.evidence.parsedErrors.slice(0, 10),
        stdoutRef: args.evidence.stdoutRef,
        stderrRef: args.evidence.stderrRef,
        timestamp: args.evidence.timestamp,
        platform: args.evidence.platform,
        versions: args.evidence.versions
      },
      null,
      2
    ),
    args.maxChars
  );
};
