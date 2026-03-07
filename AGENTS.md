# AGENTS.md

## 1. Purpose

This repository implements an agent architecture based on:

- **Closed Core**
- **Effect Shell**
- **Profile-driven Shell Assembly**

This file exists to guide AI coding agents (for example Codex-like tools) when reading, modifying, or generating code in this repository.

The goal of this file is to ensure that automated code changes remain aligned with the architecture and terminology of the project.

This file is normative for code generation tasks unless a task-specific instruction explicitly overrides it.

---

## 2. Project Architecture Summary

This project is organized around three top-level concepts:

1. **Core**
2. **Shell**
3. **Profile**

### 2.1 Core

Core is a **closed semantic runtime kernel**.

Core owns:

- state machine semantics
- state transitions
- run / milestone / task lifecycle semantics
- verification semantics
- repair / replan semantics
- terminal semantics (`done`, `failed`)

Core does **not** own:

- LLM clients
- message / prompt construction
- tool execution
- middleware pipelines
- sandbox execution
- profile-specific runtime behavior

### 2.2 Shell

Shell is the **effect execution and integration layer**.

Shell owns:

- effect request routing
- context construction
- message assembly
- LLM integration
- action execution
- middleware
- sandbox usage
- result normalization
- external capability integration

Shell does **not** define Core semantics.

### 2.3 Profile

Profile is a **scenario-specific shell configuration package**.

Profile configures:

- shell handler bindings
- capability bindings
- action policy
- context policy
- middleware selection
- sandbox policy
- review routing policy

Profile does **not** change Core semantics.

---

## 3. Canonical Document Set

This repository architecture is defined by the following documents:

1. `agent_architecture_glossary.md`
2. `core_shell_profile_architecture_spec.md`
3. `core_internal_design_and_agent_loop_spec.md`
4. `shell_internal_design_and_effect_handling_spec.md`
5. `profile_design_and_assembly_spec.md`
6. `core_shell_protocol_and_data_model_spec.md`

When making substantial architectural or structural changes, you MUST align with these documents.

If a code change appears to conflict with them, do not silently “improve” the architecture in code. Instead, preserve the documented architecture unless the task explicitly asks for an architecture revision.

---

## 4. Required Terminology

Use the following terms consistently in code, comments, commit messages, and generated documentation:

### Core-side terms
- `state`
- `state machine`
- `transition`
- `run`
- `plan`
- `milestone`
- `task`
- `action`
- `evidence`
- `verify`
- `repair`
- `replan`
- `done`
- `failed`

### Shell-side terms
- `effect request`
- `effect result`
- `effect handler`
- `context engine`
- `message assembler`
- `capability layer`
- `result normalizer`
- `middleware`
- `sandbox`

### Provider / external terms
- `LLM`
- `message`
- `prompt`
- `tool-calling`
- `tool`
- `command runner`

### Terminology constraints
- Do **not** use provider-native tool-calling terminology as a Core primitive.
- Do **not** use `done` to mean task completion or milestone completion.
- Do **not** treat prompt/message objects as Core runtime objects.
- Do **not** describe Profile as altering Core state machine logic.

---

## 5. Core/Shell Boundary Rules

These rules are strict.

### 5.1 The Core MUST NOT directly own or import:
- provider-native message objects
- LLM clients
- tool registries used as semantic control primitives
- sandbox session objects
- middleware chains that alter semantics
- profile-specific behavior as semantic branching

### 5.2 The Shell MUST:
- receive normalized `EffectRequest`
- return normalized `EffectResult`
- normalize all provider-native and executor-native outputs before returning to Core

### 5.3 The Profile MUST:
- configure the Shell only
- remain outside the Core semantic model

### 5.4 Never violate this dependency direction:

```text
Profile -> Shell -> Core
```

Do **not** introduce:

```text
Profile -> Core
LLM -> Core
Tool -> Core
Sandbox -> Core
Middleware -> Core semantics
```

---

## 6. Canonical Runtime Model

The canonical agent loop is:

**Plan -> Dispatch -> Execute -> Verify -> Repair**

### 6.1 Core owns:
- whether plan is needed
- how tasks are selected
- what counts as task success
- when retry happens
- when repair happens
- when replan happens
- when run becomes `done`
- when run becomes `failed`

### 6.2 Shell owns:
- how plan proposals are obtained
- how action proposals are obtained
- how actions are executed
- how context is built
- how LLM is called
- how tools are routed
- how sandbox is used
- how raw results are normalized

---

## 7. Required Shared Protocol Objects

At the Core/Shell boundary, use normalized protocol objects only.

Canonical shared objects include:

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

### Important rules
- All boundary objects must be serializable.
- Provider-native responses must be normalized before crossing the boundary.
- Sandbox-native handles must never cross the boundary.
- Tool-calling payloads must be normalized into `Action[]`.

---

## 8. Guidance for Modifying Core Code

When modifying Core code, preserve the following properties:

### 8.1 Core is a state machine
Core code should read like state transition logic, not like integration code.

### 8.2 Core should stay deterministic
Do not embed provider behavior assumptions into Core decision logic.

### 8.3 Core should remain profile-agnostic
Do not add profile-specific branches into Core transitions.

### 8.4 Core should not directly perform effects
If Core appears to “call” something external, that is a design smell unless it is emitting an `EffectRequest`.

### 8.5 Use single-source-of-truth state
In particular:
- completed task tracking should not be duplicated inconsistently
- task lifecycle state should be explicit
- plan version updates should be atomic with plan mutation

### 8.6 Preserve semantic distinctions
Keep these distinct:
- task verification
- milestone acceptance
- goal acceptance
- retry
- repair
- replan
- terminal failure

---

## 9. Guidance for Modifying Shell Code

When modifying Shell code, preserve the following properties:

### 9.1 Keep provider logic inside Shell
Provider-specific message formats, tool-calling protocols, and raw response parsing stay in Shell.

### 9.2 Context engineering belongs to Shell
Context building happens before message assembly and should remain phase-aware.

### 9.3 Middleware is allowed only as Shell governance
Middleware may handle:
- logging
- metrics
- tracing
- safety checks
- budget checks
- normalization assistance
- audit augmentation

Middleware must **not** redefine Core semantics.

### 9.4 Sandbox remains a Shell execution concern
Do not expose sandbox implementation details to the Core.

### 9.5 Normalize before returning
Every externally sourced result must be normalized into boundary-safe protocol objects.

---

## 10. Guidance for Modifying Profile Code

When modifying or introducing Profile code:

### 10.1 Think declaratively
Profiles should describe:
- enabled handlers
- capability bindings
- policies
- presets
- constraints

### 10.2 Do not encode Core semantics
Profiles must not define:
- Core transitions
- task completion semantics
- terminal run semantics
- failure class semantics

### 10.3 Profiles configure Shell assembly only
Treat Profile as shell assembly input, not semantic runtime code.

---

## 11. File and Module Organization Guidance

Use naming and organization that makes architectural boundaries obvious.

### Recommended conceptual areas
- `core/` for closed semantic runtime
- `shell/` for effect handling and integration
- `profiles/` for scenario-specific shell configuration
- `protocol/` or equivalent for shared normalized boundary schemas
- `docs/` for architecture documents

### Naming guidance
Prefer names such as:
- `effect_request`
- `effect_result`
- `context_engine`
- `result_normalizer`
- `action_executor`
- `plan_patch`

Avoid ambiguous names that mix layers, such as:
- `agent_tool_runtime_core`
- `llm_state_machine`
- `profile_transition_logic`

---

## 12. Code Generation Constraints

When generating or editing code, follow these rules:

1. Do not collapse Core and Shell into one module.
2. Do not introduce direct provider SDK objects into Core types.
3. Do not use raw tool-call payloads as Core actions.
4. Do not add middleware hooks that change Core transitions.
5. Do not treat Profile as a runtime semantic plug-in to the Core.
6. Do not redefine existing canonical terms with new meanings.
7. Prefer explicit protocol objects over loosely typed dictionaries when possible.
8. Prefer schema validation at boundaries.
9. Preserve auditability and traceability.
10. Preserve serializability of boundary objects.

---

## 13. When Unsure

If a task is ambiguous, follow these priorities:

### Priority 1
Preserve the documented architecture.

### Priority 2
Keep Core semantically closed.

### Priority 3
Move provider/tool/sandbox complexity into Shell.

### Priority 4
Use normalized protocol objects instead of provider-native objects.

### Priority 5
Prefer explicitness over cleverness.

If a change would improve convenience but weaken boundary clarity, choose boundary clarity.

---

## 14. What Good Changes Look Like

Examples of good changes:

- introducing a new normalized `Action` kind without exposing provider-native tool payloads
- adding a new Shell handler that still returns canonical `EffectResult`
- improving Context Engine phase routing
- tightening schema validation for boundary objects
- introducing a new Profile that binds different capabilities without changing Core semantics
- improving sandbox execution policy inside Shell

Examples of bad changes:

- letting Core import LLM message types
- letting Profile redefine `done`
- letting middleware override verification outcome
- returning raw tool-calling objects to Core
- embedding sandbox execution details into Core state machine logic

---

## 15. Recommended Workflow for AI Coding Agents

When working on a task in this repository:

1. Identify whether the task belongs to Core, Shell, Profile, or Protocol.
2. Read the relevant architecture document before making structural edits.
3. Confirm the boundary objects affected.
4. Implement the smallest change that preserves architecture invariants.
5. Keep naming aligned with the glossary.
6. If introducing a new concept, place it in the correct layer first.
7. Update docs only when the task explicitly requires architectural changes.

---

## 16. Final Rule

This repository is not organized around “whatever helps the agent run.”  
It is organized around **clear semantic boundaries**.

The most important rule is:

> Keep semantics in the Core, effects in the Shell, and scenario assembly in the Profile.

Any generated code that violates this rule should be considered architecturally incorrect even if it appears to work.
