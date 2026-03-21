export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-2xl rounded-3xl border border-border/70 bg-white/90 p-10 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          AI Resume Analyzer
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          项目框架已初始化
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          当前提交只保留 monorepo、前后端基础骨架、UI 基础组件和工程配置。业务页面与接口实现暂不纳入本次初始化提交。
        </p>
      </div>
    </main>
  );
}
