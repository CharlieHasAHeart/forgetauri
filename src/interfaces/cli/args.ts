import { readFile } from "node:fs/promises";
import { ZodError } from "zod";
import type { AgentPolicy } from "../../app/defaultPolicy.js";

export type CliOptions = {
  specPath?: string;
  outDir?: string;
  agent: boolean;
  goal?: string;
  plan: boolean;
  apply: boolean;
  applySpecified: boolean;
  verify: boolean;
  verifySpecified: boolean;
  repair: boolean;
  repairSpecified: boolean;
  autoApprove: boolean;
  ui: "routeA";
  noUi: boolean;
  maxTurns: number;
  maxPatches: number;
  policyInput?: string;
  truncation: "auto" | "disabled";
  compactionThreshold?: number;
};

export const printValidationErrors = (error: ZodError): void => {
  console.error("Spec validation failed:");
  error.issues.forEach((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
    console.error(`- ${path}: ${issue.message}`);
  });
};

export const parseArgs = (argv: string[]): CliOptions => {
  let specPath: string | undefined;
  let outDir: string | undefined;
  let agent = false;
  let goal: string | undefined;
  let plan = false;
  let apply = false;
  let applySpecified = false;
  let verify = false;
  let verifySpecified = false;
  let repair = false;
  let repairSpecified = false;
  let autoApprove = false;
  let ui: "routeA" = "routeA";
  let noUi = false;
  let maxTurns = 8;
  let maxPatches = 6;
  let policyInput: string | undefined;
  let truncation: "auto" | "disabled" = "auto";
  let compactionThreshold: number | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--spec") {
      specPath = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--out") {
      outDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--goal") {
      goal = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--max-turns") {
      const raw = Number(argv[i + 1]);
      const parsed = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 8;
      maxTurns = Math.max(1, parsed);
      i += 1;
      continue;
    }
    if (arg === "--max-patches") {
      const raw = Number(argv[i + 1]);
      const parsed = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 6;
      maxPatches = Math.min(8, parsed);
      i += 1;
      continue;
    }
    if (arg === "--truncation") {
      truncation = argv[i + 1] === "disabled" ? "disabled" : "auto";
      i += 1;
      continue;
    }
    if (arg === "--policy") {
      policyInput = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--compaction-threshold") {
      const raw = Number(argv[i + 1]);
      if (Number.isFinite(raw) && raw > 0) compactionThreshold = Math.floor(raw);
      i += 1;
      continue;
    }
    if (arg === "--plan") {
      plan = true;
      continue;
    }
    if (arg === "--agent") {
      agent = true;
      continue;
    }
    if (arg === "--apply") {
      apply = true;
      applySpecified = true;
      continue;
    }
    if (arg === "--verify") {
      verify = true;
      verifySpecified = true;
      continue;
    }
    if (arg === "--repair") {
      repair = true;
      repairSpecified = true;
      continue;
    }
    if (arg === "--auto-approve") {
      autoApprove = true;
      continue;
    }
    if (arg === "--no-ui") {
      noUi = true;
      continue;
    }
    if (arg === "--ui") {
      ui = argv[i + 1] === "routeA" ? "routeA" : "routeA";
      i += 1;
      continue;
    }
    if (!arg.startsWith("-") && !specPath) specPath = arg;
  }

  return {
    specPath,
    outDir,
    agent,
    goal,
    plan,
    apply,
    applySpecified,
    verify,
    verifySpecified,
    repair,
    repairSpecified,
    autoApprove,
    ui,
    noUi,
    maxTurns,
    maxPatches,
    policyInput,
    truncation,
    compactionThreshold
  };
};

export const usage = (): void => {
  console.error("Usage:");
  console.error(
    "- pnpm dev --agent --goal \"...\" --spec <path> --out <dir> [--policy <json-or-path>] [--plan] [--apply] [--verify] [--repair] [--ui routeA] [--no-ui] [--auto-approve] [--max-turns N] [--max-patches N] [--truncation auto|disabled] [--compaction-threshold N]"
  );
};

export const parsePolicy = async (input?: string): Promise<AgentPolicy | undefined> => {
  if (!input) return undefined;
  const trimmed = input.trim();
  const raw = trimmed.startsWith("{") ? trimmed : await readFile(trimmed, "utf8");
  return JSON.parse(raw) as AgentPolicy;
};
