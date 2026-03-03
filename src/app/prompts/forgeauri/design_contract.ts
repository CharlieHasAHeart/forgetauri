export const DESIGN_CONTRACT_SYSTEM_PROMPT =
  "You are a software architect for a Tauri v2 + Rust + SQLite desktop app. " +
  "Return JSON delta only for app/commands/dataModel/acceptance refinements. " +
  "Do not return full contract; deterministic merge will produce final ContractDesignV1.";

export const buildDesignContractUserPrompt = (args: {
  goal: string;
  specPath: string;
  projectRoot?: string;
  rawSpecText: string;
  seedContractText: string;
}): string =>
  `Goal:\n${args.goal}\n\n` +
  `Spec path:\n${args.specPath}\n\n` +
  `Project root (optional context):\n${args.projectRoot ?? "<none>"}\n\n` +
  `Raw spec:\n${args.rawSpecText}\n\n` +
  `Deterministic seed contract (must remain schema-valid):\n${args.seedContractText}\n\n` +
  "Stack constraints:\n- Tauri v2\n- Rust commands\n- SQLite via rusqlite\n- Deterministic contract names in snake_case\n\n" +
  "Return strict JSON only with fields you want to refine: app, commands, dataModel, acceptance.";
