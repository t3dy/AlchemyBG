# Puffers — Decisions & Fork Log

The method for this project (Ted's directive): **at every fork in the road, build out
each version** so there's a bunch of playable options to test, rather than choosing on
paper. This file records the locked calls and every open fork with its branches.

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| Genre (Q-A) | **Build all three** | Pausable · Real-time · Tick — shipped as three playable variants over one shared simulation. |
| Tone (Q-B) | **Comical fantasy gnomes** | Literal gnomes. This game *may be fantastical* — it is a separate game from the board game. |
| Homunculus | **In** | Grown via the Cradle (an alchemical Generation process). Tireless & fume-immune, but destabilises and pops — clear advantage/drawback vs. gnomes. |
| Relationship (Q-C) | **Standalone** | Own project in `PUFFERSGAME/`; shares only the research base (`../docs/*`). Free to diverge. |
| Deliverable (Q-D) | **Vertical slice per design** | Each genre variant is a complete, winnable, losable slice with tests. |
| Tech | Self-contained HTML + canvas | Vanilla JS, seeded deterministic sim (mirrors the root engine ethos). Zero-dependency; each variant is one self-contained file, instantly playable and Artifact-publishable. |

## Slice v0.1 — what shipped

- One simulation (`src/sim.js`), three drivers (`src/shell.js`): tick / real-time / pausable.
- 4 furnaces, 2 gnomes, stamina/fatigue, quench, full boil-over **cascade** (integrity
  loss + spoilage + fume KO + neighbour splash), homunculus birth/pop lifecycle.
- 8 passing `node --test` cases incl. winnable + losable + deterministic gates.
- Browser-verified in headless Chromium: all three render, no console errors.

## Open forks (each to be built out both/all ways when we tackle it)

Every one of these, per the method, becomes **N playable builds** to compare — not a memo.

1. **Gnome count / furnace count** — 2 gnomes × 4 furnaces is the current tension. Build
   variants: 2×3 (tight), 3×5 (busier), 1×3 (frantic solo).
2. **Cascade severity** — "fun but not too punishing" (the root game's central lesson).
   Build: gentle / current / brutal.
3. **Win condition** — finish-the-batch vs. score-attack (survive N seconds for max VP) vs.
   endless (how long can you last?).
4. **Homunculus design** — tireless-but-pops (current) vs. erratic (wanders off) vs.
   toxic (fume-immune but poisons gnomes nearby). Build each as a swappable rule.
5. **Control scheme** — click-to-assign (current) vs. drag-and-drop vs. lane/keyboard.
6. **Difficulty curve / levels** — hand-authored contraptions vs. a seeded daily challenge
   (mirror the root's `/api/daily`).
7. **Fantasy dial** — how far into whimsy (talking homunculi, imps, a lab cat) before it
   stops feeling like a lab. Build a "grounded" and a "zany" art/flavor pass.
8. **Rendering** — DOM/canvas (current) vs. a richer sprite/animation pass, if a variant
   proves fun enough to invest in.

## Parking lot (bigger questions)
- Scoring/economy shared with the board game's named-materials reserve? (Currently: a
  simple integrity×speed×homunculi score.)
- Co-op (multiple hands on one lab) or versus (side-by-side labs)?
- Meta-progression: unlock apparatus, gnome hats, lab upgrades between runs.
