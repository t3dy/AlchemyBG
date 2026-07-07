// Core rule types for The Alchemist's Lab — solo vertical slice.
// The engine is a pure state machine: UI dispatches GameAction, engine returns new GameState.

export type WorkerHealth = "healthy" | "sickened" | "injured" | "critical" | "dead";

// "illuminated" is a positive overlay earned via the Grand Transmutation,
// distinct from the health ladder.
export interface Worker {
  id: string;
  name: string;
  health: WorkerHealth;
  illuminated: boolean;
  /** Tile id the worker is assigned to this round, or null. */
  placedOn: string | null;
  /** Spent on the Grand Experiment this round; cleared at upkeep. */
  exhausted: boolean;
}

export type ResourceKind = "ingredients" | "metals" | "gold" | "medicine" | "potions" | "advancedPotions";

export type Resources = Record<ResourceKind, number>;

export type FurnitureId =
  | "crucible"
  | "alembic"
  | "workbench"
  | "researchDesk"
  | "fumeHood"
  | "safetyShower"
  | "neutralizationStation";

export interface FurnitureTile {
  id: FurnitureId;
  name: string;
  emoji: string;
  description: string;
  /** Some tiles (fume hood, safety shower) are passive and cannot host a worker. */
  passive: boolean;
  flavor: string;
  flavorSource: string;
}

export type DisasterSeverity = "minor" | "major" | "catastrophic";

export interface DisasterCard {
  id: string;
  name: string;
  emoji: string;
  severity: DisasterSeverity;
  /** Rules text shown to the player. */
  effectText: string;
  /** Prevention clause: always offered before the effect applies. */
  preventionText: string;
  preventionCost: Partial<Resources>;
  flavor: string;
}

export type ResearchUpgradeId = "safetyShower" | "neutralizationStation" | "advancedDistillation";

export interface ResearchUpgrade {
  id: ResearchUpgradeId;
  name: string;
  emoji: string;
  description: string;
}

export type Phase =
  | "placement"   // assign workers to furniture
  | "disaster"    // a disaster card is revealed; player chooses prevent / accept
  | "healing"     // spend medicine to heal workers
  | "gameOver";

export interface LogEntry {
  round: number;
  phase: Phase | "production" | "upkeep" | "setup";
  text: string;
  tone: "neutral" | "good" | "bad" | "gold";
}

export interface PendingDisaster {
  card: DisasterCard;
  canPrevent: boolean;
}

export type RecipeId = "potion" | "medicine" | "advancedPotion";

export interface GameState {
  seed: number;
  rngState: number;       // advances with every random draw so replays are deterministic
  round: number;          // 1..MAX_ROUNDS
  phase: Phase;
  workers: Worker[];
  resources: Resources;
  furniture: FurnitureId[];          // tiles present in the lab
  /** Tile id -> round it broke. Unusable until cleaned up at the following upkeep. */
  brokenFurniture: Partial<Record<FurnitureId, number>>;
  /** Recipe chosen for the worker on the crucible this round. */
  crucibleRecipe: RecipeId | null;
  upgrades: ResearchUpgradeId[];     // research track progress, in order
  disasterDeck: string[];            // card ids, pre-shuffled by severity tier
  pendingDisaster: PendingDisaster | null;
  fumeHoodUsedThisRound: boolean;    // fume hood negates one sickening effect per round
  safetyShowerUsedThisRound: boolean;
  neutralizationUsed: boolean;       // once-per-game acid cancel
  grandAttempted: boolean;
  grandSucceeded: boolean;
  vp: number;
  log: LogEntry[];
  outcome: "won" | "lost" | null;
  outcomeText: string;
}

export type GameAction =
  | { type: "buildTile"; workerId: string; tileId: FurnitureId }
  | { type: "placeWorker"; workerId: string; tileId: FurnitureId; recipe?: RecipeId }
  | { type: "unplaceWorker"; workerId: string }
  | { type: "confirmPlacement" }                 // run production, reveal disaster
  | { type: "resolveDisaster"; prevent: boolean }
  | { type: "healWorker"; workerId: string }     // spend 1 medicine (or the round's free shower heal)
  | { type: "endHealing" }                       // upkeep, next round
  | { type: "attemptGrandExperiment"; workerId: string }  // rounds 9-10 gamble, from placement phase
  | { type: "newGame"; seed?: number };
