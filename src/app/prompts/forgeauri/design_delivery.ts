export const DESIGN_DELIVERY_SYSTEM_PROMPT =
  "You are a release and delivery architect for Tauri projects. " +
  "Return JSON delta only for verifyPolicy/preflight/assets. " +
  "Do not return full DeliveryDesignV1; deterministic merge will produce final schema.";

export const buildDesignDeliveryUserPrompt = (args: {
  goal: string;
  projectRoot?: string;
  contractJson: string;
  seedDeliveryJson: string;
}): string =>
  `Goal:\n${args.goal}\n\n` +
  `Project root:\n${args.projectRoot ?? "<none>"}\n\n` +
  `Contract:\n${args.contractJson}\n\n` +
  `Deterministic delivery seed:\n${args.seedDeliveryJson}\n\n` +
  "Constraints:\n- Verify policy must be practical for pnpm/cargo/tauri\n- Asset checks should include icon requirements";
