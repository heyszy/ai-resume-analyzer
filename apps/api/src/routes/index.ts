import type { FastifyInstance } from "fastify";

import { registerAnalysisRoutes } from "./analysis";
import { registerCandidateRoutes } from "./candidates";
import { registerJobDescriptionRoutes } from "./job-descriptions";
import { registerUploadRoutes } from "./uploads";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(registerUploadRoutes);
  await app.register(registerCandidateRoutes);
  await app.register(registerJobDescriptionRoutes);
  await app.register(registerAnalysisRoutes);
}
