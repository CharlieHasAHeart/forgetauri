import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { LlmMessage, LlmPort } from "../core/contracts/llm.js";
import type { ToolRunContext, ToolSpec } from "../core/contracts/tools.js";
import type { KernelMiddleware } from "../core/middleware/types.js";

export type FilesystemMiddlewareOptions = {
  baseDir?: string;
  maxChars?: number;
  maxFiles?: number;
  readOnly?: boolean;
};

export type FileData = {
  path: string;
  bytes: number;
  updatedAt: number;
  preview?: string;
  truncated?: boolean;
  ref?: string;
};

const DEFAULT_MAX_CHARS = 20_000;
const DEFAULT_MAX_FILES = 2_000;
const DEFAULT_GREP_MATCHES = 500;
const DEFAULT_GLOB_MAX = 500;

const normalizeSlashes = (value: string): string => value.replace(/\\/g, "/");

const safeRelative = (baseDir: string, absolutePath: string): string => {
  const rel = normalizeSlashes(relative(baseDir, absolutePath));
  return rel === "" ? "." : rel;
};

const isPathInside = (baseDir: string, targetPath: string): boolean => {
  const rel = relative(resolve(baseDir), resolve(targetPath));
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.split(sep).includes("..");
};

const safeResolve = (baseDir: string, userPath: string): string => {
  const candidate = normalizeSlashes(userPath.trim() || ".");
  const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(baseDir, candidate);
  if (!isPathInside(baseDir, absolute)) {
    throw new Error(`Path escapes baseDir: ${userPath}`);
  }
  return absolute;
};

const truncateWithMarker = (value: string, maxChars: number): { text: string; truncated: boolean } => {
  if (value.length <= maxChars) {
    return { text: value, truncated: false };
  }
  return { text: `${value.slice(0, maxChars)}...<truncated>`, truncated: true };
};

const memoryView = (ctx: ToolRunContext): ToolRunContext["memory"] & {
  files?: Record<string, FileData>;
  blobs?: Record<string, string>;
  filesFull?: Record<string, string>;
  fsBaseDir?: string;
  fsBlobSeq?: number;
} => ctx.memory;

const ensureBlobStore = (ctx: ToolRunContext): Record<string, string> => {
  const mem = memoryView(ctx);
  if (!mem.blobs) mem.blobs = {};
  if (!mem.filesFull) mem.filesFull = {};
  if (typeof mem.fsBlobSeq !== "number") mem.fsBlobSeq = 0;
  return mem.blobs;
};

const storeBlob = (ctx: ToolRunContext, payload: string): string => {
  const mem = memoryView(ctx);
  const blobs = ensureBlobStore(ctx);
  mem.fsBlobSeq = (mem.fsBlobSeq ?? 0) + 1;
  const ref = `blob:${mem.fsBlobSeq}`;
  blobs[ref] = payload;
  if (mem.filesFull) mem.filesFull[ref] = payload;
  return ref;
};

const getBaseDir = (ctx: ToolRunContext, opts?: FilesystemMiddlewareOptions): string => {
  const mem = memoryView(ctx);
  const raw = opts?.baseDir ?? mem.fsBaseDir ?? mem.appDir ?? mem.repoRoot ?? process.cwd();
  const resolved = resolve(raw);
  mem.fsBaseDir = resolved;
  return resolved;
};

const updateFileCache = (args: {
  ctx: ToolRunContext;
  relPath: string;
  bytes: number;
  updatedAt: number;
  preview?: string;
  truncated?: boolean;
  ref?: string;
}): void => {
  const mem = memoryView(args.ctx);
  if (!mem.files) mem.files = {};
  mem.files[args.relPath] = {
    path: args.relPath,
    bytes: args.bytes,
    updatedAt: args.updatedAt,
    preview: args.preview,
    truncated: args.truncated,
    ref: args.ref
  };
};

const listFiles = async (args: {
  baseDir: string;
  maxFiles: number;
}): Promise<string[]> => {
  const out: string[] = [];
  const queue: string[] = [args.baseDir];
  const skipDirs = new Set(["node_modules", ".git", "dist"]);

  while (queue.length > 0 && out.length < args.maxFiles) {
    const current = queue.shift() as string;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (out.length >= args.maxFiles) break;
      const absolute = join(current, entry.name);
      const rel = safeRelative(args.baseDir, absolute);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) queue.push(absolute);
        continue;
      }
      if (entry.isFile()) {
        out.push(rel);
      }
    }
  }

  return out;
};

const escapeRegExp = (value: string): string => value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");

const globToRegExp = (pattern: string): RegExp => {
  let normalized = normalizeSlashes(pattern.trim());
  if (normalized.length === 0) normalized = "**/*";
  const DOUBLE_STAR = "__DOUBLE_STAR__";
  let source = escapeRegExp(normalized);
  source = source.replace(/\*\*/g, DOUBLE_STAR);
  source = source.replace(/\*/g, "[^/]*");
  source = source.replace(/\?/g, "[^/]");
  source = source.replace(new RegExp(DOUBLE_STAR, "g"), ".*");
  return new RegExp(`^${source}$`);
};

const parseObject = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid input: expected object");
  }
  return input as Record<string, unknown>;
};

const parsePath = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid input: ${field} must be non-empty string`);
  }
  return normalizeSlashes(value.trim());
};

const parseIntPositive = (value: unknown, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
};

const filesystemSystemPromptBody = (args: { maxChars: number; readOnly: boolean }): string =>
  [
    args.readOnly
      ? "You can use read-only filesystem tools: ls, read_file, glob, grep, read_blob."
      : "You can use filesystem tools: ls, read_file, write_file, edit_file, glob, grep, read_blob.",
    "Use read_file/grep before assumptions; never invent file contents.",
    "When a tool returns a ref, use read_blob to fetch full content.",
    "All paths are confined to middleware baseDir. Never attempt path traversal.",
    `Keep outputs concise. Large outputs may be truncated with ref handles (maxChars=${args.maxChars}).`
  ].join(" ");

export const filesystemSystemPrompt = (opts?: FilesystemMiddlewareOptions): string =>
  filesystemSystemPromptBody({
    maxChars: opts?.maxChars ?? DEFAULT_MAX_CHARS,
    readOnly: opts?.readOnly ?? true
  });

export const createFilesystemMiddleware = (opts?: FilesystemMiddlewareOptions): KernelMiddleware => {
  const maxChars = opts?.maxChars ?? DEFAULT_MAX_CHARS;
  const maxFiles = opts?.maxFiles ?? DEFAULT_MAX_FILES;
  const readOnly = opts?.readOnly ?? true;

  const toolLs: ToolSpec = {
    name: "ls",
    description: "List directory entries",
    run: async (input, ctx) => {
      try {
        const data = parseObject(input ?? {});
        const baseDir = getBaseDir(ctx, opts);
        const relPath = typeof data.path === "string" ? normalizeSlashes(data.path) : ".";
        const absolute = safeResolve(baseDir, relPath);
        const entries = await readdir(absolute, { withFileTypes: true });
        return {
          ok: true,
          data: {
            entries: entries
              .map((entry) => {
                const abs = join(absolute, entry.name);
                return {
                  name: entry.name,
                  type: entry.isFile() ? "file" : entry.isDirectory() ? "dir" : "other",
                  path: safeRelative(baseDir, abs)
                };
              })
              .sort((a, b) => a.path.localeCompare(b.path))
          }
        };
      } catch (error) {
        return { ok: false, error: { code: "FS_LS_FAILED", message: error instanceof Error ? error.message : String(error) } };
      }
    }
  };

  const toolReadFile: ToolSpec = {
    name: "read_file",
    description: "Read UTF-8 file with optional truncation",
    run: async (input, ctx) => {
      try {
        const data = parseObject(input ?? {});
        const relPath = parsePath(data.path, "path");
        const max = parseIntPositive(data.maxChars, maxChars);
        const baseDir = getBaseDir(ctx, opts);
        const absolute = safeResolve(baseDir, relPath);

        const [content, fileStat] = await Promise.all([readFile(absolute, "utf8"), stat(absolute)]);
        const preview = truncateWithMarker(content, max);
        const bytes = Buffer.byteLength(content, "utf8");

        let ref: string | undefined;
        if (preview.truncated) {
          ref = storeBlob(ctx, content);
        }

        const relativePath = safeRelative(baseDir, absolute);
        updateFileCache({
          ctx,
          relPath: relativePath,
          bytes,
          updatedAt: fileStat.mtimeMs,
          preview: preview.text,
          truncated: preview.truncated,
          ref
        });

        return {
          ok: true,
          data: {
            path: relativePath,
            text: preview.text,
            truncated: preview.truncated,
            ref
          },
          meta: { touchedPaths: [relativePath] }
        };
      } catch (error) {
        return { ok: false, error: { code: "FS_READ_FAILED", message: error instanceof Error ? error.message : String(error) } };
      }
    }
  };

  const toolWriteFile: ToolSpec = {
    name: "write_file",
    description: "Write UTF-8 file (mkdir -p parent)",
    run: async (input, ctx) => {
      try {
        const data = parseObject(input ?? {});
        const relPath = parsePath(data.path, "path");
        if (typeof data.content !== "string") {
          throw new Error("Invalid input: content must be string");
        }
        const baseDir = getBaseDir(ctx, opts);
        const absolute = safeResolve(baseDir, relPath);
        await mkdir(dirname(absolute), { recursive: true });
        await writeFile(absolute, data.content, "utf8");
        const fileStat = await stat(absolute);
        const relativePath = safeRelative(baseDir, absolute);
        const bytes = Buffer.byteLength(data.content, "utf8");
        const preview = truncateWithMarker(data.content, Math.min(2000, maxChars));
        updateFileCache({
          ctx,
          relPath: relativePath,
          bytes,
          updatedAt: fileStat.mtimeMs,
          preview: preview.text,
          truncated: preview.truncated
        });
        return {
          ok: true,
          data: { path: relativePath, bytes },
          meta: { touchedPaths: [relativePath] }
        };
      } catch (error) {
        return { ok: false, error: { code: "FS_WRITE_FAILED", message: error instanceof Error ? error.message : String(error) } };
      }
    }
  };

  const toolEditFile: ToolSpec = {
    name: "edit_file",
    description: "Edit file by find/replace or line range replacement",
    run: async (input, ctx) => {
      try {
        const data = parseObject(input ?? {});
        const relPath = parsePath(data.path, "path");
        const baseDir = getBaseDir(ctx, opts);
        const absolute = safeResolve(baseDir, relPath);
        const original = await readFile(absolute, "utf8");

        let updated = original;
        if (typeof data.find === "string" && typeof data.replace === "string") {
          if (!original.includes(data.find)) {
            throw new Error("find text not found");
          }
          updated = original.replace(data.find, data.replace);
        } else if (
          typeof data.startLine === "number" &&
          typeof data.endLine === "number" &&
          Number.isFinite(data.startLine) &&
          Number.isFinite(data.endLine) &&
          typeof data.replacement === "string"
        ) {
          const lines = original.split(/\r?\n/);
          const start = Math.max(1, Math.floor(data.startLine));
          const end = Math.max(start, Math.floor(data.endLine));
          if (start < 1 || start > lines.length) {
            return {
              ok: false,
              error: {
                code: "FS_EDIT_RANGE",
                message: `Invalid startLine ${start}. Valid range is 1..${lines.length}`
              }
            };
          }
          if (end < start || end > lines.length) {
            return {
              ok: false,
              error: {
                code: "FS_EDIT_RANGE",
                message: `Invalid endLine ${end}. Valid range is ${start}..${lines.length}`
              }
            };
          }
          const replLines = data.replacement.split(/\r?\n/);
          lines.splice(start - 1, end - start + 1, ...replLines);
          updated = lines.join("\n");
        } else {
          throw new Error("Invalid input: provide find/replace or startLine/endLine/replacement");
        }

        await writeFile(absolute, updated, "utf8");
        const fileStat = await stat(absolute);
        const relativePath = safeRelative(baseDir, absolute);
        const bytes = Buffer.byteLength(updated, "utf8");
        const preview = truncateWithMarker(updated, Math.min(2000, maxChars));
        updateFileCache({
          ctx,
          relPath: relativePath,
          bytes,
          updatedAt: fileStat.mtimeMs,
          preview: preview.text,
          truncated: preview.truncated
        });

        return {
          ok: true,
          data: { path: relativePath, bytes },
          meta: { touchedPaths: [relativePath] }
        };
      } catch (error) {
        return { ok: false, error: { code: "FS_EDIT_FAILED", message: error instanceof Error ? error.message : String(error) } };
      }
    }
  };

  const toolGlob: ToolSpec = {
    name: "glob",
    description: "List files matching a glob pattern",
    run: async (input, ctx) => {
      try {
        const data = parseObject(input ?? {});
        const pattern = parsePath(data.pattern, "pattern");
        const max = parseIntPositive(data.max, DEFAULT_GLOB_MAX);
        const baseDir = getBaseDir(ctx, opts);
        const files = await listFiles({ baseDir, maxFiles });
        const matcher = globToRegExp(pattern);
        const matched = files.filter((file) => matcher.test(file)).slice(0, max);
        return { ok: true, data: { files: matched } };
      } catch (error) {
        return { ok: false, error: { code: "FS_GLOB_FAILED", message: error instanceof Error ? error.message : String(error) } };
      }
    }
  };

  const toolGrep: ToolSpec = {
    name: "grep",
    description: "Search text pattern in files",
    run: async (input, ctx) => {
      try {
        const data = parseObject(input ?? {});
        const pattern = parsePath(data.pattern, "pattern");
        const glob = typeof data.glob === "string" && data.glob.trim().length > 0 ? normalizeSlashes(data.glob.trim()) : undefined;
        const useRegex = data.regex === true;
        const maxMatches = parseIntPositive(data.maxMatches, DEFAULT_GREP_MATCHES);
        const baseDir = getBaseDir(ctx, opts);
        const files = await listFiles({ baseDir, maxFiles });
        const matcher = glob ? globToRegExp(glob) : undefined;
        const targetFiles = matcher ? files.filter((file) => matcher.test(file)) : files;

        const matches: Array<{ file: string; line: number; preview: string }> = [];
        const regex = useRegex ? new RegExp(pattern, "g") : undefined;

        for (const file of targetFiles) {
          if (matches.length >= maxMatches) break;
          const absolute = safeResolve(baseDir, file);
          let content: string;
          try {
            content = await readFile(absolute, "utf8");
          } catch {
            continue;
          }
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length; i += 1) {
            if (matches.length >= maxMatches) break;
            const line = lines[i] ?? "";
            const found = regex ? regex.test(line) : line.includes(pattern);
            if (regex) regex.lastIndex = 0;
            if (!found) continue;
            matches.push({ file, line: i + 1, preview: truncateWithMarker(line, 500).text });
          }
        }

        const serialized = JSON.stringify(matches);
        if (serialized.length > maxChars) {
          const ref = storeBlob(ctx, serialized);
          return {
            ok: true,
            data: {
              matches: matches.slice(0, Math.max(1, Math.floor(maxMatches / 4))),
              truncated: true,
              ref
            }
          };
        }

        return {
          ok: true,
          data: {
            matches
          }
        };
      } catch (error) {
        return { ok: false, error: { code: "FS_GREP_FAILED", message: error instanceof Error ? error.message : String(error) } };
      }
    }
  };

  const toolReadBlob: ToolSpec = {
    name: "read_blob",
    description: "Read blob content by ref (from ctx.memory.blobs/filesFull).",
    run: async (input, ctx) => {
      try {
        const data = parseObject(input ?? {});
        const ref = parsePath(data.ref, "ref");
        const max = parseIntPositive(data.maxChars, maxChars);
        const mem = memoryView(ctx);
        const fullStore = mem.filesFull ?? {};
        const blobStore = mem.blobs ?? {};
        const content = fullStore[ref] ?? blobStore[ref];
        if (typeof content !== "string") {
          return { ok: false, error: { code: "FS_BLOB_NOT_FOUND", message: "blob ref not found" } };
        }
        const preview = truncateWithMarker(content, max);
        return {
          ok: true,
          data: {
            text: preview.text,
            truncated: preview.truncated,
            ref
          }
        };
      } catch (error) {
        return { ok: false, error: { code: "FS_BLOB_READ_FAILED", message: error instanceof Error ? error.message : String(error) } };
      }
    }
  };

  const wrapProvider = (provider: LlmPort): LlmPort => {
    const prependSystem = (messages: LlmMessage[]): LlmMessage[] => [
      { role: "system", content: filesystemSystemPromptBody({ maxChars, readOnly }) },
      ...messages
    ];

    return {
      ...provider,
      name: provider.name,
      complete: provider.complete
        ? async (messages, opts) => provider.complete!(prependSystem(messages), opts)
        : undefined,
      completeJSON: provider.completeJSON
        ? async <T>(messages: LlmMessage[], schema: unknown, opts?: Record<string, unknown>) =>
            provider.completeJSON!<T>(prependSystem(messages), schema, opts)
        : undefined
    };
  };

  return {
    name: "filesystem",
    init: ({ ctx }) => {
      const mem = memoryView(ctx);
      if (!mem.files) mem.files = {};
      if (!mem.blobs) mem.blobs = {};
      if (!mem.filesFull) mem.filesFull = {};
      if (typeof mem.fsBlobSeq !== "number") mem.fsBlobSeq = 0;
      mem.fsBaseDir = getBaseDir(ctx, opts);
    },
    tools: () => {
      const out: Record<string, ToolSpec<any>> = {
        ls: toolLs,
        read_file: toolReadFile,
        glob: toolGlob,
        grep: toolGrep,
        read_blob: toolReadBlob
      };
      if (!readOnly) {
        out.write_file = toolWriteFile;
        out.edit_file = toolEditFile;
      }
      return out;
    },
    wrapProvider,
    hooks: {
      onToolResult: ({ result, ctx }) => {
        try {
          if (!result.ok) return;
          if (typeof result.data !== "string") return;
          if (result.data.length <= maxChars) return;
          const ref = storeBlob(ctx, result.data);
          const preview = truncateWithMarker(result.data, maxChars);
          result.data = {
            text: preview.text,
            truncated: true,
            ref
          };
        } catch {
          // Best-effort safety net: never throw from middleware hook.
        }
      }
    }
  };
};
