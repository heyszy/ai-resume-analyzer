import { z } from "zod";

export const appEnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),
});

export type AppEnv = z.infer<typeof appEnvSchema>;
