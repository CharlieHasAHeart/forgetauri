import { readFile } from "node:fs/promises";
import { specSchema, type SpecIR } from "./schema.js";

export const parseSpecFromRaw = (rawText: string): SpecIR => {
  const raw = JSON.parse(rawText) as unknown;
  const parsed = specSchema.parse(raw);
  return {
    ...parsed,
    raw
  };
};

export const loadSpec = async (path: string): Promise<SpecIR> => {
  const rawText = await readFile(path, "utf8");
  return parseSpecFromRaw(rawText);
};
