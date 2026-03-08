# Core ↔ Shell Boundary And Minimal Contract

## 1. 文档定位

本文是当前仓库的 Core ↔ Shell 最小契约文档。它只描述当前代码与测试已经固定住的边界行为，不描述未来完整平台设计。本文应与 `docs/architecture/02-core_runtime_visual_model.md`、`docs/architecture/04-shell_internal_design_and_effect_handling_spec.md` 一起阅读，并以当前实现为准。

## 2. Core -> Shell 输入边界

当前主线中，Core 通过 runtime tick/step 驱动 Shell，并把 effect 请求交给 Shell 入口处理。Shell 入口函数是 `executeEffectRequest(...)`，输入对象是 `EffectRequest`。

`EffectRequest` 在当前最小实现里承担“跨边界执行意图”的角色。当前协议里合法且已使用的 `kind` 只有：

- `execute_actions`
- `run_review`

当前这两个 kind 的职责是：

- `execute_actions`：请求 Shell 执行动作链路，并返回归一化 action results。
- `run_review`：请求 Shell 返回最小 review 结果（accepted-only minimal path）。

## 3. Shell -> Core 输出边界

Shell 回流给 Core 的对象是 normalized 的 `EffectResult`，不是 provider/tool/sandbox 原生对象。当前稳定输出类别包括：

- `action_results`
- `review_result`

两者区别：

- `action_results`：来自 action 路径聚合，表达动作执行结果集合。
- `review_result`：来自当前最小 review builder，表达 review 路径的最小确认结果。

当前失败模板包括：

- invalid effect request
- unsupported effect request

当前输出围绕这些稳定字段组织：

- `kind`
- `success`
- `payload`
- `context`

## 4. 当前最小实现链路

### 4.1 execute_actions

```text
EffectRequest
  -> extractActionsFromEffectRequest
  -> Action[]
  -> executeActions
  -> ActionResult[]
  -> buildEffectResultFromActionResults
  -> EffectResult
```

对应代码：

- `src/shell/execute-effect-request.ts`
- `src/shell/extract-actions-from-effect-request.ts`
- `src/shell/action-executor.ts`
- `src/shell/build-effect-result-from-actions.ts`

### 4.2 run_review

```text
EffectRequest
  -> buildRunReviewEffectResult
  -> EffectResult
```

对应代码：

- `src/shell/execute-effect-request.ts`
- `src/shell/build-run-review-effect-result.ts`

说明：`run_review` 当前是最小 builder path，不是完整 review orchestration。

## 5. Runtime 与 Effect Entry 的关系

`runShellRuntimeStep(...)` / `runShellRuntimeLoop(...)` 与 `executeEffectRequest(...)` 之间，当前已经建立最小一致性契约：

- runnable step 会产出可被 effect entry 接受的 request；
- step 内部产出的 result 与显式调用 `executeEffectRequest(request)` 的结果一致；
- loop 当前按 step 的 `tick.state` 推进，保持最小同步闭环。

对应代码：

- `src/shell/run-shell-runtime.ts`
- `src/shell/execute-effect-request.ts`

对应测试：

- `tests/shell/run-shell-runtime.test.ts`
- `tests/shell/execute-effect-request.test.ts`

## 6. 当前已实现的最小承诺

当前可以视为已承诺的边界行为：

- Shell 能处理 `execute_actions`；
- Shell 能处理 `run_review`；
- Shell 对 invalid request 返回稳定失败模板；
- Shell 保留 unsupported builder 模板；
- runtime 与 effect entry 的最小一致性已建立；
- review builder 已抽离为独立边界文件。

## 7. 当前未实现但已预留边界

当前尚未实现，但边界位已预留：

- 真实 provider / sandbox / tool backend；
- 完整 review orchestration；
- 更多 effect kind；
- 更复杂 context/profile 驱动执行逻辑。

这里仅说明边界预留，不构成 roadmap 承诺。

## 8. 不应混淆的边界

- Core 不是外部执行层；
- Shell 不是核心语义裁决层；
- Shell 负责 integration、execution bridge、normalization；
- Core 负责驱动、状态推进与上层语义组织；
- Shell 返回的是 protocol object，不是私有 `ok/data/error/meta` 风格对象。

## 9. 关于 unsupported 的当前事实

当前协议里合法 `EffectRequest.kind` 只有 `execute_actions` 与 `run_review`，且入口层都已显式处理。因此在当前实现下，无法在入口层真实构造“合法但 unsupported”的可达路由分支。当前被固定的是 unsupported builder 模板本身，而不是入口可达分支。
