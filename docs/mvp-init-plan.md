# 智能简历分析平台 MVP 初始化方案

## 目标

第一阶段只完成仓库初始化，不进入业务开发。

## 范围

- 建立 `pnpm workspace` monorepo 结构
- 初始化 `apps/web`、`apps/api`、`packages/shared`
- 安装首批必需依赖
- 前端视觉基底允许直接使用 `shadcn/ui` 默认风格

## 本阶段不做

- 任何业务页面、接口、数据库表与评分逻辑
- 任何候选人管理、PDF 解析、AI 调用实现
- 任何自定义视觉设计与组件细化

## 目录约定

```text
.
├─ apps/
│  ├─ web/
│  └─ api/
├─ packages/
│  └─ shared/
├─ docs/
│  └─ mvp-init-plan.md
└─ 根级配置文件
```

## 依赖基线

- 前端：Next.js、TypeScript、Tailwind CSS、shadcn/ui、Zustand、SWR
- 后端：Fastify、Vercel AI SDK、Drizzle ORM、Neon、Vercel Blob
- 共享层：Zod

## 约束

- 使用 `Node.js 22.x`
- 对话与文档统一使用中文
- 初始化阶段只允许脚手架、配置和依赖安装
- 代码检查与格式化统一使用 `Biome`
