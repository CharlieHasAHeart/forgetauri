# ForgeTauri

Scenario-oriented agent runtime architecture repository.

Current direction:
- move from structural baseline toward semantic closure in `core`
- stabilize Core/Shell contracts in `protocol`
- keep `profiles` constraint-oriented

## Layers

- `app`: thin entry points and caller-facing wrappers
- `shell`: execution bridge, request handling, and result normalization
- `core`: runtime semantics and state progression
- `protocol`: shared shapes and cross-layer contracts
- `profiles`: runtime constraints and scenario configuration

## Repository Layout

```text
.
├── AGENTS.md
├── ROADMAP.md
├── WORKLOG.md
├── README.md
├── docs/
│   └── architecture/
├── src/
│   ├── app/
│   ├── core/
│   ├── shell/
│   ├── protocol/
│   └── profiles/
└── tests/
    ├── app/
    ├── core/
    ├── shell/
    └── shared/
```

## Scripts

- `pnpm build`: compile TypeScript
- `pnpm test`: run unit tests once
- `pnpm test:unit`: same as `pnpm test`
- `pnpm test:watch`: run tests in watch mode

## Collaboration Flow

Follow the three-document system:

1. read `AGENTS.md` for stable workflow and collaboration rules
2. read `ROADMAP.md` for current priorities and sequencing
3. read `WORKLOG.md` for factual history of meaningful changes

## Architecture Docs

Primary specs live in `docs/architecture/`.
