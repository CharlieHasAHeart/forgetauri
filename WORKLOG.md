# WORKLOG

This file records meaningful work entries for the repository.

It is a log file only.

- collaboration rules belong in `AGENTS.md`
- priorities and sequencing belong in `ROADMAP.md`

Recording rule:

- append one entry for each meaningful commit / push
- keep entries short and factual
- use append-only updates
- minor typo-only or formatting-only changes may be skipped

Recommended entry structure:

```text
## YYYY-MM-DD HH:MM — <short title>

### Changed
- ...

### Scope
- ...

### Result
- ...
````

---

## 2026-03-16 — initial document system established

### Changed

* created the first coordinated three-document system for repository collaboration
* added `AGENTS.md`, `ROADMAP.md`, and `WORKLOG.md`

### Scope

* docs
* repository coordination structure

### Result

* the repository gained a basic document system for collaboration, planning, and logging

---

## 2026-03-16 — repository baseline clarified

### Changed

* clarified that the repository already has a usable architectural baseline
* clarified that `app` should stay thin
* clarified that `core` is the semantic center
* clarified that `shell` is the execution bridge
* clarified that structural splitting should no longer be the dominant form of progress

### Scope

* architecture understanding
* docs
* repository positioning

### Result

* the repository is now described more clearly as a scenario-oriented pre-production runtime architecture repository

---

## 2026-03-16 — roadmap direction consolidated

### Changed

* turned the current repository judgment into a focused roadmap
* identified active priorities
* identified queued work for scenario contract and first real shell capability
* identified non-goals and deferred work

### Scope

* `ROADMAP.md`
* planning
* project prioritization

### Result

* the project now has a clearer overview of what matters now and what should wait

---

## 2026-03-17 — document system compressed

### Changed

* compressed `AGENTS.md` into a shorter stable workflow document
* compressed `ROADMAP.md` into a shorter overview and priority board
* compressed `WORKLOG.md` toward a pure record-file role

### Scope

* docs
* Codex collaboration flow
* context cost reduction

### Result

* the repository now has a lighter document system better suited for repeated Codex-assisted work

---

## 2026-03-18 — readme aligned with current repository state

### Changed

* refreshed `README.md` project description to reflect current scenario-oriented runtime direction
* aligned layer definitions with `AGENTS.md` responsibilities (`app`, `shell`, `core`, `protocol`, `profiles`)
* corrected repository layout and removed outdated roadmap path reference
* updated script section to match `package.json`
* added explicit three-document collaboration flow (`AGENTS.md`, `ROADMAP.md`, `WORKLOG.md`)

### Scope

* docs
* contributor onboarding
* repository navigation

### Result

* `README.md` now matches current structure, priorities, and collaboration workflow

---

## 2026-03-18 — protocol review contract and architecture docs refined

### Changed

* refined `src/protocol/effect-result.ts` so `review_result` uses an explicit minimal payload contract (`decision`, `next_action`, optional `summary`) with dedicated type guards
* updated `docs/architecture/03-core_internal_design_and_agent_loop_spec.md` to strengthen failure absorption semantics, review-required separation, and non-linear runtime loop wording
* updated `docs/architecture/05-profile_design_and_assembly_spec.md` to position Profile as runtime constraint/governance surface while preserving profile-agnostic Core semantics

### Scope

* protocol boundary typing
* core architecture spec wording
* profile architecture spec wording

### Result

* review-related result flow now has a clearer protocol contract for next-step runtime integration
* architecture docs are better aligned with robust runtime semantics and constraint-oriented Profile governance

---

## 2026-03-18 — core effect-result absorption refined by result meaning

### Changed

* updated `src/core/apply-effect-result.ts` to absorb `EffectResult` by result meaning instead of only success/failure blanket handling
* distinguished `action_results` success/failure behavior from `review_result` behavior
* wired `review_result.payload.next_action` handling for `continue`, `repair`, `replan`, and `stop`

### Scope

* core runtime semantics
* effect result absorption path

### Result

* success no longer always clears task in every result kind
* failure no longer always forces run-level `failed`
* `lastEffectResultKind` remains recorded across handled branches

---

## 2026-03-18 — core/shell effect-result semantics and tests converged

### Changed

* refined `src/core/apply-effect-result.ts` to absorb effect results by kind/meaning and fixed the TypeScript narrowing issue in fallback branches
* made shell action result generation protocol-conformant in `src/shell/build-action-result.ts` (status/actionName/output/errorMessage)
* made `src/shell/build-effect-result-from-actions.ts` aggregate success from protocol `ActionResult.status` via `isSuccessfulActionResult`
* aligned `src/shell/build-run-review-effect-result.ts` with protocol review payload contract (`decision`, `next_action`, optional `summary`)
* added `tests/core/apply-effect-result.test.ts` and updated related core/shell tests to match the new semantics
* installed project dependencies and generated `package-lock.json` to enable local vitest execution

### Scope

* core effect-result absorption semantics
* shell protocol conformance and effect-result normalization
* semantic transition test coverage

### Result

* runtime meaning now distinguishes action/review outcomes without collapsing all failures into run-level failure
* review result path now satisfies protocol type-guards end-to-end
* full test suite passes locally (`17/17` files, `129/129` tests)

---

## 2026-03-18 — core runtime tick progression made result-meaning aware

### Changed

* updated `src/core/prepare-runtime-step-request.ts` with explicit post-result request gating (`action_results`, and `review_result` `continue/repair/replan/stop`)
* updated `src/core/run-runtime-tick.ts` to apply explicit request-preparation policy instead of relying on implicit downstream behavior
* expanded `tests/core/run-runtime-tick.test.ts` with direct assertions for failed action results and all review next-action branches

### Scope

* core runtime progression policy
* core request preparation gating
* semantic transition tests

### Result

* runtime progression now visibly distinguishes continue-able, hold/current-task, and stop paths
* `repair` and `replan` are represented as explicit minimal branches without pretending full orchestration
* local test suite remains green after change (`17/17` files, `133/133` tests)

---

## 2026-03-18 — protocol/core/shell failure-signal semantics converged

### Changed

* refined `src/protocol/failure-signal.ts` into a minimal normalized protocol object (`category`, `source`, `terminal`, optional `message`/`summary`) with type guards
* extended `src/protocol/effect-result.ts` with optional `failure_signal` and related narrowing helpers while keeping `success` as aggregate signal
* updated `src/shell/build-action-result.ts` to keep stable protocol-conformant failed action outputs and explicit invalid-action normalization helpers
* updated `src/shell/build-effect-result-from-actions.ts` so failed `action_results` now carry normalized aggregated `failure_signal`
* updated `src/core/apply-effect-result.ts` to explicitly absorb `failure_signal`, distinguish terminal vs non-terminal failure impact, and preserve minimal branch semantics
* expanded `tests/core/apply-effect-result.test.ts` to assert terminal/non-terminal failure-signal behavior across action and review branches

### Scope

* protocol boundary normalization
* shell result construction semantics
* core failure absorption semantics
* semantic transition tests

### Result

* failure handling is no longer only `success: false`; normalized failure signal now flows protocol -> shell -> core
* core now distinguishes record-only failures from terminal failures in explicit code paths
* local full test suite remains green (`17/17` files, `134/134` tests)

---

## 2026-03-18 — core runtime observability summary converged to shared state slot

### Changed

* updated `src/core/apply-runtime-step-result.ts` to write a minimal shared runtime summary (`progression`, `resultKind`, `failureSummary`) into `state.failure.runtimeSummary`
* updated `src/core/run-runtime-tick.ts` so tick-level observability reuses the shared summary and only supplements `requestKind` when step summary already exists
* updated `tests/core/apply-runtime-step-result.test.ts` and `tests/core/run-runtime-tick.test.ts` to assert shared-summary semantics across continue / hold / terminal paths and failure-signal cases

### Scope

* core runtime progression observability
* shared minimal runtime summary surface
* semantic transition test alignment

### Result

* runtime now has a single minimal Core-shared observability slot instead of tick-local-only summary logic
* step/result/failure/progression are visible through a stable serialized summary, with tick adding request-kind context when available
* local full test suite remains green (`17/17` files, `140/140` tests)

---

## 2026-03-18 — review-stop boundary and waiting orchestration semantics tightened

### Changed

* clarified `review_result.stop` semantics as review-rejected run-level terminal across `apply-effect-result`, step summary, and tick summary paths
* upgraded core runtime summary to express minimal orchestration waiting state for review outcomes (`waiting_for_repair`, `waiting_for_replan`)
* updated `prepare-runtime-step-request` to explicitly block next request while in waiting orchestration state
* updated `run-runtime-tick` to reuse step-written waiting state and keep progression/request behavior aligned with shared runtime summary
* updated core tests to assert explicit continue/hold/terminal boundaries and waiting-state visibility in shared `runtimeSummary`

### Scope

* core effect-result semantics
* core step/tick progression policy
* core request preparation policy
* semantic transition and summary consistency tests

### Result

* stop is now consistently modeled as review-rejected run-level terminal in code and tests
* repair/replan now act as minimal orchestration entry points with explicit waiting semantics instead of hold-only labels
* runtime summary now shows not only hold reason but also waiting orchestration state for repair/replan
* local full test suite remains green (`17/17` files, `142/142` tests)

---

## 2026-03-20 10:05 — stage 1.1 first capability contract defined

### Changed

* added a dedicated protocol contract for `controlled_single_file_text_modification` with:
  * narrow single-file text input (`target_path` + `replace_text` change)
  * explicit refusal codes (`invalid_path`, `unsupported_file_type`, `missing_target`, `empty_request`, `no_op_request`)
  * minimal success/failure output and evidence shapes
  * deterministic validation helpers
* extended `ActionKind` with `capability` and exported the new capability contract through protocol index
* updated shell action normalization to accept only the new capability action contract and normalize refusal/success payloads without implementing real file execution
* refined effect-result failure message derivation to reuse capability refusal summary when available
* updated shell tests to use capability actions and added dedicated contract coverage tests for all required refusal/success/failure cases

### Scope

* protocol contract surface
* shell action/effect normalization
* tests (contract and normalization)

### Result

* Task-Group 1.1 now has a narrow, explicit, test-covered first capability contract that stays on the existing runtime path (`EffectRequest -> Action[] -> ActionResult[] -> EffectResult`)
* runtime semantics (`failure_signal`, waiting/stop handling, runtimeSummary) remain unchanged and continue to absorb results through existing Core logic
* local full test suite passes (`18/18` files, `150/150` tests)

---

## 2026-03-20 14:38 — stage 1.1 boundary semantics tightened before task-group 1.2

### Changed

* adjusted `canBuildActionResult` semantics in `src/shell/build-action-result.ts`:
  * recognized `controlled_single_file_text_modification` capability actions now return buildable `true` even when they normalize to refusal/failed results
  * kept `buildActionResult` success/refusal normalization path unchanged
* clarified contract wording in `src/protocol/controlled-single-file-text-modification.ts`:
  * `missing_target` explicitly means missing/blank target path in request input
  * `empty_request` explicitly means missing/incomplete/empty change intent
  * did not introduce filesystem existence checks or new refusal codes
* updated shell tests to lock the new boundary semantics (buildability for refusal inputs and clarified refusal summaries)

### Scope

* shell action buildability boundary
* protocol refusal-boundary wording
* shell contract tests

### Result

* Stage 1.1 contract boundary is now internally consistent: recognizable capability inputs are always normalizable via existing `ActionResult` path
* refusal handling remains normalized and stable without changing runtime semantics (`failure_signal` / waiting / stop / runtimeSummary)
* local full test suite passes (`18/18` files, `152/152` tests)

---

## 2026-03-20 14:57 — stage 1.2 minimal real shell execution path connected

### Changed

* added a narrow shell executor `src/shell/execute-controlled-single-file-text-modification.ts` for the single capability `controlled_single_file_text_modification`:
  * read target text file
  * apply one `find_text -> replace_text`
  * write file back
* kept Stage 1.1 contract refusal flow unchanged; contract refusal still normalizes as refusal-style failed `ActionResult`
* added execution-failure normalization (separate from refusal) in protocol/action output for:
  * `target_file_missing`
  * `find_text_not_found`
  * `file_read_failed`
  * `file_write_failed`
* wired real execution into `src/shell/build-action-result.ts` only after contract acceptance
* kept existing `EffectRequest -> Action[] -> ActionResult[] -> EffectResult` path and updated `build-effect-result-from-actions` to surface execution failure summaries in aggregated `failure_signal.message`
* added a shared temp-workspace fixture for shell tests and updated shell/integration tests to cover:
  * real success path
  * contract refusal path
  * execution failures (missing file / find-text miss / read/write failure)
  * `ActionResult -> EffectResult` failure aggregation consistency

### Scope

* shell capability execution bridge
* protocol action-output failure shape
* shell/integration tests

### Result

* first capability now executes real single-file text modification through the existing shell/runtime path without introducing a second execution model
* contract refusal and execution failure are explicitly separated while remaining protocol-normalized and Core-compatible
* local full test suite passes (`18/18` files, `157/157` tests)

---

## 2026-03-20 15:04 — stage 1.3 kernel validation e2e path added

### Changed

* added a dedicated core e2e validation test `tests/core/kernel-validation-real-capability.e2e.test.ts` that runs the real first capability through the existing runtime chain:
  * Core tick bootstrap (`runRuntimeTick`)
  * Shell real execution (`executeShellRuntimeRequest`)
  * Core absorb/summary update (`runRuntimeTick` with returned `EffectResult`)
* covered required Stage 1.3 branches under real capability context:
  * success
  * non-terminal failure (`target_file_missing`, `find_text_not_found`)
  * terminal failure (via existing terminal `failure_signal` entry path)
  * review continue / repair / replan / stop
* asserted runtimeSummary coherence and request/result/failure alignment for each branch without introducing a second runtime path

### Scope

* core kernel-validation tests
* stage-level semantic regression coverage

### Result

* Stage 1 now has a real capability end-to-end validation path that demonstrates semantic stability of Core/Shell integration under real execution
* runtimeSummary/request/result/failure behavior remains aligned with current Core semantics across continue/hold/terminal and review branches
* local full test suite passes (`19/19` files, `165/165` tests)

---

## 2026-03-20 15:28 — stage 2.1 repair recovery entry introduced

### Changed

* extended protocol `EffectResult` with a minimal explicit repair recovery trigger:
  * new `kind: "repair_recovery"`
  * payload `status: "recovered" | "failed"` with optional summary
* integrated `repair_recovery` into core absorption semantics (`apply-effect-result`):
  * `recovered` re-enters normal progression path without creating a second runtime channel
  * `failed` normalizes through existing failure-signal absorption (default runtime/core non-terminal failure when not explicitly provided)
* integrated `repair_recovery` into step/tick summary semantics (`apply-runtime-step-result`):
  * explicit progression mapping for recovered/failed recovery results
  * coherent hold/orchestration behavior (`waiting_for_repair` retained on failed recovery)
  * failureSummary extraction aligned with repair recovery payload summary
* updated request gating (`prepare-runtime-step-request`) so recovery re-entry only resumes request emission when recovery status is explicitly `recovered`
* added dedicated core tests for repair recovery entry, success re-entry, failure handling, and gating behavior

### Scope

* protocol result contract (minimal extension)
* core effect absorption and progression semantics
* core request gating semantics
* core recovery tests

### Result

* `waiting_for_repair` is no longer passive-only: it now has an explicit minimal recovery entry
* repair recovery success/failure paths are visible, testable, and remain in existing runtime semantics
* no additional runtime model/framework was introduced
* local full test suite passes (`20/20` files, `169/169` tests)

---

## 2026-03-20 15:43 — stage 2.2 replan recovery entry introduced

### Changed

* extended protocol `EffectResult` with a minimal explicit replan recovery trigger:
  * new `kind: "replan_recovery"`
  * payload `status: "recovered" | "failed"` with optional `summary`
  * optional `next_task_id` as the narrow pointer-update surface for successful replan recovery
* integrated `replan_recovery` into core absorption semantics (`apply-effect-result`):
  * `recovered` re-enters normal progression and applies optional `currentTaskId` pointer update
  * `failed` normalizes through existing failure-signal absorption (default runtime/core non-terminal failure when not explicitly provided)
* integrated `replan_recovery` into step/tick summary semantics (`apply-runtime-step-result`):
  * explicit progression mapping for recovered/failed replan recovery results
  * coherent hold/orchestration behavior (`waiting_for_replan` retained on failed recovery)
  * failureSummary extraction aligned with replan recovery payload summary
* updated request gating (`prepare-runtime-step-request`) so replan recovery re-entry only resumes request emission when status is explicitly `recovered`
* added dedicated core tests for replan recovery entry, success/failure paths, gating behavior, and pointer application behavior

### Scope

* protocol result contract (minimal extension)
* core effect absorption and progression semantics
* core request gating semantics
* core recovery tests

### Result

* `waiting_for_replan` is no longer passive-only: it now has an explicit minimal recovery entry
* replan recovery success/failure and minimal pointer update behavior are visible, testable, and remain in existing runtime semantics
* no additional runtime model/framework was introduced
* local full test suite passes (`21/21` files, `174/174` tests)

---

## 2026-03-20 15:54 — stage 2.3 recovery path tests consolidated

### Changed

* added a dedicated Stage-2 recovery validation suite `tests/core/recovery-paths.test.ts` organized by branch lifecycle:
  * enter waiting (`repair` / `replan`)
  * verify no-trigger gating remains blocked
  * apply explicit recovery trigger
  * validate recovery success/failure semantics
* strengthened branch-level consistency assertions across repair/replan recovery paths:
  * `progression`
  * `holdReason`
  * `orchestration`
  * `resultKind`
  * `requestKind`
  * `failureSummary`
* added explicit replan pointer-application validation in consolidated recovery tests:
  * `next_task_id` update reflected in `currentTaskId`
  * post-recovery request points to updated task
  * unrelated pointer state remains unchanged
* kept existing 2.1/2.2 entry tests in place and verified compatibility

### Scope

* core recovery-path validation tests
* stage-level recovery semantics visibility

### Result

* recovery is now test-visible as a real runtime branch (not label-only) for both repair and replan
* success/failure/gating and summary consistency are covered end-to-end at core tick path level
* local full test suite passes (`22/22` files, `178/178` tests)

---

## 2026-03-20 16:12 — stage 3.1 minimal capability policy introduced

### Changed

* added a narrow shell policy surface for `controlled_single_file_text_modification` in `src/shell/controlled-single-file-text-modification-policy.ts`
  * path boundary allow rule: target must stay under `docs/`
  * policy file-type allow rule: executable types restricted to `.md` / `.txt`
* extended protocol capability output in `src/protocol/controlled-single-file-text-modification.ts` with explicit policy-violation normalization:
  * `policy_violation.code`: `path_outside_boundary` | `disallowed_file_type`
  * policy violation summary builder for stable message normalization
* updated `src/shell/build-action-result.ts` execution flow to enforce policy after contract acceptance and before real execution
  * kept existing contract refusal and execution failure paths unchanged
  * added normalized failed `ActionResult` builder for policy violations
* updated `src/shell/build-effect-result-from-actions.ts` failure-message aggregation to include `policy_violation.summary` so policy failures continue through existing `failure_signal` path
* expanded shell tests to verify Stage 3.1 distinctions and runtime-path compatibility:
  * policy-refused path and file-type cases
  * contract refusal vs policy violation distinction
  * policy violation vs execution failure distinction
  * policy violation aggregation into `failure_signal`

### Scope

* shell minimal governance surface for first capability
* protocol action output normalization
* shell/core-compatible failure aggregation tests

### Result

* first real capability is now explicitly constrained by policy, not only by contract shape
* policy violations are normalized into failed `ActionResult` and aggregated into runtime-absorbable `failure_signal` without introducing a second failure path
* contract refusal / policy violation / execution failure are now observably distinct in code and tests
* local full test suite passes (`22/22` files, `185/185` tests)

---

## 2026-03-20 16:27 — stage 3.2 review / approval gate introduced

### Changed

* added a minimal core review-gate helper `src/core/review-gate.ts` and integrated it into runtime request preparation:
  * explicit pre-execution gate for tagged tasks (`[review_gate:pre_execution_controlled_single_file_text_modification]`) routes to `run_review`
  * explicit failure-escalation gate for selected failed action results routes to `run_review`
* extended `src/core/build-effect-request.ts` with `buildRunReviewRequest(...)` to produce governance-visible review requests on the existing main path
* integrated review gate into `src/core/prepare-runtime-step-request.ts` so review-gated branches emit `run_review` instead of bypassing runtime progression
* updated `src/core/apply-runtime-step-result.ts` to recognize escalation-to-review progression (`review_required` signal and continueable progression for escalated action failures)
* extended shell review execution in `src/shell/build-run-review-effect-result.ts`:
  * supports explicit review decision override (`continue` / `repair` / `replan` / `stop`)
  * non-continue decisions normalize into review failure signals (terminal for `stop`, non-terminal otherwise)
* kept review absorption semantics in Core unchanged and aligned with existing `review_result` handling (`continue/repair/replan/stop`)
* added dedicated Stage 3.2 tests `tests/core/review-approval-gate.test.ts` covering:
  * pre-execution review-required path
  * review continue + resumed real capability execution
  * review stop/reject governance-visible terminal outcome
  * review repair/replan compatibility with Stage-2 recovery entry
  * failure escalation to review and non-escalated fallback path
  * distinction assertions across contract refusal / policy violation / review-required / execution failure
* updated `tests/shell/build-run-review-effect-result.test.ts` for decision override coverage
* updated `tests/core/kernel-validation-real-capability.e2e.test.ts` find-text-miss branch to assert Stage 3.2 escalation-to-review behavior

### Scope

* core governance entry and request routing
* shell review result normalization
* stage-level governance path tests

### Result

* review is now a real governance control surface on the runtime main path, not protocol-shape-only
* at least one pre-execution path now requires review before execution proceeds
* selected failure cases now escalate into review while non-escalated failures keep prior behavior
* review continue / stop / repair / replan remain aligned with existing Core semantics and Stage-2 recovery paths
* local full test suite passes (`23/23` files, `194/194` tests)

---

## 2026-03-20 16:44 — stage 3.3 profile-driven policy/review surface introduced

### Changed

* extended `AgentProfile` in `src/profiles/default-profile.ts` with minimal declarative governance config:
  * `capabilityPolicy.controlledSingleFileTextModification.allowedPathPrefixes`
  * `capabilityPolicy.controlledSingleFileTextModification.allowedTextFileExtensions`
  * `reviewPolicy.preExecutionMode` (`tagged_only` | `always` | `disabled`)
  * `reviewPolicy.escalation` flags (`policyPathOutsideBoundary`, `findTextNotFound`)
* added active-profile resolution helpers in `src/profiles/default-profile.ts` (`set/get/resetActiveAgentProfile`) and policy/review resolvers used by runtime bridge code
* added a second concrete profile variant `src/profiles/strict-profile.ts` and exported it via `src/profiles/index.ts`
* updated profile app entry `src/app/run-agent-with-profile.ts` to scope active profile during profile-based runs and restore previous profile after execution
* made shell capability policy profile-driven in `src/shell/controlled-single-file-text-modification-policy.ts` (path boundary + file-type allowlist now sourced from active profile config)
* made review gate routing profile-driven in `src/core/review-gate.ts`:
  * pre-execution review gate mode driven by profile
  * failure escalation rules driven by profile flags
* kept Core semantics unchanged while preserving existing review/failure absorption contracts

### Scope

* profiles as real policy/review routing surface
* shell capability policy selection
* core review routing selection (without semantic redefinition)
* profile influence verification tests

### Result

* profile now drives at least one capability policy and at least one review/escalation rule
* default profile behavior remains aligned with Stage 3.1/3.2 baseline
* strict profile demonstrates concrete behavior differences without introducing a second runtime meaning model
* added dedicated Stage 3.3 tests in `tests/profiles/profile-policy-surface.test.ts` proving profile influence and no semantic leakage
* local full test suite passes (`24/24` files, `199/199` tests)

---

## 2026-03-20 16:54 — stage 4.1 minimal evidence/reference surface introduced

### Changed

* replaced the old loose evidence object in `src/protocol/evidence.ts` with a minimal explicit `EvidenceRef` protocol shape:
  * `kind`, `source`, `outcome`
  * optional small refs (`capability`, `actionName`, `requestKind`, `targetPath`, `code`, `summary`)
  * added validators for single ref and ref arrays
* extended protocol carriers with optional evidence refs:
  * `ActionResult.evidence_refs` (`src/protocol/action-result.ts`)
  * `FailureSignal.evidence_refs` (`src/protocol/failure-signal.ts`)
  * `EffectResult.evidence_refs` (`src/protocol/effect-result.ts`)
* updated shell normalization to preserve evidence across success/failure paths:
  * action-level success/contract refusal/policy violation/execution failure now emit `evidence_refs` in `src/shell/build-action-result.ts`
  * effect-level aggregation now emits minimal `effect` evidence refs and forwards failed-action evidence refs into `failure_signal.evidence_refs` in `src/shell/build-effect-result-from-actions.ts`
  * review-result builder now emits evidence refs for continue/repair/replan/stop, including governance-visible reject/stop failure refs in `src/shell/build-run-review-effect-result.ts`
* updated core default failure-signal normalization (`src/core/apply-effect-result.ts`) to include minimal review/recovery failure evidence refs when defaults are synthesized
* added Stage 4.1 evidence tests (`tests/shell/evidence-surface.test.ts`) covering:
  * success evidence
  * contract refusal evidence
  * policy violation evidence
  * execution failure evidence
  * review reject evidence
  * serialization and summary/failure/evidence distinction assertions
* added recovery-failure evidence assertion in `tests/core/apply-effect-result.test.ts`

### Scope

* protocol evidence/reference shape
* shell/core-compatible evidence preservation
* minimal audit-surface tests

### Result

* request/result/failure flow now carries a minimal, stable, JSON-serializable evidence/reference surface
* success/failure/governance/recovery paths preserve small reference clues without blob payloads
* summary, failure semantics, and evidence refs are now explicitly separated
* local full test suite passes (`25/25` files, `205/205` tests)

---

## 2026-03-20 17:31 — stage 4.2 audit-friendly runtime summary alignment introduced

### Changed

* aligned tick-level summary shape with step-level shared summary by adding `signal` to `RuntimeTickSummary` in `src/core/run-runtime-tick.ts`
* updated tick summary build/write path to preserve `signal` during request-summary application, preventing step-level signal loss
* strengthened core summary alignment assertions in existing tests:
  * `tests/core/run-runtime-tick.test.ts`
  * `tests/core/apply-runtime-step-result.test.ts`
  * `tests/core/recovery-paths.test.ts`
  * `tests/core/kernel-validation-real-capability.e2e.test.ts`
* added dedicated Stage 4.2 consistency suite `tests/core/runtime-summary-consistency.test.ts` for:
  * stop/waiting/failure field clarity
  * step/tick signal alignment
  * recovery pre/post summary coherence and gating behavior

### Scope

* core runtime summary surface
* core summary consistency validation
* stage 4 audit-readiness baseline

### Result

* stop/waiting/failure summary combinations are now more explicit and stable at tick level
* step-level and tick-level runtime summary meaning are aligned on key fields (`progression`, `signal`, `holdReason`, `orchestration`, `resultKind`, `requestKind`, `failureSummary`)
* summary remained minimal with no new state-machine branches or audit stream
* local full test suite passes (`26/26` files, `211/211` tests)

---

## 2026-03-20 17:45 — stage 4.3 replay-friendly boundary preparation added

### Changed

* added a minimal protocol-level `request_ref` boundary object in `src/protocol/request-ref.ts` (`run_id`, `plan_id`, `task_id`, `request_kind`) with validation
* extended protocol carriers to accept stable request refs:
  * `EffectRequest.request_ref` (`src/protocol/effect-request.ts`)
  * `EffectResult.request_ref` (`src/protocol/effect-result.ts`)
  * `FailureSignal.request_ref` (`src/protocol/failure-signal.ts`)
* updated core request assembly in `src/core/build-effect-request.ts` to emit explicit `request_ref` for both `execute_actions` and `run_review`, and mirror it into request context for compatibility
* updated shell result normalization to propagate request refs across request/result/failure boundaries:
  * `src/shell/build-effect-result-from-actions.ts`
  * `src/shell/build-run-review-effect-result.ts`
  * `src/shell/execute-effect-request.ts`
* reduced implicit dependency on heavy action output for failure aggregation by preferring `evidence_refs[0].summary` when building aggregated failure message in `build-effect-result-from-actions`
* updated core default failure normalization in `src/core/apply-effect-result.ts` to preserve `request_ref` when synthesizing fallback failure signals
* added/updated tests for replay-friendly stability and boundary clarity:
  * request ref creation in core request preparation
  * request/result/failure/context request-ref propagation
  * malformed request-ref rejection path
  * refs-over-payload aggregation preference
  * context vs evidence distinction

### Scope

* protocol boundary preparation (minimal refs-first enhancement)
* core request assembly
* shell effect/failure normalization
* replay-friendly boundary tests

### Result

* boundary objects now carry a stable, serializable request reference without introducing replay/resume implementation
* effect/failure interpretation is less coupled to embedded output payload details
* `runtimeSummary` / `failure_signal` / `evidence_refs` / `context` responsibilities are clearer at protocol boundaries
* local full test suite passes (`26/26` files, `216/216` tests)

---

## 2026-03-20 17:56 — stage 5.1 recoverable state surface defined

### Changed

* added an explicit protocol recoverable-state descriptor in `src/protocol/recoverable-runtime-state.ts`:
  * `RecoverableRuntimeState`
  * `RecoverableRuntimeSummarySurface` (must-survive vs rebuildable split)
  * `RecoverableRuntimeRestorationBoundary`
  * explicit boundary kinds for continue/waiting/terminal paths
  * explicit `INTENTIONALLY_NOT_RESUMABLE_YET` list
  * validation guard `isRecoverableRuntimeState(...)`
* exported new protocol descriptor via `src/protocol/index.ts`
* added a minimal core reader `src/core/read-recoverable-runtime-state.ts`:
  * reads runtime identity/pointers from current `AgentState`
  * maps Stage-4 summary into recoverable must-survive/rebuildable sections
  * maps failure signal into recoverable failure surface
  * derives restoration boundary semantics for:
    * waiting_for_repair
    * waiting_for_replan
    * hold_non_terminal_failure
    * terminal_review_stop
    * terminal_failure
    * terminal_completed
  * supports optional `profileName` injection without making Core profile-semantic
* exported core reader via `src/core/index.ts`
* added dedicated Stage-5.1 tests in `tests/core/recoverable-runtime-state-surface.test.ts` covering:
  * serializable shape and guard
  * must-survive pointer/gating fields
  * summary must-survive vs rebuildable split
  * waiting/stop/failure restoration boundaries
  * intentionally-not-resumable scope and request_ref carry-over on failures

### Scope

* protocol recoverable-state surface
* core read-only recoverability selector
* recoverability boundary tests

### Result

* runtime now has a minimal explicit recoverable-state surface without implementing restore/resume execution
* waiting/stop/failure restoration boundaries are field-level explicit and test-visible
* summary persistence expectations are clarified (must-survive vs rebuildable)
* intentionally-not-resumable scope is explicit for 5.2 path selection
* local full test suite passes (`27/27` files, `221/221` tests)

---

## 2026-03-20 18:16 — stage 5.2 minimal resume path (waiting_for_repair) implemented

### Changed

* added a minimal restore helper `src/core/restore-runtime-state.ts` for one narrow resumable path:
  * supports only `waiting_for_repair` restoration boundary
  * rebuilds `AgentState` from `RecoverableRuntimeState` (runtime pointers + failure/runtimeSummary surface)
  * enforces boundary semantics for resume safety (`hold_current_task` + `waiting_for_repair` + `repair_recovery` trigger requirement)
  * returns explicit restore result (`restored: true/false`) with failure codes:
    * `invalid_recoverable_state`
    * `unsupported_resume_boundary`
    * `profile_mismatch`
  * preserves profile consistency via optional expected profile-name check
  * rejects tampered unknown non-resumable markers instead of silently restoring
* exported restore helper via `src/core/index.ts`
* added dedicated Stage-5.2 resume tests `tests/core/minimal-resume-path.test.ts` covering:
  * persisted recoverable form JSON round-trip -> restore
  * waiting_for_repair restore -> no-trigger gating still blocked
  * repair_recovery(recovered) resumes through existing runtime main path
  * summary must-survive continuity and rebuildable coherence after restore
  * profile consistency guard (no silent drift, explicit mismatch rejection)
  * unsupported boundary and tampered unsupported scope rejection

### Scope

* minimal restore/readiness layer in core
* single resumable path validation (waiting_for_repair)
* resume consistency tests

### Result

* runtime no longer assumes a single-process uninterrupted lifecycle for this narrow path
* restore/resume continues through existing Core/Shell/Protocol path without introducing a second runtime model
* request gating and recovery semantics remain stable after restore
* unsupported resume boundaries are explicitly rejected
* local full test suite passes (`28/28` files, `227/227` tests)

---

## 2026-03-20 18:28 — stage 5.3 recoverability tests added

### Changed

* minimally extended restore boundary support in `src/core/restore-runtime-state.ts` to enable Stage-5 recoverability validation coverage without introducing a new runtime model:
  * `waiting_for_replan` restore accepted with strict semantic checks
  * terminal boundaries (`terminal_review_stop`, `terminal_failure`, `terminal_completed`) restore accepted as terminal-only states
  * `continueable` / `hold_non_terminal_failure` remain unsupported for resume in current scope
* added dedicated Stage-5 recoverability suite `tests/core/recoverability-paths.test.ts` with structured pre-restore -> round-trip -> restore -> post-restore assertions
* kept existing 5.2 minimal resume tests intact and compatible (`tests/core/minimal-resume-path.test.ts`)

### Scope

* recoverability validation coverage
* minimal restore-boundary compatibility extension for tests
* no new persistence/replay platform features

### Result

* waiting_for_repair and waiting_for_replan restore/resume semantics are now system-tested
* terminal states are explicitly verified to remain terminal after restore
* request gating stability after restore is explicitly verified across waiting and terminal branches
* profile consistency and mismatch rejection after restore are verified
* must-survive vs rebuildable summary behavior is verified across restore and post-resume progression
* local full test suite passes (`29/29` files, `234/234` tests)

---

## 2026-03-20 18:41 — stage 6.1 second real capability introduced (controlled_single_file_text_read)

### Changed

* added a second real capability contract in `src/protocol/controlled-single-file-text-read.ts`:
  * capability name: `controlled_single_file_text_read`
  * narrow single mode: `contains_text`
  * single-file text-only boundaries
  * contract refusal / policy-violation / execution-failure summaries
  * minimal success/failure output + evidence shape
* exported the new protocol via `src/protocol/index.ts`
* added real shell execution helper `src/shell/execute-controlled-single-file-text-read.ts`:
  * reads one text file
  * returns `matched: boolean` for `contains_text`
  * normalizes execution failures (`target_file_missing`, `file_read_failed`)
* added second-capability policy helper `src/shell/controlled-single-file-text-read-policy.ts` and wired it to profile surface
* extended profile capability policy surface in `src/profiles/default-profile.ts` and `src/profiles/strict-profile.ts`:
  * added `controlledSingleFileTextRead` policy block
  * added resolver `resolveControlledSingleFileTextReadPolicy(...)`
* integrated second capability into existing action normalization path in `src/shell/build-action-result.ts`:
  * shared action entry path remains unchanged
  * supports both mutation and read capabilities under same ActionResult contract
  * keeps contract refusal / policy violation / execution failure distinction
  * keeps evidence refs and normalized output behavior aligned with Stage 3/4/5 boundaries
* added dedicated tests in `tests/shell/second-capability-text-read.test.ts` covering:
  * second capability contract and success/failure shapes
  * semantic difference from text modification
  * same effect pipeline (`ActionResult -> EffectResult -> failure_signal`)
  * profile/policy compatibility
  * request_ref/evidence compatibility
  * first+second capability coexistence in same request/runtime flow

### Scope

* second capability contract
* shell execution and policy integration for second capability
* profile policy compatibility extension
* multi-capability semantic-path validation

### Result

* runtime now carries a second meaningfully different real capability (read/inspect vs mutate) on the same semantic runtime path
* no second executor/runtime model was introduced
* failure/review/policy/profile/evidence/summary boundaries remain unified
* local full test suite passes (`30/30` files, `240/240` tests)

---

## 2026-03-20 18:54 — stage 6.2 third real capability introduced (controlled_directory_text_list)

### Changed

* added third capability protocol contract in `src/protocol/controlled-directory-text-list.ts`:
  * capability name: `controlled_directory_text_list`
  * narrow input: single `target_path` + `list.kind = text_entries` + optional small `limit`
  * non-recursive single-directory boundaries with explicit refusal/execution/policy summary builders
  * minimal success output (`listed`, `count`, small `entries`, `summary`, `evidence`)
* exported new protocol type via `src/protocol/index.ts`
* added third capability shell policy helper `src/shell/controlled-directory-text-list-policy.ts`:
  * path-boundary enforcement from profile
  * effective limit resolution from request limit + profile `maxEntries`
* added third capability shell execution helper `src/shell/execute-controlled-directory-text-list.ts`:
  * real non-recursive directory listing
  * text-file filtering by profile allowlist extensions
  * bounded result size
  * normalized execution failures (`target_directory_missing`, `target_not_directory`, `directory_read_failed`)
* extended profile policy surface for third capability in `src/profiles/default-profile.ts` and `src/profiles/strict-profile.ts`:
  * `controlledDirectoryTextList.allowedPathPrefixes`
  * `controlledDirectoryTextList.allowedTextFileExtensions`
  * `controlledDirectoryTextList.maxEntries`
  * resolver `resolveControlledDirectoryTextListPolicy(...)`
* integrated third capability into the existing unified action normalization path in `src/shell/build-action-result.ts`:
  * capability discriminator extended without introducing a new execution model
  * unified ActionResult success/failure normalization retained
  * unified evidence_ref + policy/refusal/execution distinction retained
  * `canBuildActionResult` now recognizes all three real capabilities
* added dedicated tests `tests/shell/third-capability-directory-text-list.test.ts` covering:
  * third capability contract shape
  * clearly different kind vs file read/modify
  * same ActionResult -> EffectResult -> failure_signal path
  * profile/policy compatibility
  * evidence/request_ref compatibility
  * coexistence of first+second+third capabilities under same runtime summary semantics

### Scope

* third capability contract and execution
* profile/policy extension for third capability
* unified action/effect normalization continuity
* third-capability validation tests

### Result

* runtime now supports a third clearly different real capability (single-directory text listing) without introducing a second runtime logic system
* failure/review/policy/profile/evidence/summary boundaries remain unified across three capabilities
* minimal repeated-pattern reuse was applied without platformization
* local full test suite passes (`31/31` files, `246/246` tests)

## 2026-03-20 19:03 — stage 6.3 multi-capability consistency tests strengthened

### Changed

- strengthened `tests/core/multi-capability-consistency.test.ts` as the Stage 6.3 cross-capability closure file
- added explicit cross-capability assertion for `review_result(next_action=replan)` to verify unified `waiting_for_replan` semantics
- added explicit cross-capability distinction coverage for `contract_refusal` vs `policy_violation` vs `execution_failure` while keeping one `ActionResult -> EffectResult -> failure_signal` path

### Scope

- core/runtime consistency tests
- multi-capability semantic unification (modification / read / directory-list)
- Stage 6.3 validation closure

### Result

- multi-capability consistency coverage now explicitly includes success/failure normalization, review/repair/replan/stop semantics, summary/failure_signal consistency, profile-policy influence, and no-second-semantics assertions in one structured test suite
- targeted tests passed:
  - `tests/core/multi-capability-consistency.test.ts`
  - `tests/shell/second-capability-text-read.test.ts`
  - `tests/shell/third-capability-directory-text-list.test.ts`

---

## 2026-03-22 20:26 — stage 7.1 first validating scenario contract defined

### Changed

- added `docs/architecture/08-first_validating_scenario_contract.md`
- defined one narrow validating scenario: **Controlled Docs Maintenance Validation Scenario**
- documented target stack, workflow boundary, expected capability usage, review/approval expectations, artifact expectations, non-goals, and containment notes

### Scope

- stage 7.1 contract definition
- docs only
- no runtime semantic or execution-model expansion

### Result

- repository now has a concrete Stage 7.1 scenario contract that pressures the existing kernel through current capabilities and governance surfaces while preventing scenario-driven semantic leakage

---

## 2026-03-22 20:33 — stage 7.2 first validating scenario end-to-end validation added

### Changed

- added `tests/core/first-validating-scenario.e2e.test.ts`
- implemented Stage 7.2 scenario validation for **Controlled Docs Maintenance Validation Scenario**
- covered three scenario-shaped paths on the existing kernel path:
  - normal bounded success (`directory_list -> file_read -> single_file_modification`)
  - governance/policy constrained path with review-observable escalation
  - failure/recovery path (`find_text` miss -> review repair -> repair recovery re-entry)

### Scope

- stage 7.2 test validation only
- no core/shell/protocol semantic expansion
- no new capability and no second execution model

### Result

- scenario e2e pressure is now validated through existing capability/policy/review/failure/runtimeSummary surfaces
- bounded docs/architecture markdown workflow is verified without semantic leakage
- local full test suite passes (`33/33` files, `255/255` tests)
