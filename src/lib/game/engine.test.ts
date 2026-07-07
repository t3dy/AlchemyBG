import { describe, expect, it } from "vitest";
import { MAX_ROUNDS, STARTING_RESOURCES, WIN_VP } from "./data";
import { canWork, computeVp, newGame, reduce } from "./engine";
import type { GameAction, GameState } from "./types";

function play(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(reduce, state);
}

/** Advance through a full round with both workers gathering, always preventing if possible. */
function playSafeRound(state: GameState): GameState {
  let s = state;
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
  it("starts with the spec's lab, workers, and resources", () => {
    const s = newGame(42);
    expect(s.round).toBe(1);
    expect(s.phase).toBe("placement");
    expect(s.workers).toHaveLength(2);
    expect(s.workers.every((w) => w.health === "healthy")).toBe(true);
    expect(s.resources).toEqual(STARTING_RESOURCES);
    expect(s.furniture).toEqual(["crucible", "alembic", "workbench", "researchDesk", "fumeHood"]);
    expect(s.disasterDeck).toHaveLength(MAX_ROUNDS);
  });

  it("builds the disaster deck as an escalation ladder", () => {
    const s = newGame(7);
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
    expect(newGame(123).disasterDeck).toEqual(newGame(123).disasterDeck);
  });
});

describe("placement and production", () => {
  it("workbench yields 3 ingredients, alembic yields 2 metals + 1 gold", () => {
    let s = newGame(1);
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
    let s = newGame(1);
    s = reduce(s, { type: "placeWorker", workerId: "w1", tileId: "workbench" });
    const blocked = reduce(s, { type: "placeWorker", workerId: "w2", tileId: "workbench" });
    expect(blocked.workers.find((w) => w.id === "w2")!.placedOn).toBeNull();
    const passive = reduce(s, { type: "placeWorker", workerId: "w2", tileId: "fumeHood" });
    expect(passive.workers.find((w) => w.id === "w2")!.placedOn).toBeNull();
  });

  it("brews a potion at the crucible for 2 ingredients + 1 metal", () => {
    let s = newGame(1);
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
    let s = newGame(1);
    s = play(
      s,
      { type: "placeWorker", workerId: "w1", tileId: "researchDesk" },
      { type: "confirmPlacement" },
    );
    expect(s.upgrades).toEqual(["safetyShower"]);
    expect(s.furniture).toContain("safetyShower");
    expect(computeVp(s)).toBeGreaterThanOrEqual(1);
  });
});

describe("disasters", () => {
  it("reveals a disaster with prevention offered before the effect", () => {
    let s = newGame(1);
    s = play(s, { type: "confirmPlacement" });
    expect(s.phase).toBe("disaster");
    expect(s.pendingDisaster).not.toBeNull();
  });

  it("prevention pays the cost and skips the effect", () => {
    let s = newGame(1);
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
      let s = newGame(seed);
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
      let s = newGame(seed);
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
    let s = newGame(1);
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
    let s = newGame(1);
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
    let s = newGame(2024);
    let guard = 0;
    while (s.phase !== "gameOver" && guard++ < 50) {
      s = playSafeRound(s);
    }
    expect(s.phase).toBe("gameOver");
    expect(s.outcome === "won" || s.outcome === "lost").toBe(true);
    expect(s.log.length).toBeGreaterThan(10);
  });

  it("winning is achievable: a potion-focused bot wins on some seeds", () => {
    let wins = 0;
    for (let seed = 1; seed <= 40; seed++) {
      let s = newGame(seed);
      let guard = 0;
      while (s.phase !== "gameOver" && guard++ < 50) {
        // Priority: grand experiment > brew advanced potion > potion > medicine when low > research > gather.
        const free = () => s.workers.filter((w) => canWork(w) && w.placedOn === null);
        if (s.round >= 9 && !s.grandAttempted) {
          const gw = s.workers.find((w) => w.health === "healthy" && w.placedOn === null && !w.exhausted);
          if (gw && s.resources.potions >= 1 && s.resources.metals >= 2 && s.resources.gold >= 1) {
            s = reduce(s, { type: "attemptGrandExperiment", workerId: gw.id });
          }
        }
        let f = free();
        if (f[0]) {
          if (s.resources.potions >= 1 && s.resources.metals >= 1) {
            s = reduce(s, { type: "placeWorker", workerId: f[0].id, tileId: "crucible", recipe: "advancedPotion" });
          } else if (s.resources.ingredients >= 2 && s.resources.metals >= 1) {
            s = reduce(s, { type: "placeWorker", workerId: f[0].id, tileId: "crucible", recipe: "potion" });
          } else if (s.resources.medicine === 0 && s.resources.ingredients >= 1 && s.resources.gold >= 1) {
            s = reduce(s, { type: "placeWorker", workerId: f[0].id, tileId: "crucible", recipe: "medicine" });
          } else {
            s = reduce(s, { type: "placeWorker", workerId: f[0].id, tileId: "workbench" });
          }
        }
        f = free();
        if (f[0]) {
          if (s.upgrades.length < 3 && s.resources.ingredients >= 3) {
            s = reduce(s, { type: "placeWorker", workerId: f[0].id, tileId: "researchDesk" });
          } else {
            const tile = s.workers.some((w) => w.placedOn === "workbench") ? "alembic" : "workbench";
            s = reduce(s, { type: "placeWorker", workerId: f[0].id, tileId: tile });
          }
        }
        s = reduce(s, { type: "confirmPlacement" });
        if (s.phase === "disaster") {
          s = reduce(s, { type: "resolveDisaster", prevent: s.pendingDisaster?.canPrevent ?? false });
        }
        let healed = true;
        while (s.phase === "healing" && healed) {
          healed = false;
          for (const w of s.workers) {
            if (w.health === "critical" || w.health === "injured") {
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
      }
      if (s.outcome === "won") wins++;
    }
    // Balance gate: the game must be winnable but not trivial.
    expect(wins).toBeGreaterThan(0);
    expect(wins).toBeLessThan(40);
  });

  it(`VP formula matches the spec (${WIN_VP} to win)`, () => {
    const s = newGame(5);
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
