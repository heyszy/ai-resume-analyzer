import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "../db";

type AppSchema = typeof schema;

let database: NeonHttpDatabase<AppSchema> | null = null;

export function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL_MISSING");
  }

  if (!database) {
    database = drizzle(databaseUrl, { schema });
  }

  return database;
}
