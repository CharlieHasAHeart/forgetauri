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
