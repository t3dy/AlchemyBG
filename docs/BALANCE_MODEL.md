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

The board starts **empty**; the opening is a gold-allocation puzzle. "All strategies
approximately equally good" is enforced empirically by `strategyParity()`: four
archetypal build orders (production / distillation / research / safety) each play many
seeded games under a competent build-and-operate policy, and we require their score
distributions to overlap. Current tuning (60 seeds, WIN_VP 8):

| Archetype | median VP | win rate |
|---|---|---|
| production | 8 | ~57% |
| distillation | 8 | ~57% |
| research | 8 | ~57% |
| safety | 6 | ~38% |

**Median spread = 2 VP.** The three economic openings are statistically indistinguishable;
safety trades ~19 points of win rate for variance reduction (early Fume Hood → fewer
catastrophic losses), a deliberate risk/return identity rather than an imbalance — and
exactly the mean-for-variance trade §4 predicts a hedging line should pay. The parity
spread is the objective function to minimize when retuning `BUILD_COST` /
`STARTING_RESOURCES`: if one order's median pulls >3 VP ahead, its costs are mispriced.
The gate lives in `engine.test.ts` ("no build order dominates").

Key tuning history (what the harness caught): removing the pre-built board first
over-nerfed every line to a loss; the fix was raising starting capital and cutting build
costs. Then safety-first *dominated* (6 vs 2) because skipping the Fume Hood was fatal —
resolved not by nerfing safety but by giving the bot competent operate logic (feed the
crucible, don't hoard one input), which lifted the economic lines to parity.

## 7. Next: personality asymmetry (hook)

Worker personas are drawn from the **AlchemyTimelineMap** database (all
`SCHOLARSHIP_BASED` figures: Zosimos, Jabir, al-Razi, al-Kindi, Gerard of Cremona,
Roger Bacon, Paracelsus, Tycho Brahe, Michael Maier — no legendary/fictional figures
such as Flamel). They are mechanically identical today. When adding historically
grounded abilities (Tycho: +1 when brewing Medicine — medicamenta tria; al-Razi: +1⛏️
at the Alembic — systematic distillation; Zosimos: sublimation reroll), price each
ability with §2: an ability is balanced when it adds ≤ 0.15·r per WR of expected value,
and any stronger ability must carry a matching drawback. Re-run `strategyParity()` after
any such change — persona abilities must not widen the median spread past 3 VP.
