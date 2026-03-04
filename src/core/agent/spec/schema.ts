import { z } from "zod";

export const specSchema = z.object({
  raw: z.unknown().optional()
}).passthrough();

export type ParsedSpec = z.infer<typeof specSchema>;
export type SpecIR = ParsedSpec & { raw: unknown };
