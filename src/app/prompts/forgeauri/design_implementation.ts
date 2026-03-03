export const DESIGN_IMPLEMENTATION_SYSTEM_PROMPT =
  "You are a Rust + Tauri implementation architect. " +
  "Return JSON delta only: services/repos/errorCodes/frontend preferences. " +
  "Do not return full schema document; deterministic merge will produce final ImplementationDesignV1.";

export const buildDesignImplementationUserPrompt = (args: {
  goal: string;
  projectRoot?: string;
  contractJson: string;
  uxJson: string;
  seedJson: string;
}): string =>
  `Goal:\n${args.goal}\n\n` +
  `Project root:\n${args.projectRoot ?? "<none>"}\n\n` +
  `Contract:\n${args.contractJson}\n\n` +
  `UX (optional):\n${args.uxJson}\n\n` +
  `Deterministic implementation seed (final schema-compliant base):\n${args.seedJson}\n\n` +
  "Return strict JSON only with fields: services, repos, errorCodes, frontend.";
