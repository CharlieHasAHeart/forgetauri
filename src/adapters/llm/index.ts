import { loadEnvFile } from "../../config/loadEnv.js";
import { DashScopeResponsesAdapter } from "./dashscope/DashScopeResponsesAdapter.js";
import { OpenAIResponsesAdapter } from "./openai/OpenAIResponsesAdapter.js";
import type { LlmPort } from "../../ports/LlmPort.js";

export const getLlmAdapterFromEnv = (): LlmPort => {
  loadEnvFile();
  if (process.env.OPENAI_API_KEY) {
    return new OpenAIResponsesAdapter();
  }
  if (process.env.DASHSCOPE_API_KEY) {
    return new DashScopeResponsesAdapter();
  }
  throw new Error(
    "Missing LLM credentials. Set OPENAI_API_KEY (optionally OPENAI_BASE_URL / OPENAI_MODEL) or DASHSCOPE_API_KEY (optionally DASHSCOPE_BASE_URL / DASHSCOPE_MODEL)."
  );
};
