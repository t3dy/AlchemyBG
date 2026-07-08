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
  WORKER_ROSTER,
  COMMISSIONS,
  COMMISSION_BY_ID,
  PATRON_BY_ID,
  DEFAULT_PATRON,
  SUSPICION,
} from "./data";
import type {
  DisasterCard,
  FurnitureId,
  GameAction,
  GameState,
  LogEntry,
  PatronId,
  Resources,
  Worker,
  WorkerHealth,
} from "./types";

const RESOURCE_KEYS: (keyof Resources)[] = [
  "ingredients",
  "metals",
  "gold",
  "medicine",
  "potions",
  "advancedPotions",
];

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
    state.commissionsVp +
    (state.grandSucceeded ? 4 : 0) +
    illuminated -
    dead
  );
}

// ── Setup ─────────────────────────────────────────────────

export function newGame(
  seed: number = Math.floor(Math.random() * 2 ** 31),
  patron?: PatronId,
): GameState {
  const state: GameState = {
    seed,
    rngState: seed,
    round: 1,
    phase: patron ? "placement" : "patronSelect",
    workers: [],
    resources: { ...STARTING_RESOURCES },
    furniture: [], // empty board — every tile must be built
    brokenFurniture: {},
    crucibleRecipe: null,
    commissionDeck: [],
    commissionsVp: 0,
    upgrades: [],
    disasterDeck: [],
    pendingDisaster: null,
    fumeHoodUsedThisRound: false,
    safetyShowerUsedThisRound: false,
    neutralizationUsed: false,
    grandAttempted: false,
    grandSucceeded: false,
    vp: 0,
    patron: patron ?? DEFAULT_PATRON,
    standing: 0,
    suspicion: 0,
    seekingAudience: false,
    trialOutcome: null,
    log: [],
    outcome: null,
    outcomeText: "",
  };
  // Two documented alchemists drawn per game from the AlchemyTimelineMap roster.
  const roster = shuffled(state, WORKER_ROSTER);
  state.workers = roster.slice(0, 2).map((p, i) => ({
    id: `w${i + 1}`,
    name: p.name,
    persona: p.slug,
    ability: p.ability,
    health: "healthy" as const,
    illuminated: false,
    placedOn: null,
    exhausted: false,
  }));
  // One-time ability grants (medicamenta tria, imperial patronage).
  for (const w of state.workers) {
    if (w.ability === "medicamenta-tria") state.resources.medicine += 2;
    if (w.ability === "patronage") state.resources.gold += 3;
  }
  // Escalation ladder: rounds 1-4 minor, 5-8 major, 9-10 catastrophic.
  const minor = shuffled(state, DISASTERS.filter((d) => d.severity === "minor").map((d) => d.id));
  const major = shuffled(state, DISASTERS.filter((d) => d.severity === "major").map((d) => d.id));
  const cata = shuffled(state, DISASTERS.filter((d) => d.severity === "catastrophic").map((d) => d.id));
  state.disasterDeck = [...minor, ...major, ...cata.slice(0, MAX_ROUNDS - minor.length - major.length)];
  state.commissionDeck = shuffled(state, COMMISSIONS.map((c) => c.id));
  if (patron) applyPatronSetup(state, patron);
  return state;
}

/** Configure the chosen patron: contract terms, round-1 stipend, persona affinity. */
function applyPatronSetup(state: GameState, patronId: PatronId): void {
  state.patron = patronId;
  const p = PATRON_BY_ID.get(patronId)!;
  // Persona affinity: an alchemist tied to this court arrives with a foot in the door.
  if (p.affinityPersona && state.workers.some((w) => w.persona === p.affinityPersona)) {
    state.standing += 2;
  }
  log(state, {
    phase: "setup",
    tone: "neutral",
    text: `You take service with ${p.name} of ${p.court}. The contract: ${p.demand} Fail, or draw the court's suspicion, and face a trial.`,
  });
  grantStipend(state); // round-1 stipend
}

function grantStipend(state: GameState): void {
  const p = PATRON_BY_ID.get(state.patron)!;
  const gained = RESOURCE_KEYS.filter((k) => p.stipend[k]);
  for (const k of gained) state.resources[k] += p.stipend[k]!;
  if (gained.length) {
    const txt = gained.map((k) => `+${p.stipend[k]} ${k}`).join(", ");
    log(state, { phase: "upkeep", tone: "good", text: `${p.name}'s stipend arrives: ${txt}.` });
  }
}

function raiseSuspicion(state: GameState, amount: number, reason: string): void {
  if (amount <= 0) return;
  state.suspicion += amount;
  log(state, { phase: "disaster", tone: "bad", text: `Suspicion at court rises (+${amount}): ${reason}. [${state.suspicion}/${PATRON_BY_ID.get(state.patron)!.suspicionThreshold}]` });
}

// ── Production ────────────────────────────────────────────

// Grind, then distil, then fire, then assay by balance, then cupel and refine.
const PRODUCTION_ORDER: FurnitureId[] = ["workbench", "alembic", "crucible", "researchDesk", "patronsCabinet"];

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
        let metals = (sick ? 1 : 2) + (state.upgrades.includes("advancedDistillation") ? 1 : 0);
        let gold = sick ? 0 : 1;
        let bonusIngredients = 0;
        if (worker.ability === "systematic-still") metals += 1; // al-Razi
        if (worker.ability === "essences") gold += 1; // al-Kindi
        if (worker.ability === "sublimation") bonusIngredients = 1; // Zosimos
        state.resources.metals += metals;
        state.resources.gold += gold;
        state.resources.ingredients += bonusIngredients;
        const extras = [
          gold ? "+1 Gold" : "(too sick to work the sales)",
          bonusIngredients ? "+1 Ingredient (sublimation)" : "",
        ]
          .filter(Boolean)
          .join(", ");
        log(state, {
          phase: "production",
          tone: "good",
          text: `${worker.name} distills at the Alembic: +${metals} Metal${metals > 1 ? "s" : ""}${extras ? ", " + extras : ""}.`,
        });
        break;
      }
      case "crucible": {
        const recipe = RECIPES.find((r) => r.id === state.crucibleRecipe);
        if (!recipe) break;
        // Roger Bacon's experimental method: Potion costs 1 fewer Ingredient.
        const cost = { ...recipe.cost };
        if (worker.ability === "experiment" && recipe.id === "potion" && cost.ingredients) {
          cost.ingredients = Math.max(0, cost.ingredients - 1);
        }
        if (canAfford(state.resources, cost)) {
          state.resources = pay(state.resources, cost);
          // Paracelsus' iatrochemistry: Medicine brews yield 2.
          const yieldAmount = worker.ability === "iatrochemistry" && recipe.id === "medicine" ? 2 : 1;
          state.resources[recipe.yields] += yieldAmount;
          const note = yieldAmount > 1 ? ` ×${yieldAmount} (iatrochemistry)` : "";
          log(state, { phase: "production", tone: "gold", text: `${worker.name} fires the Crucible: ${recipe.emoji} ${recipe.name}${note} complete.` });
        } else {
          log(state, { phase: "production", tone: "bad", text: `${worker.name} lacks the materials for ${recipe.name}. The Crucible stays cold.` });
        }
        break;
      }
      case "researchDesk": {
        const next = RESEARCH_TRACK[state.upgrades.length];
        // Jabir's corpus: research needs no Ingredient.
        const freeResearch = worker.ability === "the-corpus";
        if (!next) {
          log(state, { phase: "production", tone: "neutral", text: `${worker.name} finds nothing new left to research.` });
        } else if (freeResearch || state.resources.ingredients >= 1) {
          if (!freeResearch) state.resources.ingredients -= 1;
          state.upgrades.push(next.id);
          if (next.id === "safetyShower" || next.id === "neutralizationStation") {
            state.furniture.push(next.id);
          }
          // Gerard's translations: research also yields +1 Gold.
          let goldNote = "";
          if (worker.ability === "translations") {
            state.resources.gold += 1;
            goldNote = ", +1 Gold";
          }
          const freeNote = freeResearch ? " (corpus: no Ingredient)" : "";
          log(state, { phase: "production", tone: "gold", text: `${worker.name} completes research: ${next.emoji} ${next.name} (+1 VP)${goldNote}${freeNote}.` });
        } else {
          log(state, { phase: "production", tone: "bad", text: `${worker.name} has no Ingredient to spend on research.` });
        }
        break;
      }
      case "patronsCabinet": {
        const assay = state.commissionDeck.length ? COMMISSION_BY_ID.get(state.commissionDeck[0]) : undefined;
        if (!assay) {
          log(state, { phase: "production", tone: "neutral", text: `${worker.name} finds no assay left to run at the Cupellation Furnace.` });
        } else if (canAfford(state.resources, assay.cost)) {
          state.resources = pay(state.resources, assay.cost);
          state.commissionsVp += assay.vp;
          state.commissionDeck.shift();
          log(state, { phase: "production", tone: "gold", text: `${worker.name} completes the assay — ${assay.name} (+${assay.vp} VP, proven fine metal).` });
        } else {
          log(state, { phase: "production", tone: "bad", text: `${worker.name} lacks the materials for the assay: ${assay.name}.` });
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

function goToTrial(state: GameState, reason: string): void {
  const p = PATRON_BY_ID.get(state.patron)!;
  state.phase = "gameOver";
  state.outcome = "lost";
  log(state, { phase: "upkeep", tone: "bad", text: `${reason} ${p.name} refers your case to the court.` });
  if (state.standing >= SUSPICION.exileStandingFloor) {
    state.trialOutcome = "exile";
    state.outcomeText = `The court of ${p.name} finds against you — but your standing spares your life. You are stripped of the work and banished, fleeing to a distant refuge with what you can carry.`;
  } else {
    state.trialOutcome = "execution";
    const end =
      state.patron === "friedrich"
        ? "You hang on Friedrich's gallows, an example to every adept who would defraud a prince."
        : "The Hofgericht condemns you as a fraud and a poisoner; you burn at the stake, as Anna Zieglerin did in 1575.";
    state.outcomeText = `The court of ${p.name} finds against you. ${end}`;
  }
  log(state, { phase: "upkeep", tone: "bad", text: state.outcomeText });
}

function runUpkeep(state: GameState): void {
  const p = PATRON_BY_ID.get(state.patron)!;
  for (const w of state.workers) {
    if (w.health === "critical") {
      w.health = "dead";
      log(state, { phase: "upkeep", tone: "bad", text: `${w.name} succumbs to their wounds. (-1 VP)` });
      // A death in the laboratory reads, at court, as poison.
      raiseSuspicion(state, SUSPICION.workerDeath, `a death in ${w.name === state.workers[0].name ? "the" : "your"} laboratory`);
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
  state.seekingAudience = false;
  state.vp = computeVp(state);

  // Losses first: both dead, or suspicion boils over into a trial.
  if (state.workers.every((w) => w.health === "dead")) {
    state.phase = "gameOver";
    state.outcome = "lost";
    state.outcomeText = "Both alchemists are lost. The lab falls silent, the furnace burns out.";
    log(state, { phase: "upkeep", tone: "bad", text: state.outcomeText });
    return;
  }
  // Win FIRST: delivering the contract satisfies the patron and earns your independence,
  // carrying you past the court's suspicion (the escape victory).
  if (state.vp >= p.quota) {
    state.phase = "gameOver";
    state.outcome = "won";
    state.outcomeText = `You deliver the Work — ${state.vp} of ${p.quota} — and ${p.name} makes good the contract: ${p.reward} You are free of any patron's changing humours.`;
    log(state, { phase: "upkeep", tone: "gold", text: state.outcomeText });
    return;
  }
  if (state.suspicion >= p.suspicionThreshold) {
    goToTrial(state, "The court's suspicion has boiled over.");
    return;
  }
  // Deadline: the contract lapses, and reneging on a prince is prosecutable.
  if (state.round >= p.deadline) {
    goToTrial(state, `The deadline has passed with only ${state.vp} of ${p.quota} Work delivered.`);
    return;
  }
  // Advance: stipend, then the rival network's periodic denunciation.
  state.round += 1;
  log(state, { phase: "placement", tone: "neutral", text: `— Round ${state.round} —` });
  grantStipend(state);
  if (state.round % p.denunciationEvery === 0) {
    raiseSuspicion(state, p.denunciationAmount, `${p.court}'s rival network denounces you`);
  }
  state.phase = "placement";
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
  if (action.type === "newGame") return newGame(action.seed, action.patron);
  if (prev.phase === "gameOver") return prev;

  // Patron selection: the only legal move before the work begins.
  if (prev.phase === "patronSelect") {
    if (action.type !== "choosePatron") return prev;
    const state = clone(prev);
    applyPatronSetup(state, action.patron);
    state.phase = "placement";
    return state;
  }

  const state = clone(prev);

  switch (action.type) {
    case "seekAudience": {
      if (state.phase !== "placement") return prev;
      const worker = state.workers.find((w) => w.id === action.workerId);
      if (!worker || !canWork(worker) || worker.placedOn !== null) return prev;
      worker.exhausted = true; // an audience at court spends the worker's action
      state.seekingAudience = true;
      state.suspicion = Math.max(0, state.suspicion - SUSPICION.audienceRelief);
      state.standing += SUSPICION.audienceStanding;
      const p = PATRON_BY_ID.get(state.patron)!;
      log(state, { phase: "placement", tone: "good", text: `${worker.name} seeks an audience with ${p.name} — suspicion eased, standing gained. [suspicion ${state.suspicion}/${p.suspicionThreshold}]` });
      return state;
    }

    case "cancelAudience": {
      return prev; // audiences resolve immediately; nothing to cancel
    }

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
        // A very public failure feeds the whispers of fraud.
        raiseSuspicion(state, SUSPICION.grandFailure, "a failed transmutation, seen by the court");
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
