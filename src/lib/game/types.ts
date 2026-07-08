// Core rule types for The Alchemist's Lab — solo vertical slice.
// The engine is a pure state machine: UI dispatches GameAction, engine returns new GameState.

export type WorkerHealth = "healthy" | "sickened" | "injured" | "critical" | "dead";

// "illuminated" is a positive overlay earned via the Grand Transmutation,
// distinct from the health ladder.
// Each roster alchemist has one passive ability grounded in their documented
// historical contribution. Effects are small and mostly economic; see data.ts.
export type AbilityId =
  | "sublimation"      // Zosimos — Alembic also yields +1 Ingredient
  | "the-corpus"       // Jabir — research needs no Ingredient
  | "systematic-still" // al-Razi — Alembic yields +1 Metal
  | "essences"         // al-Kindi — Alembic yields +1 Gold
  | "translations"     // Gerard — research also yields +1 Gold
  | "experiment"       // Roger Bacon — his Potion brews cost 1 fewer Ingredient
  | "iatrochemistry"   // Paracelsus — brewing Medicine yields 2
  | "medicamenta-tria" // Tycho — starts with +2 Medicine (one-time)
  | "patronage";       // Maier — starts with +3 Gold (one-time)

export interface Worker {
  id: string;
  name: string;
  /** Roster persona slug (AlchemyTimelineMap), drives the ability. */
  persona: string;
  ability: AbilityId;
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
  | "patronsCabinet"
  | "safetyShower"
  | "neutralizationStation";

/** A court commission: deliver the goods, gain reputation (VP). Second scoring path. */
export interface Commission {
  id: string;
  name: string;
  cost: Partial<Resources>;
  vp: number;
  flavor: string;
}

export interface FurnitureTile {
  id: FurnitureId;
  name: string;
  emoji: string;
  description: string;
  /** Some tiles (fume hood, safety shower) are passive and cannot host a worker. */
  passive: boolean;
  /** An in-period historical statement about the apparatus/practice. */
  flavor: string;
  /** The primary-source locus or period attribution for the flavor line. */
  flavorSource: string;
  /** Modern scholarship (new historiography of alchemy) the design draws on. */
  scholarship: string;
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
  | "patronSelect" // choose your patron before the work begins
  | "placement"   // assign workers to furniture
  | "disaster"    // a disaster card is revealed; player chooses prevent / accept
  | "healing"     // spend medicine to heal workers
  | "gameOver";

// ── Patronage layer (v2.0) — see docs/PATRONAGE_PLAN.md ────
// Each patron is a historical prince/duke who funds the lab under a Contract and can,
// if Suspicion runs high, put you on trial. Grounded in Nummedal.
export type PatronId = "julius" | "rudolf" | "moritz" | "friedrich" | "rozmberk";

export interface Patron {
  id: PatronId;
  name: string;
  court: string;
  /** Rich historical bio — the "person information," per the design plan. */
  bio: string;
  /** Resources granted at the start of each round. */
  stipend: Partial<Resources>;
  /** Work (VP) that must be delivered by the deadline to fulfill the contract. */
  quota: number;
  /** Round by which the quota must be met, or the patron prosecutes. */
  deadline: number;
  /** Suspicion at or above this triggers a Trial. */
  suspicionThreshold: number;
  /** A denunciation from the court's rival network fires every N rounds. */
  denunciationEvery: number;
  denunciationAmount: number;
  /** Alchemist persona (slug) with a historical tie to this court; grants starting Standing. */
  affinityPersona?: string;
  affinityNote?: string;
  /** One-line contract summary + reward flavor. */
  demand: string;
  reward: string;
  risk: string;
}

export type TrialOutcome = "exile" | "execution" | null;

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
  commissionDeck: string[];          // commission ids, shuffled; index 0 is current
  commissionsVp: number;             // reputation earned from fulfilled commissions
  upgrades: ResearchUpgradeId[];     // research track progress, in order
  disasterDeck: string[];            // card ids, pre-shuffled by severity tier
  pendingDisaster: PendingDisaster | null;
  fumeHoodUsedThisRound: boolean;    // fume hood negates one sickening effect per round
  safetyShowerUsedThisRound: boolean;
  neutralizationUsed: boolean;       // once-per-game acid cancel
  grandAttempted: boolean;
  grandSucceeded: boolean;
  vp: number;
  // ── Patronage layer ──
  patron: PatronId;
  standing: number;          // court favor; high standing softens a Trial to exile
  suspicion: number;         // court distrust; crossing the threshold triggers a Trial
  seekingAudience: boolean;  // a worker is currying favor this round (set in placement)
  trialOutcome: TrialOutcome;
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
  | { type: "seekAudience"; workerId: string }   // spend a worker at court: -Suspicion, +Standing
  | { type: "cancelAudience" }
  | { type: "choosePatron"; patron: PatronId }   // from patronSelect phase
  | { type: "newGame"; seed?: number; patron?: PatronId };
