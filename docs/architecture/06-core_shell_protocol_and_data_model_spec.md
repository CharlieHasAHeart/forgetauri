# Core-Shell 协议与数据模型规范

**文档 ID**: AGENT-ARCH-PROTOCOL-006  
**标题**: Core-Shell 协议与数据模型规范  
**版本**: 1.3.0  
**状态**: Draft  
**受众**: 架构师、工程师、评审者、代码生成工具  
**语言**: 中文  
**更新时间**: 2026-03-18

---

## 1. 引言与目的

本文是当前五层基线中的 Protocol / Core-Shell boundary 规范文档。`02-core_shell_profile_architecture_spec.md` 负责整体分层与主线路径，`03-core_internal_design_and_agent_loop_spec.md` 负责 Core 内部语义与状态推进，`04-shell_internal_design_and_effect_handling_spec.md` 负责 Shell 内部职责、effect request/result 桥接与结果归一化。本文只定义跨 Core / Shell 边界的标准协议对象与数据模型约束。

本文关注的不只是对象定义本身，还包括边界安全、结果可吸收性、审计友好性、回放友好性，以及对未来持久化 / resume 支撑能力的协议层准备。本文描述的是当前实现态与规范边界，不是未来完整 agent 协议平台的总设计，也不表示 persistence / resume 已完整实现。

---

## 2. 适用范围

本文覆盖 Protocol 层定义的、可跨 Core / Shell 边界流转的标准对象，典型包括：

- `Plan`
- `Milestone`
- `Task`
- `SuccessCriterion`
- `Action`
- `ActionResult`
- `Evidence`
- `FailureSignal`
- `ContextPacket`
- `EffectRequest`
- `EffectResult`
- `PlanPatch`
- `ReviewRequest`
- `ReviewResult`
- `AgentState`（共享状态对象；并非其所有字段都属于跨边界主载荷）

本文不覆盖：

- Core 内部状态机细节；
- Shell 内部 handler / executor 实现；
- provider SDK 私有字段；
- sandbox/tool 内部对象；
- App/Profile 层装配细节。

---

## 3. 规范原则

1. **Normalization First**：provider-native / tool-native / sandbox-native 输出必须先归一化，再跨边界流转。  
2. **Boundary Safety**：边界对象必须是 protocol-safe 对象，禁止 raw message objects、tool-call payloads、sandbox handles 直接跨界。  
3. **Semantic Neutrality**：边界对象表达语义意图与归一化事实，不承载厂商私有协议语义。  
4. **Serializable by Default**：跨边界对象应默认可序列化、可记录、可审计。  
5. **Replayability by Design**：协议边界应尽量保留支持回放与事后追踪的最小信息，而不是只服务一次性调用。  
6. **Resume-Aware Boundary Design**：即使完整 persistence / resume 尚未实现，边界对象设计也不应阻断未来的持久化、恢复与继续执行能力。  
7. **Absorbable Failure Shapes**：失败相关边界对象必须足够规范化，使 Core 可以安全吸收，而不依赖 provider / tool / sandbox 的原始异常结构。  
8. **Versionable Evolution**：协议演进应可版本化，优先向后兼容。  
9. **Minimal Leakage**：最小化外部实现细节泄漏到 Core 原语。

---

## 4. 边界对象（规范）

### 4.1 规范边界对象总览

Protocol 提供跨层标准对象目录：`Plan`、`Milestone`、`Task`、`SuccessCriterion`、`Action`、`ActionResult`、`Evidence`、`FailureSignal`、`ContextPacket`、`EffectRequest`、`EffectResult`、`PlanPatch`、`ReviewRequest`、`ReviewResult`、`AgentState`。

### 4.2 当前主线路径中已直接进入流转的对象

当前最明确进入主线闭环的对象包括：

- `Action`
- `ActionResult`
- `EffectRequest`
- `EffectResult`
- `Plan`
- `Task`
- `AgentState`

### 4.3 已定义但未完整进入主线路径的预留协议对象

以下对象协议已定义，但其完整 orchestration 仍未全部进入当前主线：

- `ReviewRequest` / `ReviewResult`
- `Evidence`
- `ContextPacket`
- `PlanPatch`
- `FailureSignal`
- `Milestone` / `SuccessCriterion` 的完整验收闭环

### 4.4 边界对象的一般约束

1. `EffectRequest` 是 Core 发给 Shell 的 normalized protocol object。  
2. `EffectResult` 是 Shell 回给 Core 的 normalized protocol object，具体字段以 protocol 层定义为准，不将旧 envelope（如 `ok/data/error/meta`）写死为唯一标准。  
3. `Action` 表达待执行动作的规范化描述，字段以 protocol 定义为准，不限定为旧草案字段集合。  
4. `ContextPacket` 是 Shell 侧上下文构造后的规范化上下文对象或引用对象，可用于不同 capability path，不绑定唯一消费者。其设计应优先支持引用、安全裁剪、可追踪来源，而非隐式携带任意大文本。  
5. `Evidence` 应优先表达为规范化证据对象或证据引用，而不是未经约束的原始执行副产物。若证据体量较大，应使用摘要、预览或 `ref` 方式表达。  
6. `FailureSignal` 及其他承载失败信息的边界对象，必须保持 normalized、serializable、protocol-safe，不得直接泄漏 provider / tool / sandbox 私有异常结构。  
7. 支持 review / audit / replay 的边界对象，应保留最小可引用性与可追踪性，使后续调查、回放或审计成为可能。  
8. Core 内部直接关注对象：`Plan`、`Milestone`、`Task`、`SuccessCriterion`、`FailureSignal`、`PlanPatch`。  
9. Core/Shell 边界对象：`Action`、`ActionResult`、`EffectRequest`、`EffectResult`、`ContextPacket`、`Evidence`、`ReviewRequest`、`ReviewResult`。  
10. 共享状态对象：`AgentState`。  
11. 大载荷、大文本与大结果不应无边界直接内嵌到主边界对象中；在合适情况下应优先采用摘要 + 引用的表达方式，以支持序列化、审计、回放与未来恢复能力。

---

## 5. 错误与失败信号

应明确区分以下三个层面：

1. **provider / tool / sandbox raw failure**：外部执行世界产生的原始错误、异常、拒绝、退出码、stderr 或私有失败对象。  
2. **normalized boundary failure object**：跨 Core / Shell 边界回流的规范化失败对象，例如 `FailureSignal` 或失败型 `EffectResult` 所携带的失败信息。  
3. **Core runtime failure semantics**：Core 基于规范化结果、当前状态、预算、恢复可能性与终止规则所做出的运行语义判断，例如 retry、repair、replan、terminal failure 或 run-level failed。

必须遵守：

- Core 不依赖 provider 原始异常对象结构作语义判定；
- Shell 不应把 raw failure 直接穿透为 Core 原语；
- boundary failure object 必须足够结构化，使 Core 能安全吸收；
- failure information 应尽量保留机器可判定字段与最小审计线索；
- failure information 的表达应支持后续审计、回放与调查，而不要求当前就实现完整 persistence / resume。

错误对象跨边界时必须是 normalized protocol-safe object。可保留 `code` / `message` / `detail` / `ref` / `source` / `severity` 等机器可判定与可追溯信息，但不将某个旧字段模板写死为唯一结构。

---

## 6. 引用与大文本外置

为保证 serializability、auditability、replayability 与未来 resume 支撑能力，边界协议建议：

1. 大文本与大载荷应 ref 化 / 外置；  
2. 协议对象仅保留摘要、预览或引用；  
3. 任何可追溯实体应具备 `ref` 或等价回放定位方式；  
4. 引用设计不只是为了减小对象体积，也为了保证审计、回放与后续恢复时的对象稳定性；  
5. 若对象天然涉及长上下文、证据集合或执行产物，应优先考虑“边界安全引用”而不是“直接穿透全量内容”。

---

## 7. 当前实现态

当前主线路径中最明确的最小边界闭环是：

- `Action -> ActionResult -> EffectResult`
- `EffectRequest -> EffectResult`

`ReviewRequest` / `ReviewResult`、`Evidence` / `ContextPacket`、`FailureSignal` 目前更多处于协议已定义但主线路径未完全接入状态。本文中的完整对象目录表示“协议边界能力与规范集合”，不等于全部对象都已进入当前主线路径。

当前协议方向并不是为了把所有对象一次性落地，而是为了给更硬的 runtime path 做边界准备。review、evidence、context、failure-related 对象之所以重要，是因为它们支撑 runtime hardening、审计、回放与后续恢复能力，而不是因为当前仓库已经完成这些能力的完整实现。

---

## 8. 当前边界 / 非目标

本文不定义：

- Core 状态机实现；
- Shell effect handler / executor 内部实现；
- provider adapter 细节；
- tool executor 细节；
- sandbox implementation；
- App / Profile 装配策略。

这些内容分别属于 02 / 03 / 04 / 05 文档范围。

---

## 9. 版本演进规则

1. 协议演进优先新增可选字段，避免直接破坏既有对象语义。  
2. 语义变化必须同步更新 protocol 定义与架构文档。  
3. 跨边界协议变更不能通过隐式代码漂移完成，必须先文档化再实现。  
4. 若发生协议语义变化，应同步更新测试与相关架构文档。  
5. 保持向后兼容与文档先行。  
6. 若某类边界对象影响 audit / replay / future resumeability，应在演进时显式评估其引用稳定性与序列化稳定性。  

---

## 10. 合规检查清单

- Core 是否仍只消费 normalized protocol objects？  
- Shell 是否已屏蔽 provider/tool/sandbox 私有结构？  
- 是否存在 raw message / tool-call payload / sandbox handle 越过边界？  
- 协议对象是否保持 serializable？  
- 边界失败对象是否已规范化到足以被 Core 安全吸收？  
- 协议对象是否保留了足够的引用性，以支持 audit / replay？  
- 是否有对象形状在无意中阻断未来 resumeability？  
- 是否把当前未完整落地对象误写成主线路径既成事实？  
- 协议变更是否有版本说明与测试覆盖？  
- 是否仍保留 ref / 引用机制以支撑审计、回放与后续恢复能力？  