import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import type { FileSystemPort } from "../../ports/FileSystemPort.js";

export class NodeFsAdapter implements FileSystemPort {
  async readFile(path: string, encoding: BufferEncoding = "utf8"): Promise<string> {
    return readFile(path, encoding);
  }

  async writeFile(path: string, data: string): Promise<void> {
    await writeFile(path, data, "utf8");
  }

  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await mkdir(path, options);
  }

  async stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean; size: number }> {
    return stat(path);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }
}
