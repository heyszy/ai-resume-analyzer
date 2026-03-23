# 智能简历分析平台

本项目是一个在线简历分析平台，支持上传 PDF 格式的简历，通过 AI 分析简历和岗位 JD 的匹配度。

在线预览：https://ai-resume-analyzer-zheyu.vercel.app

## 主要功能

- PDF 格式简历上传
- 候选人管理
- 岗位 JD 管理
- AI 解析简历
- AI 分析简历与岗位匹配度

## 项目架构

本仓库使用 `pnpm workspace` 管理前后端与共享包。

- `apps/web`：Next.js 前端
    - `apps/web/components`：前端组件，包括 shadcn/ui 组件和自定义组件
    - `apps/web/hooks`：前端自定义 Hook
    - `apps/web/lib`：前端工具函数
- `apps/api`：Fastify 后端
    - `apps/api/src/db`：数据库 Schema
    - `apps/api/src/plugins`：后端插件
    - `apps/api/src/lib`：后端工具函数
    - `apps/api/src/routes`：后端路由
    - `apps/api/src/modules`：后端具体实现模块
- `packages/shared`：共享类型与 Schema

## 技术栈

- 前端：Next.js + Typescript + Tailwind CSS + Zustand + SWR + shadcn/ui
- 后端：Fastify + Vercel Blob + PostgreSQL + Vercel AI SDK + Drizzle ORM + Zod + PDF Parse
- 代码检查与格式化：Biome

选型理由：为了快速开发，本项目前后端均使用 TypeScript 技术栈。前端使用的是现代化、开发生态丰富的 Next.js，后端使用高性能的 Fastify。同时使用 Biome 作为代码检查和格式化工具，用一个库替代 ESLint + Prettier 的繁杂配置。

后端数据库使用了 PostgreSQL，我用的是 Neon 提供的服务。使用 Drizzle 作为 ORM 工具，方便数据库操作和类型安全。Vercel Blob 作为文件存储，方便文件上传和下载，节省存储空间。

使用 Vercel AI SDK 作为大模型的调用，可以快速接入各家模型 API。

## 本地开发说明

在本地开发时，可以使用 `pnpm dev:web` 和 `pnpm dev:api` 命令分别启动前端和后端服务。

环境变量参考 `.env.example`：
- DATABASE_URL：数据库连接串；
- BLOB_READ_WRITE_TOKEN：Vercel Blob 的读写权限 Token；
- AI_BASE_URL：大模型 API 的 Base URL;
- AI_API_KEY：大模型 API Key;
- AI_MODEL：模型名称；
- NEXT_PUBLIC_API_BASE_URL：后端服务 URL，需要以 /v1 结尾。

### Mock PDF 流程

项目提供了本地生成 mock PDF 的脚本，用于测试简历上传、PDF 解析和后续分析流程。

在仓库根目录执行：

```bash
node scripts/generate-mock-resumes.mjs
```

生成结果默认位于 `mock-data/resumes`。

## 项目部署

前端部署在 Vercel，后端使用 PM2 + Nginx 部署在 AWS EC2 实例。


