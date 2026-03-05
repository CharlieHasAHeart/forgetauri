import type { ToolRunContext } from "../contracts/tools.js";

type BlobMemory = ToolRunContext["memory"] & {
  blobs?: Record<string, string>;
  filesFull?: Record<string, string>;
  blobSeq?: number;
};

const asBlobMemory = (ctx: ToolRunContext): BlobMemory => ctx.memory as BlobMemory;

export const ensureBlobStores = (ctx: ToolRunContext): void => {
  const mem = asBlobMemory(ctx);
  if (!mem.blobs) mem.blobs = {};
  if (!mem.filesFull) mem.filesFull = {};
  if (typeof mem.blobSeq !== "number") mem.blobSeq = 0;
};

export const storeBlob = (ctx: ToolRunContext, content: string, prefix = "blob"): string => {
  ensureBlobStores(ctx);
  const mem = asBlobMemory(ctx);
  mem.blobSeq = (mem.blobSeq ?? 0) + 1;
  const ref = `${prefix}:${mem.blobSeq}`;
  mem.blobs![ref] = content;
  mem.filesFull![ref] = content;
  return ref;
};

export const readBlob = (ctx: ToolRunContext, ref: string): string | undefined => {
  const mem = asBlobMemory(ctx);
  return mem.filesFull?.[ref] ?? mem.blobs?.[ref];
};
