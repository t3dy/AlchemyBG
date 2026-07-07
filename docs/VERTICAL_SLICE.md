# Vertical Slice — status and gates

## Slice 1: Solo core loop (SHIPPED 2026-07-06)

One complete, winnable, losable solo game in the browser.

**Contents**
- Full round loop: Placement → Production → Disaster → Healing → Upkeep, 10 rounds
- 5 starting tiles + 3-step research track (adds 2 passive tiles)
- 3 recipes, 6 resource types
- 12 real-chemistry disaster cards on the escalation ladder, prevention-first UX
- Worker health ladder with color-coded tokens; permanent death; loss condition
- Grand Experiment endgame gamble; Illumination
- Seeded determinism; localStorage save/resume; `/api/daily` shared daily seed
- Journal log with tone coloring; medieval flavor quotes on tiles

**Acceptance gates — all green**
- [x] `npm test`: 16/16, including rules acceptance + balance gate (bot wins some
      but not all of 40 seeds at 12 VP)
- [x] `tsc --noEmit`, `eslint src`, `next build` clean
- [x] Browser-verified full round: place → produce → disaster modal (prevention shown
      before effect) → prevent → heal → round 2; VP updates live
- [x] Save persists across reload; daily seed endpoint returns stable date-hashed seed
- [x] No horizontal scroll at 375px (mobile)

## Slice 1.5 (SHIPPED) — depth on the core loop

Layered onto Slice 1 without changing its shape:
- **Empty-board build-up**: 6 buildable tiles; opening is a gold-allocation puzzle
- **Strategy-parity balance model** (`balance.ts`): shadow prices + a 5-archetype harness
  gate; three economic lines dead-even (median 9), two specialist lines (safety, patronage)
  at median 7 — spread 2 VP
- **Historically-grounded persona abilities**: 9 roster alchemists, one ability each
- **Scholarly equipment**: every tile cites Moran / Principe / Newman (see HISTORIOGRAPHY.md)
- **Patron's Cabinet** second scoring path (court commissions) relieving the crucible
  bottleneck — the item from the Slice 2 list below

## Slice 2 candidates (pick one, don't blend)

1. **Deeper solo** — Apprentice replacement economy, Scar/Trauma tokens, 8-ailment
   palette, more disasters (20-card pool exists in DESIGN.md reserve)
2. **Named materials** — swap generic Ingredients/Metals for sulfur/mercury/salt/
   vitriol/gold with per-tile production chains (30-ingredient reserve)
3. **Lab building** — buy/place furniture tiles on a grid with adjacency effects
   (the original board-game fantasy; biggest UI lift)
4. **Persistence upward** — Vercel KV/Postgres leaderboard on the daily seed
   (full-stack growth; smallest design risk)

Each slice must ship with: engine tests for every new rule, an updated balance
simulation, and a browser-verified playthrough. Run /phase-gate before declaring done.
