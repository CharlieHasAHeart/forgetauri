# ROADMAP

## 0. Role

This file is the project overview and priority board for this repository.

It defines:

- current project stage
- active priorities
- what should happen next
- what can wait
- what is explicitly deferred
- what conditions should trigger replanning

This file should stay concise and easy to scan.

It is not a work diary.

Related document roles:

- `AGENTS.md` = startup protocol and long-lived rules
- `ROADMAP.md` = overview, priorities, and sequencing
- `WORKLOG.md` = work record only

---

## 1. Current Snapshot

- Current direction: move from structural baseline toward semantic closure, runtime hardening, and one narrow real execution path
- Current repository identity: agent runtime architecture repository under scenario-oriented validation
- Current priority: make runtime semantics and runtime boundaries robust enough to support one narrow real scenario without semantic drift
- Current caution: do not treat further structural splitting or scenario-specific convenience as the main form of progress
- Last update: 2026-03-18

---

## 2. Current Phase

### Active Phase

**Phase 1 — Core Semantic Closure**

The current main work should happen in `core` semantics and `protocol` boundary definition before large execution or platform expansion.

### Next Phase

**Phase 2 — Runtime Hardening and First Validating Scenario**

After Core semantics become more stable, the next step is to harden the runtime path and define the first scenario that validates the runtime under real constraints.

This phase should clarify:

- review / retry / repair / replan entry into the runtime path
- minimal tracing / audit / evidence expectations
- the first validating scenario contract
- the first real policy surface driven by `profiles`

The first validating scenario may be a fixed-stack desktop-app workflow, but the runtime should not be defined by that scenario alone.

### Later Phase

**Phase 3 — Execution and Governance Capability**

After runtime semantics and runtime hardening become more stable, Shell should gain one narrow but real execution path with clear governance, observability, and failure return.

---

## 3. Active Priorities

### R1 — Core task outcome semantics `[active]`

Define the minimal runtime outcome model for:

- success
- failure
- terminal failure
- retry
- repair
- replan
- review interaction

Done when:

- the minimal outcome model is explicit in code and docs
- runtime progression is no longer only structural
- task / milestone / run-level outcomes are no longer conflated

### R2 — Semantic transition tests `[active]`

Add tests for the most important runtime meaning transitions, especially around:

- success
- failure
- retry
- repair
- review-required transitions
- stopping conditions

Done when:

- key semantic transitions are covered by tests
- tests assert runtime meaning, not only structural call flow
- the main runtime story is more than structural call-flow testing

### R3 — Review contract `[active]`

Upgrade review from placeholder behavior into a minimally usable request/result contract.

Done when:

- review has a clear request/result shape
- review affects runtime progression in a defined way
- review no longer exists only as a placeholder flag or naming stub

### R4 — Runtime hardening baseline `[active]`

Make the runtime path minimally hard enough to support later real execution safely and observably.

Focus areas:

- minimal artifact / evidence / context contract
- minimal tracing for step / request / result / failure flow
- failure return that is normalized enough for Core to absorb safely
- replay / audit-friendly protocol boundaries
- clear runtime stopping and escalation visibility

Done when:

- the runtime path is not only semantically defined, but minimally observable and auditable
- at least one request/result/failure path can be traced end-to-end
- protocol and runtime flow are strong enough to support a narrow real capability without hidden semantic assumptions

### R5 — First validating scenario contract `[queued]`

Define the first scenario contract that validates the runtime under real constraints.

The first validating scenario should clarify:

- target technical stack
- workflow boundary
- artifact expectation
- validation expectation
- review / approval expectation
- policy boundary

The first validating scenario may be a fixed-stack desktop-app workflow, but it should validate the runtime rather than redefine Core semantics.

Done when:

- the first validating scenario is explicit instead of implied
- scenario constraints are clear enough to exercise the runtime path
- scenario wording does not collapse runtime semantics into scenario-specific semantics

### R6 — First real Shell capability `[queued]`

Add one narrow but real Shell capability, preferably one of:

- scaffold generation
- file modification
- build / validation execution

Done when:

- one real scenario-facing execution path exists
- the path is controlled and understandable
- the path is observable
- failure from that path returns in normalized form that the runtime can absorb safely

### R7 — Profile drives real policy `[queued]`

Make `profiles` drive at least one real runtime or shell policy beyond step count or execution toggle.

Candidate policy surfaces:

- review gating
- command or capability policy
- budget boundary
- sandbox boundary
- routing or approval policy

Done when:

- profile affects a real scenario boundary or execution decision
- profile remains constraint-oriented, not semantics-oriented
- profile does not become a second semantic engine

---

## 4. Should Do Soon

- review whether the main runtime path stays understandable after semantic additions
- tighten protocol wording around evidence / context / failure normalization
- identify the minimum useful audit / replay surface for the runtime
- clarify which runtime-hardening items must land before the first real Shell capability

---

## 5. Can Wait

- broad provider abstraction
- support for multiple technology stacks
- large generic integration frameworks
- advanced optimization before the first real scenario path exists
- broad platformization before one narrow runtime path is semantically and operationally clear

---

## 6. Explicitly Deferred

- treating `profiles` as a semantic decision engine
- adding many effect kinds before real consumers exist
- large structural reorganization without clear semantic payoff
- building future-ready platform layers before one real scenario path works
- defining the runtime primarily through one scenario instead of using scenarios to validate the runtime

---

## 7. Replanning Triggers

Re-evaluate this roadmap when any of the following becomes true:

- the first validating scenario contract is implemented
- the first real execution capability lands
- review / repair / replan enters the main runtime path
- persistence / resume becomes an active implementation target
- protocol boundaries need stronger audit / replay / resume support
- the target technical-stack contract changes
- current top priorities are no longer the main blockers

---

## 8. Update Rules

Update this file when work changes:

- current phase status
- active priorities
- sequencing
- milestone judgment
- scope boundaries
- explicit deferrals
- the answer to “what should happen next?”

Do not use this file as a step-by-step execution log.

That belongs in `WORKLOG.md`.

---

## 9. One-Sentence Judgment

The project should now prioritize:

**semantic closure, runtime hardening, and one narrow real execution path validated by a first scenario**