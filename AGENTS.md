# AGENTS.md

本文件只写会影响后续 agent 行为的项目规则。默认用中文思考、汇报和写交付说明。

## 项目结构

- `src/main/`: Electron 主进程；文件读写、工作区访问、图片解析、外链处理、PDF 导出、原生菜单、安全策略和 IPC handler 都在这里落地。
- `src/preload/`: renderer 可用 API 的唯一桥接层；新增 renderer 能力时同步更新 `types.ts`、`global.d.ts` 和相关测试。
- `src/renderer/src/`: React UI、i18n、样式、Markdown 渲染/搜索/图片解析辅助逻辑。
- `src/shared/`: main/preload/renderer 共用类型和 IPC 常量；IPC 名称以 `src/shared/ipcChannels.ts` 为准。
- `tests/e2e/`: Playwright Electron 分阶段工作流测试，按 `stageN.spec.ts` 对应功能阶段运行。
- `tests/fixtures/markdown/`: Markdown 渲染、链接、图片、表格、代码块等测试样本。
- `tests/stage8/`: 打包配置和产物约束测试。
- `build/`: 图标、NSIS、afterPack、可执行文件图标更新脚本；改这里必须考虑 Windows 安装包影响。

## 运行命令

- 安装依赖：`npm install`
- 开发运行：`npm run dev`
- 预览构建产物：`npm run preview`
- 类型检查并构建到 `out/`：`npm run build`
- 生成 Windows NSIS 安装包到 `release/`：`npm run dist`
- 重新生成应用图标：`npm run generate:icon`

## 测试命令

- 基础必跑：`npm run typecheck`
- 单元和打包规则：`npm test`
- 只跑某阶段单元测试：`npm run test:stageN`，例如 `npm run test:stage8`
- Electron E2E：`npm run test:e2e:stageN`，例如 `npm run test:e2e:stage7`
- 修改 UI、菜单、文件打开/保存、工作区、图片、链接、PDF 或打包行为时，必须跑对应 `test:e2e:stageN`；不清楚阶段时先查 `tests/e2e/`，不要用猜的。
- 打包相关改动必须跑 `npm run dist`，并重新验证 `tests/stage8` 或对应 packaged-stage 检查；不要信任旧的 `release/win-unpacked`。

## 代码风格

- TypeScript strict；两空格缩进、单引号、分号、命名导出。
- 变量/函数用 `camelCase`，组件和类型用 `PascalCase`，IPC channel key 用 `UPPER_SNAKE_CASE`。
- IPC 常量只在 `src/shared/ipcChannels.ts` 增改；main handler、preload API、renderer 类型和测试必须一起更新。
- 文件系统、外链、本地图片、PDF、默认编辑器等能力必须经 main/preload 受控 API；renderer 不直接扩大系统能力。
- Markdown 行为变化要补或更新 `tests/fixtures/markdown/`，并覆盖 renderer helper 测试。
- UI 文案只使用用户请求、现有项目文案、真实应用数据或 TODO；不要新增营销话术、假指标、假说明。

## 禁止事项

- 不提交或依赖生成目录：`node_modules/`、`out/`、`release/`、`test-results/`、`playwright-report/`。
- 不绕过 `.md` / `.markdown` 扩展检查，不扩大任意路径读写权限，不把安全判断搬到 renderer。
- 不新增未列入 `ALLOWED_IPC_CHANNELS` 的 IPC 使用，不使用散落字符串代替 `IPC_CHANNELS`。
- 不把通过单元测试等同于 Electron 真实工作流通过；菜单、窗口、文件选择、保存、外链确认要用 E2E 或手动运行验证。
- 不把旧构建产物、旧截图、旧测试日志当作本次验证证据。
- 不在有用户改动或冲突的文件上做无关格式化、重排、回滚；修改前先看 `git status --short`。
- 不用 `git reset --hard`、`git checkout --`、删除/移动批量文件等破坏性操作，除非用户明确要求。

## 完成标准

- 改动范围和用户目标一致；无关文件不动。
- `git diff` 自查过：没有多余文案、调试输出、临时代码、生成物或格式化噪音。
- 至少跑过与改动风险匹配的验证；没跑的命令要说明原因。
- IPC/文件系统/安全相关改动必须有对应单元测试，并检查 preload 暴露面没有意外变宽。
- UI/菜单/窗口布局改动必须验证窄窗口和主要交互路径，不只看默认窗口。
- 打包/图标/安装器改动必须产出新的打包验证结果；`npm run dist` 卡住或失败时不能声称已完成安装包验证。
- 最终回复写清楚：改了什么、验证了什么、哪些验证未跑或仍有风险。

## Review 标准

- 用户说“审核一下”时，默认做代码评审；先列 findings，再写简短结论。
- findings 按严重程度排序，必须带文件和行号，说明可复现的影响或回归路径。
- 优先审真实风险：文件访问边界、IPC 白名单、preload 暴露、外链/图片解析、保存/未保存状态、原生菜单语言、窄窗口布局、打包产物。
- 看到测试通过也要核对测试是否覆盖真实路径；Electron E2E 中用 `TEST_WORKER_INDEX` 判断测试环境更可靠，不假设存在 `PLAYWRIGHT_TEST`。
- 没发现问题时明确说“未发现可报告问题”，并列出剩余测试缺口或未验证风险。
