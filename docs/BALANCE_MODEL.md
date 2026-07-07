# Balance Model — shadow prices and decision tension

Implementation: `src/lib/game/balance.ts` (recomputes from `data.ts`; numbers below are
the current tuning). Empirical check: the 40-seed bot gate in `engine.test.ts`.

## 1. Unit of account

The **worker-round (WR)**: one placement of one able worker. Gross budget 2×10 = 20 WR;
disasters tax it (sickened −productivity, injured/critical −whole rounds, death −all
remaining). All balance questions reduce to: *VP per WR, adjusted for risk*.

## 2. Shadow prices

Let every repeatable production line pay the same wage **r** (VP/WR) at equilibrium —
if one line pays more, it dominates and the placement choice dies. With vI, vM, vG, vMed
the VP-equivalent prices of Ingredients, Metals, Gold, Medicine:

| Line | Equation |
|---|---|
| Workbench (3🌿/WR) | r = 3·vI |
| Alembic (2⛏️+1🪙/WR) | r = 2·vM + vG |
| Potion→Advanced chain (2 WR, 2🌿+2⛏️ → 2 VP) | r = 1 − vI − vM |
| Medicine craft (1🌿+1🪙+WR → 1💊) | r = vMed − vI − vG |

Closed form: **vI = r/3, vM = 1 − 4r/3, vG = 11r/3 − 2, r = (vMed + 2)/5**.

With vMed ≈ 1.5 (medicine's value comes from intercepting the critical→death clause):
**r = 0.70, vI = 0.23, vM = 0.07, vG = 0.57**.

Diagnostics this immediately yields:
- **Research is an opening, not an engine**: 1🌿 + WR → 1 VP pays 0.77 VP/WR > r, but
  the track caps at 3 — correctly a strong early move that self-exhausts.
- **Advanced dominates fresh potions at the crucible when a potion is in stock**
  (saves 2🌿 for the same VP) — intended progression chain, not a bug.
- **Metal is nearly free (vM ≈ 0.07)** — the alembic is really a gold engine. Tuning
  lever if metals feel irrelevant: lower alembic to 1⛏️+1🪙 and cheapen metal costs.

## 3. Disaster decision tension

Prevent iff prevention cost < expected loss (both in VP-eq). The design target is
**ratio = cost/loss in ~0.4–0.9**: prevention usually right but never automatic, and
skipping is a real gamble, not a blunder. `analyzePreventions()` computes the table;
health-state damage is priced as lost WRs + healing resources (sickened ≈ 0.5r + ½·vMed,
injured ≈ 1.5r + vMed, critical ≈ 0.5·(1 + 2r) + vMed via the 50% death clause).
Cards outside the band are the retuning worklist — adjust their `preventionCost`.

## 4. Risk-return frontier

Strategies must not be mean-dominated: higher variance must buy higher expected VP.
- **Grand Experiment**: `grandExperimentEv()` — stake (1🧪+2⛏️+1🪙 ≈ 1.7 VP-eq) vs
  0.5·(+5) − 0.5·(critical ≈ 1.2+vMed·share). EV mildly positive (~+0.4) with huge
  variance: correct for a climax gamble.
- **Safety spending** (medicine stock, prevention, safety research) trades mean for
  variance reduction — it must cost a little EV, or turtling dominates.

## 5. Empirical gate

The vitest balance gate runs a fixed-policy bot over 40 seeds and requires
0 < wins < 40 at 12 VP (currently ~6%). When retuning `data.ts`: re-run
`npm test`, re-derive §2 (automatic via `solveShadowPrices`), and check no
prevention ratio leaves the band. Never weaken the gate to make tuning pass.

## 6. Strategy parity (empty-board build orders)

The board starts **empty**; the opening is a gold-allocation puzzle across **six**
buildable tiles. "All strategies approximately equally good" is enforced empirically by
`strategyParity()`: five archetypal build orders each play many seeded games under a
competent build-and-operate policy, and we require their score distributions to overlap.
Current tuning (60 seeds, WIN_VP 9):

| Archetype | median VP | win rate | identity |
|---|---|---|---|
| production | 9 | ~52% | workbench→crucible engine, advanced potions |
| distillation | 9 | ~52% | alembic-led, metal/gold into potions |
| research | 9 | ~52% | reading-desk VP + economic upgrades |
| safety | 7 | ~18% | early Furnace Hood; a survival hedge |
| patronage | 7 | ~23% | Patron's Cabinet; second scoring path (commissions) |

**Median spread = 2 VP.** The three *economic* openings are statistically
indistinguishable. Safety and patronage are deliberate **specialist** lines: each spends
a build slot on its signature tile (Furnace Hood / Patron's Cabinet) instead of pure
economy, trading ~2 VP of tempo for a distinct identity — survival variance-reduction, or
a crucible-independent VP engine. That is the mean-for-variance / diversification trade §4
predicts, not an imbalance. The parity spread is the objective function to minimize when
retuning `BUILD_COST` / `STARTING_RESOURCES` / `COMMISSIONS`: if any order's median pulls
>3 VP ahead, it's mispriced. The gate lives in `engine.test.ts` ("no build order dominates").

**Second scoring path (relieving the crucible bottleneck).** Potion play alone caps near
the win line because one crucible generates ≤1 VP/round. The Patron's Cabinet adds a
parallel faucet: fulfill a court **Commission** (a gold-heavy material bundle) for VP.
Commissions are priced at ~1.2–1.5 VP-eq of materials per 2–3 VP so the cabinet pays ≈ the
baseline wage r and never dominates — the alembic's gold becomes VP without routing through
the crucible, giving distillation/patronage lines their own outlet.

Key tuning history (what the harness caught): removing the pre-built board first
over-nerfed every line to a loss; the fix was raising starting capital and cutting build
costs. Then safety-first *dominated* (6 vs 2) because skipping the Fume Hood was fatal —
resolved not by nerfing safety but by giving the bot competent operate logic (feed the
crucible, don't hoard one input), which lifted the economic lines to parity.

## 7. Next: personality asymmetry (hook)

Worker personas are drawn from the **AlchemyTimelineMap** database (all
`SCHOLARSHIP_BASED` figures: Zosimos, Jabir, al-Razi, al-Kindi, Gerard of Cremona,
Roger Bacon, Paracelsus, Tycho Brahe, Michael Maier — no legendary/fictional figures
such as Flamel). Two are drawn per game, each with **one passive ability grounded in
their documented contribution**:

| Persona | Ability | Effect | Historical basis |
|---|---|---|---|
| Zosimos | Sublimation | Alembic also +1 Ingredient | earliest systematic operations, incl. sublimation |
| Jabir | The Corpus | research needs no Ingredient | the vast Jabirian corpus |
| al-Razi | Systematic Distillation | Alembic +1 Metal | classified apparatus & processes |
| al-Kindi | Distiller of Essences | Alembic +1 Gold | his treatise on distilling perfumes |
| Gerard | Toledo Translations | research also +1 Gold | Arabic→Latin transmission |
| Roger Bacon | Experimental Method | Potion costs 1 fewer Ingredient | championing of experiment |
| Paracelsus | Iatrochemistry | Medicine brews yield 2 | father of medical chemistry |
| Tycho | Medicamenta Tria | start +2 Medicine (one-time) | his three plague-medicines |
| Maier | Imperial Patronage | start +3 Gold (one-time) | physician to Rudolf II |

**Parity is preserved by construction**: `newGame(seed)` draws the same two personas
for every build-order archetype, so abilities affect all four equally per seed — they
add per-game texture without biasing the strategy comparison. Measured impact (60 seeds,
after adding abilities): the three economic lines stayed dead-even (median 9, ~53% win),
safety held its hedge identity (median 7, ~30%), **spread 2 VP**. Abilities did raise the
overall economy, so `WIN_VP` moved 8 → 9 to keep competent play at a ~50% challenge.
When adding or retuning abilities, keep each near ≤ 0.15·r per WR of EV, and re-run
`strategyParity()` — the median spread must stay ≤ 3.
