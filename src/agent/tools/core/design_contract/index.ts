import { readFile } from "node:fs/promises";
import { z } from "zod";
import { contractDesignV1Schema, type ContractDesignV1 } from "../../../design/contract/schema.js";
import type { LlmProvider } from "../../../../llm/provider.js";
import { parseSpecFromRaw } from "../../../../spec/loadSpec.js";
import type { SpecIR } from "../../../../spec/schema.js";
import type { ToolPackage } from "../../types.js";

const inputSchema = z.object({
  goal: z.string().min(1),
  specPath: z.string().min(1),
  rawSpec: z.unknown().optional(),
  projectRoot: z.string().min(1).optional()
});

const outputSchema = z.object({
  contract: contractDesignV1Schema,
  attempts: z.number().int().positive()
});

const contractDeltaSchema = z
  .object({
    app: z
      .object({
        name: z.string().optional(),
        description: z.string().optional()
      })
      .optional(),
    commands: z
      .array(
        z.object({
          name: z.string().optional(),
          purpose: z.string().optional(),
          inputs: z
            .array(
              z.object({
                name: z.string().optional(),
                type: z.enum(["string", "int", "float", "boolean", "json"]).optional(),
                optional: z.boolean().optional(),
                description: z.string().optional()
              })
            )
            .optional(),
          outputs: z
            .array(
              z.object({
                name: z.string().optional(),
                type: z.enum(["string", "int", "float", "boolean", "json"]).optional(),
                optional: z.boolean().optional(),
                description: z.string().optional()
              })
            )
            .optional(),
          errors: z.array(z.object({ code: z.string().optional(), message: z.string().optional() })).optional(),
          sideEffects: z.array(z.enum(["db_read", "db_write", "fs_read", "fs_write", "network"])).optional(),
          idempotent: z.boolean().optional()
        })
      )
      .optional(),
    dataModel: z
      .object({
        tables: z
          .array(
            z.object({
              name: z.string().optional(),
              columns: z
                .array(
                  z.object({
                    name: z.string().optional(),
                    type: z.enum(["text", "integer", "real", "blob", "json"]).optional(),
                    nullable: z.boolean().optional(),
                    primaryKey: z.boolean().optional(),
                    default: z.string().optional()
                  })
                )
                .optional()
            })
          )
          .optional(),
        migrations: z.object({ strategy: z.enum(["single", "versioned"]).optional() }).optional()
      })
      .optional(),
    acceptance: z
      .object({
        mustPass: z.array(z.enum(["pnpm_build", "cargo_check", "tauri_help", "tauri_build"])).optional(),
        smokeCommands: z.array(z.string()).optional()
      })
      .optional()
  })
  .passthrough();

type ContractGate = z.infer<typeof contractDesignV1Schema>["acceptance"] extends infer A
  ? A extends { mustPass: Array<infer G> }
    ? G
    : never
  : never;

const truncate = (value: string, max = 120000): string => (value.length > max ? `${value.slice(0, max)}\n...<truncated>` : value);

const toSnakeCase = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

const withUniqueName = (base: string, used: Set<string>, fallbackPrefix: string, index: number): string => {
  const normalizedBase = toSnakeCase(base);
  const root = normalizedBase.length > 0 && /^[a-z]/.test(normalizedBase) ? normalizedBase : `${fallbackPrefix}_${index + 1}`;
  let candidate = root;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${root}_${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
};

const inferIoType = (value: unknown): "string" | "int" | "float" | "boolean" | "json" => {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "int" : "float";
  if (typeof value === "string") return "string";
  return "json";
};

const toSqlType = (value: string): "text" | "integer" | "real" | "blob" | "json" => {
  const normalized = value.trim().toLowerCase();
  if (["text", "string", "varchar", "char"].includes(normalized)) return "text";
  if (["int", "integer", "bool", "boolean"].includes(normalized)) return "integer";
  if (["real", "float", "double", "number", "decimal"].includes(normalized)) return "real";
  if (["blob", "binary", "bytes"].includes(normalized)) return "blob";
  if (["json", "object", "array"].includes(normalized)) return "json";
  return "text";
};

const buildFallbackSeedContract = (raw: unknown): ContractDesignV1 => {
  const rawObject = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawApp = (rawObject.app && typeof rawObject.app === "object" ? rawObject.app : {}) as Record<string, unknown>;
  const name = typeof rawApp.name === "string" && rawApp.name.trim().length > 0 ? rawApp.name.trim() : "generated_app";
  const description =
    typeof rawApp.one_liner === "string" && rawApp.one_liner.trim().length > 0
      ? rawApp.one_liner.trim()
      : undefined;

  return {
    version: "v1",
    app: { name, description },
    commands: [],
    dataModel: {
      tables: [],
      migrations: { strategy: "versioned" }
    }
  };
};

const buildSeedContract = (raw: unknown): ContractDesignV1 => {
  try {
    const spec = parseSpecFromRaw(raw);
    return buildSeedContractFromSpec(spec);
  } catch {
    return buildFallbackSeedContract(raw);
  }
};

const buildSeedContractFromSpec = (spec: SpecIR): ContractDesignV1 => {
  const usedCommandNames = new Set<string>();
  const commands = spec.rust_commands.map((cmd, commandIndex) => {
    const commandName = withUniqueName(cmd.name, usedCommandNames, "command", commandIndex);

    const usedInputNames = new Set<string>();
    const inputs = Object.entries(cmd.input ?? {}).map(([key, value], inputIndex) => ({
      name: withUniqueName(key, usedInputNames, "input", inputIndex),
      type: inferIoType(value)
    }));

    const usedOutputNames = new Set<string>();
    const outputs = Object.entries(cmd.output ?? {}).map(([key, value], outputIndex) => ({
      name: withUniqueName(key, usedOutputNames, "output", outputIndex),
      type: inferIoType(value)
    }));

    return {
      name: commandName,
      purpose: cmd.purpose?.trim() || `Handle ${commandName}`,
      inputs,
      outputs,
      idempotent: true
    };
  });

  const usedTableNames = new Set<string>();
  const tables = spec.data_model.tables.map((table, tableIndex) => {
    const tableName = withUniqueName(table.name, usedTableNames, "table", tableIndex);
    const usedColumnNames = new Set<string>();
    const columns = table.columns.map((column, columnIndex) => ({
      name: withUniqueName(column.name, usedColumnNames, "column", columnIndex),
      type: toSqlType(column.type)
    }));
    return { name: tableName, columns };
  });

  return {
    version: "v1",
    app: {
      name: spec.app.name,
      description: spec.app.one_liner
    },
    commands,
    dataModel: {
      tables,
      migrations: { strategy: "versioned" }
    }
  };
};

const uniqueStrings = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );

const uniqueValues = <T>(values: T[]): T[] => Array.from(new Set(values));

const mergeContractDelta = (seed: ContractDesignV1, delta: z.infer<typeof contractDeltaSchema>): ContractDesignV1 => {
  const commandMap = new Map(seed.commands.map((command) => [command.name, command]));
  for (const [index, patch] of (delta.commands ?? []).entries()) {
    const requestedName = toSnakeCase(patch.name ?? "") || `command_${index + 1}`;
    const name = commandMap.has(requestedName)
      ? requestedName
      : withUniqueName(requestedName, new Set(commandMap.keys()), "command", index);
    const base = commandMap.get(name);
    const mapFields = (
      fields: Array<{ name?: string; type?: "string" | "int" | "float" | "boolean" | "json"; optional?: boolean; description?: string }> | undefined,
      fallbackPrefix: string
    ) =>
      fields && fields.length > 0
        ? fields.map((field, fieldIndex) => ({
            name: toSnakeCase(field.name ?? `${fallbackPrefix}_${fieldIndex + 1}`) || `${fallbackPrefix}_${fieldIndex + 1}`,
            type: field.type ?? "json",
            optional: field.optional,
            description: field.description
          }))
        : undefined;

    commandMap.set(name, {
      name,
      purpose: patch.purpose?.trim() || base?.purpose || `Handle ${name}`,
      inputs: mapFields(patch.inputs, "input") ?? base?.inputs ?? [],
      outputs: mapFields(patch.outputs, "output") ?? base?.outputs ?? [],
      errors:
        patch.errors && patch.errors.length > 0
          ? patch.errors.map((item, errorIndex) => ({
              code: item.code?.trim() || `ERR_${name.toUpperCase()}_${errorIndex + 1}`,
              message: item.message?.trim() || "Operation failed"
            }))
          : base?.errors,
      sideEffects: patch.sideEffects ?? base?.sideEffects,
      idempotent: patch.idempotent ?? base?.idempotent
    });
  }

  const tableMap = new Map(seed.dataModel.tables.map((table) => [table.name, table]));
  for (const [index, patch] of (delta.dataModel?.tables ?? []).entries()) {
    const requestedName = toSnakeCase(patch.name ?? "") || `table_${index + 1}`;
    const name = tableMap.has(requestedName)
      ? requestedName
      : withUniqueName(requestedName, new Set(tableMap.keys()), "table", index);
    const base = tableMap.get(name);
    const columns =
      patch.columns && patch.columns.length > 0
        ? patch.columns.map((column, columnIndex) => ({
            name: toSnakeCase(column.name ?? `column_${columnIndex + 1}`) || `column_${columnIndex + 1}`,
            type: column.type ?? "text",
            nullable: column.nullable,
            primaryKey: column.primaryKey,
            default: column.default
          }))
        : base?.columns ?? [{ name: "id", type: "integer" as const, primaryKey: true }];
    tableMap.set(name, {
      name,
      columns,
      indices: base?.indices,
      description: base?.description
    });
  }

  return {
    version: "v1",
    app: {
      name: delta.app?.name?.trim() || seed.app.name,
      description: delta.app?.description ?? seed.app.description
    },
    commands: Array.from(commandMap.values()),
    dataModel: {
      tables: Array.from(tableMap.values()),
      migrations: {
        strategy: delta.dataModel?.migrations?.strategy ?? seed.dataModel.migrations.strategy
      }
    },
    acceptance:
      delta.acceptance || seed.acceptance
        ? {
            mustPass:
              (delta.acceptance?.mustPass && delta.acceptance.mustPass.length > 0
                ? uniqueValues<ContractGate>(delta.acceptance.mustPass)
                : seed.acceptance?.mustPass) ?? ["pnpm_build"],
            smokeCommands:
              (delta.acceptance?.smokeCommands && delta.acceptance.smokeCommands.length > 0
                ? uniqueStrings(delta.acceptance.smokeCommands)
                : seed.acceptance?.smokeCommands) ?? undefined
          }
        : undefined
  };
};

export const runDesignContract = async (args: {
  goal: string;
  specPath: string;
  rawSpec?: unknown;
  projectRoot?: string;
  provider: LlmProvider;
}): Promise<{ contract: ContractDesignV1; attempts: number; raw: string }> => {
  const raw =
    args.rawSpec !== undefined
      ? args.rawSpec
      : (JSON.parse(await readFile(args.specPath, "utf8")) as unknown);
  const seedContract = buildSeedContract(raw);

  const rawSpecText = truncate(JSON.stringify(raw, null, 2));
  const seedContractText = truncate(JSON.stringify(seedContract, null, 2));

  const messages = [
    {
      role: "system" as const,
      content:
        "You are a software architect for a Tauri v2 + Rust + SQLite desktop app. " +
        "Return JSON delta only for app/commands/dataModel/acceptance refinements. " +
        "Do not return full contract; deterministic merge will produce final ContractDesignV1."
    },
    {
      role: "user" as const,
      content:
        `Goal:\n${args.goal}\n\n` +
        `Spec path:\n${args.specPath}\n\n` +
        `Project root (optional context):\n${args.projectRoot ?? "<none>"}\n\n` +
        `Raw spec:\n${rawSpecText}\n\n` +
        `Deterministic seed contract (must remain schema-valid):\n${seedContractText}\n\n` +
        "Stack constraints:\n- Tauri v2\n- Rust commands\n- SQLite via rusqlite\n- Deterministic contract names in snake_case\n\n" +
        "Return strict JSON only with fields you want to refine: app, commands, dataModel, acceptance."
    }
  ];

  try {
    const { data, raw: llmRaw, attempts } = await args.provider.completeJSON(messages, contractDeltaSchema, {
      temperature: 0,
      maxOutputTokens: 5000
    });
    const merged = mergeContractDelta(seedContract, data);
    const contract = contractDesignV1Schema.parse(merged);

    return {
      contract,
      attempts,
      raw: llmRaw
    };
  } catch (error) {
    return {
      contract: seedContract,
      attempts: 1,
      raw: error instanceof Error ? error.message : "fallback to deterministic seed contract"
    };
  }
};

export const toolPackage: ToolPackage<
  z.infer<typeof inputSchema>,
  z.infer<typeof outputSchema>
> = {
  manifest: {
    name: "tool_design_contract",
    version: "1.0.0",
    category: "high",
    description: "Designs command/data contracts from goal + raw spec using LLM structured output.",
    capabilities: ["design", "contract", "business"],
    inputSchema,
    outputSchema,
    safety: {
      sideEffects: "llm"
    }
  },
  runtime: {
    run: async (input, ctx) => {
      try {
        const result = await runDesignContract({
          goal: input.goal,
          specPath: input.specPath,
          rawSpec: input.rawSpec,
          projectRoot: input.projectRoot,
          provider: ctx.provider
        });

        return {
          ok: true,
          data: { contract: result.contract, attempts: result.attempts },
          meta: { touchedPaths: [] }
        };
      } catch (error) {
        return {
          ok: false,
          error: {
            code: "DESIGN_CONTRACT_FAILED",
            message: error instanceof Error ? error.message : "contract design failed"
          }
        };
      }
    },
    examples: [
      {
        title: "Design from spec",
        toolCall: {
          name: "tool_design_contract",
          input: {
            goal: "Design commands and schema for lint/fix workflows",
            specPath: "/tmp/spec.json"
          }
        },
        expected: "Returns a validated v1 contract design payload."
      }
    ]
  }
};
