import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import { envPlugin } from "./plugins/env";
import { registerRoutes } from "./routes";

export function buildApp() {
  const app = Fastify({
    logger: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.register(envPlugin);
  app.register(cors, {
    origin: true,
  });
  app.register(sensible);
  app.register(multipart, {
    limits: {
      files: 10,
      fileSize: 10 * 1024 * 1024,
      fields: 4,
    },
    throwFileSizeLimit: true,
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.register(registerRoutes, { prefix: "/v1" });

  return app;
}
