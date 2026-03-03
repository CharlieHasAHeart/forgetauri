import { loadEnvFile } from "../config/loadEnv.js";

export const loadAppEnv = (): void => {
  loadEnvFile();
};

export const getEnv = (): NodeJS.ProcessEnv => process.env;
