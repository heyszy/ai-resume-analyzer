import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type AppEnv = {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  DATABASE_URL?: string;
  BLOB_READ_WRITE_TOKEN?: string;
  OPENAI_API_KEY?: string;
  AI_MODEL?: string;
};

const currentDir = dirname(fileURLToPath(import.meta.url));

export const rootEnvPath = resolve(currentDir, "../../../.env");

export const appEnvSchema = {
  type: "object",
  required: ["NODE_ENV", "PORT"],
  properties: {
    NODE_ENV: {
      type: "string",
      enum: ["development", "test", "production"],
      default: "development",
    },
    PORT: {
      type: "number",
      default: 3001,
    },
    DATABASE_URL: {
      type: "string",
    },
    BLOB_READ_WRITE_TOKEN: {
      type: "string",
    },
    OPENAI_API_KEY: {
      type: "string",
    },
    AI_MODEL: {
      type: "string",
    },
  },
} as const;
