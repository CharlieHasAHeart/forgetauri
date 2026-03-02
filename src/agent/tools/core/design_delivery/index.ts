import { z } from "zod";
import type { LlmProvider } from "../../../../llm/provider.js";
import { contractForDeliveryV1Schema } from "../../../design/contract/views.js";
import { deliveryDesignV1Schema, type DeliveryDesignV1 } from "../../../design/delivery/schema.js";
import type { ToolPackage } from "../../types.js";

const inputSchema = z.object({
  goal: z.string().min(1),
  contract: contractForDeliveryV1Schema,
  projectRoot: z.string().min(1).optional()
});

const outputSchema = z.object({
  delivery: deliveryDesignV1Schema,
  attempts: z.number().int().positive()
});

const deliveryDeltaSchema = z
  .object({
    verifyPolicy: z
      .object({
        levelDefault: z.enum(["full", "basic"]).optional(),
        gates: z
          .array(z.enum(["pnpm_install_if_needed", "pnpm_build", "cargo_check", "tauri_help", "tauri_build"]))
          .optional(),
        smokeCommands: z.array(z.string()).optional()
      })
      .optional(),
    preflight: z
      .object({
        checks: z
          .array(
            z.object({
              id: z.string().optional(),
              description: z.string().optional(),
              cmd: z.string().optional(),
              required: z.boolean().optional()
            })
          )
          .optional()
      })
      .optional(),
    assets: z
      .object({
        icons: z
          .object({
            required: z.boolean().optional(),
            paths: z.array(z.string()).optional()
          })
          .optional(),
        capabilities: z
          .object({
            required: z.boolean().optional()
          })
          .optional()
      })
      .optional()
  })
  .passthrough();

type VerifyGate = z.infer<typeof deliveryDesignV1Schema>["verifyPolicy"]["gates"][number];

const uniqueStrings = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );

const uniqueValues = <T>(values: T[]): T[] => Array.from(new Set(values));

const buildSeedDelivery = (contract: z.infer<typeof contractForDeliveryV1Schema>): DeliveryDesignV1 => ({
  version: "v1",
  verifyPolicy: {
    levelDefault: "full",
    gates: ["pnpm_install_if_needed", "pnpm_build", "cargo_check", "tauri_help"],
    smokeCommands: contract.commands.slice(0, 2).map((command) => command.name)
  },
  preflight: {
    checks: [
      { id: "node", description: "Node.js available", cmd: "node --version", required: true },
      { id: "pnpm", description: "pnpm available", cmd: "pnpm --version", required: true }
    ]
  },
  assets: {
    icons: { required: true, paths: ["src-tauri/icons/icon.png"] },
    capabilities: { required: true }
  }
});

const mergeDeliveryDelta = (seed: DeliveryDesignV1, delta: z.infer<typeof deliveryDeltaSchema>): DeliveryDesignV1 => {
  const verifyPolicy = delta.verifyPolicy
    ? {
        levelDefault: "full" as const,
        gates:
          delta.verifyPolicy.gates && delta.verifyPolicy.gates.length > 0
            ? uniqueValues<VerifyGate>(delta.verifyPolicy.gates)
            : seed.verifyPolicy.gates,
        smokeCommands:
          delta.verifyPolicy.smokeCommands && delta.verifyPolicy.smokeCommands.length > 0
            ? uniqueStrings(delta.verifyPolicy.smokeCommands)
            : seed.verifyPolicy.smokeCommands
      }
    : seed.verifyPolicy;

  const preflightChecks =
    delta.preflight?.checks && delta.preflight.checks.length > 0
      ? delta.preflight.checks.map((check, index) => ({
          id: check.id?.trim() || `check_${index + 1}`,
          description: check.description?.trim() || "Environment check",
          cmd: check.cmd?.trim() || undefined,
          required: check.required ?? true
        }))
      : seed.preflight.checks;

  const iconPaths =
    delta.assets?.icons?.paths && delta.assets.icons.paths.length > 0
      ? uniqueStrings(delta.assets.icons.paths)
      : seed.assets.icons.paths;

  return {
    version: "v1",
    verifyPolicy,
    preflight: { checks: preflightChecks },
    assets: {
      icons: {
        required: delta.assets?.icons?.required ?? seed.assets.icons.required,
        paths: iconPaths
      },
      capabilities: {
        required: delta.assets?.capabilities?.required ?? seed.assets.capabilities?.required ?? true
      }
    }
  };
};

export const runDesignDelivery = async (args: {
  goal: string;
  contract: z.infer<typeof contractForDeliveryV1Schema>;
  projectRoot?: string;
  provider: LlmProvider;
}): Promise<{ delivery: DeliveryDesignV1; attempts: number; raw: string }> => {
  const seedDelivery = buildSeedDelivery(args.contract);
  const messages = [
    {
      role: "system" as const,
      content:
        "You are a release and delivery architect for Tauri projects. " +
        "Return JSON delta only for verifyPolicy/preflight/assets. " +
        "Do not return full DeliveryDesignV1; deterministic merge will produce final schema."
    },
    {
      role: "user" as const,
      content:
        `Goal:\n${args.goal}\n\n` +
        `Project root:\n${args.projectRoot ?? "<none>"}\n\n` +
        `Contract:\n${JSON.stringify(args.contract, null, 2)}\n\n` +
        `Deterministic delivery seed:\n${JSON.stringify(seedDelivery, null, 2)}\n\n` +
        "Constraints:\n- Verify policy must be practical for pnpm/cargo/tauri\n- Asset checks should include icon requirements"
    }
  ];

  try {
    const { data, raw, attempts } = await args.provider.completeJSON(messages, deliveryDeltaSchema, {
      temperature: 0,
      maxOutputTokens: 3500
    });
    const merged = mergeDeliveryDelta(seedDelivery, data);
    const delivery = deliveryDesignV1Schema.parse(merged);
    return {
      delivery,
      attempts,
      raw
    };
  } catch (error) {
    return {
      delivery: seedDelivery,
      attempts: 1,
      raw: error instanceof Error ? error.message : "fallback to deterministic delivery seed"
    };
  }
};

export const toolPackage: ToolPackage<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
  manifest: {
    name: "tool_design_delivery",
    version: "1.0.0",
    category: "high",
    description: "Designs verify policy, preflight checks, and delivery assets.",
    capabilities: ["design", "delivery", "verify-policy"],
    inputSchema,
    outputSchema,
    safety: {
      sideEffects: "llm"
    }
  },
  runtime: {
    run: async (input, ctx) => {
      try {
        const out = await runDesignDelivery({
          goal: input.goal,
          contract: input.contract,
          projectRoot: input.projectRoot,
          provider: ctx.provider
        });

        return {
          ok: true,
          data: {
            delivery: out.delivery,
            attempts: out.attempts
          },
          meta: { touchedPaths: [] }
        };
      } catch (error) {
        return {
          ok: false,
          error: {
            code: "DESIGN_DELIVERY_FAILED",
            message: error instanceof Error ? error.message : "delivery design failed"
          }
        };
      }
    },
    examples: [
      {
        title: "Design delivery strategy",
        toolCall: {
          name: "tool_design_delivery",
          input: {
            goal: "Define verify policy and assets",
            contract: { version: "v1" }
          }
        },
        expected: "Returns DeliveryDesignV1 with verify gates and preflight checks."
      }
    ]
  }
};
