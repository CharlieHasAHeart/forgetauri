# Core Runtime Minimal Input Contract

## 1. 文档定位

本文是一份“当前 runtime 最小输入契约”文档。它只描述当前最小主线中，被实现与测试实际依赖的输入字段。本文不是 protocol 全量字段说明，也不是未来完整 Core 状态模型设计。

## 2. 为什么需要这份文档

当前 Shell 最小主线已经形成闭环：runtime 可以基于最小 Core 输入产出可执行 request，并接收 effect result。`tests/shared/minimal-runtime-fixtures.ts` 已将这组最小输入显性化。为了避免后续演进时把“当前最小必需”与“协议全量可能性”混在一起，需要把这份最小输入契约单独文档化，作为当前基线。

## 3. AgentState 当前最小依赖字段

在当前最小 runnable path 中，runtime 侧被直接依赖并被测试固定的 `AgentState` 字段是：

- `runId`
- `status`
- `goal`

当前用途：

- `status` 用于 runtime gate 与终态判断（是否可继续推进）。
- `runId` 与 `goal` 会进入后续 request payload 相关链路（经 core/shell 组合后用于执行上下文）。

`AgentState` 在 protocol 中还有其它可选字段（如 `planId`、`currentTaskId` 等），但这些不应被表述为“当前最小输入必需字段”。

## 4. Plan 当前最小依赖字段

当前最小主线被直接依赖并被测试固定的 `Plan` 字段是：

- `id`
- `goal`
- `status`
- `taskIds`

当前用途：

- `status` 与 plan 合法性共同参与可运行性判断。
- `taskIds` 参与当前 task 选择与推进。
- `id`/`goal` 会参与 request 构造的上下文信息。

这表示“当前最小 path 依赖”，不是 `Plan` 的完整协议约束清单。

## 5. Task 当前最小依赖字段

当前最小主线被直接依赖并被测试固定的 `Task` 字段是：

- `id`
- `title`
- `status`

当前用途：

- `status` 用于 runnable 判断。
- `id` 用于 `currentTaskId` 推进与 request 定位。
- `title` 作为当前最小 request payload 的任务描述字段。

当前实现未要求比这更多的 task 结构字段来跑通最小 runnable path。

## 6. 当前最小 runnable path

```text
AgentState + Plan + Task[]
  -> runShellRuntimeStep
  -> tick.state + tick.request
  -> executeEffectRequest
  -> EffectResult
```

这条路径由最小输入字段支撑：

- `AgentState.status` 决定能否推进；
- `Plan.taskIds` + `Task.status` 决定能否选出 runnable task；
- 被选中 task 的 `id/title` 与 plan/state 字段共同进入 request 相关链路。

`tests/shared/minimal-runtime-fixtures.ts` 正是这条最小路径的测试化输入基线。

## 7. Shared fixture 与契约关系

`tests/shared/minimal-runtime-fixtures.ts` 是当前最小输入契约的测试化表达，不是 protocol 官方 schema。它表达的是“当前 runtime 最小主线可运行所需的最小输入集合”。

对应单测 `tests/shared/minimal-runtime-fixtures.test.ts` 已固定：

- 默认 baseline 形状；
- override 行为；
- 对象引用隔离；
- 使用该 fixture 可驱动当前 runtime 最小 step。

## 8. 当前不应误解的事项

这份文档不表示 `AgentState` / `Plan` / `Task` 的最终完整模型，也不冻结未来 Core 演进空间。它只记录“当前实现与测试已验证的最小输入基线”。后续 runtime 或 Core 扩展时，这份文档应随实现一起更新。

## 9. 与 Core ↔ Shell 边界文档的关系

`docs/architecture/05-core_shell_boundary_and_minimal_contract.md` 聚焦跨层边界契约（Core ↔ Shell）。本文聚焦 runtime 在 Core 侧可推进所需的最小输入前提。两者组合后，形成“Core 输入基线 + Core/Shell 边界契约”的双侧说明。
