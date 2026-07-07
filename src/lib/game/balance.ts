// Mathematical balance model for The Alchemist's Lab.
// Derivation in docs/BALANCE_MODEL.md. Everything here recomputes from data.ts,
// so retuning the data automatically retunes the model.
//
// Unit: the worker-round (WR) — one placement of one able worker.
// We solve for shadow prices (VP-equivalents) of resources such that every
// repeatable production line pays the same baseline wage r (VP per WR):
//
//   Workbench:      r = 3·vI
//   Alembic:        r = 2·vM + vG
//   Potion→Advanced chain (2 WR, 2🌿+2⛏️ → 2 VP):  r = 1 − vI − vM
//   Medicine craft: r = vMed − vI − vG   (vMed measured from disaster economy)
//
// Solving:  vI = r/3,  vM = 1 − 4r/3,  vG = 11r/3 − 2,  r = (vMed + 2)/5.

import { DISASTERS } from "./data";
import type { DisasterCard, Resources } from "./types";

export interface ShadowPrices {
  wage: number; // r — baseline VP per worker-round
  ingredients: number;
  metals: number;
  gold: number;
  medicine: number; // input, from disaster economy
  potions: number; // fixed: 1 VP
  advancedPotions: number; // fixed: 2 VP
}

/**
 * vMed: marginal value of holding one medicine. Dominated by the critical-state
 * clause (unhealed critical = death = −1 VP plus lost future worker-rounds).
 * Healing a critical worker mid-game saves ≈ 1 VP + ~2 effective WR ≈ 1 + 2r;
 * weighted by how often medicine actually intercepts criticals (~1/3 of stock),
 * a serviceable estimate is vMed ≈ 1.5. Passed in so simulations can refine it.
 */
export function solveShadowPrices(vMed = 1.5): ShadowPrices {
  const wage = (vMed + 2) / 5;
  return {
    wage,
    ingredients: wage / 3,
    metals: 1 - (4 * wage) / 3,
    gold: (11 * wage) / 3 - 2,
    medicine: vMed,
    potions: 1,
    advancedPotions: 2,
  };
}

export function costInVp(cost: Partial<Resources>, p: ShadowPrices): number {
  const map: Record<keyof Resources, number> = {
    ingredients: p.ingredients,
    metals: p.metals,
    gold: p.gold,
    medicine: p.medicine,
    potions: p.potions,
    advancedPotions: p.advancedPotions,
  };
  return (Object.entries(cost) as [keyof Resources, number][]).reduce(
    (sum, [k, v]) => sum + map[k] * v,
    0,
  );
}

/**
 * Expected VP loss if a disaster resolves unprevented, in shadow-price terms.
 * Health-state damage is priced as lost worker-rounds (wage r each) plus the
 * healing resources needed to recover:
 *   sickened ≈ 0.5·r + 1 medicine-step share; injured ≈ 1.5·r + 1 med;
 *   critical ≈ death-risk weighted: 0.5·(1 + remaining·r) + 1 med.
 */
export function expectedLoss(card: DisasterCard, p: ShadowPrices): number {
  const sick = 0.5 * p.wage + 0.5 * p.medicine;
  const injure = 1.5 * p.wage + p.medicine;
  const critical = 0.5 * (1 + 2 * p.wage) + p.medicine;
  switch (card.id) {
    case "sulphurFire": return sick;
    case "sodiumHydroxideSplash": return injure;
    case "leadContamination": return 2 * p.ingredients;
    case "equipmentFailure": return p.wage; // one workbench round lost
    case "hydrochloricSpill": return injure + p.ingredients;
    case "mercuryVapor": return 2 * sick;
    case "chlorineGas": return 2 * sick; // one step each, both workers
    case "arsenicExposure": return sick + p.potions;
    case "crucibleExplosion": return critical + p.wage;
    case "nitricBurn": return critical;
    case "dimethylmercury": return critical;
    case "fumeBackflow": return 2 * sick;
    default: return 0;
  }
}

export interface PreventionAnalysis {
  id: string;
  name: string;
  severity: string;
  preventionCost: number; // VP-eq
  expectedLoss: number; // VP-eq
  ratio: number; // cost / loss — the "decision tension" (healthy range ~0.4–0.9)
}

/** The core balance table: is prevention a real decision on every card? */
export function analyzePreventions(vMed = 1.5): PreventionAnalysis[] {
  const p = solveShadowPrices(vMed);
  return DISASTERS.map((card) => {
    const cost = costInVp(card.preventionCost, p);
    const loss = expectedLoss(card, p);
    return {
      id: card.id,
      name: card.name,
      severity: card.severity,
      preventionCost: cost,
      expectedLoss: loss,
      ratio: loss > 0 ? cost / loss : Infinity,
    };
  });
}

/**
 * Grand Experiment EV in shadow prices: stake vs 50/50 payoff.
 * Evaluated at rounds 9-10, where a critical worker forfeits little future labor
 * (~1 WR) and a rational gambler holds Medicine in reserve — so the failure cost
 * is min(heal with medicine, accept the death). The model's strategic corollary:
 * never attempt the Grand Experiment without Medicine stocked.
 */
export function grandExperimentEv(vMed = 1.5): number {
  const p = solveShadowPrices(vMed);
  const stake = p.potions + 2 * p.metals + p.gold;
  const win = 5; // +4 VP + illumination
  const lateCritical = Math.min(p.medicine, 1 + p.wage);
  return 0.5 * win - 0.5 * lateCritical - stake;
}

// ── Strategy parity (empty-board build order) ─────────────
//
// "All strategies approximately equally good" is a MEASURABLE claim, not a hope.
// We encode four archetypal build orders as deterministic policies, run each over
// many seeds, and require their score distributions to overlap tightly. If one
// archetype's median pulls ahead, the build costs in data.ts are mispriced — the
// parity spread is the objective function to minimize when tuning.

import { BASE_BUILDABLE, BUILD_COST, COMMISSION_BY_ID, WIN_VP } from "./data";
import { canWork, newGame, reduce } from "./engine";
import type { FurnitureId, GameState } from "./types";

export type Archetype = "production" | "distillation" | "research" | "safety" | "patronage";

// Priority build orders. Every viable engine needs the workbench→alembic→crucible
// core (ingredients + metal + conversion); archetypes differ in WHEN they slot the
// remaining tiles (research VP, fume-hood safety, or the cupellation furnace second
// scoring path) and their operating emphasis.
const BUILD_ORDER: Record<Archetype, FurnitureId[]> = {
  production: ["workbench", "crucible", "alembic", "researchDesk", "fumeHood"],
  distillation: ["alembic", "crucible", "workbench", "researchDesk", "fumeHood"],
  research: ["workbench", "researchDesk", "alembic", "crucible", "fumeHood"],
  safety: ["workbench", "crucible", "fumeHood", "alembic", "researchDesk"],
  patronage: ["alembic", "workbench", "patronsCabinet", "crucible", "researchDesk"],
};

const BUILD_CAP: Record<Archetype, number> = {
  production: 4,
  distillation: 4,
  research: 4,
  safety: 5, // the hedge builds out fully — the Furnace Hood's survival edge affords it
  patronage: 5, // full build-out: the cabinet's commission VP supplements potion/research VP
};

function commissionAffordable(s: GameState): boolean {
  const c = s.commissionDeck.length ? COMMISSION_BY_ID.get(s.commissionDeck[0]) : undefined;
  if (!c) return false;
  return (Object.entries(c.cost) as [keyof typeof s.resources, number][]).every(([k, v]) => s.resources[k] >= v);
}

function canBuild(s: GameState, tile: FurnitureId): boolean {
  if (!BASE_BUILDABLE.includes(tile) || s.furniture.includes(tile)) return false;
  return (Object.entries(BUILD_COST[tile]) as [keyof typeof s.resources, number][]).every(
    ([k, v]) => s.resources[k] >= v,
  );
}

/** Play one game to completion under an archetype policy; return final VP. */
export function simulateArchetype(seed: number, arch: Archetype): number {
  let s = newGame(seed);
  const order = BUILD_ORDER[arch];
  const cap = BUILD_CAP[arch];
  let guard = 0;
  while (s.phase !== "gameOver" && guard++ < 60) {
    // Late-game grand experiment when a spare potion allows it.
    if (s.round >= 9 && !s.grandAttempted) {
      const gw = s.workers.find((w) => w.health === "healthy" && w.placedOn === null && !w.exhausted);
      if (gw && s.resources.potions >= 1 && s.resources.metals >= 2 && s.resources.gold >= 1) {
        s = reduce(s, { type: "attemptGrandExperiment", workerId: gw.id });
      }
    }
    // Each free worker: build the next tile in the order if affordable, else operate.
    let acted = true;
    while (acted) {
      acted = false;
      const w = s.workers.find((x) => canWork(x) && x.placedOn === null);
      if (!w) break;
      const nextBuild = order.find((t) => canBuild(s, t));
      if (nextBuild && s.furniture.length < cap) {
        s = reduce(s, { type: "buildTile", workerId: w.id, tileId: nextBuild });
        acted = true;
        continue;
      }
      // Operate. A competent player keeps the crucible fed rather than hoarding one
      // input, and fills idle worker-rounds with research, then the scarcer input.
      const R = s.resources;
      const free = (t: FurnitureId) =>
        s.furniture.includes(t) && !s.brokenFurniture[t] && !s.workers.some((x) => x.placedOn === t);
      const crucibleFree = free("crucible");
      if (crucibleFree && R.potions >= 1 && R.metals >= 1) {
        s = reduce(s, { type: "placeWorker", workerId: w.id, tileId: "crucible", recipe: "advancedPotion" }); acted = true; continue;
      }
      if (crucibleFree && R.ingredients >= 2 && R.metals >= 1) {
        s = reduce(s, { type: "placeWorker", workerId: w.id, tileId: "crucible", recipe: "potion" }); acted = true; continue;
      }
      if (crucibleFree && R.medicine <= 1 && R.ingredients >= 1 && R.gold >= 1) {
        s = reduce(s, { type: "placeWorker", workerId: w.id, tileId: "crucible", recipe: "medicine" }); acted = true; continue;
      }
      // The Patron's Cabinet is a second VP engine — fulfill a commission when it's paid for.
      if (free("patronsCabinet") && commissionAffordable(s)) {
        s = reduce(s, { type: "placeWorker", workerId: w.id, tileId: "patronsCabinet" }); acted = true; continue;
      }
      // Research is a strong idle-round sink (VP + economy), until the track caps.
      if (free("researchDesk") && s.upgrades.length < 3 && R.ingredients >= 1) {
        s = reduce(s, { type: "placeWorker", workerId: w.id, tileId: "researchDesk" }); acted = true; continue;
      }
      // Otherwise produce whichever crucible input is scarcer.
      const wantMetal = R.metals < 2;
      const inputOrder: FurnitureId[] = wantMetal
        ? ["alembic", "workbench"]
        : ["workbench", "alembic"];
      let did = false;
      for (const t of inputOrder) {
        if (free(t)) { s = reduce(s, { type: "placeWorker", workerId: w.id, tileId: t }); acted = true; did = true; break; }
      }
      if (!did && free("researchDesk")) { s = reduce(s, { type: "placeWorker", workerId: w.id, tileId: "researchDesk" }); acted = true; did = true; }
      if (!did && nextBuild) { s = reduce(s, { type: "buildTile", workerId: w.id, tileId: nextBuild }); acted = true; }
    }
    s = reduce(s, { type: "confirmPlacement" });
    if (s.phase === "disaster") s = reduce(s, { type: "resolveDisaster", prevent: s.pendingDisaster?.canPrevent ?? false });
    let healed = true;
    while (s.phase === "healing" && healed) {
      healed = false;
      for (const w of s.workers) {
        if (w.health === "critical" || w.health === "injured") {
          const n = reduce(s, { type: "healWorker", workerId: w.id });
          if (n !== s) { s = n; healed = true; break; }
        }
      }
    }
    if (s.phase === "healing") s = reduce(s, { type: "endHealing" });
  }
  return s.vp;
}

export interface ParityReport {
  perArchetype: Record<Archetype, { mean: number; median: number; winRate: number }>;
  spread: number; // max median − min median across archetypes (target: ≤ 1.5)
}

export function strategyParity(seeds = 60): ParityReport {
  const arches: Archetype[] = ["production", "distillation", "research", "safety", "patronage"];
  const per = {} as ParityReport["perArchetype"];
  const medians: number[] = [];
  for (const a of arches) {
    const vps: number[] = [];
    for (let seed = 1; seed <= seeds; seed++) vps.push(simulateArchetype(seed, a));
    vps.sort((x, y) => x - y);
    const median = vps[Math.floor(vps.length / 2)];
    per[a] = {
      mean: vps.reduce((s, v) => s + v, 0) / vps.length,
      median,
      winRate: vps.filter((v) => v >= WIN_VP).length / vps.length,
    };
    medians.push(median);
  }
  return { perArchetype: per, spread: Math.max(...medians) - Math.min(...medians) };
}
