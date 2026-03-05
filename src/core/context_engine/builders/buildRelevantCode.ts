import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { CodeExcerpt, Evidence } from "../../contracts/context.js";
import type { ToolRunContext } from "../../contracts/tools.js";
import { storeBlob } from "../../utils/blobStore.js";

const normalizePath = (value: string): string => value.replace(/\\/g, "/");

const readExcerpt = async (args: { absolutePath: string; line: number; around: number }): Promise<{ start: number; end: number; text: string }> => {
  const content = await readFile(args.absolutePath, "utf8");
  const lines = content.split(/\r?\n/);
  const center = Math.max(1, args.line);
  const start = Math.max(1, center - args.around);
  const end = Math.min(lines.length, center + args.around);
  const text = lines.slice(start - 1, end).join("\n");
  return { start, end, text };
};

const toAbsolute = (repoRoot: string, path: string): string => (isAbsolute(path) ? path : resolve(repoRoot, path));

export const buildRelevantCode = async (args: {
  ctx: ToolRunContext;
  evidence?: Evidence;
  repoRoot: string;
  maxChars: number;
}): Promise<CodeExcerpt[]> => {
  const first = args.evidence?.parsedErrors?.[0];
  if (!first?.file) return [];

  const absolutePath = toAbsolute(args.repoRoot, first.file);
  try {
    const excerpt = await readExcerpt({ absolutePath, line: first.line, around: 60 });
    const normalized = normalizePath(first.file);
    if (excerpt.text.length > args.maxChars) {
      const ref = storeBlob(args.ctx, excerpt.text, "code");
      return [{ path: normalized, startLine: excerpt.start, endLine: excerpt.end, textRef: ref }];
    }
    return [{ path: normalized, startLine: excerpt.start, endLine: excerpt.end, textPreview: excerpt.text }];
  } catch {
    return [];
  }
};
