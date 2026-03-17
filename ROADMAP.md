# ROADMAP

## 0. Document Role

This document defines the current development roadmap for this repository.

It exists to answer:

- what stage the project is currently in
- what should be prioritized next
- what should explicitly wait
- how to judge whether a phase is complete

This document is not a work diary.
Execution details and recent progress belong in `WORKLOG.md`.

This document should stay aligned with:

- `AGENTS.md`
- `README.md`
- `docs/architecture/*`

---

## 1. Project Direction

### 1.1 Long-Term Goal

Build a production-capable agent for generating desktop applications under a fixed technical-stack contract.

The target is **not** a generic “do everything” agent platform.
The target is a constrained, governable, scenario-driven agent built on top of a clear runtime architecture.

### 1.2 Current Repository Identity

The repository is currently best understood as a:

**pre-production runtime kernel / early integration-stage agent architecture repository**

It already has a clear five-layer baseline:

- `protocol`
- `core`
- `shell`
- `app`
- `profiles`

It already proves:

- boundary clarity
- a minimal runtime loop
- a minimal effect request/result bridge
- early behavioral test coverage for orchestration

It does **not** yet prove:

- production-ready semantics
- scenario-specific workflow completion
- real execution capability
- recoverability
- governance
- production safety

### 1.3 Current Near-Term Goal

Shift the project from **structural baseline completion** to **semantic closure and scenario closure**.

The next major milestone is to make the runtime semantically meaningful enough to support a first narrow real execution path.

### 1.4 Non-Goals for Now

The following are explicitly not the current priority:

- broad provider abstraction
- multiple scenario support
- large-scale platformization
- adding many new effect kinds without clear consumption
- treating profile as a second semantic engine
- continued boundary splitting without semantic gain

---

## 2. Current State Assessment

### 2.1 What Is Already Strong

The current repository already has a valuable base:

- `core` owns minimal runtime progression and task-pointer flow
- `shell` owns minimal effect execution bridging
- `app` exposes thin runtime entry points
- `profiles` already constrain runtime mode
- `protocol` provides normalized cross-layer objects
- tests already lock down parts of the main orchestration path

### 2.2 What Is Still Weak

The main weaknesses are now concentrated in:

- task success/failure semantics
- retry / repair / replan semantics
- review / approval semantics
- scenario-specific profile and workflow contracts
- real execution capabilities
- persistence and replay
- tracing / audit / governance

### 2.3 Current Strategic Judgment

The project should now be treated as:

**architecture baseline established, semantics and scenario expression still incomplete**

That means future work should optimize for:

- semantic clarity
- scenario contract clarity
- execution realism
- production governance preparation

not for endless structural refinement.

---

## 3. Phase Overview

### 3.1 Phase List

- Phase 0 — Structural Baseline Confirmation
- Phase 1 — Core Semantic Closure
- Phase 2 — Scenario Profile and Desktop-App Contract
- Phase 3 — Execution and Governance Capability
- Phase 4 — Recoverability and Auditability
- Phase 5 — Production Readiness and Scenario Validation

### 3.2 Current Phase

**Current Phase: Phase 0 moving into Phase 1**

Interpretation:

- the structural baseline is mostly clear enough
- the next meaningful work should begin inside Core semantics
- structural refinement should no longer be the dominant mode of progress

### 3.3 Phase Transition Rule

The project should not claim to have entered a later phase unless the earlier phase’s completion criteria are materially satisfied.

---

## 4. Phase Details

## Phase 0 — Structural Baseline Confirmation

### Goal

Confirm the current runtime/core/shell/profile/app structure as the working baseline and stop unbounded structural splitting.

### Why This Phase Matters

The repository has already crossed the point where more boundary splitting alone produces strong returns.
Before moving forward, the project needs a shared understanding of:

- what is already stable
- what is only placeholder
- what should not be refactored again without clear semantic reason

### In Scope

- confirm the current five-layer baseline
- align architecture docs with current code
- establish a canonical roadmap
- make explicit that the target desktop-app generation scenario is not yet fully encoded in the repository
- define the current “do not over-refactor” boundary

### Out of Scope

- large provider integrations
- many new effect kinds
- over-expanding profile configuration without real consumers

### Expected Outputs

- root-level `ROADMAP.md`
- clearer document alignment across `README`, `AGENTS`, and architecture docs
- team-level agreement on current baseline
- explicit statement of current limitations

### Completion Criteria

- current baseline is documented clearly
- new conversations can use the roadmap as project context
- the team shares the judgment that the next work belongs to semantic closure, not more structural splitting

---

## Phase 1 — Core Semantic Closure

### Goal

Make Core move from “structurally correct orchestration” to “semantically meaningful runtime behavior”.

### Why This Phase Matters

Without semantic closure, any real executor integration will amplify ambiguity into unstable behavior.

### In Scope

- define task success semantics
- define task failure semantics
- define terminal failure conditions
- introduce minimal retry / repair / replan distinctions
- give review a minimal place in Core semantics
- make effect-result application richer than simple success/failure toggling
- add semantic tests for key state transitions

### Out of Scope

- enterprise-grade recovery systems
- complex strategy engines
- many scenario workflows at once

### Expected Outputs

- documented Core semantic rules
- updated state transition handling
- semantic test cases for success/failure/retry/repair
- minimal review-related runtime contract

### Completion Criteria

- key state transitions are semantically tested
- run progression is not just structural movement anymore
- recovery semantics form a minimal closed loop

---

## Phase 2 — Scenario Profile and Desktop-App Contract

### Goal

Turn the target scenario — a fixed-stack desktop application generation agent — into an explicit code-and-document contract.

### Why This Phase Matters

Only after Core semantics become more stable can scenario profile design land cleanly.

### In Scope

- define the target technical stack
- define the first scenario profile
- define desktop app generation workflow contract
- define scaffold / file generation / validation / review boundaries
- define artifact contract and acceptance criteria

### Out of Scope

- turning profile into another semantic engine
- putting provider-native protocols into Core
- supporting arbitrary tech stacks

### Expected Outputs

- scenario profile definition
- first fixed-stack workflow contract
- artifact contract
- acceptance criteria for generated output

### Completion Criteria

- the scenario profile expresses fixed-stack constraints clearly
- generation inputs/outputs/validation steps are documented
- the repository no longer needs vague wording like “the scenario is implied but not solidified”

---

## Phase 3 — Execution and Governance Capability

### Goal

Upgrade Shell from a minimal bridge into a controlled execution layer.

### Why This Phase Matters

Once the scenario contract is clear, execution capability can be added in a targeted way.

### In Scope

- first real action executor path
- file / command / build / test capability for the chosen scenario
- sandbox or equivalent isolation
- policy / budget / approval gating
- stronger result normalization
- minimal tracing / audit / metrics

### Out of Scope

- premature multi-provider abstraction
- large generic platform layers unrelated to the scenario
- moving governance logic into Core

### Expected Outputs

- first real narrow execution path
- execution safety policy
- traceable request/result path
- diagnostics good enough for debugging failures

### Completion Criteria

- Shell can execute key scenario actions
- execution risk paths are governed
- results are traceable and diagnosable

---

## Phase 4 — Recoverability and Auditability

### Goal

Give the system enough recovery and audit structure for long-running real tasks.

### Why This Phase Matters

As soon as real execution exists, recovery and audit stop being “nice to have”.

### In Scope

- checkpoint / resume
- run journal
- artifact reference strategy
- structured event stream
- traceable review / approval records

### Out of Scope

- making recovery a new business-logic layer
- allowing logging to pollute semantic models

### Expected Outputs

- resumable run model
- basic replayability
- traceable decision chain
- audit-supporting event structure

### Completion Criteria

- interrupted runs can resume
- key decisions are auditable
- important artifacts can be traced back to execution history

---

## Phase 5 — Production Readiness and Scenario Validation

### Goal

Move from “engineerable prototype” to “usable for the target scenario”.

### Why This Phase Matters

Only after semantics, execution, and governance are in place does realistic scenario validation become meaningful.

### In Scope

- end-to-end desktop app generation validation
- real example set
- failure review
- quality gates
- operator-facing docs and default run path

### Out of Scope

- introducing new major scenarios while validating the first one
- large-scale runtime refactoring during validation

### Expected Outputs

- repeatable scenario demonstrations
- known-failure handling patterns
- operator guidance
- candidate pre-production confidence

### Completion Criteria

- at least one fixed-stack desktop app generation path is repeatable
- major failure modes have response strategies
- the repository can honestly be called a pre-production candidate instead of a pure prototype

---

## 5. Immediate Priorities

## 5.1 Must Do Next

1. Define the minimal Core semantic contract for task outcome handling (success / failure / terminal failure / retry / repair / replan / review interaction).
2. Add minimal Core semantic tests for success / failure / retry / repair.
3. Upgrade `run_review` from an accepted-only placeholder path into a minimally consumable request/result contract.
4. Define and document the target desktop-app technical-stack contract.
5. Define the first narrow real Shell execution capability, preferably file modification or scaffold generation.
6. Make profile drive at least one real shell policy instead of only step-count and execution toggles.

## 5.2 Should Do Soon

1. Add first minimal artifact / evidence / context contract.
2. Introduce minimal runtime tracing for step / request / result / failure flow.
3. Review whether current default run path is still clear after semantic additions.

## 5.3 Can Wait

- broad provider abstraction
- support for multiple technology stacks
- heavy integration frameworks
- advanced optimization work before the first scenario path is real

## 5.4 Explicitly Deferred

- treating profile as a semantic decision engine
- creating many new effect kinds before their consumers exist
- large structural re-organization without clear semantic payoff

---

## 6. Decision Principles

### 6.1 Prefer Semantic Progress Over Structural Splitting

New structure should only be introduced when it reduces semantic complexity or improves clarity materially.

### 6.2 Prefer Narrow Real Capability Over Broad Abstraction

A thin but real execution path is more valuable now than a large generic integration framework.

### 6.3 Keep Core Semantically Closed

Do not move provider logic, sandbox logic, or profile-specific semantics into Core.

### 6.4 Keep Profile Scenario-Oriented, Not Semantics-Oriented

Profile should constrain shell assembly, capability policy, and workflow boundaries.
It should not redefine Core meaning.

### 6.5 Document Major Capability Shifts Immediately

When the project gains a new real scenario contract, execution capability, review path, or recovery path, the roadmap and related docs must be updated immediately.

---

## 7. Re-Planning Triggers

A roadmap re-evaluation should happen when any of the following becomes true:

- the first fixed-stack profile is implemented
- the first real execution capability lands
- review / repair / replan enters the main runtime path
- persistence / resume starts implementation
- the target technical-stack contract changes

---

## 8. Current One-Sentence Judgment

The project no longer needs more architecture splitting as its primary activity.

It now needs:

**semantic closure, scenario closure, and controlled execution capability**
