# Implementation Roadmap and Module Delivery Plan

**Document ID**: AGENT-ARCH-ROADMAP-007  
**Title**: Implementation Roadmap and Module Delivery Plan  
**Version**: 1.1.0  
**Status**: Draft  
**Audience**: Architects, engineers, reviewers, code generation tools  
**Language**: Chinese  
**Last Updated**: 2026-03-08

---

## 1. 引言与目的

本文是**基于当前仓库代码状态**的 implementation roadmap，不是从零重建计划。本文负责三件事：盘点当前实现状态、识别主线路径缺口、给出后续增量实施顺序与阶段完成标准。本文是 planning 文档，不重新定义 02/03/04/05/06 的架构语义。本文重点是让“已存在的五层最小闭环”走向“可持续扩展 + 测试闭环 + 默认路径稳定”。

---

## 2. Scope

本文覆盖的是 current-state-aware implementation plan、gap-oriented roadmap、incremental hardening and expansion plan。

范围包括：

- 对已有实现做补强与收束；
- 对缺失能力做增量接入；
- 测试闭环建设；
- 文档与代码一致性修正；
- 旧分叉与无效实现清理。

本文不以“repository restructuring”作为核心目标，因为当前五层目录与主路径已基本存在。

---

## 3. Conformance Language

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** in this document indicate requirement levels.

- **MUST / MUST NOT**: mandatory requirement.
- **SHOULD / SHOULD NOT**: recommended requirement; deviations require justification.
- **MAY**: optional behavior.

---

## 4. Implementation Goal

在当前已形成的五层基线（Protocol/Core/Shell/App/Profile）与最小主线路径之上，逐步补齐：

- protocol completeness；
- core recovery semantics；
- shell capability expansion；
- profile assembly depth；
- testing closure；
- legacy cleanup。

目标不是重建目录，而是把“最小闭环 + 文档对齐”推进为“默认路径稳定 + 测试覆盖可持续 + 边界纪律可执行”。

---

## 5. Strategic Decision

### 5.1 Strategy

## **Stabilize the existing five-layer baseline, then expand and harden incrementally**

核心策略：

1. 以当前已存在代码为基础，而不是把现有实现视为仅供参考；
2. 先稳定 protocol/core/shell 的最小闭环；
3. 再补 review / recovery / richer protocol objects / profile assembly；
4. 最后执行 legacy cleanup 与默认路径收束。

### 5.2 Why This Strategy

- 当前仓库已具备可运行主线，不适合“推倒重来”；
- 现阶段主要问题是能力深度与测试闭环不足，而不是目录缺失；
- 增量对齐能降低语义漂移与回归风险；
- 可以持续交付并持续验证边界纪律。

---

## 6. Roadmap Principles

1. **Current Baseline First**：先承认并稳定已存在主线路径。  
2. **Stabilize Before Expanding**：先固化行为，再扩展能力。  
3. **Tests Close the Gap**：缺口必须通过测试收敛，不靠口头约定。  
4. **Preserve Boundary Discipline**：坚持 Core/Shell 边界对象归一化纪律。  
5. **Expand From Minimal Closure**：从最小闭环向外扩，不跳层。  
6. **Cleanup After Replacement**：替代路径稳定后再清理旧分叉。  
7. **Docs and Code Must Converge**：文档与代码必须持续收敛。

---

## 7. Current Repository Baseline and Convergence Direction

当前仓库结构已基本成型：

- `src/protocol`
- `src/core`
- `src/shell`
- `src/profiles`
- `src/app`
- `docs/architecture`
- `docs/planning`

roadmap 的目标不是再造目录，而是让代码、测试、默认入口和文档进一步收敛。当前最需要补强的目录是 `tests/` 的分层覆盖与主线语义验证。

---

## 8. Phase Overview

本 roadmap 采用 7 个增量阶段：

1. Phase 0 — Baseline Audit and Alignment  
2. Phase 1 — Protocol and Type Closure  
3. Phase 2 — Core Semantic Hardening  
4. Phase 3 — Shell Capability Deepening  
5. Phase 4 — Profile Assembly Expansion  
6. Phase 5 — Test Closure and Default Path Stabilization  
7. Phase 6 — Legacy Cleanup and Hardening

---

## 9. Phase 0 — Baseline Audit and Alignment

### 9.1 Objective

对当前主线路径做实现盘点与文档对齐，形成缺口清单。

### 9.2 Required Actions

1. 盘点当前已进入主线路径的对象与函数；
2. 区分“协议已定义”与“主线已接入”；
3. 形成文档与代码差异列表；
4. 形成最小主线 smoke tests 清单。

### 9.3 Deliverables

- 当前实现矩阵（对象/模块/路径）；
- gap list（语义缺口、测试缺口、文档缺口）；
- smoke tests 列表。

### 9.4 Acceptance Criteria

- 主线路径被明确标注（runRuntimeTick、runEffectCycle、executeEffectRequest、runShellRuntimeLoop、runAgentWithProfile）；
- 已实现 vs 预留能力划分清晰；
- 缺口清单可直接转为后续 phase 任务。

---

## 10. Phase 1 — Protocol and Type Closure

### 10.1 Objective

在现有 protocol 基础上补齐对象目录一致性、守卫一致性与序列化约束。

### 10.2 Scope

重点覆盖：

- `Plan` / `Milestone` / `Task` / `SuccessCriterion`
- `Action` / `ActionResult`
- `EffectRequest` / `EffectResult`
- `FailureSignal`
- `ReviewRequest` / `ReviewResult`
- `ContextPacket` / `Evidence`

### 10.3 Required Outputs

1. 统一 protocol export；
2. type guards 一致性收束；
3. serialization assumptions 明确化；
4. 边界对象主线接入状态说明。

### 10.4 Testing Requirements

- protocol guards 对非法 effect/action 对象拒绝行为可验证；
- 关键对象序列化可验证；
- protocol 导出稳定可用。

### 10.5 Acceptance Criteria

- protocol 关键对象统一导出并可用；
- 守卫行为有测试覆盖；
- 文档与对象实际定义一致。

---

## 11. Phase 2 — Core Semantic Hardening

### 11.1 Objective

在现有 Core 主线路径上补齐状态推进约束、恢复语义与终态一致性。

### 11.2 Scope

重点补强：

- task pointer 语义稳定性；
- tick 行为稳定性；
- effect cycle prepare/apply 正确性；
- terminal handling；
- retry / repair / replan 语义补齐；
- review / goal acceptance 语义补齐。

### 11.3 Required Outputs

1. Core 关键语义不变量列表；
2. 关键函数行为约束（runSingleStep/driveCoreRun/runRuntimeTick）；
3. 恢复语义分层定义（当前实现 + 预留语义）。

### 11.4 Testing Requirements

- `runRuntimeTick` 的确定性行为测试；
- `runEffectCycle` 的回流行为测试；
- `done/failed` 终态不可逆测试；
- task pointer 推进与清空测试。

### 11.5 Acceptance Criteria

- Core 主线路径行为可重复、可测试；
- 终态、指针、effect 吸收语义稳定；
- recovery/review 缺口清晰并有落地计划。

---

## 12. Phase 3 — Shell Capability Deepening

### 12.1 Objective

在现有 Shell bridge 基础上扩展能力与治理，而非从零实现 Shell。

### 12.2 Scope

重点包括：

- richer request kind handling；
- context construction boundary；
- review path completion；
- normalization hardening；
- real executor / provider / sandbox 接入位；
- middleware governance（可选层）。

### 12.3 Required Outputs

1. `executeEffectRequest` 路径能力扩展；
2. `Action -> ActionResult -> EffectResult` 桥接增强；
3. Shell 能力边界与治理策略说明。

### 12.4 Testing Requirements

- `execute_actions` 通过 shell bridge 的稳定性测试；
- `run_review` 返回 normalized result shape 测试；
- Shell 归一化边界（无 raw provider/tool 对象泄漏）测试。

### 12.5 Acceptance Criteria

- Shell 在主线路径中能稳定处理更多 request 类型；
- 归一化边界纪律由测试保障；
- 可接入能力与主线能力边界清晰。

---

## 13. Phase 4 — Profile Assembly Expansion

### 13.1 Objective

从当前 default profile 出发，扩展 profile 的 shell assembly 输入面。

### 13.2 Scope

重点包括：

- profile validation；
- profile-specific capability binding；
- action/context/middleware/sandbox/review policy surface；
- 场景化 profile 最小示例。

### 13.3 Required Outputs

1. default profile 保持稳定；
2. 至少一个更明确场景 profile 样例（可最小化）；
3. profile 字段与运行行为映射说明。

### 13.4 Testing Requirements

- `maxSteps` / `autoRunToCompletion` / `allowShellExecution` 行为测试；
- profile 不越界改写 core semantics 的约束测试。

### 13.5 Acceptance Criteria

- Profile 对运行方式的影响可预测、可测试；
- Profile 仍作为 runtime constraint object / shell assembly input；
- 未将 profile 扩展误写成“完整场景装配平台已落地”。

---

## 14. Phase 5 — Test Closure and Default Path Stabilization

### 14.1 Objective

补齐主线路径测试闭环并稳定默认运行路径。

### 14.2 Scope

重点包括：

- protocol tests
- core tests
- shell tests
- integration tests
- app/profile entry tests
- 默认运行路径与默认 profile 行为收束。

### 14.3 Required Outputs

1. 分层测试目录与主线覆盖矩阵；
2. 默认入口行为说明；
3. 关键回归测试集合。

### 14.4 Acceptance Criteria

- 主要主线路径有稳定自动化测试覆盖；
- 默认运行行为一致、可复现；
- 文档与测试对同一语义达成一致。

---

## 15. Phase 6 — Legacy Cleanup and Hardening

### 15.1 Objective

在替代路径稳定后，清理冲突旧实现并强化不变量。

### 15.2 Required Actions

1. 区分 current baseline code / active path / obsolete or conflicting code；
2. 对仍有价值的旧行为保留 characterization tests；
3. 对主线路径冲突代码进行语义替换后移除；
4. 清理 dead code / obsolete type / 无效分叉；
5. 同步 README 与开发文档。

### 15.3 Acceptance Criteria

- 旧冲突实现已清理或明确降级；
- 主线路径唯一且稳定；
- 强化后的不变量有测试保障。

---

## 16. Testing Strategy

当前仓库下一步必须尽快补齐的测试闭环：

1. **Protocol tests**：对象守卫、序列化约束、边界对象合法性。  
2. **Core tests**：`runRuntimeTick`、`runEffectCycle`、状态终态与 task 指针语义。  
3. **Shell tests**：`executeEffectRequest`、`buildActionResult`、`buildEffectResultFromActions`、`runShellRuntimeLoop`。  
4. **Integration tests**：request/result 贯通与五层默认路径行为。  
5. **App/Profile entry tests**：`runAgent`、`runAgentWithProfile` 入口行为与 profile 约束行为。

---

## 17. Minimum Semantic Test Set

在扩展功能前，最小语义测试集应至少覆盖：

1. terminal state does not emit further requests；
2. runtime tick prepares state deterministically；
3. effect result can be applied without raw provider objects crossing boundary；
4. next ready task selection is stable；
5. `execute_actions` request can flow through shell bridge；
6. `run_review` request path has normalized result shape；
7. profile `maxSteps` / `autoRunToCompletion` / `allowShellExecution` affect runtime behavior as expected；
8. `done` / `failed` remain terminal；
9. protocol guards reject invalid effect objects；
10. current minimal loop remains serializable and boundary-safe。

---

## 18. Migration Strategy

迁移策略改为“收束现有代码”而非“迁往新世界”：

1. 区分 current baseline code、active path、obsolete/conflicting code；
2. 对 active path 先补 characterization tests 与语义测试；
3. 对冲突模块先做 semantic rewrites 再移除；
4. 清理动作以后续主线稳定为前提，不抢跑。

---

## 19. Engineering Risks and Mitigations

### 19.1 Risk: 基线误判导致重复建设

#### Mitigation

先做 Phase 0 实现矩阵，所有任务先定位“已有/缺失/预留”状态。

### 19.2 Risk: 边界纪律回退

#### Mitigation

将 boundary-safe 规则写入测试与 code review checklist，重点防 raw 对象跨界。

### 19.3 Risk: 扩展先于稳定

#### Mitigation

在 Phase 2/5 完成前限制大规模能力扩展，先稳主线再加能力。

### 19.4 Risk: 清理过早

#### Mitigation

执行“替代稳定后清理”，并保留必要 characterization coverage。

---

## 20. Milestone-Based Delivery View

- **Milestone A — Baseline Documented**：实现矩阵、缺口清单、主线 smoke 清单。  
- **Milestone B — Protocol Closed**：关键协议对象、守卫、导出与序列化约束收敛。  
- **Milestone C — Core Tick Stable**：tick/effect cycle/task pointer/terminal 语义稳定。  
- **Milestone D — Shell Loop Deepened**：shell bridge 扩展并保持归一化纪律。  
- **Milestone E — Profile Expanded**：profile 配置面与行为约束可测试化。  
- **Milestone F — Test Closure**：分层测试与入口测试形成闭环。  
- **Milestone G — Cleanup Complete**：冲突旧实现清理完成，文档与代码一致。

---

## 21. Recommended Implementation Order Inside `src/`

这是基于现状的实施顺序，不是目录创建顺序：

1. stabilize protocol exports and guards
2. harden core tick / effect cycle
3. deepen shell request/result handling
4. expand profile surface
5. stabilize app entry behavior
6. add tests and cleanup

依赖方向约束仍保持：

```text
Protocol -> Core -> Shell -> App
Profile -> Shell (assembly input)
```

---

## 22. Code Review Guidance

Reviewers SHOULD reject changes that:

- 让 raw provider/tool/sandbox 对象越过 Core/Shell 边界；
- 将场景规则下沉到 Core 语义；
- 让 Profile 越界改写边界协议；
- 把未落地能力写成当前主线路径事实。

Reviewers SHOULD favor changes that:

- 稳定现有主线；
- 补齐可执行测试；
- 强化边界纪律；
- 让文档与代码持续收敛。

---

## 23. Completion Definition

roadmap 完成标准是：

1. 当前五层基线成为默认且稳定实现路径；
2. protocol/core/shell/profile/app 职责与测试边界清晰；
3. 主要主线路径由测试覆盖；
4. 文档描述与实际运行系统一致；
5. 旧冲突实现已被清理或明确降级。

这不是“全新架构重建完成”的定义，而是“现有基线稳定收敛完成”的定义。

---

## 24. Summary

本 roadmap 采用“基于当前代码状态的增量实施”策略：

1. 先盘点并对齐基线；
2. 再补协议与 core 语义硬化；
3. 再扩 shell 与 profile；
4. 最后闭合测试并清理冲突旧路径。

最重要的执行规则是：

> Stabilize what exists, then expand with tests and boundary discipline.
