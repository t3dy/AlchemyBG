# Puffers 🧪🎩

A comical alchemy-lab **heat-juggling puzzle**. You command a handful of alchemist
**gnomes** who jump up and down on **bellows** to heat furnaces. There are never enough
gnomes for all the bellows — so the moment a furnace drifts out of its temperature band,
zany Rube-Goldberg catastrophe ensues: boil-overs, acid belches, mercury fumes that knock
a gnome cold, and fires that leap furnace to furnace.

Named for the **"puffer"** (*souffleur* / *Bläser*) — the period slur for the charlatan
alchemist who just worked the bellows hoping gold would appear (see Bruegel's *The
Alchemist*, c. 1558). A **totally separate game** from the board game in the repo root —
it borrows only the research base and is free to be fantastical (gnomes, homunculi).

## The core loop

- **4 furnaces**, each running a real operation with a target temperature **band**:
  Alembic (distillation), Retort (aqua fortis — hot, narrow, dangerous), Aludel
  (sublimation), and a **Cradle** (grow a homunculus).
- Temperature **decays** constantly. A gnome on the bellows pumps it up — but gnomes
  **tire** (stamina) and must rest. **Too cold** → the process stalls. **Too hot** →
  overheat climbs → **boil-over**: lab integrity drops, the batch spoils, fumes knock the
  gnome off the bellows, and the trouble **splashes onto the neighbours**.
- **Quench** a furnace (❄, on a cooldown) to pull it back from the brink.
- **Homunculus:** tend the Cradle in its gentle band and you birth a **homunculus** — a
  tireless, fume-immune extra worker… that slowly destabilises and **pops** if you don't
  spend it fast. Advantage + drawback vs. a gnome.
- **Win:** finish the three required processes. **Lose:** lab integrity hits 0.

## Three genre variants (same rules, different sense of time)

The single simulation (`src/sim.js`) is driven three ways — this is the design fork the
project is built to explore side-by-side:

| Variant | Feel | Controls |
|---|---|---|
| **Pausable** (recommended) | real-time you can freeze to think | **Space** = pause/resume |
| **Real-time** | Overcooked-style scramble, no pausing | just keep moving |
| **Tick** | Zachtronics-style plan-and-run | **Step** ½s · **×3** · **Run** |

## Play / develop

```bash
npm test          # simulation tests (node --test, no deps)
npm run build     # inline src/ → self-contained dist/{tick,realtime,pausable}.html
npm run serve     # static server at http://localhost:4173 (menu at /)
```

Open `dist/index.html` to pick a variant. Each `dist/*.html` is fully self-contained
(double-click to play; publishable as an Artifact — no external requests).

## Architecture

- `src/sim.js` — **pure deterministic rules engine** (seeded mulberry32, no DOM). Single
  source of truth. Node-testable like the root project's engine.
- `src/render.js` — canvas renderer + layout + hit-testing. No rules.
- `src/shell.js` — canvas/input/controls + the three time-loops (the only per-variant code).
- `build.mjs` — inlines the three modules into `dist/` per variant.
- `docs/` — `PLAN.md` (options survey), `DECISIONS.md` (locked choices + fork log).

See `docs/DECISIONS.md` for the "build every fork" method: at each design fork we ship a
playable version of **each** branch to test, rather than choosing on paper.
