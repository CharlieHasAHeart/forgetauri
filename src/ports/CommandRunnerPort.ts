import type { CmdResult } from "../runner/runCmd.js";

export type CommandRunnerPort = (cmd: string, args: string[], cwd: string) => Promise<CmdResult>;
