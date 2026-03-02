import { describe, expect, test } from "vitest";
import { toolPackage } from "../src/agent/tools/core/design_delivery/index.js";
import { MockProvider } from "./helpers/mockProvider.js";
import type { ContractForDeliveryV1 } from "../src/agent/design/contract/views.js";

const contract: ContractForDeliveryV1 = {
  version: "v1",
  app: { name: "MacroGraph" },
  commands: [
    {
      name: "lint_config"
    }
  ]
};

describe("tool_design_delivery", () => {
  test("returns validated delivery design", async () => {
    const provider = new MockProvider([
      JSON.stringify({
        verifyPolicy: {
          levelDefault: "full",
          gates: ["pnpm_install_if_needed", "pnpm_build", "cargo_check", "tauri_help"],
          smokeCommands: ["lint_config"]
        },
        preflight: { checks: [{ id: "node", description: "Node installed", cmd: "node --version", required: true }] },
        assets: { icons: { required: true, paths: ["src-tauri/icons/icon.png"] } }
      })
    ]);

    const result = await toolPackage.runtime.run(
      { goal: "Design delivery", contract },
      {
        provider,
        runCmdImpl: async () => ({ ok: true, code: 0, stdout: "", stderr: "" }),
        flags: { apply: true, verify: true, repair: true, maxPatchesPerTurn: 8 },
        memory: { patchPaths: [], touchedPaths: [] }
      }
    );

    expect(result.ok).toBe(true);
    const data = result.data as { delivery: { verifyPolicy: { levelDefault: string } } };
    expect(data.delivery.verifyPolicy.levelDefault).toBe("full");
  });

  test("falls back to deterministic delivery when LLM output is invalid", async () => {
    const provider = new MockProvider(["not json"]);

    const result = await toolPackage.runtime.run(
      { goal: "Design delivery", contract },
      {
        provider,
        runCmdImpl: async () => ({ ok: true, code: 0, stdout: "", stderr: "" }),
        flags: { apply: true, verify: true, repair: true, maxPatchesPerTurn: 8 },
        memory: { patchPaths: [], touchedPaths: [] }
      }
    );

    expect(result.ok).toBe(true);
    const data = result.data as { delivery: { version: string; verifyPolicy: { gates: string[] } } };
    expect(data.delivery.version).toBe("v1");
    expect(data.delivery.verifyPolicy.gates.length).toBeGreaterThan(0);
  });
});
