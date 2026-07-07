// Pure rules engine for The Alchemist's Lab solo mode.
// No DOM, no React, no side effects: (state, action) -> state.
// The RNG state lives inside GameState so every game is a deterministic replay of its seed.

import {
  ACID_DISASTERS,
  BASE_BUILDABLE,
  BUILD_COST,
  FURNITURE_BY_ID,
  DISASTER_BY_ID,
  DISASTERS,
  GRAND_TRANSMUTATION_ROUND,
  MAX_ROUNDS,
  RECIPES,
  STARTING_RESOURCES,
  RESEARCH_TRACK,
  WIN_VP,
  WORKER_ROSTER,
} from "./data";
import type {
  DisasterCard,
  FurnitureId,
  GameAction,
  GameState,
  LogEntry,
  Resources,
  Worker,
  WorkerHealth,
} from "./types";

// ── RNG (mulberry32) ──────────────────────────────────────

function nextRand(state: GameState): number {
  let t = (state.rngState += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffled<T>(state: GameState, items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand(state) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Helpers ───────────────────────────────────────────────

const HEALTH_ORDER: WorkerHealth[] = ["healthy", "sickened", "injured", "critical", "dead"];

function worsen(health: WorkerHealth, to?: WorkerHealth): WorkerHealth {
  if (health === "dead") return "dead";
  if (to) {
    // Direct-to-state effects never improve a worker.
    return HEALTH_ORDER.indexOf(to) > HEALTH_ORDER.indexOf(health) ? to : health;
  }
  const idx = HEALTH_ORDER.indexOf(health);
  // One-step worsening caps at critical; only upkeep kills.
  return HEALTH_ORDER[Math.min(idx + 1, HEALTH_ORDER.indexOf("critical"))];
}

function improve(health: WorkerHealth): WorkerHealth {
  if (health === "dead" || health === "healthy") return health;
  return HEALTH_ORDER[HEALTH_ORDER.indexOf(health) - 1];
}

export function canWork(w: Worker): boolean {
  return (w.health === "healthy" || w.health === "sickened") && !w.exhausted;
}

export function canAfford(resources: Resources, cost: Partial<Resources>): boolean {
  return (Object.entries(cost) as [keyof Resources, number][]).every(
    ([k, v]) => resources[k] >= v,
  );
}

function pay(resources: Resources, cost: Partial<Resources>): Resources {
  const next = { ...resources };
  for (const [k, v] of Object.entries(cost) as [keyof Resources, number][]) {
    next[k] -= v;
  }
  return next;
}

function log(state: GameState, entry: Omit<LogEntry, "round">): void {
  state.log.push({ round: state.round, ...entry });
}

function tileBroken(state: GameState, id: FurnitureId): boolean {
  return state.brokenFurniture[id] !== undefined;
}

export function computeVp(state: GameState): number {
  const dead = state.workers.filter((w) => w.health === "dead").length;
  const illuminated = state.workers.filter((w) => w.illuminated).length;
  return (
    state.resources.potions +
    state.resources.advancedPotions * 2 +
    state.upgrades.length +
    (state.grandSucceeded ? 4 : 0) +
    illuminated -
    dead
  );
}

// ── Setup ─────────────────────────────────────────────────

export function newGame(seed: number = Math.floor(Math.random() * 2 ** 31)): GameState {
  const state: GameState = {
    seed,
    rngState: seed,
    round: 1,
    phase: "placement",
    workers: [],
    resources: { ...STARTING_RESOURCES },
    furniture: [], // empty board — every tile must be built
    brokenFurniture: {},
    crucibleRecipe: null,
    upgrades: [],
    disasterDeck: [],
    pendingDisaster: null,
    fumeHoodUsedThisRound: false,
    safetyShowerUsedThisRound: false,
    neutralizationUsed: false,
    grandAttempted: false,
    grandSucceeded: false,
    vp: 0,
    log: [],
    outcome: null,
    outcomeText: "",
  };
  // Two documented alchemists drawn per game from the AlchemyTimelineMap roster.
  const roster = shuffled(state, WORKER_ROSTER);
  state.workers = [
    { id: "w1", name: roster[0].name, health: "healthy", illuminated: false, placedOn: null, exhausted: false },
    { id: "w2", name: roster[1].name, health: "healthy", illuminated: false, placedOn: null, exhausted: false },
  ];
  // Escalation ladder: rounds 1-4 minor, 5-8 major, 9-10 catastrophic.
  const minor = shuffled(state, DISASTERS.filter((d) => d.severity === "minor").map((d) => d.id));
  const major = shuffled(state, DISASTERS.filter((d) => d.severity === "major").map((d) => d.id));
  const cata = shuffled(state, DISASTERS.filter((d) => d.severity === "catastrophic").map((d) => d.id));
  state.disasterDeck = [...minor, ...major, ...cata.slice(0, MAX_ROUNDS - minor.length - major.length)];
  log(state, {
    phase: "setup",
    tone: "neutral",
    text: `The lab is swept, the furnace lit. Chymistry is a craft of the hands: ten rounds to prove the work, reach ${WIN_VP} VP — and keep your alchemists alive.`,
  });
  return state;
}

// ── Production ────────────────────────────────────────────

// Gather before refining, refine before brewing, research last.
const PRODUCTION_ORDER: FurnitureId[] = ["workbench", "alembic", "crucible", "researchDesk"];

function runProduction(state: GameState): void {
  for (const tileId of PRODUCTION_ORDER) {
    const worker = state.workers.find((w) => w.placedOn === tileId);
    if (!worker) continue;
    const sick = worker.health === "sickened";
    switch (tileId) {
      case "workbench": {
        const amount = sick ? 2 : 3;
        state.resources.ingredients += amount;
        log(state, { phase: "production", tone: "good", text: `${worker.name} gathers ${amount} Ingredient${amount > 1 ? "s" : ""} at the Workbench.` });
        break;
      }
      case "alembic": {
        const metals = (sick ? 1 : 2) + (state.upgrades.includes("advancedDistillation") ? 1 : 0);
        state.resources.metals += metals;
        const gold = sick ? 0 : 1;
        state.resources.gold += gold;
        log(state, {
          phase: "production",
          tone: "good",
          text: `${worker.name} distills at the Alembic: +${metals} Metal${metals > 1 ? "s" : ""}${gold ? ", +1 Gold" : " (too sick to work the sales)"}.`,
        });
        break;
      }
      case "crucible": {
        const recipe = RECIPES.find((r) => r.id === state.crucibleRecipe);
        if (!recipe) break;
        if (canAfford(state.resources, recipe.cost)) {
          state.resources = pay(state.resources, recipe.cost);
          state.resources[recipe.yields] += 1;
          log(state, { phase: "production", tone: "gold", text: `${worker.name} fires the Crucible: ${recipe.emoji} ${recipe.name} complete.` });
        } else {
          log(state, { phase: "production", tone: "bad", text: `${worker.name} lacks the materials for ${recipe.name}. The Crucible stays cold.` });
        }
        break;
      }
      case "researchDesk": {
        const next = RESEARCH_TRACK[state.upgrades.length];
        if (!next) {
          log(state, { phase: "production", tone: "neutral", text: `${worker.name} finds nothing new left to research.` });
        } else if (state.resources.ingredients >= 1) {
          state.resources.ingredients -= 1;
          state.upgrades.push(next.id);
          if (next.id === "safetyShower" || next.id === "neutralizationStation") {
            state.furniture.push(next.id);
          }
          log(state, { phase: "production", tone: "gold", text: `${worker.name} completes research: ${next.emoji} ${next.name} (+1 VP).` });
        } else {
          log(state, { phase: "production", tone: "bad", text: `${worker.name} has no Ingredient to spend on research.` });
        }
        break;
      }
    }
  }
}

// ── Disasters ─────────────────────────────────────────────

function pickVictim(state: GameState, preferWorking = true): Worker | null {
  const alive = state.workers.filter((w) => w.health !== "dead");
  if (alive.length === 0) return null;
  const working = alive.filter((w) => w.placedOn !== null);
  const pool = preferWorking && working.length > 0 ? working : alive;
  return pool[Math.floor(nextRand(state) * pool.length)];
}

function sicken(state: GameState, worker: Worker, ignoreFumeHood = false): void {
  if (
    !ignoreFumeHood &&
    !state.fumeHoodUsedThisRound &&
    state.furniture.includes("fumeHood") &&
    !tileBroken(state, "fumeHood")
  ) {
    state.fumeHoodUsedThisRound = true;
    log(state, { phase: "disaster", tone: "good", text: `The Fume Hood vents the fumes — ${worker.name} is unharmed.` });
    return;
  }
  worker.health = worsen(worker.health, "sickened");
  log(state, { phase: "disaster", tone: "bad", text: `${worker.name} is SICKENED.` });
}

function applyDisaster(state: GameState, card: DisasterCard): void {
  switch (card.id) {
    case "sulphurFire": {
      const v = pickVictim(state);
      if (v) sicken(state, v);
      break;
    }
    case "sodiumHydroxideSplash": {
      const v = pickVictim(state);
      if (v) {
        v.health = worsen(v.health, "injured");
        log(state, { phase: "disaster", tone: "bad", text: `${v.name} is INJURED by the caustic splash.` });
      }
      break;
    }
    case "leadContamination": {
      const lost = Math.min(2, state.resources.ingredients);
      state.resources.ingredients -= lost;
      log(state, { phase: "disaster", tone: "bad", text: `Contaminated stores: ${lost} Ingredient${lost === 1 ? "" : "s"} discarded.` });
      break;
    }
    case "equipmentFailure": {
      // Jam the most valuable operable production tile the player actually owns.
      const target = (["crucible", "alembic", "workbench", "researchDesk"] as FurnitureId[]).find(
        (t) => state.furniture.includes(t) && !tileBroken(state, t),
      );
      if (target) {
        state.brokenFurniture[target] = state.round;
        log(state, { phase: "disaster", tone: "bad", text: `The ${FURNITURE_BY_ID.get(target)!.name} jams — unusable next round.` });
      } else {
        log(state, { phase: "disaster", tone: "neutral", text: "The failure finds no apparatus to ruin — the board is still bare." });
      }
      break;
    }
    case "hydrochloricSpill": {
      const v = pickVictim(state);
      if (v) {
        v.health = worsen(v.health, "injured");
        log(state, { phase: "disaster", tone: "bad", text: `${v.name} is INJURED by the acid.` });
      }
      if (state.resources.ingredients > 0) {
        state.resources.ingredients -= 1;
        log(state, { phase: "disaster", tone: "bad", text: "1 Ingredient dissolves in the spill." });
      }
      break;
    }
    case "mercuryVapor": {
      for (const w of state.workers) {
        if (w.placedOn !== null && w.health !== "dead") sicken(state, w);
      }
      break;
    }
    case "chlorineGas": {
      for (const w of state.workers) {
        if (w.health === "dead") continue;
        w.health = worsen(w.health);
        log(state, { phase: "disaster", tone: "bad", text: `${w.name} worsens to ${w.health.toUpperCase()}.` });
      }
      break;
    }
    case "arsenicExposure": {
      const v = pickVictim(state);
      if (v) sicken(state, v);
      if (state.resources.potions > 0) {
        state.resources.potions -= 1;
        log(state, { phase: "disaster", tone: "bad", text: "A finished Potion is tainted and discarded." });
      }
      break;
    }
    case "crucibleExplosion": {
      const onCrucible = state.workers.find((w) => w.placedOn === "crucible" && w.health !== "dead");
      const v = onCrucible ?? pickVictim(state);
      if (v) {
        v.health = worsen(v.health, "critical");
        log(state, { phase: "disaster", tone: "bad", text: `${v.name} is CRITICAL — molten spray. Heal them this round or lose them.` });
      }
      if (state.furniture.includes("crucible")) {
        state.brokenFurniture.crucible = state.round;
        log(state, { phase: "disaster", tone: "bad", text: "The Crucible is wrecked — unusable next round." });
      }
      break;
    }
    case "nitricBurn": {
      const v = pickVictim(state);
      if (v) {
        v.health = worsen(v.health, "critical");
        log(state, { phase: "disaster", tone: "bad", text: `${v.name} is CRITICAL — aqua fortis burns. Heal them this round or lose them.` });
      }
      break;
    }
    case "dimethylmercury": {
      const v = pickVictim(state, false);
      if (v) {
        v.health = worsen(v.health, "critical");
        log(state, { phase: "disaster", tone: "bad", text: `${v.name} is CRITICAL — a drop through the glove. Heal them this round or lose them.` });
      }
      break;
    }
    case "fumeBackflow": {
      for (const w of state.workers) {
        if (w.placedOn !== null && w.health !== "dead") sicken(state, w, true);
      }
      break;
    }
  }
}

// ── Upkeep ────────────────────────────────────────────────

function runUpkeep(state: GameState): void {
  for (const w of state.workers) {
    if (w.health === "critical") {
      w.health = "dead";
      log(state, { phase: "upkeep", tone: "bad", text: `${w.name} succumbs to their wounds. (-1 VP)` });
    }
    w.placedOn = null;
    w.exhausted = false;
  }
  for (const [id, round] of Object.entries(state.brokenFurniture) as [FurnitureId, number][]) {
    if (round < state.round) delete state.brokenFurniture[id];
  }
  state.crucibleRecipe = null;
  state.fumeHoodUsedThisRound = false;
  state.safetyShowerUsedThisRound = false;
  state.vp = computeVp(state);

  const allDead = state.workers.every((w) => w.health === "dead");
  if (allDead) {
    state.phase = "gameOver";
    state.outcome = "lost";
    state.outcomeText = "Both alchemists are lost. The lab falls silent, the furnace burns out.";
    log(state, { phase: "upkeep", tone: "bad", text: state.outcomeText });
    return;
  }
  if (state.vp >= WIN_VP) {
    state.phase = "gameOver";
    state.outcome = "won";
    state.outcomeText = `The Work is proven at ${state.vp} VP. Word of your laboratory spreads through every court in Europe.`;
    log(state, { phase: "upkeep", tone: "gold", text: state.outcomeText });
    return;
  }
  if (state.round >= MAX_ROUNDS) {
    state.phase = "gameOver";
    state.outcome = "lost";
    state.outcomeText = `Ten rounds gone, ${state.vp} of ${WIN_VP} VP earned. The work remains unfinished — the patron withdraws.`;
    log(state, { phase: "upkeep", tone: "bad", text: state.outcomeText });
    return;
  }
  state.round += 1;
  state.phase = "placement";
  log(state, { phase: "placement", tone: "neutral", text: `— Round ${state.round} —` });
}

// ── Reducer ───────────────────────────────────────────────

function clone(state: GameState): GameState {
  // The log is append-only and its entries are never mutated, so we shallow-copy
  // the array instead of deep-cloning it — this keeps reduce() linear, not
  // quadratic, which matters for the thousands of games the balance sims run.
  const { log, ...rest } = state;
  const copy = structuredClone(rest) as GameState;
  copy.log = log.slice();
  return copy;
}

export function reduce(prev: GameState, action: GameAction): GameState {
  if (action.type === "newGame") return newGame(action.seed);
  if (prev.phase === "gameOver") return prev;
  const state = clone(prev);

  switch (action.type) {
    case "buildTile": {
      if (state.phase !== "placement") return prev;
      const worker = state.workers.find((w) => w.id === action.workerId);
      if (!worker || !canWork(worker) || worker.placedOn !== null) return prev;
      const tile = action.tileId;
      if (!BASE_BUILDABLE.includes(tile) || state.furniture.includes(tile)) return prev;
      const cost = BUILD_COST[tile];
      if (!canAfford(state.resources, cost)) return prev;
      state.resources = pay(state.resources, cost);
      state.furniture.push(tile);
      worker.exhausted = true; // building consumes the worker's action this round
      const t = FURNITURE_BY_ID.get(tile)!;
      log(state, { phase: "placement", tone: "good", text: `${worker.name} constructs the ${t.name} ${t.emoji}.` });
      return state;
    }

    case "placeWorker": {
      if (state.phase !== "placement") return prev;
      const worker = state.workers.find((w) => w.id === action.workerId);
      if (!worker || !canWork(worker)) return prev;
      const tile = action.tileId;
      if (!state.furniture.includes(tile) || tileBroken(state, tile)) return prev;
      if (tile === "fumeHood" || tile === "safetyShower" || tile === "neutralizationStation") return prev;
      if (state.workers.some((w) => w.id !== worker.id && w.placedOn === tile)) return prev;
      worker.placedOn = tile;
      if (tile === "crucible") state.crucibleRecipe = action.recipe ?? "potion";
      return state;
    }

    case "unplaceWorker": {
      if (state.phase !== "placement") return prev;
      const worker = state.workers.find((w) => w.id === action.workerId);
      if (!worker) return prev;
      if (worker.placedOn === "crucible") state.crucibleRecipe = null;
      worker.placedOn = null;
      return state;
    }

    case "attemptGrandExperiment": {
      if (state.phase !== "placement") return prev;
      if (state.round < GRAND_TRANSMUTATION_ROUND || state.grandAttempted) return prev;
      const worker = state.workers.find((w) => w.id === action.workerId);
      if (!worker || worker.health !== "healthy" || worker.placedOn !== null || worker.exhausted) return prev;
      const cost: Partial<Resources> = { potions: 1, metals: 2, gold: 1 };
      if (!canAfford(state.resources, cost)) return prev;
      state.resources = pay(state.resources, cost);
      state.grandAttempted = true;
      worker.exhausted = true;
      if (nextRand(state) < 0.5) {
        state.grandSucceeded = true;
        worker.illuminated = true;
        log(state, {
          phase: "placement",
          tone: "gold",
          text: `${worker.name} attempts the Chrysopoeia — and a silver Philosophers' Tree branches in the flask, just as Principe grew it again in the lab. A marvel, the talk of every court. (+4 VP, ${worker.name} is Illuminated: +1 VP)`,
        });
      } else {
        worker.health = worsen(worker.health, "critical");
        log(state, {
          phase: "placement",
          tone: "bad",
          text: `${worker.name} attempts the Chrysopoeia — the sealed vessel bursts in the fire. ${worker.name} is CRITICAL. Heal them this round or lose them.`,
        });
      }
      state.vp = computeVp(state);
      return state;
    }

    case "confirmPlacement": {
      if (state.phase !== "placement") return prev;
      runProduction(state);
      state.vp = computeVp(state);
      // Reveal this round's disaster.
      const cardId = state.disasterDeck[state.round - 1];
      const card = cardId ? DISASTER_BY_ID.get(cardId) : undefined;
      if (!card) {
        // Deck exhausted (defensive) — straight to healing.
        state.phase = "healing";
        return state;
      }
      log(state, { phase: "disaster", tone: "bad", text: `${card.emoji} Disaster: ${card.name} (${card.severity}).` });
      // Neutralization Station auto-cancels one acid disaster per game.
      if (
        ACID_DISASTERS.has(card.id) &&
        state.upgrades.includes("neutralizationStation") &&
        !state.neutralizationUsed
      ) {
        state.neutralizationUsed = true;
        log(state, { phase: "disaster", tone: "good", text: "The Neutralization Station absorbs the spill entirely. (once per game)" });
        state.phase = "healing";
        return state;
      }
      state.phase = "disaster";
      state.pendingDisaster = { card, canPrevent: canAfford(state.resources, card.preventionCost) };
      return state;
    }

    case "resolveDisaster": {
      if (state.phase !== "disaster" || !state.pendingDisaster) return prev;
      const { card, canPrevent } = state.pendingDisaster;
      if (action.prevent && canPrevent) {
        state.resources = pay(state.resources, card.preventionCost);
        log(state, { phase: "disaster", tone: "good", text: `Prevented: ${card.preventionText}` });
      } else {
        applyDisaster(state, card);
      }
      state.pendingDisaster = null;
      state.vp = computeVp(state);
      state.phase = "healing";
      return state;
    }

    case "healWorker": {
      if (state.phase !== "healing") return prev;
      const worker = state.workers.find((w) => w.id === action.workerId);
      if (!worker || worker.health === "dead" || worker.health === "healthy") return prev;
      const showerFree =
        state.upgrades.includes("safetyShower") && !state.safetyShowerUsedThisRound;
      if (showerFree) {
        state.safetyShowerUsedThisRound = true;
        worker.health = improve(worker.health);
        log(state, { phase: "healing", tone: "good", text: `The Safety Shower washes ${worker.name} clean — now ${worker.health.toUpperCase()}. (free)` });
      } else if (state.resources.medicine >= 1) {
        state.resources.medicine -= 1;
        worker.health = improve(worker.health);
        log(state, { phase: "healing", tone: "good", text: `💊 Medicine administered: ${worker.name} is now ${worker.health.toUpperCase()}.` });
      } else {
        return prev;
      }
      return state;
    }

    case "endHealing": {
      if (state.phase !== "healing") return prev;
      runUpkeep(state);
      return state;
    }
  }
  return prev;
}
