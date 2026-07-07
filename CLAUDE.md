@AGENTS.md

# The Alchemist's Lab — AlchemyBoardGame

Solo digital prototype of Ted's alchemy board game, realized as a full-stack Next.js
website for deployment to GitHub + Vercel. Vertical slice complete and playable.

## Read first, by task

- **Game rules / balance / new content** → `docs/DESIGN.md` (the design bible, distilled
  from 7 megabase conversations spanning Sep 2024 – Feb 2026)
- **What the current slice contains + acceptance gates** → `docs/VERTICAL_SLICE.md`
- **Where a design decision came from** → `docs/MEGABASE_SOURCES.md` (provenance map)

## Hard design constraints (Ted's own words — do not violate)

1. **No magic.** "This is aimed at simulating a realistic early modern alchemy lab."
   Real apparatus names only (alembic, crucible, aludel, retort) — never invented
   portmanteaus like "philosopher's table" or "elixir pot". Goldmaking = false gold /
   gilding, i.e. what early modern practitioners could really do.
2. **Consequences are unskippable.** A disaster's effect must always land unless
   explicitly prevented; never let UI flow route around a negative outcome.
3. **Prevention cost is shown before the effect applies.** Every disaster offers its
   prevention clause up front.
4. **Status changes are visible before the heal prompt**, with the state word
   color-coded (the colored worker tokens are the game's signature mechanic).
5. **Educational but fun-first.** Historical flavor (real chemistry, medieval
   quotations) enriches; it never gates gameplay.

## Architecture

- `src/lib/game/` — **pure rules engine**, zero React/DOM. `types.ts` (state + actions),
  `data.ts` (tiles, disasters, recipes, tuning constants), `engine.ts` (reducer:
  `(state, action) -> state`). RNG is seeded mulberry32 stored in `GameState.rngState`,
  so any game is a deterministic replay of its seed. **All rules changes happen here,
  never in components.**
- `src/components/Game.tsx` — the whole UI (client component). Select-worker-then-
  click-tile interaction. Persists to localStorage (`alchemists-lab-save-v1`).
- `src/app/api/daily/route.ts` — server route: date-hashed seed for a shared daily
  challenge. Grow server features here (leaderboards etc.).
- Tests: `src/lib/game/engine.test.ts` (vitest). Includes a **balance gate**: a scripted
  bot must win some but not all of 40 seeds. If you retune `data.ts`, re-run and keep
  that gate honest — don't weaken the test to make it pass.

## Commands

- `npm run dev` — dev server (preview config `alchemy-board-game`, port 3210)
- `npm test` — vitest engine suite (16 tests)
- `npm run build` — production build; must stay clean along with `npx tsc --noEmit`
  and `npx eslint src`

## Deployment

Git repo initialized; no remote yet. Intended: GitHub repo + Vercel (Ted deploys, or
ask before creating remotes). No env vars needed; `/api/daily` is stateless.
