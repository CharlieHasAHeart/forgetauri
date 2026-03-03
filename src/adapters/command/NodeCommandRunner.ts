import { runCmd } from "../../runner/runCmd.js";
import type { CommandRunnerPort } from "../../ports/CommandRunnerPort.js";

export const NodeCommandRunner: CommandRunnerPort = async (cmd, args, cwd) => runCmd(cmd, args, cwd);
