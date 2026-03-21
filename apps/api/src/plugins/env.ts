import fastifyEnv from "@fastify/env";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { type AppEnv, appEnvSchema, rootEnvPath } from "../env";

declare module "fastify" {
  interface FastifyInstance {
    config: AppEnv;
  }
}

// 环境变量插件统一从仓库根目录读取 .env，并把校验后的配置挂到 fastify.config。
export const envPlugin = fp(async (app: FastifyInstance) => {
  await app.register(fastifyEnv, {
    confKey: "config",
    schema: appEnvSchema,
    dotenv: {
      path: rootEnvPath,
    },
  });
});
