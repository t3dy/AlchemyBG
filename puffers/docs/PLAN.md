# Puffers — Project Plan & Options (DRAFT)

*Provisional title.* A comical alchemy-lab **heat-juggling puzzle game**: too few alchemist
gnomes, too many bellows, and a lab full of glassware that boils over into zany
Rube-Goldberg catastrophe the moment a furnace drifts out of its temperature band.

Sibling to *The Alchemist's Lab* (the turn-based worker-placement game in the repo root).
Shares the same research corpus (`../docs/ALCHEMY_FACTS.md`, `HISTORIOGRAPHY.md`) and the
"real chymistry, no magic" ethos — but is a totally different *genre*: real-time/timing
dexterity + spatial routing, not turn-based economy.

---

## 1. The historical hook (why this is on-brand, not a betrayal of the realism rule)

- **"Puffer"** = *Bläser* / *souffleur*: the period slur for charlatan alchemists who just
  worked the bellows greedily hoping for gold, mocked in **Pieter Bruegel's *The Alchemist*
  (c. 1558)**. The comedy is *documented*, so slapstick here is historically literate, not a
  fantasy departure.
- **Heat control was the real skill.** The **athanor** ("slow Harry") existed to hold a
  *steady gentle heat for days* (FACT #92). Processes wanted a temperature *band*.
- **Failure modes are real chemistry:** a failed **lute** (clay joint seal) vents or bursts
  the vessel (#93); adding water to oil of vitriol explodes (#23); roasting cinnabar boils
  off **toxic mercury vapour** (#79); antimony the "wolf" devours base metal (#28).
- **Apparatus already inventoried:** alembic + cucurbit distillation (#60), aludel for
  sublimation (#11), bain-marie gentle bath (#63), cohobation / circulation loops (#61, #64),
  cupellation assay (#68), retort for corrosive acids (#62), **Bellows** is already a named
  reserve tile in `../docs/DESIGN.md`.

**Design constraint inherited:** consequences are unskippable; the danger is the point;
flavor teaches real chemistry. **New tension to resolve:** literal fantasy *gnomes* vs.
the "no magic / real early-modern lab" rule (see Question B).

---

## 2. Core loop (the shared skeleton, whichever genre we pick)

1. **Furnaces** each carry a temperature that **decays over time**.
2. **Apparatus** sits on a furnace and runs a **process** (distill, sublime, digest,
   cupellate) that only advances while temp is inside its **target band** [min..max].
3. **Gnomes** are the only heat source: a gnome on a bellows **pumps temperature up**
   (jump-jump-jump). There are **fewer gnomes than bellows** — that scarcity is the puzzle.
4. **Drift out of band → escalating trouble:**
   - *Too cold*: process stalls, then spoils (wasted batch).
   - *Too hot*: boil-over / lute failure → **cascade**: spill fouls the neighbouring
     station, cracked glass leaks toxic fumes that **knock a gnome out** (removing a worker
     mid-crisis), fire spreads to the next furnace… a Rube-Goldberg chain.
5. **Goal:** complete the day's/level's commissioned processes (a Great Work, a batch of
   medicines, a gilding job) before the timer/round ends, without the lab detonating.

The signature feel: **plate-spinning under a leaky roof** — you can never keep every
furnace hot, so you triage, and the comedy is the scramble + the chain-reaction failures.

---

## 3. THE PIVOTAL FORK — what kind of game is it? (Question A)

### Option A1 — Real-time juggle (Overcooked / plate-spinning)
Drag/assign gnomes between bellows live; temps decay in real time; you physically scramble.
- **Pro:** maximum comedy, immediate readability, "zany" is native to the format.
- **Con:** hardest to make *fair* and deterministic; twitch skill can wall out players;
  animation-heavy.

### Option A2 — Tick / turn-based logic puzzle (Zachtronics / "set the plan, watch it run")
You *program* gnome routes & bellows priorities, press **Run**, and watch the tick sim play
out; iterate. Rube Goldberg becomes a *deterministic contraption* you're debugging.
- **Pro:** pure puzzle, cleanly deterministic (reuses the repo's seeded-engine pattern),
  accessible, deep. Reuses `(state, action) -> state` reducer discipline.
- **Con:** less frantic/"jumping up and down" energy; comedy is in the replay, not the moment.

### Option A3 — Pausable real-time / auto-with-overrides (tower-defense-y, "active pause")
Real-time by default, but **space bar pauses** to reassign gnomes; optional auto-rules.
- **Pro:** best of both — frantic when you let it run, fair because you can always pause &
  think. Scales difficulty by how much you rely on pausing.
- **Con:** two control modes to build & balance.

> Recommendation to discuss: **A3** as the target, **A2's deterministic tick engine as the
> core** (so real-time is just "auto-advancing ticks"). That reuses the repo's engine
> philosophy and keeps everything replayable/testable.

---

## 4. Other forks to settle

### Question B — Tone & the gnome problem (realism dial)
- **B1 Literal fantasy gnomes** (pointy hats, cartoon) — max charm, breaks the "no magic" rule.
- **B2 "Puffers" = comic human apprentices/journeymen** — grimy, soot-faced, over-eager;
  keeps hard realism, the *gnome* is affectionate slang. Ties directly to the Bruegel joke.
- **B3 Stylised homunculi / lab-sprite conceit** — a period *idea* (the homunculus) played
  for laughs; realism-adjacent but winks at the occult. (Note: repo rule bans occult;
  would be a deliberate exception for this sibling.)

### Question C — Relationship to *The Alchemist's Lab*
- **C1 Standalone** game in `puffers/`, own stack, only shares research docs.
- **C2 Monorepo sibling** sharing flavor data, apparatus definitions, and UI kit.
- **C3 A "furnace-tending" mini-game/mode** embedded inside the existing game.

### Question D — First deliverable / how far to go now
- **D1 Plan only** (this doc) + a paper spec of one hand-designed level.
- **D2 Playable toy**: 1 screen, 2 gnomes / 3 furnaces / 1 alembic, temps decaying, one
  cascade — the "is it fun?" test, ~a few hundred lines.
- **D3 Vertical slice**: 3–5 levels, 3 apparatus types, the cascade system, win/lose,
  seeded determinism + tests, in the Next.js stack.

### Question E — Tech shape (can default once A & C are picked)
- Reuse **Next.js 16 + React 19 + seeded mulberry32 + pure `src/lib/game` engine** (matches
  root project & CLAUDE.md conventions).
- Rendering: **DOM/SVG** (simple, accessible, fast to build) vs **Canvas** (smoother
  animation, needed if A1 real-time gets busy). Suggest DOM/SVG for the first toy.

---

## 5. Signature systems to design once the forks are set

- **Temperature model:** decay curve, bellows pump power, thermal mass per furnace, the
  band width per process (athanor = wide/forgiving, retort of aqua fortis = narrow/deadly).
- **The Cascade deck:** boil-over → spill → crack → fume → fire, each a real hazard (#23,
  #79, #28), each with a *shown-before-it-lands* prevention (quench trough, salt-of-tartar
  bath, luting clay) — inheriting the root game's "prevention cost shown up front" UX law.
- **Gnome scarcity puzzle:** assignment/scheduling; fatigue (a gnome can't pump forever);
  fumes knocking gnomes out mid-level as the escalation mechanic.
- **Levels / progression:** hand-authored "contraptions" of increasing furnace count &
  band tightness; a daily seeded challenge (mirrors root's `/api/daily`).

---

## 6. Open questions parked for later
- Scoring: pure pass/fail, or VP for yield & speed & safety (mirror root's VP)?
- Co-op / multiple hands on the lab?
- Named-materials economy shared with root's Slice-2 reserve?
