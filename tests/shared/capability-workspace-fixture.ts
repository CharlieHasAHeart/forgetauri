import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export interface CapabilityWorkspace {
  root: string;
  originalCwd: string;
  primaryTargetPath: string;
  secondaryTargetPath: string;
}

export function setupCapabilityWorkspace(): CapabilityWorkspace {
  const root = mkdtempSync(join(tmpdir(), "forgetauri-capability-"));
  const originalCwd = process.cwd();
  const docsDir = join(root, "docs");
  mkdirSync(docsDir, { recursive: true });
  process.chdir(root);

  const workspace: CapabilityWorkspace = {
    root,
    originalCwd,
    primaryTargetPath: "docs/notes.md",
    secondaryTargetPath: "docs/notes-2.md"
  };

  resetCapabilityWorkspaceFiles(workspace);
  return workspace;
}

export function resetCapabilityWorkspaceFiles(workspace: CapabilityWorkspace): void {
  writeFileSync(workspace.primaryTargetPath, "before-one before-two", "utf8");
  writeFileSync(workspace.secondaryTargetPath, "alpha beta", "utf8");
}

export function teardownCapabilityWorkspace(workspace: CapabilityWorkspace): void {
  process.chdir(workspace.originalCwd);
  rmSync(workspace.root, { recursive: true, force: true });
}

