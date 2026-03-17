# AGENTS

## 0. Document Role

This document defines the long-lived collaboration rules for this repository.

It is written for both:

- human contributors
- Codex / agent collaborators

This file should remain relatively stable.
It should describe how work should be performed, not act as a short-term progress log.

Use the document stack in this order:

1. `AGENTS.md` — collaboration rules and repository-wide working principles
2. `ROADMAP.md` — current phases, priorities, and what should happen next
3. `WORKLOG.md` — current working state, recent decisions, and handoff context

---

## 1. Project Identity

### 1.1 Mission

This repository is building a constrained, scenario-oriented agent runtime intended to support desktop application generation under a fixed technical-stack contract.

The goal is not to build an unconstrained general-purpose agent platform.
The goal is to build a runtime that is:

- structurally clear
- semantically meaningful
- governable
- scenario-driven
- evolvable toward production use

### 1.2 Current Repository Identity

At the current stage, this repository should be understood as:

**a pre-production runtime kernel / early integration-stage agent architecture repository**

It already contains a meaningful runtime baseline, but it is not yet a production-ready agent system.

### 1.3 Current Scope

The current scope includes:

- runtime architecture
- runtime state progression
- effect request / result flow
- profile-constrained runtime entry
- early scenario-oriented design for desktop app generation
- semantic closure and execution-governance preparation

### 1.4 Out of Scope

The following are currently outside the intended scope:

- broad “do anything” agent behavior
- multi-scenario platformization
- premature provider generalization
- turning profile into a second semantic engine
- structural refactoring without clear semantic payoff

---

## 2. Architecture View

### 2.1 Layer Map

The repository currently uses a five-layer baseline:

- `protocol`
- `core`
- `shell`
- `app`
- `profiles`

### 2.2 Responsibility Boundaries

#### `protocol`

Owns cross-layer object shapes and normalized runtime-facing data structures.

#### `core`

Owns runtime semantics and state progression.
Core is the semantic center of the system.

#### `shell`

Owns effect handling and execution bridging.
Shell is where requests are executed and results are normalized back into runtime-compatible form.

#### `app`

Owns thin public entry points and caller-facing runtime wrappers.
App is not the semantic center.

#### `profiles`

Own runtime constraints and scenario-facing configuration boundaries.
Profiles should influence assembly, permissions, and workflow policy, but should not redefine Core semantics.

### 2.3 Dependency Direction

The intended direction is:

- public entry comes in through `app`
- `app` drives runtime through `shell`
- `shell` interacts with `core`
- all layers share `protocol` objects
- `profiles` constrain runtime mode and scenario shape without becoming semantic logic containers

### 2.4 Architectural Status

The repository already has enough structural clarity to support the next phase of work.

The current primary need is **not** more boundary splitting.
The current primary need is:

- semantic closure
- scenario closure
- controlled execution capability

### 2.5 Current Architectural Judgment

When making decisions, assume:

- `app` should stay thin
- `core` should stay semantically central
- `shell` should grow realistic execution capability
- `profiles` should become scenario-shaping constraints, not alternate semantics

---

## 3. Working Principles

### 3.1 Prefer Semantic Progress Over Structural Splitting

Do not introduce new layers, wrappers, or abstraction boundaries unless they clearly improve semantic clarity, execution control, or maintainability.

Structural change is justified when it:

- removes real confusion
- reduces semantic leakage
- improves scenario expression
- improves execution governance

Structural change is not justified when it only creates cleaner-looking boundaries without meaningful behavioral gain.

### 3.2 Prefer Narrow Real Capability Over Broad Generalization

When choosing between:

- adding one narrow real capability, or
- adding a broad abstract capability framework

prefer the narrow real capability.

At the current stage, real constrained execution is more valuable than abstract extensibility.

### 3.3 Keep Core Semantically Closed

Do not move provider-specific logic, environment-specific execution rules, sandbox behavior, or policy plumbing into Core unless there is a very strong semantic reason.

Core should own runtime meaning, not external system details.

### 3.4 Keep Shell Operational, Not Semantic

Shell should execute, normalize, trace, and govern requests.
Shell should not silently become the place where task meaning is invented.

If a change affects:

- task success meaning
- task failure meaning
- retry / repair / replan meaning
- review meaning
- terminal state meaning

the change likely belongs in Core, not only in Shell.

### 3.5 Keep Profile Scenario-Oriented

Profile should express things such as:

- whether execution is allowed
- what execution modes are permitted
- whether review is required
- what workflow constraints apply
- what scenario contract is active

Profile should not become a free-form bag of semantics.

### 3.6 Prefer Explicit Contracts

When introducing a new runtime behavior, prefer explicit contracts over hidden conventions.

Examples include:

- task outcome states
- review request / result contracts
- artifact acceptance rules
- executor result normalization
- scenario workflow boundaries

---

## 4. How to Start Work

### 4.1 Required Reading Order

Before starting meaningful work:

1. read `AGENTS.md`
2. read `ROADMAP.md`
3. read `WORKLOG.md`

Do not start from local code changes alone if the work depends on current project direction.

### 4.2 First Question to Ask

Before making changes, identify which of the following the task belongs to:

- semantic closure
- scenario contract definition
- shell execution capability
- governance / observability
- documentation alignment
- test strengthening

### 4.3 Default Starting Assumption

Unless explicitly recorded otherwise, assume the current highest-value direction is:

**Phase 1 — Core semantic closure**

### 4.4 Use Existing Structure First

Before creating new files, new layers, or new abstraction surfaces, check whether the intended change can be expressed cleanly within the current structure.

---

## 5. How to Propose and Make Changes

### 5.1 Make Small, Legible Moves

Prefer small, focused, explainable changes over large multi-purpose edits.

A good change usually has:

- one main purpose
- clear placement in the architecture
- clear relationship to current roadmap priorities

### 5.2 Avoid Premature Framework Building

Do not introduce “future-ready” frameworks unless the current repository already has at least one real use path that justifies them.

### 5.3 Keep the Main Path Understandable

Each meaningful change should preserve or improve the readability of the main runtime path.

The key runtime flow should remain easy to explain in terms of:

- entry
- state progression
- request generation
- request execution
- result application
- stopping conditions

### 5.4 Preserve Layer Intent

When adding code, verify that the change preserves the existing layer role.

Examples:

- entry-point convenience belongs in `app`
- semantic transitions belong in `core`
- execution bridging belongs in `shell`
- shape definitions belong in `protocol`
- runtime mode constraints belong in `profiles`

### 5.5 Explain Semantic Changes Explicitly

When a change modifies runtime meaning, the change should be reflected in both code and documentation.
Do not allow semantic drift to exist only in implementation details.

---

## 6. Code Guidelines

### 6.1 Prefer Readability Over Cleverness

Favor direct, explicit code over clever compressed logic.

### 6.2 Prefer Narrow Interfaces

New interfaces should be as small as possible while still being useful.

### 6.3 Keep Naming Aligned With Runtime Meaning

Names should reflect runtime roles and contracts clearly.
Avoid vague names that hide whether something is:

- a request
- a result
- a state transition
- a review artifact
- an execution artifact
- a scenario constraint

### 6.4 Avoid Semantic Duplication

Do not define the same behavioral meaning in multiple places.
If task failure semantics live in Core, Shell and Profile should consume or constrain them, not re-invent them.

### 6.5 Keep Placeholder Logic Honest

If something is a placeholder, keep it clearly marked as such in naming, docs, or tests.
Do not let placeholder behavior masquerade as finished behavior.

---

## 7. Test Guidelines

### 7.1 Current Priority: Semantic Tests

At the current stage, prioritize tests that validate runtime meaning, not only structural call flow.

Examples of high-value tests now include:

- task success transitions
- task failure transitions
- terminal failure handling
- retry / repair / replan decisions
- review-related state progression
- request/result effect on runtime state

### 7.2 Structural Tests Are Not Enough

Structural tests remain useful, but they are no longer sufficient as the main form of confidence.

### 7.3 Test the Main Runtime Story

Prefer tests that help answer:

- what happens after a successful effect result?
- what happens after a failed effect result?
- what causes a run to stop?
- what changes when review is required?
- what outcome is expected from the current profile?

### 7.4 Keep Tests Aligned With Current Phase

When deciding what test to add next, consult `ROADMAP.md`.
The test suite should reflect the current phase of the project.

---

## 8. Documentation Rules

### 8.1 Document Roles

The repository uses three primary coordination documents:

- `AGENTS.md` — long-lived collaboration rules
- `ROADMAP.md` — staged direction and priorities
- `WORKLOG.md` — current state and execution memory

### 8.2 What Goes Where

#### Put information in `AGENTS.md` when it is:

- a stable collaboration rule
- a repository-wide principle
- a long-lived architectural constraint
- a maintenance rule for contributors and agents

#### Put information in `ROADMAP.md` when it is:

- a phase definition
- a priority judgment
- a sequencing decision
- a milestone or completion rule
- an explicit deferral or non-goal

#### Put information in `WORKLOG.md` when it is:

- a recent implementation change
- a notable design decision
- a blocker
- a handoff note
- the current best next step
- a temporary but important repository insight

### 8.3 Keep Documents Distinct

Do not let the three documents collapse into each other.

In particular:

- do not turn `AGENTS.md` into a diary
- do not turn `ROADMAP.md` into a task log
- do not turn `WORKLOG.md` into a policy handbook

### 8.4 Update Documentation When Meaning Changes

When the repository gains a meaningful new capability, semantic rule, scenario contract, or execution path, documentation must be updated accordingly.

---

## 9. Documentation Sync After Task Completion

### 9.1 General Rule

Completing a meaningful task includes aligning the relevant project documents with the new project state.

Code-only completion is usually incomplete completion.

### 9.2 WORKLOG Update Rule

Update `WORKLOG.md` when a task:

- changes implementation state materially
- introduces a notable design or semantic decision
- reveals a blocker
- changes the next likely step
- changes the current understanding of repository status

### 9.3 ROADMAP Update Rule

Update `ROADMAP.md` when a task changes:

- phase status
- milestone status
- sequencing
- priorities
- scope boundaries
- explicit deferrals
- the judgment of what should happen next

### 9.4 AGENTS Update Rule

Update `AGENTS.md` only when a task changes:

- long-lived collaboration rules
- stable architectural principles
- repository-wide working conventions
- contributor expectations

### 9.5 Completion Standard

A meaningful task is not fully complete until the following are aligned:

- code
- validation or tests, when appropriate
- relevant documentation

If documentation is intentionally not updated, the reason should be explicit.

---

## 10. Current Working Mode

### 10.1 Current Development Focus

The current repository focus is:

**move from structural baseline toward semantic closure**

### 10.2 Preferred Change Shape

Preferred changes at this stage are:

- semantic clarification in Core
- narrow real capability in Shell
- concrete scenario expression in Profile
- clearer request/result contracts
- better semantic tests

### 10.3 Current Anti-Patterns

Avoid the following unless there is a very strong reason:

- more structural splitting as the main form of progress
- large provider abstraction too early
- profile expansion without real consumption
- adding many effect kinds without real execution paths
- hiding semantic changes inside shell-only logic
- writing only structural tests while semantic gaps remain open

---

## 11. Handoff Expectations

### 11.1 Leave the Next Step Visible

A contributor should try to leave the project in a state where the next likely step is easy to identify.

### 11.2 Record Important Judgments

If a change involves an important architectural or semantic judgment, record it in `WORKLOG.md`.

### 11.3 Keep the Repository Resumable

The repository should be maintainable not only by the original author, but also by a future human contributor or agent resuming work from the current state.

---

## 12. Maintenance Rules

### 12.1 Keep AGENTS Stable

`AGENTS.md` should change less often than `ROADMAP.md` and much less often than `WORKLOG.md`.

### 12.2 Revise Only for Lasting Reasons

Only revise this file when the change reflects a durable rule or a lasting project-wide judgment.

### 12.3 Resolve Conflicts by Document Role

If two documents appear to conflict, prefer interpretation by role:

- `AGENTS.md` defines how collaboration should work
- `ROADMAP.md` defines what is currently prioritized
- `WORKLOG.md` defines what has recently happened and what is currently active

### 12.4 Keep the Stack Coherent

Whenever one of the three documents changes significantly, verify that the other two still remain coherent with it.