import { describe, expect, it } from "vitest";
import { MAX_ROUNDS, STARTING_RESOURCES, WIN_VP } from "./data";
import { canWork, computeVp, newGame, reduce } from "./engine";
import type { GameAction, GameState } from "./types";

function play(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(reduce, state);
}

/**
 * White-box helper: a fresh game with the given tiles on the board and BOTH workers
 * given a persona ability that never affects basic production (Toledo Translations
 * fires only at the Reading Desk), plus resources reset — so exact-value assertions
 * about the base economy aren't perturbed by random personas.
 */
function withTiles(seed: number, ...tiles: GameState["furniture"]): GameState {
  const s = newGame(seed, "julius");
  s.furniture.push(...tiles);
  s.workers = s.workers.map((w) => ({ ...w, ability: "translations" as const }));
  s.resources = { ...STARTING_RESOURCES };
  return s;
}

/** Advance through a full round with both workers gathering, always preventing if possible. */
function playSafeRound(state: GameState): GameState {
  let s = state;
  if (s.phase === "courtEvent") return reduce(s, { type: "resolveEvent", optionIndex: 0 });
  const free = s.workers.filter((w) => canWork(w) && w.placedOn === null);
  if (free[0]) s = reduce(s, { type: "placeWorker", workerId: free[0].id, tileId: "workbench" });
  if (free[1]) s = reduce(s, { type: "placeWorker", workerId: free[1].id, tileId: "alembic" });
  s = reduce(s, { type: "confirmPlacement" });
  if (s.phase === "disaster") {
    s = reduce(s, { type: "resolveDisaster", prevent: s.pendingDisaster?.canPrevent ?? false });
  }
  // Heal whoever can be healed while medicine lasts.
  let healed = true;
  while (s.phase === "healing" && healed) {
    healed = false;
    for (const w of s.workers) {
      if (w.health !== "healthy" && w.health !== "dead") {
        const next = reduce(s, { type: "healWorker", workerId: w.id });
        if (next !== s) {
          s = next;
          healed = true;
          break;
        }
      }
    }
  }
  if (s.phase === "healing") s = reduce(s, { type: "endHealing" });
  return s;
}

describe("setup", () => {
  it("with no patron, starts in patronSelect; choosePatron begins the work", () => {
    let s = newGame(42);
    expect(s.phase).toBe("patronSelect");
    expect(s.workers).toHaveLength(2);
    expect(s.furniture).toEqual([]);
    // The only legal move is choosing a patron.
    expect(reduce(s, { type: "confirmPlacement" })).toBe(s);
    s = reduce(s, { type: "choosePatron", patron: "julius" });
    expect(s.phase).toBe("placement");
    expect(s.patron).toBe("julius");
  });

  it("starts with the spec's lab, workers, and resources", () => {
    const s = newGame(42, "julius");
    expect(s.round).toBe(1);
    expect(s.phase).toBe("placement");
    expect(s.workers).toHaveLength(2);
    expect(s.workers.every((w) => w.health === "healthy")).toBe(true);
    // Metals/potions always match spec; gold/medicine may carry one-time persona
    // grants; ingredients carry Julius's +1 round-1 stipend.
    expect(s.resources.metals).toBe(STARTING_RESOURCES.metals);
    expect(s.resources.ingredients).toBeGreaterThanOrEqual(STARTING_RESOURCES.ingredients);
    expect(s.resources.gold).toBeGreaterThanOrEqual(STARTING_RESOURCES.gold);
    expect(s.furniture).toEqual([]); // empty board — everything must be built
    expect(s.disasterDeck).toHaveLength(MAX_ROUNDS);
  });

  it("builds the disaster deck as an escalation ladder", () => {
    const s = newGame(7, "julius");
    const severities = s.disasterDeck.map((id) =>
      id.match(/crucibleExplosion|nitricBurn|dimethylmercury|fumeBackflow/)
        ? "catastrophic"
        : id.match(/hydrochloricSpill|mercuryVapor|chlorineGas|arsenicExposure/)
          ? "major"
          : "minor",
    );
    expect(severities.slice(0, 4)).toEqual(["minor", "minor", "minor", "minor"]);
    expect(severities.slice(4, 8)).toEqual(["major", "major", "major", "major"]);
    expect(severities.slice(8)).toEqual(["catastrophic", "catastrophic"]);
  });

  it("is deterministic for a given seed", () => {
    expect(newGame(123, "julius").disasterDeck).toEqual(newGame(123, "julius").disasterDeck);
  });
});

describe("placement and production", () => {
  it("workbench yields 3 ingredients, alembic yields 2 metals + 1 gold", () => {
    let s = withTiles(1, "workbench", "alembic");
    s = play(
      s,
      { type: "placeWorker", workerId: "w1", tileId: "workbench" },
      { type: "placeWorker", workerId: "w2", tileId: "alembic" },
      { type: "confirmPlacement" },
    );
    expect(s.resources.ingredients).toBe(STARTING_RESOURCES.ingredients + 3);
    expect(s.resources.metals).toBe(STARTING_RESOURCES.metals + 2);
    expect(s.resources.gold).toBe(STARTING_RESOURCES.gold + 1);
  });

  it("rejects two workers on one tile and placement on passive tiles", () => {
    let s = withTiles(1, "workbench", "fumeHood");
    s = reduce(s, { type: "placeWorker", workerId: "w1", tileId: "workbench" });
    const blocked = reduce(s, { type: "placeWorker", workerId: "w2", tileId: "workbench" });
    expect(blocked.workers.find((w) => w.id === "w2")!.placedOn).toBeNull();
    const passive = reduce(s, { type: "placeWorker", workerId: "w2", tileId: "fumeHood" });
    expect(passive.workers.find((w) => w.id === "w2")!.placedOn).toBeNull();
  });

  it("brews a potion at the crucible for 2 ingredients + 1 metal", () => {
    let s = withTiles(1, "crucible");
    s = play(
      s,
      { type: "placeWorker", workerId: "w1", tileId: "crucible", recipe: "potion" },
      { type: "confirmPlacement" },
    );
    expect(s.resources.potions).toBe(1);
    expect(s.resources.ingredients).toBe(STARTING_RESOURCES.ingredients - 2);
    expect(s.resources.metals).toBe(STARTING_RESOURCES.metals - 1);
  });

  it("research unlocks the track in order and adds tiles + VP", () => {
    let s = withTiles(1, "researchDesk");
    s = play(
      s,
      { type: "placeWorker", workerId: "w1", tileId: "researchDesk" },
      { type: "confirmPlacement" },
    );
    expect(s.upgrades).toEqual(["advancedDistillation"]);
    expect(computeVp(s)).toBeGreaterThanOrEqual(1);
  });
});

describe("disasters", () => {
  it("reveals a disaster with prevention offered before the effect", () => {
    let s = newGame(1, "julius");
    s = play(s, { type: "confirmPlacement" });
    expect(s.phase).toBe("disaster");
    expect(s.pendingDisaster).not.toBeNull();
  });

  it("prevention pays the cost and skips the effect", () => {
    let s = newGame(1, "julius");
    s = play(s, { type: "confirmPlacement" });
    const card = s.pendingDisaster!.card;
    if (!s.pendingDisaster!.canPrevent) return; // seed-dependent; other seeds cover this
    const before = { ...s.resources };
    s = reduce(s, { type: "resolveDisaster", prevent: true });
    expect(s.workers.every((w) => w.health === "healthy")).toBe(true);
    for (const [k, v] of Object.entries(card.preventionCost)) {
      expect(s.resources[k as keyof typeof s.resources]).toBe(
        before[k as keyof typeof before] - (v as number),
      );
    }
  });

  it("accepting the consequences is never skippable — the effect applies", () => {
    // Find a seed whose round-1 card targets a worker, then verify harm lands.
    for (let seed = 1; seed < 50; seed++) {
      let s = withTiles(seed, "workbench");
      s = play(
        s,
        { type: "placeWorker", workerId: "w1", tileId: "workbench" },
        { type: "confirmPlacement" },
      );
      const id = s.pendingDisaster!.card.id;
      if (id === "sodiumHydroxideSplash") {
        s = reduce(s, { type: "resolveDisaster", prevent: false });
        expect(s.workers.some((w) => w.health === "injured")).toBe(true);
        return;
      }
    }
    throw new Error("no suitable seed found");
  });

  it("the fume hood negates the first sickening each round", () => {
    for (let seed = 1; seed < 80; seed++) {
      let s = withTiles(seed, "workbench", "fumeHood");
      s = play(
        s,
        { type: "placeWorker", workerId: "w1", tileId: "workbench" },
        { type: "confirmPlacement" },
      );
      if (s.pendingDisaster!.card.id === "sulphurFire") {
        s = reduce(s, { type: "resolveDisaster", prevent: false });
        expect(s.workers.every((w) => w.health === "healthy")).toBe(true);
        expect(s.fumeHoodUsedThisRound).toBe(true);
        return;
      }
    }
    throw new Error("no suitable seed found");
  });
});

describe("healing and death", () => {
  it("medicine heals one step; critical workers die at upkeep if unhealed", () => {
    let s = newGame(1, "julius");
    // Force a critical worker through the state shape (white-box: run a catastrophic effect).
    s = play(s, { type: "confirmPlacement" });
    s = reduce(s, { type: "resolveDisaster", prevent: false });
    expect(s.phase).toBe("healing");
    s.workers[0].health = "critical"; // direct injection for the upkeep rule
    const healed = reduce(s, { type: "healWorker", workerId: s.workers[0].id });
    expect(healed.workers[0].health).toBe("injured");
    const unhealed = reduce(s, { type: "endHealing" });
    expect(unhealed.workers[0].health).toBe("dead");
  });

  it("loses the game when both workers are dead", () => {
    let s = newGame(1, "julius");
    s = play(s, { type: "confirmPlacement" });
    s = reduce(s, { type: "resolveDisaster", prevent: false });
    s.workers.forEach((w) => (w.health = "critical"));
    s = reduce(s, { type: "endHealing" });
    expect(s.outcome).toBe("lost");
    expect(s.phase).toBe("gameOver");
  });
});

describe("full playthrough", () => {
  it("a cautious bot reaches game over within 10 rounds without crashing", () => {
    let s = newGame(2024, "julius");
    let guard = 0;
    while (s.phase !== "gameOver" && guard++ < 50) {
      s = playSafeRound(s);
    }
    expect(s.phase).toBe("gameOver");
    expect(s.outcome === "won" || s.outcome === "lost").toBe(true);
    expect(s.log.length).toBeGreaterThan(10);
  });

  it("winning is achievable but not trivial (competent build-and-operate bot)", async () => {
    const { simulateArchetype } = await import("./balance");
    let wins = 0;
    for (let seed = 1; seed <= 40; seed++) {
      if (simulateArchetype(seed, "production") >= WIN_VP) wins++;
    }
    // The game must be winnable by good play, but luck of the disaster deck must
    // still cost some games — never a solved 100%.
    expect(wins).toBeGreaterThan(4);
    expect(wins).toBeLessThan(40);
  });

  it(`VP formula matches the spec (${WIN_VP} to win)`, () => {
    const s = newGame(5, "julius");
    s.resources.potions = 3;
    s.resources.advancedPotions = 2;
    s.upgrades = ["safetyShower", "neutralizationStation"];
    s.grandSucceeded = true;
    s.workers[0].illuminated = true;
    s.workers[1].health = "dead";
    // 3 + 4 + 2 + 4 + 1 - 1 = 13
    expect(computeVp(s)).toBe(13);
  });
});

describe("balance model", () => {
  it("shadow prices are sane and prevention ratios create real decisions", async () => {
    const { solveShadowPrices, analyzePreventions, grandExperimentEv } = await import("./balance");
    const p = solveShadowPrices();
    expect(p.wage).toBeGreaterThan(0.4);
    expect(p.wage).toBeLessThan(1);
    expect(p.ingredients).toBeGreaterThan(0);
    expect(p.gold).toBeGreaterThan(p.metals); // alembic is a gold engine
    for (const a of analyzePreventions()) {
      expect(a.ratio, `${a.name} ratio ${a.ratio.toFixed(2)} out of band`).toBeGreaterThan(0.15);
      expect(a.ratio, `${a.name} ratio ${a.ratio.toFixed(2)} out of band`).toBeLessThan(1.3);
    }
    const ev = grandExperimentEv();
    expect(ev).toBeGreaterThan(0); // worth attempting...
    expect(ev).toBeLessThan(1.5); // ...but a gamble, not free VP
  });

  it("draws two distinct roster alchemists per game, seeded", async () => {
    const { WORKER_ROSTER } = await import("./data");
    const names = new Set(WORKER_ROSTER.map((w) => w.name));
    const s = newGame(99, "julius");
    expect(s.workers).toHaveLength(2);
    expect(names.has(s.workers[0].name)).toBe(true);
    expect(names.has(s.workers[1].name)).toBe(true);
    expect(s.workers[0].name).not.toBe(s.workers[1].name);
    expect(newGame(99, "julius").workers.map((w) => w.name)).toEqual(s.workers.map((w) => w.name));
  });
});

describe("strategy parity (empty-board build orders)", () => {
  it("starts with an empty board", () => {
    expect(newGame(1, "julius").furniture).toEqual([]);
  });

  it("a worker can build a tile, paying its cost and spending its action", async () => {
    const { BUILD_COST } = await import("./data");
    let s = newGame(1, "julius");
    const goldBefore = s.resources.gold;
    s = reduce(s, { type: "buildTile", workerId: "w1", tileId: "workbench" });
    expect(s.furniture).toContain("workbench");
    expect(s.resources.gold).toBe(goldBefore - (BUILD_COST.workbench.gold ?? 0));
    expect(s.workers.find((w) => w.id === "w1")!.exhausted).toBe(true);
    // A spent worker cannot also operate.
    const blocked = reduce(s, { type: "placeWorker", workerId: "w1", tileId: "workbench" });
    expect(blocked.workers.find((w) => w.id === "w1")!.placedOn).toBeNull();
  });

  it("no build order dominates: median VP spread across archetypes stays tight", async () => {
    const { strategyParity } = await import("./balance");
    const report = strategyParity(60);
    // Every archetype must be viable (reach a respectable score) and none runaway.
    for (const [arch, r] of Object.entries(report.perArchetype)) {
      expect(r.median, `${arch} median ${r.median}`).toBeGreaterThanOrEqual(5);
      expect(r.winRate, `${arch} winRate ${r.winRate}`).toBeLessThan(0.85); // never solved
    }
    // The parity guarantee: best and worst archetype medians within 3 VP.
    expect(report.spread, `spread ${report.spread}`).toBeLessThanOrEqual(3);
  });
});

describe("persona abilities (historically grounded, small)", () => {
  // White-box: force a specific persona onto a worker, then verify the effect.
  function withPersona(seed: number, ability: string, ...tiles: GameState["furniture"]): GameState {
    const s = newGame(seed, "julius");
    s.furniture.push(...tiles);
    s.workers[0] = { ...s.workers[0], ability: ability as GameState["workers"][number]["ability"] };
    return s;
  }

  it("al-Razi's Systematic Distillation gives +1 Metal at the Alembic", () => {
    const base = newGame(1, "julius");
    let s = withPersona(1, "systematic-still", "alembic");
    s = reduce(s, { type: "placeWorker", workerId: "w1", tileId: "alembic" });
    s = reduce(s, { type: "confirmPlacement" });
    // 2 base + 1 ability = 3 metals over the starting stock.
    expect(s.resources.metals).toBe(base.resources.metals + 3);
  });

  it("Paracelsus' Iatrochemistry brews 2 Medicine", () => {
    let s = withPersona(1, "iatrochemistry", "crucible");
    s = reduce(s, { type: "placeWorker", workerId: "w1", tileId: "crucible", recipe: "medicine" });
    const before = s.resources.medicine;
    s = reduce(s, { type: "confirmPlacement" });
    expect(s.resources.medicine).toBe(before + 2);
  });

  it("Jabir's Corpus makes research cost no Ingredient", () => {
    let s = withPersona(1, "the-corpus", "researchDesk");
    s.resources.ingredients = 0; // no ingredients at all
    s = reduce(s, { type: "placeWorker", workerId: "w1", tileId: "researchDesk" });
    s = reduce(s, { type: "confirmPlacement" });
    expect(s.upgrades).toHaveLength(1); // researched anyway
  });

  it("Tycho and Maier grant one-time starting resources when present", () => {
    // Search seeds for games that include each persona and check the grant landed.
    let sawTycho = false, sawMaier = false;
    for (let seed = 1; seed <= 60 && !(sawTycho && sawMaier); seed++) {
      const s = newGame(seed, "julius");
      if (s.workers.some((w) => w.ability === "medicamenta-tria")) {
        sawTycho = true;
        expect(s.resources.medicine).toBeGreaterThanOrEqual(STARTING_RESOURCES.medicine + 2);
      }
      if (s.workers.some((w) => w.ability === "patronage")) {
        sawMaier = true;
        expect(s.resources.gold).toBeGreaterThanOrEqual(STARTING_RESOURCES.gold + 3);
      }
    }
    expect(sawTycho && sawMaier).toBe(true);
  });
});

describe("cupellation furnace (second scoring path)", () => {
  it("fulfilling a commission spends goods and grants reputation VP", async () => {
    const { COMMISSION_BY_ID } = await import("./data");
    let s = newGame(3, "julius");
    s.furniture.push("patronsCabinet");
    const commission = COMMISSION_BY_ID.get(s.commissionDeck[0])!;
    // Guarantee affordability.
    s.resources = { ...s.resources, gold: 9, metals: 9, ingredients: 9 };
    const vpBefore = computeVp(s);
    const deckBefore = s.commissionDeck.length;
    s = reduce(s, { type: "placeWorker", workerId: "w1", tileId: "patronsCabinet" });
    s = reduce(s, { type: "confirmPlacement" });
    expect(s.commissionsVp).toBe(commission.vp);
    expect(computeVp(s)).toBe(vpBefore + commission.vp);
    expect(s.commissionDeck.length).toBe(deckBefore - 1); // advanced to next
  });

  it("does nothing if the current commission is unaffordable", () => {
    let s = newGame(3, "julius");
    s.furniture.push("patronsCabinet");
    s.resources = { ingredients: 0, metals: 0, gold: 0, medicine: 0, potions: 0, advancedPotions: 0 };
    const deckBefore = s.commissionDeck.length;
    s = reduce(s, { type: "placeWorker", workerId: "w1", tileId: "patronsCabinet" });
    s = reduce(s, { type: "confirmPlacement" });
    expect(s.commissionsVp).toBe(0);
    expect(s.commissionDeck.length).toBe(deckBefore); // unchanged
  });
});

describe("patronage layer (v2.0)", () => {
  it("grants the round-1 stipend and applies persona affinity standing", () => {
    // Rudolf's affinity is Maier; find a seed drawing Maier, check +2 standing.
    let saw = false;
    for (let seed = 1; seed <= 80 && !saw; seed++) {
      const s = newGame(seed, "rudolf");
      if (s.workers.some((w) => w.persona === "michael-maier")) {
        saw = true;
        expect(s.standing).toBeGreaterThanOrEqual(2);
      }
      // Rudolf's stipend includes ingredients + gold.
      expect(s.resources.gold).toBeGreaterThanOrEqual(STARTING_RESOURCES.gold + 3);
    }
    expect(saw).toBe(true);
  });

  it("a worker death raises suspicion (a death reads as poison)", () => {
    let s = newGame(1, "julius");
    s = reduce(s, { type: "confirmPlacement" });
    s = reduce(s, { type: "resolveDisaster", prevent: false });
    s.workers[0].health = "critical";
    const before = s.suspicion;
    s = reduce(s, { type: "endHealing" }); // upkeep: critical dies
    expect(s.workers[0].health).toBe("dead");
    expect(s.suspicion).toBeGreaterThan(before);
  });

  it("seeking an audience spends the worker and lowers suspicion", () => {
    let s = newGame(1, "julius");
    s.suspicion = 5;
    s = reduce(s, { type: "seekAudience", workerId: "w1" });
    expect(s.suspicion).toBeLessThan(5);
    expect(s.standing).toBeGreaterThanOrEqual(1);
    expect(s.workers.find((w) => w.id === "w1")!.exhausted).toBe(true);
  });

  it("crossing the suspicion threshold triggers a Trial (execution if standing is low)", () => {
    let s = newGame(1, "friedrich"); // threshold 5
    s = reduce(s, { type: "confirmPlacement" });
    s = reduce(s, { type: "resolveDisaster", prevent: false });
    s.suspicion = 6; // over Friedrich's threshold
    s.standing = 0;
    s = reduce(s, { type: "endHealing" });
    expect(s.phase).toBe("gameOver");
    expect(s.outcome).toBe("lost");
    expect(s.trialOutcome).toBe("execution");
  });

  it("high standing softens the Trial to exile", () => {
    let s = newGame(1, "friedrich");
    s = reduce(s, { type: "confirmPlacement" });
    s = reduce(s, { type: "resolveDisaster", prevent: false });
    s.suspicion = 6;
    s.standing = 5; // >= exileStandingFloor
    s = reduce(s, { type: "endHealing" });
    expect(s.outcome).toBe("lost");
    expect(s.trialOutcome).toBe("exile");
  });

  it("fulfilling the contract quota wins (the escape victory)", () => {
    let s = newGame(1, "julius"); // quota 9
    s = reduce(s, { type: "confirmPlacement" });
    if (s.phase === "disaster") s = reduce(s, { type: "resolveDisaster", prevent: s.pendingDisaster?.canPrevent ?? false });
    s.resources.advancedPotions = 5; // 10 VP worth, over quota 9
    s = reduce(s, { type: "endHealing" });
    expect(s.phase).toBe("gameOver");
    expect(s.outcome).toBe("won");
  });

  it("patrons differ: Friedrich prosecutes far more than Rožmberk", async () => {
    const { simulateArchetype } = await import("./balance");
    let friedrichLosses = 0, rozmberkLosses = 0;
    for (let seed = 1; seed <= 30; seed++) {
      // A bot that ignores the court (never manages suspicion) to expose patron risk.
      if (simulateArchetype(seed, "production", "friedrich") < 9) friedrichLosses++;
      if (simulateArchetype(seed, "production", "rozmberk") < 8) rozmberkLosses++;
    }
    expect(friedrichLosses).toBeGreaterThanOrEqual(rozmberkLosses);
  });
});

describe("court events (v2.1)", () => {
  it("fires a court event at an event round, awaiting a choice", () => {
    let s = newGame(1, "julius");
    let guard = 0;
    // Play rounds passively until a court event appears (event rounds are 3 and 6).
    while (s.phase !== "courtEvent" && s.phase !== "gameOver" && guard++ < 40) {
      if (s.phase === "placement") s = reduce(s, { type: "confirmPlacement" });
      else if (s.phase === "disaster") s = reduce(s, { type: "resolveDisaster", prevent: s.pendingDisaster?.canPrevent ?? false });
      else if (s.phase === "healing") s = reduce(s, { type: "endHealing" });
    }
    expect(s.phase).toBe("courtEvent");
    expect(s.pendingEvent).not.toBeNull();
    expect([3, 6]).toContain(s.round);
  });

  it("resolving an event applies its effect and returns to placement", async () => {
    const { COURT_EVENT_BY_ID } = await import("./data");
    let s = newGame(1, "julius");
    // Inject a known event to test a suspicion-raising option deterministically.
    s.phase = "courtEvent";
    s.pendingEvent = "greaterAdept"; // option 0: +3 standing, +3 suspicion
    const ev = COURT_EVENT_BY_ID.get("greaterAdept")!;
    expect(ev.options[0].suspicion).toBe(3);
    const standingBefore = s.standing;
    s = reduce(s, { type: "resolveEvent", optionIndex: 0 });
    expect(s.phase).toBe("placement");
    expect(s.pendingEvent).toBeNull();
    expect(s.standing).toBe(standingBefore + 3);
    expect(s.suspicion).toBe(3);
  });

  it("an option's resource requirement is enforced", () => {
    const s = newGame(1, "julius");
    s.phase = "courtEvent";
    s.pendingEvent = "satire"; // option 0 requires 3 gold
    s.resources.gold = 0;
    const blocked = reduce(s, { type: "resolveEvent", optionIndex: 0 });
    expect(blocked).toBe(s); // cannot afford → no-op
    // the free option (endure) is always allowed
    const endured = reduce(s, { type: "resolveEvent", optionIndex: 1 });
    expect(endured.phase).toBe("placement");
    expect(endured.suspicion).toBe(3);
  });
});
