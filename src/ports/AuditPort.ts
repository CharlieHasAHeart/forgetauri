export type AuditPort = {
  start?(outDir: string, meta?: Record<string, unknown>): Promise<string>;
  flush?(
    baseDir: string,
    payload?: {
      ok: boolean;
      verifyHistory?: unknown;
      patchPaths?: string[];
      touchedFiles?: string[];
      budgets?: unknown;
      lastError?: unknown;
      status?: string;
      policy?: unknown;
      toolIndex?: unknown;
    }
  ): Promise<string>;
};
