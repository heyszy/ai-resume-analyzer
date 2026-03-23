# 智能简历分析平台

本仓库使用 `pnpm workspace` 管理前后端与共享包。

## 工作区

- `apps/web`：Next.js 前端
- `apps/api`：Fastify 后端
- `packages/shared`：共享类型与 Schema

## 当前阶段

当前只完成项目初始化与依赖安装，不包含业务实现。

## 工具链

- 代码检查与格式化：Biome
- 类型检查：TypeScript

## Mock PDF 流程

项目提供了本地生成 mock PDF 的脚本，用于测试简历上传、PDF 解析和后续分析流程。

在仓库根目录执行：

```bash
node scripts/generate-mock-resumes.mjs
```

生成结果默认位于 `mock-data/resumes`。

说明：

- 仓库提交生成脚本和目录说明，不提交真实生成出来的 PDF 文件。
- `mock-data/resumes/*.pdf` 已写入 `.gitignore`，本地可以反复生成和覆盖。
