# ROADMAP

## 0. Role

This file is the project overview and stage roadmap for this repository.

It defines:

- the current project judgment
- the current and next stages
- what each stage is trying to prove
- the task-groups inside each stage
- the completion criteria for each stage
- what should not be rushed
- what conditions should trigger replanning

This file should stay concise, structured, and stage-oriented.

It is not a work diary.

Related document roles:

- `AGENTS.md` = stable collaboration workflow and repository rules
- `ROADMAP.md` = project stages, priorities, and sequencing
- `WORKLOG.md` = factual record of meaningful changes

---

## 1. Current Project Judgment

This repository is building **a robust kernel for a general agent runtime**.

The current repository should not be judged as:

- a scenario-specific agent
- a coding-agent product
- a broad application platform
- a multi-capability product surface

The current repository should be judged as:

- a runtime-kernel project with explicit execution semantics
- a Core-centered semantic runtime
- a Shell-bridged execution architecture
- a Protocol-disciplined boundary system
- a runtime that should be validated through narrow real execution paths without becoming defined by them

Current direction:

- keep `core` as the semantic runtime center
- keep `shell` as the execution bridge and result normalizer
- keep `protocol` as the shared cross-layer language
- keep `profiles` constraint-oriented rather than semantic
- validate the kernel through real capabilities, but do not let capabilities redefine the kernel

---

## 2. Stage Principle

This roadmap is intentionally organized around **kernel maturity**, not feature breadth.

The project should move in this order:

1. validate the kernel through one narrow real execution path
2. turn waiting/recovery semantics into minimal real mechanisms
3. add governance and control surfaces
4. strengthen evidence and auditability
5. prepare minimal persistence/resume semantics
6. validate that the kernel can survive multiple real capabilities
7. validate the kernel under real scenarios
8. only then extract stable platform-level abstractions

This ordering is deliberate.

The project should not rush into:

- broad platformization
- many capabilities
- large scenario-specific layering
- product-surface expansion
- profile-driven semantic branching

---

## 3. Stage 1 — Kernel Validation Through One Real Execution Path

### Purpose

Validate that the current runtime kernel can survive one narrow but real execution path.

This stage exists to prove that the existing kernel semantics are not only internally coherent, but also able to carry real execution without semantic drift.

The recommended first capability is:

**controlled single-file text modification**

This capability is narrow enough to stay governed, but real enough to pressure-test:

- action emission
- shell execution
- result normalization
- failure normalization
- review/stop/waiting semantics
- runtime summary consistency

### Task-Group 1.1 — First Capability Contract

Purpose:

Define the minimal contract for the first real capability before implementing broad executor behavior.

Tasks:

1. define the minimal action input for controlled single-file text modification
2. define the allowed target surface:
   - one text file only
   - no multi-file expansion
   - no directory-wide mutation
   - no binary modification
3. define the explicit refusal conditions:
   - invalid path
   - unsupported file type
   - missing target
   - empty/no-op request
4. define the minimal success result shape
5. define the minimal normalized failure shape
6. define the minimum summary/evidence surface required for runtime observation
7. define how this capability aligns with existing runtime semantics:
   - failure signal
   - waiting
   - stop
   - runtime summary

### Task-Group 1.2 — Minimal Real Shell Execution Path

Purpose:

Connect the first real capability into the Shell without widening into a general executor platform.

Tasks:

1. implement the minimal Shell execution path for the first capability
2. keep all execution results flowing through existing protocol objects
3. keep success paths normalized through `ActionResult` and `EffectResult`
4. keep failure paths normalized through `failure_signal`
5. avoid introducing a second execution model outside the current runtime path

### Task-Group 1.3 — Kernel Validation Tests

Purpose:

Prove that the runtime kernel still behaves correctly under real execution.

Tasks:

1. add one end-to-end test path for the first real capability
2. cover:
   - success
   - non-terminal failure
   - terminal failure
   - review continue
   - repair waiting
   - replan waiting
   - review stop
3. assert that `runtimeSummary` remains coherent under real execution
4. assert that request/result/failure behavior remains aligned with Core semantics

### Stage 1 Completion Criteria

This stage is complete when:

- one real capability has been defined by a narrow contract
- one real capability has been executed through the current Core/Shell path
- normalized success/failure behavior still works under real execution
- review, stop, and waiting semantics remain consistent
- runtime summary remains meaningful under real execution
- the kernel is validated, not redefined, by this first real path

---

## 4. Stage 2 — Recovery Mechanism Stage

### Purpose

Upgrade `waiting_for_repair` and `waiting_for_replan` from waiting labels into minimal recoverable runtime mechanisms.

The current runtime already distinguishes stop, waiting, and terminal semantics. This stage turns waiting into a minimal re-entry path.

### Task-Group 2.1 — Repair Recovery Entry

Purpose:

Give `waiting_for_repair` a minimal recovery entry rather than leaving it as a passive holding state.

Tasks:

1. define what event or result clears repair waiting
2. define how repair waiting re-enters step/tick progression
3. define how repair recovery updates runtime summary
4. define failure behavior if recovery cannot proceed

### Task-Group 2.2 — Replan Recovery Entry

Purpose:

Give `waiting_for_replan` a minimal recovery entry rather than leaving it as a passive holding state.

Tasks:

1. define the minimal replan trigger
2. define how replan changes runtime progression
3. define whether and how plan/task pointer changes are applied
4. define failure behavior if replan recovery fails

### Task-Group 2.3 — Recovery Path Tests

Purpose:

Prove that waiting states are real runtime branches, not dead-end labels.

Tasks:

1. test repair recovery success
2. test replan recovery success
3. test recovery failure
4. test summary/progression consistency before and after recovery

### Stage 2 Completion Criteria

This stage is complete when:

- repair waiting has a minimal recovery entry
- replan waiting has a minimal recovery entry
- recovery paths re-enter progression explicitly
- waiting no longer means “stopped without meaning”
- recovery semantics are visible in code and tests

---

## 5. Stage 3 — Governance and Control Stage

### Purpose

Make the kernel controlled, not only executable.

This stage introduces the minimum policy and governance surfaces needed so the runtime can refuse, gate, or constrain execution in principled ways.

### Task-Group 3.1 — Minimal Capability Policy

Purpose:

Add the first real execution constraints around the first capability.

Tasks:

1. add path boundary constraints
2. add file-type constraints
3. define refusal behavior for disallowed actions
4. ensure policy violations normalize into runtime-absorbable failures

### Task-Group 3.2 — Review / Approval Gate

Purpose:

Make review a real governance surface rather than only a semantic branch.

Tasks:

1. define which operations require review before execution
2. define which failures escalate into review
3. define stop/reject behavior as governance-visible outcomes
4. keep review logic aligned with Core semantics rather than Shell-local convention

### Task-Group 3.3 — Profile as Real Policy Surface

Purpose:

Let `profiles` begin influencing real execution policy without becoming a second semantic engine.

Tasks:

1. make profile drive at least one capability policy
2. make profile drive at least one review or approval rule
3. preserve profile-agnostic Core semantics
4. add tests that prove policy influence without semantic leakage

### Stage 3 Completion Criteria

This stage is complete when:

- real capability execution is governed by explicit constraints
- review/approval acts as a real control surface
- profile influences real runtime policy
- profile does not redefine Core semantics

---

## 6. Stage 4 — Evidence and Audit Stage

### Purpose

Strengthen the kernel from minimally observable to minimally auditable.

The current shared runtime summary is a good start. This stage adds the minimum evidence and audit discipline required for a robust kernel.

### Task-Group 4.1 — Evidence Surface

Purpose:

Define the minimum evidence/ref surface for request/result/failure flow.

Tasks:

1. define the minimal evidence/reference object shape
2. define what successful execution must preserve as evidence
3. define what failure must preserve as evidence
4. keep evidence serializable and reference-friendly

### Task-Group 4.2 — Audit-Friendly Runtime Summary

Purpose:

Make `runtimeSummary` a more stable audit surface without turning it into a second state machine.

Tasks:

1. clarify stop/waiting/failure summary fields
2. keep step-level and tick-level meaning aligned
3. preserve minimality
4. add summary consistency tests

### Task-Group 4.3 — Replay-Friendly Boundary Preparation

Purpose:

Prepare protocol boundaries for later replay/resume without building a full tracing platform.

Tasks:

1. identify boundary objects that should prefer refs over embedded large payloads
2. identify result/failure objects that need replay-friendly stability
3. identify context objects that are too heavy or too implicit
4. keep all changes architecture-level and minimal

### Stage 4 Completion Criteria

This stage is complete when:

- runtime execution is no longer a black box
- request/result/failure/stop/waiting all leave minimum audit clues
- protocol boundaries are more replay-friendly
- summary and evidence remain small and stable

---

## 7. Stage 5 — Recoverable Runtime Stage

### Purpose

Prepare the kernel for minimal persistence/resume semantics.

This stage does not require a full resume platform, but it does require the runtime to stop assuming that every run must complete in a single uninterrupted process lifetime.

### Task-Group 5.1 — Recoverable State Surface

Purpose:

Define what must survive serialization and restoration.

Tasks:

1. identify the state fields that must be restorable
2. identify the summary fields that must be restorable
3. define waiting/stop/failure restoration boundaries
4. define what is intentionally not resumable yet

### Task-Group 5.2 — Minimal Resume Path

Purpose:

Make one waiting/continue path resumable.

Tasks:

1. choose one narrow resumable path
2. restore runtime state from persisted form
3. verify progression remains stable after restore
4. verify summary/failure/request behavior remains consistent after restore

### Task-Group 5.3 — Recoverability Tests

Purpose:

Test recovery semantics rather than only serialization mechanics.

Tasks:

1. test waiting-for-repair resume
2. test waiting-for-replan resume
3. test terminal states remain terminal
4. test request gating remains stable after restore

### Stage 5 Completion Criteria

This stage is complete when:

- the runtime no longer assumes uninterrupted execution only
- at least one path can resume safely
- waiting, stop, and failure semantics survive restoration
- restore/resume does not invent a second semantic path

---

## 8. Stage 6 — Multi-Capability Validation Stage

### Purpose

Validate that the kernel is genuinely generalizable by carrying multiple real capabilities through one semantic runtime model.

### Task-Group 6.1 — Second Real Capability

Purpose:

Pressure-test that the kernel is not secretly specialized for single-file text modification.

Tasks:

1. choose a second capability of a meaningfully different kind
2. define its narrow contract
3. integrate it into the same protocol/runtime path
4. keep result/failure/review/waiting semantics unified

### Task-Group 6.2 — Third Real Capability

Purpose:

Continue testing generality under a third capability.

Tasks:

1. choose a third clearly different capability
2. define its narrow contract
3. integrate it without introducing a second runtime logic system
4. refactor only when repeated patterns are real

### Task-Group 6.3 — Multi-Capability Consistency Tests

Purpose:

Prove that all capabilities still run under one semantic runtime kernel.

Tasks:

1. test success/failure across different capabilities
2. test waiting/review/stop across different capabilities
3. test summary/failure signal consistency across capabilities
4. test policy/profile influence across capabilities

### Stage 6 Completion Criteria

This stage is complete when:

- multiple real capabilities run through the same semantic kernel
- no second execution semantics appears for a specific capability
- failure/review/waiting/summary remain unified across capabilities
- the kernel shows real signs of generality

---

## 9. Stage 7 — Scenario Validation Stage

### Purpose

Validate the kernel under a real scenario without allowing the scenario to define the kernel.

### Task-Group 7.1 — First Validating Scenario Contract

Purpose:

Define one scenario that stresses the runtime meaningfully.

Tasks:

1. define the target stack
2. define the workflow boundary
3. define expected capability usage
4. define review/approval expectations
5. define artifact expectations

### Task-Group 7.2 — Scenario End-to-End Validation

Purpose:

Pressure-test the kernel in a real scenario path.

Tasks:

1. test normal execution
2. test failure and recovery
3. test review/stop/waiting behavior
4. test policy/profile behavior inside the scenario

### Task-Group 7.3 — Scenario Containment Review

Purpose:

Ensure the scenario is validating the kernel rather than redefining it.

Tasks:

1. check for scenario-specific semantic leakage
2. check for scenario-specific capability assumptions in Core
3. check for profile drift into semantic control
4. refactor if the scenario starts dictating runtime meaning

### Stage 7 Completion Criteria

This stage is complete when:

- one real scenario validates the runtime meaningfully
- the runtime survives scenario pressure without semantic drift
- the scenario remains a validator, not a definition layer

---

## 10. Stage 8 — Pre-Platformization Stage

### Purpose

Only after repeated validation, extract the stable abstractions that actually deserve to become broader runtime/platform surfaces.

### Task-Group 8.1 — Repeated Pattern Extraction

Purpose:

Identify repeated patterns worth abstracting.

Tasks:

1. identify repeated capability patterns
2. identify repeated failure/review/waiting patterns
3. identify repeated policy/profile patterns
4. distinguish stable repetition from accidental similarity

### Task-Group 8.2 — Boundary Preservation Review

Purpose:

Ensure abstraction does not damage the kernel’s role boundaries.

Tasks:

1. verify Core remains the semantic center
2. verify Shell remains the execution bridge
3. verify Protocol remains the shared language
4. verify Profiles remain constraint-oriented

### Task-Group 8.3 — Naming and Maturity Reassessment

Purpose:

Decide whether the project can move from “robust kernel” language toward “general agent runtime” language.

Tasks:

1. assess capability breadth
2. assess governance maturity
3. assess recovery maturity
4. assess scenario validation maturity
5. decide whether the repository should still be described as a kernel project or as a broader runtime

### Stage 8 Completion Criteria

This stage is complete when:

- stable abstractions are extracted from real repetition
- platformization does not distort runtime semantics
- the project can honestly reassess whether it has become more than a kernel

---

## 11. Current Stage

The project is now entering:

**Stage 1 — Kernel Validation Through One Real Execution Path**

This means the next priority is not broad platformization, not many capabilities, and not scenario expansion.

The next priority is:

**validate the robust kernel through one narrow real capability path**

---

## 12. What Should Not Be Rushed

Do not rush:

- many capabilities before the first one proves the kernel
- broad profile/policy systems before the minimum governance surface exists
- persistence/resume before waiting/recovery semantics are stable
- scenario pressure before multiple kernel semantics are coherent
- platformization before repeated patterns are real

---

## 13. Replanning Triggers

Re-evaluate this roadmap when any of the following becomes true:

- the first real capability fails to fit the current kernel cleanly
- waiting/recovery semantics cannot be extended without major semantic drift
- profile begins to pressure Core semantics
- capability diversity reveals a second semantic runtime path
- audit/replay/resume needs become immediate blockers
- the validating scenario starts redefining the kernel
- the repository is no longer best described as a kernel project

---

## 14. One-Sentence Judgment

The project should now prioritize:

**validating a robust kernel for a general agent runtime through one narrow real execution path, before expanding capability breadth, governance depth, recovery breadth, or scenario-level scope**