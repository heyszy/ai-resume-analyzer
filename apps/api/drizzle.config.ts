import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "drizzle-kit";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(currentDirectory, "../../.env");

process.loadEnvFile(rootEnvPath);

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL_MISSING");
}

export default defineConfig({
  dialect: "postgresql",
  schema: resolve(currentDirectory, "./src/db/schema.ts"),
  out: resolve(currentDirectory, "./drizzle"),
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
