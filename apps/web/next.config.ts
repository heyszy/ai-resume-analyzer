import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const currentDir = dirname(fileURLToPath(import.meta.url));

// 前端开发时额外读取仓库根目录 .env，避免 monorepo 下重复维护一份环境变量。
loadEnvConfig(resolve(currentDir, "../.."));

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@ai-resume-analyzer/shared"],
};

export default nextConfig;
