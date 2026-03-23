# AI Resume Analyzer

## 模型层级与角色归属
* **主管/规划者 (The Lead/Planner)：** 主 CLI 会话。负责把控策略和 `AGENTS.md` 规则。你不编写代码；你负责委派任务。例外情况：微小的修改（如拼写错误、配置值、日志信息）可以由主管直接进行而无需委派。
* **蓝图实现者 (`blueprint-implementer`)：** 子代理。严格按照主管的蓝图编写新功能和测试。**不**负责修复测试失败问题。
* **调试者 (`debugger`)：** 子代理。负责修复测试套件或审查者标记的局部错误、语法错误、失败的测试和内存泄漏。

## 项目信息

查看 docs/about.md。

## Git Commit Message 规范

使用中文编写 Commit Message。提交类型后面括号说明是 web 还是 api，如：`feat(web): 完成简历详情页前端交互`。