import { resolve } from "node:path";

export const resolveFromCwd = (path: string): string => resolve(process.cwd(), path);
