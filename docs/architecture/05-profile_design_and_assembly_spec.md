# Profile 设计与装配规范

**文档 ID**: AGENT-ARCH-PROFILE-005  
**标题**: Profile 设计与装配规范  
**版本**: 1.2.0  
**状态**: Draft  
**受众**: 架构师、工程师、评审者、代码生成工具  
**语言**: 中文  
**更新时间**: 2026-03-08

---

## 1. 引言与目的

本文是当前五层基线中的 Profile 规范文档。`02-core_shell_profile_architecture_spec.md` 负责整体分层与主线路径；`03-core_internal_design_and_agent_loop_spec.md` 负责 Core 内部语义；`04-shell_internal_design_and_effect_handling_spec.md` 负责 Shell 内部职责、effect request/result 桥接与结果归一化；本文只负责 Profile 的配置边界、装配职责与场景约束输入。本文描述的是当前实现态与规范边界，不是未来完整场景装配平台的总设计。

---

## 2. Profile 的定位

Profile 是 **runtime constraint and governance surface**，主要通过 Shell assembly、policy selection 与 capability binding 落地，但不是 Core 的语义依赖。

Profile 的作用是：

- 表达运行约束；
- 表达治理与审批边界；
- 表达 capability / sandbox / review / policy 的装配面；
- 为特定场景提供清晰、可审计的 runtime configuration surface。

Profile 不是 Core semantic plug-in，也不是 runtime state machine extension。

Profile 的配置面不只是“如何装配 Shell”，还包括“在什么约束下运行 runtime”。

Profile 可配置：

- capability binding；
- sandbox policy；
- review routing policy；
- governance / approval boundary。

---

## 3. 设计原则

1. **Declarative Constraint and Assembly First**：Profile 以声明式配置表达 runtime constraints、governance surface 与场景装配，不直接编写 Core 语义分支。  
2. **Explicit Configuration Surface**：所有策略面应显式可见，避免隐式规则注入。  
3. **Preserve Profile-Agnostic Core Semantics**：Core 保持 profile-agnostic 语义，不因 Profile 改写状态机定义。  
4. **Replace by New Profile, Not by Core Mutation**：扩展场景优先新增或替换 Profile，而不是修改 Core 语义。  
5. **Auditability of Policy Surface**：策略面（policy/middleware/capability）必须可追踪、可解释。  
6. **Capability Binding Without Semantic Drift**：能力绑定可以变化，但不得造成语义漂移到 Core。

---

## 4. 推荐结构

```text
src/profiles/
  default-profile.ts
  index.ts
```

当前基线下，Profile 入口与使用建议：

- Profile 文件位于 `src/profiles/`，以运行约束对象形式提供配置；
- 默认实现参考 `src/profiles/default-profile.ts`；
- app 层接入参考 `src/app/run-agent-with-profile.ts`。

当前 Profile 更像 runtime constraint object / shell assembly input，不应把 `CoreRunDeps`、registry 或 `run<ProfileName>` 作为本文主轴规范。

---

## 5. 装配内容规范

### 5.1 Handler / Capability Binding

可以配置：为不同 effect intent 绑定对应 handler 与 capability。  
不能做：通过绑定直接改写 Core 状态机语义或终态判定。

### 5.2 Action Policy / Command Policy

可以配置：action allow/deny、command allowlist、预算与风险门禁。  
不能做：把命令策略写成 Core 语义规则或绕过 Core 验收语义。

### 5.3 Context Policy

可以配置：Shell 侧上下文构造策略与输入裁剪策略。  
不能做：把 provider/message 私有结构作为 Core 协议对象前提。

### 5.4 Middleware Selection

可以配置：middleware 的启用与顺序（如 logging、metrics、safety checks）。  
不能做：让 middleware 改写 Core semantics。

### 5.5 Sandbox Policy

可以配置：sandbox 使用策略、命令执行审批策略、风险拒绝策略。  
不能做：把 sandbox 实现细节暴露为 Core 原语。

### 5.6 Review Routing Policy

可以配置：review 请求的路由与处理优先级（Shell 装配层）。  
不能做：把 review acceptance 语义从 Core 转移到 Profile。

> 以上配置全部作用于 Shell assembly，不得越界改写 Core 语义。

---

## 6. 与 HITL 的关系

HITL 是 Profile 可配置的治理策略之一，属于 Shell governance / assembly choice。Profile 可以声明哪些操作需人工审批、拒绝后如何处理、哪些路径进入人工确认。HITL 不是 Profile 的唯一核心职责，也不应被写成 Core 语义的一部分。

---

## 7. 当前实现态

当前 Profile 实现仍偏 runtime profile / default profile。主线已落地能力主要是默认 profile、参数解析与运行方式约束（如 `maxSteps`、`autoRunToCompletion`、`allowShellExecution`、`enableReview` 读取）。

当前 Profile 仍主要承担轻量 runtime constraint 角色，尚未形成完整的 scenario-specific profile assembly and governance system。文中提到的更强场景化装配、审批路由、能力治理与策略面，属于可扩展方向，不应表述为当前已完整落地。

---

## 8. 当前边界 / 非目标

本文不定义：

- Core 语义；
- Shell 内部 effect handler 细节；
- provider adapter 实现；
- tool executor 实现；
- sandbox 实现；
- middleware 内部机制；
- App 对外入口设计。

这些内容分别属于 02 / 03 / 04 或 app 文档范围，不属于 Profile 规范主体。

---

## 9. 版本与演进

Profile 演进应遵循：

1. 新场景优先通过新增或替换 Profile 实现；
2. 不通过修改 Core 语义来适配新场景；
3. 不通过让 Profile 越界修改 Shell 边界协议来适配新场景；
4. policy / middleware / capability 变更需同步文档与命名。

核心原则：**Replace by New Profile, Not by Core Mutation**。

---

## 10. 评审清单

- 是否把场景规则错误地下沉进 Core？
- 是否让 Profile 越界改写 Shell 边界协议？
- 是否把 provider/tool/sandbox 私有结构暴露为 Profile 语义前提？
- 是否保留了 Core 的 profile-agnostic semantics？
- 是否把当前未落地能力误写成已实现？
- 是否所有 policy / middleware / capability bindings 都在 Profile 中显式声明？
