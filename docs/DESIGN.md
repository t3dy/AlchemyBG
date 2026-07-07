# The Alchemist's Lab — Design Bible

Distilled from Ted's megabase conversations (see `MEGABASE_SOURCES.md` for provenance).
The catalog entry of record is `C:\Dev\games\ideas.json` → `alchemists-lab-board-game`.

## Vision

A worker-placement engine-builder about early modern laboratory life as a tension
between knowledge production and bodily risk. Not "Agricola with potions" — a
**hazard-escalation engine builder where infrastructure and bodily vulnerability define
strategy**. Agricola's Harvest is replaced by Disaster: *Labor → Production →
Catastrophe → Recovery*.

Educational mission: the "new historiography of alchemy" — alchemy as proto-science and
artisanal practice (heat control, distillation, trial-and-error, real lab dangers),
taught through flavor and mechanics, never through quizzes that gate play.

**Founding pitch (Ted, Sep 2024):** build a lab, disasters keep happening; alchemist
tokens change color with ailments (fumes, burns, sickness); medicines produced in the
lab heal them; goldmaking means what was really possible (false gold, gilding).

## The solo ruleset (current slice — from the Feb 2026 spec)

- **10 rounds**, 2 alchemists. **Win at 12 VP; lose if both die.**
- Round loop: **Placement → Production → Disaster → Healing → Upkeep.**
- VP: 1/Potion, 2/Advanced Potion, 1/research upgrade, +4 Grand Experiment success,
  +1 Illuminated worker, −1 per dead worker.
- **Worker health ladder** (signature mechanic, color-coded): Healthy (green) →
  Sickened (yellow, −1 productivity) → Injured (red, cannot work) → Critical (black,
  heal this round or the worker dies permanently). "Illuminated" is a positive overlay
  from the Grand Experiment.
- **Resources:** Ingredients 🌿, Metals ⛏️, Gold 🪙, Medicine 💊, Potions 🧪, Advanced
  Potions ✨. Start: 4/2/2/1/0/0.
- **Recipes:** Potion = 2🌿+1⛏️ · Medicine = 1🌿+1🪙 · Advanced Potion = 1🧪+1⛏️.
  Medicine is "a parallel economy that converts risk into resilience" — the central
  tension is Productivity ↔ Safety Investment.
- **Starting tiles:** Crucible (brew), Alembic (2⛏️+1🪙), Workbench (3🌿),
  Research Desk (1🌿 → next upgrade), Fume Hood (passive: negates first sickening/round).
- **Research track (in order):** Safety Shower (free heal step/round) → Neutralization
  Station (cancel one acid disaster/game) → Advanced Distillation (Alembic +1⛏️).
- **Disaster deck:** 12 real-chemistry cards, drawn 1/round on an **escalation ladder**
  (rounds 1–4 minor, 5–8 major, 9–10 catastrophic). Every card states Trigger / Effect /
  **Prevention clause** — prevention cost always offered before the effect applies.
  Disasters are environmental, never opponent-targeted ("disasters targeting opponents
  feel mean").
- **Grand Experiment** (rounds 9–10, once): pay 1🧪+2⛏️+1🪙 and stake a healthy
  alchemist on a 50/50 — success = +4 VP and Illumination (+1 VP); failure = Critical.
  The climactic gamble the earlier design lacked.

### Balance notes (measured, 100-seed bot simulation, 2026-07-06)

Bot (research-early, potion-focused, always-prevent): min 6 / median 8 / p75 9 / max 13;
wins at 12 VP ≈ 6%. A human playing well should land ~30–50%. If economy numbers change,
re-run the balance gate in `engine.test.ts`.

## The full game beyond the slice (design reserve)

From the 2024 brainstorms — content pools to draw on, all realism-vetted:

- **Multiplayer shape:** 3–4 players, personal modular lab grids; Building phase
  (buy tile for gold from a 5-tile display) → Worker Placement → Event. Adjacency
  synergies and risks (fume hood protects neighbors; two stills adjacent = efficiency
  + explosion risk).
- **Event deck in three categories:** personal Disasters; global **Lab Crises with
  contribute-or-defect forks** (plague, ingredient shortage, apprentice revolt, guild
  auditors); positive events (celestial alignment, guild investment). Event outcomes
  can depend on where workers stand.
- **Secret goals** steering the coop/compete dial (Master of Metals, Healer of the
  Ailing, Gilded Glory, Savior of the Lab, ...10 designed).
- **8-ailment palette** (extended states): Toxic Exposure green, Chemical Burn red,
  Mental Exhaustion B&W, Fever yellow, Contaminated Hands brown, Soot Lung gray,
  Nerve Damage purple, Skin Irritation pink — each with a specific historical cure.
- **40 furniture tiles** (Ted's 20 safety/production tiles + 20 historically authentic:
  Retort, Bain-Marie, Aludel, Kiln, Bellows, Luting Clay, Apothecary's Scale...).
- **30 ingredients** in common/uncommon/rare tiers, each produced by a specific tile
  (Sulfur, Saltpeter, Cinnabar→Mercury, Aqua Fortis, Verdigris, Quicklime, Orpiment,
  **Lead-to-Gold "False Gold"**, Oil of Vitriol, Dragon's Blood resin...).
- **Named-materials economy** (tria prima + vitriol + gold: the catalog's 5 materials)
  as a richer replacement for generic Ingredients/Metals once the slice proves the loop.
- **Later-spec extensions:** Apprentices replace dead workers (inefficient), Scar/Trauma
  tokens, aging; mitigation caps (roles downgrade severity, never nullify); cascade caps.
- **Sibling macro-game** ("Masters of Magic: Renaissance Journeys"): traveling magicians
  (Bruno, Dee, Agrippa, Maier), patronage stat blocks (Rudolf II, Elizabeth I...),
  Inquisition threat meter. A different game, but its patron/court economy is the
  natural campaign layer above the lab.

## Open design questions (carried from playtest-form conversation)

1. Multiplayer win condition (8 candidates analyzed, none chosen).
2. Disaster punishment tuning — "fun to deal with but don't feel bad because they are
   too punishing" (the slice's answer: prevention clauses + escalation ladder).
3. History-vs-occult dial (current answer: hard realism).
4. Which equipment/material/crafting lists make the final cut.
