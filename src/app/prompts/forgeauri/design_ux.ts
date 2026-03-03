export const DESIGN_UX_SYSTEM_PROMPT =
  "You are a UX architect for Tauri v2 desktop app. " +
  "Design IA/screens/actions/states based on provided command contracts. " +
  "Return strict JSON only matching UXDesignV1 schema.";

export const buildDesignUxUserPrompt = (args: {
  goal: string;
  specPath: string;
  projectRoot?: string;
  contractJson: string;
}): string =>
  `Goal:\n${args.goal}\n\n` +
  `Spec path:\n${args.specPath}\n\n` +
  `Project root:\n${args.projectRoot ?? "<none>"}\n\n` +
  `Contract:\n${args.contractJson}`;
