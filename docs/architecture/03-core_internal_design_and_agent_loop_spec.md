# Core 内部设计与 Agent Loop 规范

**文档 ID**: AGENT-ARCH-CORE-003  
**标题**: Core 内部设计与 Agent Loop 规范  
**版本**: 1.2.0  
**状态**: Draft  
**受众**: 架构师、工程师、评审者、代码生成工具  
**语言**: 中文  
**更新时间**: 2026-03-08

---

## 1. 引言与目的

本文是当前五层基线中的 Core 规范文档。`02-core_shell_profile_architecture_spec.md` 负责描述 Protocol/Core/Shell/App/Profile 的整体分层与主线路径；本文只聚焦 Core 层内部语义、状态推进、验收与恢复规则。本文描述的是当前实现态与规范边界，不是未来完整 agent 平台的总设计。阅读本文时应结合 glossary 与 runtime visual model 交叉对照。

---

## 2. Core 设计原则

1. **Closed Semantic Runtime Kernel**：Core 是封闭语义内核，负责定义运行语义而非外部执行细节。  
2. **State Machine First**：Core 以状态机方式推进 run，不以 provider/tool 的返回格式定义语义。  
3. **Deterministic by Rule**：状态迁移依赖明确规则与显式条件，避免隐式推断驱动关键决策。  
4. **Effect Boundary Discipline**：Core 只通过 `EffectRequest` 发出外部需求，只消费规范化 `EffectResult`。  
5. **Profile-Agnostic Semantics**：Profile 可约束运行方式，但不改写 Core 状态机语义。  
6. **Semantic Separation**：必须区分 task verification、milestone acceptance、goal acceptance、retry、repair、replan、terminal failure。

---

## 3. Core 内部模块（当前基线）

### 3.1 Run Lifecycle / State Transition

- `runCoreAgent`：run 生命周期最小骨架（初始化与收尾）。  
- `transition-engine.ts`：状态迁移规则与终态约束。  
- `terminal.ts`：run/task/milestone/plan 终态判断。

### 3.2 Step / Tick Orchestration

- `runSingleStep`：Core 内部单步推进编排。  
- `driveCoreRun`：多 step 的最小循环驱动。  
- `runRuntimeTick`：tick 级外层语义，组织 core 推进与 effect request/result 处理。

### 3.3 Task Pointer & Dispatch Semantics

- `selectNextTask`：按状态与 `plan.taskIds` 选择下一个可运行 task。  
- `advanceToNextTask`：推进、保留或清空 `currentTaskId`。  
- `preserveOrAdvanceTask`：当前 task 可继续时优先保留。

### 3.4 Effect Boundary Emission / Consumption

- `build-effect-request.ts`：从 `AgentState/Plan/Task` 生成 `EffectRequest`。  
- `apply-effect-result.ts`：把 `EffectResult` 吸收到 `AgentState`。  
- `run-effect-cycle.ts`：串接 request 准备与 result 回流的最小闭环。

### 3.5 Verification & Recovery Semantics

- 当前主线已实现：最小成功/失败推进与终态控制。  
- 当前主线未完全落地：review orchestration、repair/replan 的完整执行编排。

### 3.6 Trace / Audit Semantics

- 当前主线保留轻量可追踪语义（状态、task 指针、effect kind）。  
- 完整审计流水（例如全量 hook/middleware 事件）不属于当前 Core 主线实现。

> 说明：tool execution、planner、context engine、middleware/hook 并非 Core 固有职责。

---

## 4. 关键数据模型（规范优先）

### 4.1 Core 内部直接关注对象

- `AgentState`（`src/protocol/agent-state.ts`）
- `Plan`（`src/protocol/plan.ts`）
- `Milestone`（`src/protocol/milestone.ts`）
- `Task`（`src/protocol/task.ts`）
- `SuccessCriterion`（`src/protocol/success-criterion.ts`）
- `FailureSignal`（`src/protocol/failure-signal.ts`）
- `PlanPatch`（`src/protocol/plan-patch.ts`）

### 4.2 Core / Shell 边界对象

- `Action`（`src/protocol/action.ts`）
- `ActionResult`（`src/protocol/action-result.ts`）
- `EffectRequest`（`src/protocol/effect-request.ts`）
- `EffectResult`（`src/protocol/effect-result.ts`）
- `ReviewRequest`（`src/protocol/review-request.ts`）
- `ReviewResult`（`src/protocol/review-result.ts`）
- `Evidence`（`src/protocol/evidence.ts`）
- `ContextPacket`（`src/protocol/context-packet.ts`）

### 4.3 规范边界对象 / 预留协议对象说明

上表对象均已在 protocol 层定义；但并非全部已完整进入当前主线路径。例如 `ReviewRequest/ReviewResult`、`Evidence/ContextPacket` 已有协议定义，但其完整 orchestration 仍属后续接入范围。prompt/message/tool-call payload 不是 Core 数据模型原语。

---

## 5. Agent Loop（规范执行顺序）

canonical loop 保持为：`Plan -> Dispatch -> Execute -> Verify -> Repair`。

### 5.1 当前已实现语义（Core 视角）

1. **Plan 判断**：Core 基于当前 `AgentState` 与 `Plan` 可用性判断是否可推进。  
2. **Dispatch 选择**：Core 选择 next ready task，并维护 `currentTaskId` 的保持/推进/清空。  
3. **Execute 请求发出**：Core 发出 `EffectRequest`，不直接执行外部动作。  
4. **Result 回流吸收**：Shell 回传 `EffectResult` 后，Core 应用到 `AgentState`。  
5. **终态推进**：在可判定成功或失败时推进到 `done/failed`，并保持终态不可逆。

### 5.2 规范上应保留的后续语义（当前未完全落地）

1. Core 判断何时需要或更新 plan patch。  
2. Core 区分 verify、retry、repair、replan 的层级动作。  
3. Core 在 goal acceptance 通过后进入 `done`。  
4. Core 在明确终止条件满足时进入 `failed`。  
5. review orchestration 与真实 action executor 尚未完整落地，不应写成已实现。

---

## 6. Core / Shell 边界语义

Core 只关心规范化边界：发出 `EffectRequest`，吸收 `EffectResult`。Core 不直接执行 tool，不直接拥有 hook 机制。middleware / hook / HITL / sandbox / provider adapter 属于 Shell 或其治理层。

如实现层出现 hook，也只能作为可选机制，不得改变 Core 语义闭包。

---

## 7. 失败与恢复语义

1. **Task failure 不等于 run failure**：单任务失败可触发局部恢复，不应立即终止 run。  
2. **Milestone acceptance 不等于 goal acceptance**：局部通过不代表全局通过。  
3. **Retry / Repair / Replan 分层**：retry 是局部重试；repair 是局部补救；replan 是计划层重构。  
4. **`done` 进入条件**：只能在 goal acceptance 通过后进入。  
5. **`failed` 进入条件**：仅在明确终止条件满足时进入，如无可继续路径且无法修复、恢复预算耗尽、验收持续失败且无法补救、出现 terminal failure signal。

说明：上述恢复分层是 Core 规范语义；当前主线路径中部分 recovery orchestration 尚未完全落地。

---

## 8. 当前边界 / 非目标

本文不定义以下内容：

- provider 接入；
- message assembly；
- LLM adapter；
- tool executor；
- sandbox implementation；
- middleware/hook governance；
- profile-specific shell assembly。

这些内容属于 Shell 或 Profile/App 文档范围，不属于 Core 规范主体。

---

## 9. 审计与回放（当前基线）

当前建议至少可追踪：

- `AgentState` 关键字段变化（例如 `status`、`currentTaskId`）；
- `EffectRequest.kind` 与 `EffectResult.kind` 的往返；
- 关键状态迁移触发点（启动、推进、终止）。

完整审计流水可后续增强，但不应改变 Core 语义定义。

---

## 10. 实施边界说明

本文是五层基线下 Core 这一层的规范说明。任何实现若将 provider/tool 原生对象引入 Core 原语、或让 Profile 改写 Core 语义，均视为越界。
