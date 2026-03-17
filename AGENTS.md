# AGENTS

## 0. Role

This file is the startup protocol for this repository.

It defines:

- the stable working flow for contributors and Codex
- the long-lived collaboration rules
- how to place changes correctly
- how to keep the document system in sync

This file should stay short and stable.

Document roles:

- `AGENTS.md` = stable workflow and long-lived rules
- `ROADMAP.md` = current overview, priorities, and sequencing
- `WORKLOG.md` = work record only

---

## 1. Stable Working Flow

Before meaningful work, always follow this order:

1. read `AGENTS.md`
2. read `ROADMAP.md`
3. read `WORKLOG.md`
4. identify task type
5. identify target layer
6. identify related roadmap item
7. make the change
8. run validation or tests when appropriate
9. update docs if needed
10. update `WORKLOG.md` for each meaningful commit / push level change

Interpretation by role:

- `AGENTS.md` defines how to work
- `ROADMAP.md` defines what is prioritized now
- `WORKLOG.md` records what has been done

If they seem to conflict:

- follow `AGENTS.md` for collaboration rules
- follow `ROADMAP.md` for priority and sequencing
- treat `WORKLOG.md` as factual history only

---

## 2. Pre-Edit Check

Before making meaningful edits, identify:

- task type
- target layer
- related roadmap item
- expected files to touch

Recommended format:

```text
Task type:
Target layer:
Related roadmap item:
Expected files to touch:
````

Do not start implementation until the task has clear layer placement and roadmap relevance.

---

## 3. Layer Rules

The repository uses five layers:

* `app`
* `shell`
* `core`
* `protocol`
* `profiles`

Responsibilities:

* `app` = thin entry points and caller-facing wrappers
* `shell` = execution bridge, request handling, and result normalization
* `core` = runtime semantics and state progression
* `protocol` = shared shapes and cross-layer contracts
* `profiles` = runtime constraints and scenario-facing configuration

Placement rules:

* semantic meaning belongs in `core`
* execution behavior belongs in `shell`
* shared object shapes belong in `protocol`
* entry convenience belongs in `app`
* scenario constraints belong in `profiles`

`profiles` should constrain runtime behavior, not redefine Core semantics.

---

## 4. Long-Lived Rules

Prefer semantic progress over structural splitting.

Do not add new layers, wrappers, or abstractions unless they clearly improve:

* semantic clarity
* execution control
* maintainability
* scenario expression

Keep Core semantically closed.

Do not move provider-specific logic, sandbox behavior, or policy plumbing into `core` unless there is a strong semantic reason.

Keep Shell operational, not semantic.

If a change affects task meaning, failure meaning, retry / repair / replan meaning, review meaning, or terminal state meaning, it likely belongs in `core`, not only in `shell`.

Keep Profiles constrained.

Profiles should express permissions, workflow constraints, and scenario boundaries, not become a second semantic engine.

Prefer narrow real capability over broad future-ready abstraction.

Use existing structure first.

Do not create new files, layers, or frameworks unless the current structure cannot express the change cleanly.

Keep placeholder logic honest.

If something is still placeholder behavior, do not let it look finished.

---

## 5. Document Update Rules

Use the three-document system strictly.

Update `AGENTS.md` only when a long-lived collaboration rule or stable architectural principle changes.

Update `ROADMAP.md` when phase, priority, sequencing, scope, or milestone judgment changes.

Update `WORKLOG.md` for each meaningful commit / push level work record.

Do not let the documents collapse into each other:

* do not turn `AGENTS.md` into a diary
* do not turn `ROADMAP.md` into a task log
* do not turn `WORKLOG.md` into a policy handbook

---

## 6. WORKLOG Rule

For normal development work:

* each meaningful commit or push should produce one `WORKLOG.md` entry
* the entry should record what changed, scope, and result
* commit / push without a corresponding worklog update is incomplete unless explicitly justified

Minor typo-only or formatting-only changes may be skipped.

When in doubt, update `WORKLOG.md`.

---

## 7. Completion Rule

A meaningful task is not fully complete until:

* code is aligned
* tests or validation are updated when appropriate
* relevant docs are aligned
* `WORKLOG.md` is updated when required

One-line operating rule:

Read `AGENTS.md` to know how to work,
read `ROADMAP.md` to know what matters now,
read `WORKLOG.md` to know what has been done.