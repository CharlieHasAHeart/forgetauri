import { z } from "zod";
import type { LlmProvider } from "../../../../llm/provider.js";
import { contractForImplementationV1Schema } from "../../../design/contract/views.js";
import { implementationDesignV1Schema, type ImplementationDesignV1 } from "../../../design/implementation/schema.js";
import { uxDesignV1Schema } from "../../../design/ux/schema.js";
import type { ToolPackage } from "../../types.js";
import {
  buildDesignImplementationUserPrompt,
  DESIGN_IMPLEMENTATION_SYSTEM_PROMPT
} from "../../../../app/prompts/forgeauri/design_implementation.js";

const inputSchema = z.object({
  goal: z.string().min(1),
  contract: contractForImplementationV1Schema,
  ux: uxDesignV1Schema.optional(),
  projectRoot: z.string().min(1).optional()
});

const outputSchema = z.object({
  impl: implementationDesignV1Schema,
  attempts: z.number().int().positive()
});

const implementationDeltaSchema = z
  .object({
    services: z
      .array(
        z.object({
          command: z.string().optional(),
          name: z.string().optional(),
          responsibilities: z.array(z.string()).optional(),
          usesTables: z.array(z.string()).optional()
        })
      )
      .optional(),
    repos: z
      .array(
        z.object({
          table: z.string().optional(),
          name: z.string().optional(),
          operations: z.array(z.string()).optional()
        })
      )
      .optional(),
    errorCodes: z.array(z.string()).optional(),
    frontend: z
      .object({
        stateManagement: z.enum(["local", "stores"]).optional(),
        validation: z.enum(["zod", "simple"]).optional()
      })
      .optional()
  })
  .passthrough();

const toSnakeCase = (value: string, fallback: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (normalized.length === 0 || !/^[a-z]/.test(normalized)) return fallback;
  return normalized;
};

const buildSeedImplementation = (
  contract: z.infer<typeof contractForImplementationV1Schema>
): ImplementationDesignV1 => {
  const fallbackTable = contract.dataModel.tables[0]?.name ?? "app_data";
  const tableSet = new Set(contract.dataModel.tables.map((table) => table.name));
  const tableForService = tableSet.size > 0 ? fallbackTable : "app_data";

  const services = contract.commands.map((command, index) => ({
    name: toSnakeCase(`${command.name}_service`, `service_${index + 1}`),
    responsibilities: [command.purpose || `Handle ${command.name}`],
    usesTables: [tableForService]
  }));

  const repos = Array.from(tableSet.size > 0 ? tableSet : new Set(["app_data"])).map((table, index) => ({
    name: toSnakeCase(`${table}_repo`, `repo_${index + 1}`),
    table,
    operations: ["get", "list", "upsert"]
  }));

  return {
    version: "v1",
    rust: {
      layering: "commands_service_repo",
      services,
      repos,
      errorModel: {
        pattern: "thiserror+ApiResponse",
        errorCodes: ["INTERNAL_ERROR"]
      }
    },
    frontend: {
      apiPattern: "invoke_wrapper+typed_meta",
      stateManagement: "local",
      validation: "simple"
    }
  };
};

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter((value) => value.length > 0)));

const mergeImplementationDelta = (args: {
  seed: ImplementationDesignV1;
  delta: z.infer<typeof implementationDeltaSchema>;
  contract: z.infer<typeof contractForImplementationV1Schema>;
}): ImplementationDesignV1 => {
  const tableSet = new Set(args.contract.dataModel.tables.map((table) => table.name));
  const fallbackTable = args.contract.dataModel.tables[0]?.name ?? "app_data";
  const commandSet = new Set(args.contract.commands.map((command) => command.name));

  const serviceMap = new Map(args.seed.rust.services.map((service) => [service.name, service]));
  for (const [idx, patch] of (args.delta.services ?? []).entries()) {
    const byCommand = patch.command && commandSet.has(patch.command) ? patch.command : undefined;
    const defaultName = byCommand ? `${byCommand}_service` : `service_${idx + 1}`;
    const name = toSnakeCase(patch.name ?? defaultName, `service_${idx + 1}`);
    const previous = serviceMap.get(name);
    const normalizedTables = uniqueStrings((patch.usesTables ?? []).map((table) => (tableSet.has(table) ? table : fallbackTable)));

    serviceMap.set(name, {
      name,
      responsibilities:
        patch.responsibilities && patch.responsibilities.length > 0
          ? uniqueStrings(patch.responsibilities.map((item) => item.trim()).filter((item) => item.length > 0))
          : previous?.responsibilities ?? [byCommand ? `Handle ${byCommand}` : `Handle ${name}`],
      usesTables: normalizedTables.length > 0 ? normalizedTables : previous?.usesTables ?? [fallbackTable]
    });
  }

  const repoMap = new Map(args.seed.rust.repos.map((repo) => [repo.name, repo]));
  for (const [idx, patch] of (args.delta.repos ?? []).entries()) {
    const table = patch.table && tableSet.has(patch.table) ? patch.table : fallbackTable;
    const name = toSnakeCase(patch.name ?? `${table}_repo`, `repo_${idx + 1}`);
    const previous = repoMap.get(name);
    const operations =
      patch.operations && patch.operations.length > 0
        ? uniqueStrings(patch.operations.map((item) => item.trim()).filter((item) => item.length > 0))
        : previous?.operations ?? ["get", "list", "upsert"];
    repoMap.set(name, { name, table, operations });
  }

  const errorCodes = uniqueStrings([
    ...args.seed.rust.errorModel.errorCodes,
    ...((args.delta.errorCodes ?? []).map((value) => value.trim()).filter((value) => value.length > 0))
  ]);

  return {
    version: "v1",
    rust: {
      layering: "commands_service_repo",
      services: Array.from(serviceMap.values()),
      repos: Array.from(repoMap.values()),
      errorModel: {
        pattern: "thiserror+ApiResponse",
        errorCodes
      }
    },
    frontend: {
      apiPattern: "invoke_wrapper+typed_meta",
      stateManagement: args.delta.frontend?.stateManagement ?? args.seed.frontend.stateManagement,
      validation: args.delta.frontend?.validation ?? args.seed.frontend.validation
    }
  };
};

export const runDesignImplementation = async (args: {
  goal: string;
  contract: z.infer<typeof contractForImplementationV1Schema>;
  ux?: z.infer<typeof uxDesignV1Schema>;
  projectRoot?: string;
  provider: LlmProvider;
}): Promise<{ impl: ImplementationDesignV1; attempts: number; raw: string }> => {
  const seed = buildSeedImplementation(args.contract);
  const messages = [
    {
      role: "system" as const,
      content: DESIGN_IMPLEMENTATION_SYSTEM_PROMPT
    },
    {
      role: "user" as const,
      content: buildDesignImplementationUserPrompt({
        goal: args.goal,
        projectRoot: args.projectRoot,
        contractJson: JSON.stringify(args.contract, null, 2),
        uxJson: args.ux ? JSON.stringify(args.ux, null, 2) : "<none>",
        seedJson: JSON.stringify(seed, null, 2)
      })
    }
  ];

  try {
    const { data, raw, attempts } = await args.provider.completeJSON(messages, implementationDeltaSchema, {
      temperature: 0,
      maxOutputTokens: 4000
    });
    const merged = mergeImplementationDelta({
      seed,
      delta: data,
      contract: args.contract
    });
    const impl = implementationDesignV1Schema.parse(merged);

    return {
      impl,
      attempts,
      raw
    };
  } catch (error) {
    return {
      impl: seed,
      attempts: 1,
      raw: error instanceof Error ? error.message : "fallback to deterministic implementation seed"
    };
  }
};

export const toolPackage: ToolPackage<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
  manifest: {
    name: "tool_design_implementation",
    version: "1.0.0",
    category: "high",
    description: "Designs Rust service/repo layering and frontend invocation strategy.",
    capabilities: ["design", "implementation", "rust", "frontend"],
    inputSchema,
    outputSchema,
    safety: {
      sideEffects: "llm"
    }
  },
  runtime: {
    run: async (input, ctx) => {
      try {
        const out = await runDesignImplementation({
          goal: input.goal,
          contract: input.contract,
          ux: input.ux,
          projectRoot: input.projectRoot,
          provider: ctx.provider
        });

        return {
          ok: true,
          data: {
            impl: out.impl,
            attempts: out.attempts
          },
          meta: { touchedPaths: [] }
        };
      } catch (error) {
        return {
          ok: false,
          error: {
            code: "DESIGN_IMPLEMENTATION_FAILED",
            message: error instanceof Error ? error.message : "implementation design failed"
          }
        };
      }
    },
    examples: [
      {
        title: "Design implementation plan",
        toolCall: {
          name: "tool_design_implementation",
          input: {
            goal: "Design service and repo responsibilities",
            contract: { version: "v1" }
          }
        },
        expected: "Returns ImplementationDesignV1 with rust/frontend strategy."
      }
    ]
  }
};
