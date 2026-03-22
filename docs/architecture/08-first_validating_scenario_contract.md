# First Validating Scenario Contract (Stage 7.1)

## 1. Title

Controlled Docs Maintenance Validation Scenario

## 2. Purpose

Define one narrow but real scenario contract that can pressure the runtime kernel through existing capabilities, policy gates, review behavior, and summary/evidence surfaces.

## 3. Why This Scenario Is Validating Rather Than Defining

This scenario validates the current kernel path by reusing existing runtime semantics and capability contracts. It does not add scenario-specific runtime meaning, does not add a new capability, and does not introduce a second execution model.

## 4. Target Stack

- Repository-local docs surface only.
- Primary scope under `docs/architecture/`.
- Text files only (`.md`).

## 5. Workflow Boundary

- One bounded directory-list step in a docs directory.
- One bounded single-file read step.
- At most one bounded single-file text modification step.
- No multi-file mutation plan.
- No recursive directory workflows.
- No binary or non-text handling.
- No codebase-wide refactor behavior.

## 6. Expected Capability Usage

Expected capability order on one semantic path:

1. `controlled_directory_text_list`
2. `controlled_single_file_text_read`
3. `controlled_single_file_text_modification` (only when read evidence supports a narrow correction)

Notes:

- Capability selection remains runtime-driven and policy-constrained.
- Failure paths remain normalized through existing `ActionResult -> EffectResult -> failure_signal` flow.
- `runtimeSummary`, `request_ref`, and evidence surfaces should remain coherent across inspect/read/modify outcomes.

## 7. Review / Approval Expectations

- Review/approval gates remain profile-driven; scenario does not redefine them.
- Pre-execution review may be required for selected modification operations.
- Failure-escalation review paths remain valid and should be observable.
- `continue`, `repair`, `replan`, and `stop` outcomes remain kernel semantics, not scenario-local meanings.

## 8. Artifact Expectations

A valid run should produce checkable artifacts from the existing boundary objects:

- directory-list result evidence for candidate docs files,
- single-file read result evidence for target confirmation,
- optional single-file modification diff/evidence when a narrow correction is applied,
- coherent runtime-visible summary/failure/request references.

## 9. Explicit Non-Goals

- Not a broad documentation automation system.
- Not a coding-agent product definition.
- Not a platform abstraction for arbitrary scenarios.
- Not a request schema expansion.
- Not new core semantics or scenario-specific runtime branches.
- Not Stage 7.2 end-to-end execution implementation.

## 10. Containment Notes (Semantic Leakage Control)

- Core semantics stay unchanged and scenario-agnostic.
- Shell remains an execution bridge using existing capability contracts.
- Profile remains a policy/review surface, not a semantic engine.
- Scenario constraints are documented as contract boundaries, not encoded as kernel-specific logic.
- If future scenario work requires new runtime meaning, that must be proposed as kernel-stage work outside this contract.
