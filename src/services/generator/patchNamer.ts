export const patchNameFromRelativePath = (relativePath: string): string =>
  relativePath
    .replace(/[\\/]+/g, "__")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
