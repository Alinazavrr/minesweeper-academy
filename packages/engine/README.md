# @minesweeper/engine

Pure-TypeScript Minesweeper engine. Zero DOM dependency. Deterministic given a seed.

Runs in:
- Browser (game UI)
- Web Worker (heavy generation off main thread)
- Node (server-side validator, nightly board-pool refill)
- Vitest (tests)

See `ideas/PROJECT_PLAN.md` §16.5 for the design contract.

## Public API

Will be filled in as the engine ships. Functions land with tests, not before.

## Performance budgets

| Function | Budget (p95) |
| --- | --- |
| `applyAction` | < 5ms |
| `findSafeCell` (Expert) | < 50ms |
| `annotateMoves` (Expert full game) | < 500ms (server) |
| `probabilityMap` (Phase 2) | < 250ms |
| `serializeReplay` | < 8 bytes/action |

## Determinism rules

- No `Math.random()`. Seed-driven Mulberry32 PRNG only.
- No floating-point arithmetic in generation paths.
- Same seed + same actions = byte-identical state across browser and Node.
- Cross-runtime determinism test runs in CI.

## Versioning

Every game record stores the `ENGINE_VERSION` it was played under. The validator must load the matching version. Bumping the major version means an incompatible behavior change — old replays must keep working.
