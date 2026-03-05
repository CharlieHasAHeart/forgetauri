import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Evidence } from "../contracts/context.js";

type MemoryData = {
  decisions: string[];
  invariants: string[];
  pitfalls: string[];
};

const defaultMemory = (): MemoryData => ({ decisions: [], invariants: [], pitfalls: [] });

const normalizeItem = (value: string): string => value.trim().replace(/\s+/g, " ");

export class MemoryStore {
  private readonly filePath: string;
  private data: MemoryData = defaultMemory();

  private constructor(filePath: string) {
    this.filePath = filePath;
  }

  static async load(baseDir: string): Promise<MemoryStore> {
    const dir = join(baseDir, "generated", "memory");
    await mkdir(dir, { recursive: true });
    const path = join(dir, "adr-lite.json");
    const store = new MemoryStore(path);
    try {
      const raw = await readFile(path, "utf8");
      const parsed = JSON.parse(raw) as Partial<MemoryData>;
      store.data = {
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions.map(String) : [],
        invariants: Array.isArray(parsed.invariants) ? parsed.invariants.map(String) : [],
        pitfalls: Array.isArray(parsed.pitfalls) ? parsed.pitfalls.map(String) : []
      };
    } catch {
      store.data = defaultMemory();
      await store.persist();
    }
    return store;
  }

  private async persist(): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }

  async addDecision(value: string): Promise<void> {
    const item = normalizeItem(value);
    if (!item) return;
    this.data.decisions = [item, ...this.data.decisions.filter((x) => x !== item)].slice(0, 100);
    await this.persist();
  }

  async addPitfall(value: string): Promise<void> {
    const item = normalizeItem(value);
    if (!item) return;
    this.data.pitfalls = [item, ...this.data.pitfalls.filter((x) => x !== item)].slice(0, 100);
    await this.persist();
  }

  async addInvariant(value: string): Promise<void> {
    const item = normalizeItem(value);
    if (!item) return;
    this.data.invariants = [item, ...this.data.invariants.filter((x) => x !== item)].slice(0, 100);
    await this.persist();
  }

  async queryRelevant(args: {
    evidence?: Evidence;
    task?: { id?: string; title?: string };
    paths?: string[];
  }): Promise<{ decisions: string[]; invariants: string[]; pitfalls: string[] }> {
    const text = [args.task?.id, args.task?.title, ...(args.paths ?? []), args.evidence?.parsedErrors?.map((item) => item.message).join(" ")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const score = (item: string): number => {
      if (!text) return 0;
      const lower = item.toLowerCase();
      let hits = 0;
      for (const token of text.split(/\s+/).filter((x) => x.length > 2)) {
        if (lower.includes(token)) hits += 1;
      }
      return hits;
    };

    const top = (items: string[]): string[] => [...items].sort((a, b) => score(b) - score(a)).slice(0, 3);
    return {
      decisions: top(this.data.decisions).slice(0, 1),
      invariants: top(this.data.invariants).slice(0, 1),
      pitfalls: top(this.data.pitfalls).slice(0, 1)
    };
  }
}
