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
- `WORKLOG.md` = per-commit work record and latest execution context

---

## 1. Current Snapshot

- Current direction: move from structural baseline toward semantic closure and scenario closure
- Current repository identity: scenario-oriented agent runtime / pre-production architecture repository
- Current priority: make runtime semantics meaningful enough to support a first narrow real execution path
- Current caution: do not treat further structural splitting as the main form of progress
- Last update: 2026-03-17

---

## 2. Current Phase

### Active Phase

**Phase 1 — Core Semantic Closure**

The current main work should happen in `core` semantics before large execution or platform expansion.

### Next Phase

**Phase 2 — Scenario Profile and Desktop-App Contract**

After Core semantics become more stable, the next step is to make the first scenario contract explicit.

### Later Phase

**Phase 3 — Execution and Governance Capability**

After scenario constraints are clearer, Shell should gain a first narrow real execution path.

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

### R2 — Semantic transition tests `[active]`

Add tests for the most important runtime meaning transitions, especially around:

- success
- failure
- retry
- repair
- stopping conditions

Done when:

- key semantic transitions are covered by tests
- the main runtime story is more than structural call-flow testing

### R3 — Review contract `[active]`

Upgrade review from placeholder behavior into a minimally usable request/result contract.

Done when:

- review has a clear request/result shape
- review affects runtime progression in a defined way

### R4 — First scenario contract `[queued]`

Define the first fixed-stack desktop-app scenario contract, including:

- target technical stack
- workflow boundary
- artifact expectation
- validation expectation

Done when:

- the first scenario is explicit instead of implied

### R5 — First real Shell capability `[queued]`

Add one narrow but real Shell capability, preferably one of:

- scaffold generation
- file modification
- build / validation execution

Done when:

- one real scenario-facing execution path exists
- the path is controlled and understandable

### R6 — Profile drives real policy `[queued]`

Make `profiles` drive at least one real runtime or shell policy beyond step count or execution toggle.

Done when:

- profile affects a real scenario boundary or execution decision
- profile remains constraint-oriented, not semantics-oriented

---

## 4. Should Do Soon

- add a minimal artifact / evidence / context contract
- add minimal tracing for step / request / result / failure flow
- review whether the main runtime path stays understandable after semantic additions

---

## 5. Can Wait

- broad provider abstraction
- support for multiple technology stacks
- large generic integration frameworks
- advanced optimization before the first real scenario path exists

---

## 6. Explicitly Deferred

- treating `profiles` as a semantic decision engine
- adding many effect kinds before real consumers exist
- large structural reorganization without clear semantic payoff
- building future-ready platform layers before one real scenario path works

---

## 7. Replanning Triggers

Re-evaluate this roadmap when any of the following becomes true:

- the first fixed-stack scenario profile is implemented
- the first real execution capability lands
- review / repair / replan enters the main runtime path
- persistence / resume starts implementation
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

**semantic closure, scenario closure, and one narrow real execution path**