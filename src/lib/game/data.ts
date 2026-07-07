import type { AbilityId, Commission, DisasterCard, FurnitureId, FurnitureTile, ResearchUpgrade, Resources } from "./types";

export const MAX_ROUNDS = 10;
export const WIN_VP = 9;
export const GRAND_TRANSMUTATION_ROUND = 9;

// Historically documented alchemists, drawn from the AlchemyTimelineMap database
// (C:\Dev\ALCHEMYTIMELINEMAP\data\seed_data.json — all SCHOLARSHIP_BASED entries).
// Two are drawn per game. Pairings across eras are a game convention, not a claim.
export interface WorkerPersona {
  slug: string; // AlchemyTimelineMap person slug
  name: string;
  era: string;
  bio: string;
  ability: AbilityId;
  /** Player-facing ability name + effect. */
  abilityName: string;
  abilityText: string;
}

// Abilities are grounded in each figure's documented contribution and priced small
// by the shadow-price model (docs/BALANCE_MODEL.md §7). Because newGame draws the
// same personas per seed for every build-order archetype, abilities add per-game
// variance without biasing the strategy-parity harness.
export const WORKER_ROSTER: WorkerPersona[] = [
  {
    slug: "zosimos-of-panopolis",
    name: "Zosimos",
    era: "Late Antique",
    bio: "Zosimos of Panopolis, 3rd c. — earliest systematic alchemical writer; craft practice meets Greek philosophy.",
    ability: "sublimation",
    abilityName: "Sublimation",
    abilityText: "When Zosimos works the Alembic, also gain +1 Ingredient (his sublimation operations).",
  },
  {
    slug: "jabir-ibn-hayyan",
    name: "Jabir",
    era: "Medieval",
    bio: "Jabir ibn Hayyan, 8th–9th c. — corpus that shaped practical chemistry for a millennium; the Latin West's 'Geber'.",
    ability: "the-corpus",
    abilityName: "The Corpus",
    abilityText: "When Jabir works the Assay Balance, the assay costs no Ingredient (his vast systematizing corpus).",
  },
  {
    slug: "al-razi",
    name: "al-Razi",
    era: "Medieval",
    bio: "al-Razi, 9th–10th c. — Persian physician-alchemist; advanced systematic distillation and metallurgical work.",
    ability: "systematic-still",
    abilityName: "Systematic Distillation",
    abilityText: "When al-Razi works the Alembic, gain +1 Metal (his classified apparatus and processes).",
  },
  {
    slug: "al-kindi",
    name: "al-Kindi",
    era: "Medieval",
    bio: "al-Kindi, 9th c. — Baghdad philosopher and polymath who engaged alchemy critically.",
    ability: "essences",
    abilityName: "Distiller of Essences",
    abilityText: "When al-Kindi works the Alembic, gain +1 Gold (his treatise on distilling perfumes).",
  },
  {
    slug: "gerard-of-cremona",
    name: "Gerard",
    era: "Medieval",
    bio: "Gerard of Cremona, 12th c. — Toledo translator who carried Arabic alchemical treatises into Latin.",
    ability: "translations",
    abilityName: "Toledo Translations",
    abilityText: "When Gerard works the Assay Balance, also gain +1 Gold (his translated recipes, turned to coin).",
  },
  {
    slug: "roger-bacon",
    name: "Roger Bacon",
    era: "Medieval",
    bio: "Roger Bacon, 13th c. — English Franciscan natural philosopher engaged with alchemy and experiment.",
    ability: "experiment",
    abilityName: "Experimental Method",
    abilityText: "Bacon's Potion brews at the Crucible cost 1 fewer Ingredient (his championing of experiment).",
  },
  {
    slug: "paracelsus",
    name: "Paracelsus",
    era: "Early Modern",
    bio: "Paracelsus, 1493–1541 — Swiss physician; pioneered medical alchemy and pharmaceutical preparation.",
    ability: "iatrochemistry",
    abilityName: "Iatrochemistry",
    abilityText: "When Paracelsus brews Medicine, produce 2 instead of 1 (the father of medical chemistry).",
  },
  {
    slug: "tycho-brahe",
    name: "Tycho",
    era: "Early Modern",
    bio: "Tycho Brahe, 1546–1601 — ran the Uraniborg laboratory; medicamenta tria rather than transmutation.",
    ability: "medicamenta-tria",
    abilityName: "Medicamenta Tria",
    abilityText: "If Tycho is present, the lab starts with +2 Medicine (his three plague-medicines).",
  },
  {
    slug: "michael-maier",
    name: "Maier",
    era: "Early Modern",
    bio: "Michael Maier, 1568–1622 — German court physician and alchemist; author of Atalanta Fugiens.",
    ability: "patronage",
    abilityName: "Imperial Patronage",
    abilityText: "If Maier is present, the lab starts with +3 Gold (physician to Rudolf II's court).",
  },
];

export const PERSONA_BY_SLUG = new Map(WORKER_ROSTER.map((p) => [p.slug, p]));

// The board starts EMPTY. Openings are gold-allocation puzzles: this stock buys
// two cheap tiles, or one expensive tile plus operating capital.
export const STARTING_RESOURCES: Resources = {
  ingredients: 4,
  metals: 3,
  gold: 8,
  medicine: 3,
  potions: 0,
  advancedPotions: 0,
};

// The five tiles a player can construct directly onto their empty board. The two
// safety tiles (safetyShower, neutralizationStation) are NOT here — they are earned
// down the Research Desk tech path, keeping research a distinct strategic lane.
export const BASE_BUILDABLE: FurnitureId[] = [
  "workbench",
  "alembic",
  "crucible",
  "researchDesk",
  "fumeHood",
  "patronsCabinet",
];

// Assay & refining jobs — the second scoring path, worked at the Cupellation Furnace.
// Each is a real early-modern laboratory operation on metals and salts; completing one
// proves fine metal (VP). Costs are priced in the shadow model (docs/BALANCE_MODEL.md)
// at ~1.2–1.5 VP-eq of materials per 2–3 VP, so the furnace pays ≈ the baseline wage r
// and never dominates the crucible. Grounded in assay archaeology (Martinón-Torres &
// Rehren) and Roos, The Salt of the Earth.
export const COMMISSIONS: Commission[] = [
  { id: "cupelRegulus", name: "Cupel the Regulus", cost: { gold: 2, metals: 2 }, vp: 3, flavor: "Blast air across the bone-ash cupel; base metals sink as litharge, a bright bead remains." },
  { id: "partGold", name: "Part Gold from Silver", cost: { gold: 1, ingredients: 3 }, vp: 2, flavor: "Aqua fortis eats the silver and spares the gold — the parting acid does the sorting." },
  { id: "cementGold", name: "Cement the Gold", cost: { gold: 2, metals: 1 }, vp: 2, flavor: "Salt and brick-dust packed hot around the leaf draw the base metal out through the surface." },
  { id: "fireAssay", name: "Fire-Assay the Ore", cost: { gold: 3 }, vp: 3, flavor: "Fusion, cupel, and the balance: the weight of the bead is the truth of the vein." },
  { id: "sublimeSalt", name: "Sublime the Sal Ammoniac", cost: { gold: 2, ingredients: 2 }, vp: 3, flavor: "The volatile salt climbs the aludel and re-forms as a pure crystalline crust." },
  { id: "distilAquaFortis", name: "Distil Aqua Fortis", cost: { gold: 2, metals: 1 }, vp: 2, flavor: "Nitre and oil of vitriol in the retort yield the fuming acid that bites every metal but gold." },
];

export const COMMISSION_BY_ID = new Map(COMMISSIONS.map((c) => [c.id, c]));

// Build costs, priced by the shadow-price model (docs/BALANCE_MODEL.md) so that no
// single opening dominates: cheap tiles pay off slowly, dear tiles pay off faster.
export const BUILD_COST: Record<FurnitureId, Partial<Resources>> = {
  workbench: { gold: 1 },
  fumeHood: { gold: 2 },
  crucible: { gold: 2, metals: 1 },
  alembic: { gold: 2 },
  researchDesk: { gold: 2 },
  patronsCabinet: { gold: 2 },
  // Safety tiles are placed for free the instant their research completes.
  safetyShower: {},
  neutralizationStation: {},
};

export interface Recipe {
  id: "potion" | "medicine" | "advancedPotion";
  name: string;
  emoji: string;
  cost: Partial<Resources>;
  yields: keyof Resources;
  vpNote: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "potion",
    name: "Potion",
    emoji: "🧪",
    cost: { ingredients: 2, metals: 1 },
    yields: "potions",
    vpNote: "1 VP",
  },
  {
    id: "medicine",
    name: "Medicine",
    emoji: "💊",
    cost: { ingredients: 1, gold: 1 },
    yields: "medicine",
    vpNote: "heals wounds",
  },
  {
    id: "advancedPotion",
    name: "Advanced Potion",
    emoji: "✨",
    cost: { potions: 1, metals: 1 },
    yields: "advancedPotions",
    vpNote: "2 VP",
  },
];

// Equipment grounded in the "new historiography of alchemy": chymistry as a rigorous,
// reproducible, quantitative craft (Newman & Principe), distillation as its emblematic
// operation (Moran), and the laboratory as a real material workspace, not a den of
// mysticism. Citations in docs/HISTORIOGRAPHY.md.
export const FURNITURE: FurnitureTile[] = [
  {
    id: "crucible",
    name: "Crucible",
    emoji: "🔥",
    description: "Brew a recipe: Potion (2🌿+1⛏️), Medicine (1🌿+1🪙), or Advanced Potion (1🧪+1⛏️).",
    passive: false,
    flavor:
      "The chymist's fire tries all things. Hessian crucibles, fired past 1,300 °C, held metal and reagent where lesser clay would burst.",
    flavorSource: "Hessian crucibles, c. 1450–1750",
    scholarship: "Martinón-Torres & Rehren, crucible archaeometry; the material-culture turn (Newman & Principe)",
  },
  {
    id: "alembic",
    name: "Alembic",
    emoji: "⚗️",
    description: "Distill: gain 2 Metals and 1 Gold (sickened: 1 Metal, no Gold). Advanced Distillation adds +1 Metal.",
    passive: false,
    flavor:
      "Distillation — driving off the volatile and catching it again — was the art's signature operation, joining craft skill to natural philosophy.",
    flavorSource: "alembic & cucurbit; Rupescissa on the quintessence, 14th c.",
    scholarship: "Bruce T. Moran, Distilling Knowledge: Alchemy, Chemistry, and the Scientific Revolution (2005)",
  },
  {
    id: "workbench",
    name: "Mortar & Pestle",
    emoji: "⚗",
    description: "Grind and prepare reagents: gain 3 Ingredients (2 if the worker is sickened).",
    passive: false,
    flavor:
      "Before any fire, the work is grinding: minerals levigated to an impalpable powder so the fire can seize them. Preparation was skilled, embodied labor.",
    flavorSource: "levigation and comminution of minerals, a standard first operation",
    scholarship: "Pamela Smith on artisanal epistemology; Newman & Principe on chymical practice",
  },
  {
    id: "researchDesk",
    name: "Assay Balance",
    emoji: "⚖️",
    description: "Assay by weight: pay 1 Ingredient to master the next technique (+1 VP each).",
    passive: false,
    flavor:
      "The balance made chymistry quantitative. Weighing before and after, Boyle and Newton proved that matter was conserved through the operations — the assay does not lie.",
    flavorSource: "gravimetric assay; the mass-balance of the 17th-c. laboratory",
    scholarship: "Newman & Principe, Alchemy Tried in the Fire (2002), on quantitative chymistry",
  },
  {
    id: "patronsCabinet",
    name: "Cupellation Furnace",
    emoji: "🏵️",
    description: "Assay & refine: complete the current refining job to prove fine metal (VP).",
    passive: false,
    flavor:
      "On a bone-ash cupel, a blast of air drives the base metals into the ash as litharge and leaves a bright bead of pure gold or silver — the fire assay, the truest test of the work.",
    flavorSource: "cupellation and the fire assay; parting and cementation",
    scholarship: "Martinón-Torres & Rehren on assay archaeology; Roos, The Salt of the Earth",
  },
  {
    id: "fumeHood",
    name: "Furnace Hood",
    emoji: "🌬️",
    description: "Passive: negates the first sickening effect each round.",
    passive: true,
    flavor:
      "A hood and flue drew off the poisons the work really made. Residues from Tycho's Uraniborg laboratory still carry mercury, arsenic, and lead.",
    flavorSource: "Uraniborg laboratory residues, excavated 1988–90",
    scholarship: "Moran, Distilling Knowledge; the courtly laboratory as a real workspace",
  },
  {
    id: "safetyShower",
    name: "Quenching Trough",
    emoji: "🚿",
    description: "Passive: one free healing step each round during the Healing phase.",
    passive: true,
    flavor:
      "Every furnace-house kept water to hand against burns and fire. The metallurgical manuals treat such hazards as routine, not exceptional.",
    flavorSource: "Biringuccio, De la pirotechnia (1540); Agricola, De re metallica (1556)",
    scholarship: "Moran on chymistry's craft matrix in metallurgy and the arts of fire",
  },
  {
    id: "neutralizationStation",
    name: "Salt-of-Tartar Bath",
    emoji: "🧂",
    description: "Passive: cancel one acid disaster entirely, once per game.",
    passive: true,
    flavor:
      "Fixed alkali — salt of tartar — swallowed the strong acids with a hiss. The acid–alkali reaction was hard-won chymical knowledge, not lore.",
    flavorSource: "salt of tartar (potash) vs. the mineral acids, 16th–17th c.",
    scholarship: "Newman & Principe on chymistry as reproducible experimental knowledge",
  },
];

// Ordered so research pays off economically FIRST (Advanced Distillation), making a
// research-led opening a real engine choice rather than a purely defensive one.
export const RESEARCH_TRACK: ResearchUpgrade[] = [
  {
    id: "advancedDistillation",
    name: "Cohobation",
    emoji: "⚗️",
    description: "Redistilling the draw-off enriches the yield: the Alembic gives +1 Metal. (Moran, Distilling Knowledge)",
  },
  {
    id: "safetyShower",
    name: "Quenching Trough",
    emoji: "🚿",
    description: "Adds the Quenching Trough: one free healing step per round.",
  },
  {
    id: "neutralizationStation",
    name: "Salt-of-Tartar Bath",
    emoji: "🧂",
    description: "Adds the Salt-of-Tartar Bath: cancel one acid disaster per game.",
  },
];

// Ids of disasters the Neutralization Station can cancel.
export const ACID_DISASTERS = new Set(["hydrochloricSpill", "nitricBurn", "sodiumHydroxideSplash"]);

// 12-card deck. The deck is built in escalation-ladder order:
// rounds 1-4 draw minor, 5-8 major, 9-10 catastrophic.
export const DISASTERS: DisasterCard[] = [
  // ── Minor ────────────────────────────────────────────────
  {
    id: "sulphurFire",
    name: "Sulphur Fire",
    emoji: "🔥",
    severity: "minor",
    effectText: "Choking fumes: one working alchemist becomes Sickened.",
    preventionText: "Smother it with sand: pay 1 Ingredient.",
    preventionCost: { ingredients: 1 },
    flavor: "The brimstone catches, and a blue flame licks the rafters.",
  },
  {
    id: "sodiumHydroxideSplash",
    name: "Sodium Hydroxide Splash",
    emoji: "🧫",
    severity: "minor",
    effectText: "Caustic burn: one working alchemist becomes Injured.",
    preventionText: "Douse with diluted vinegar: pay 1 Gold.",
    preventionCost: { gold: 1 },
    flavor: "The lye bites deeper than any blade.",
  },
  {
    id: "leadContamination",
    name: "Lead Contamination",
    emoji: "🩹",
    severity: "minor",
    effectText: "Tainted stores: lose 2 Ingredients.",
    preventionText: "Line the vessels: pay 2 Metals.",
    preventionCost: { metals: 2 },
    flavor: "A sweetness in the wine that should not be there.",
  },
  {
    id: "equipmentFailure",
    name: "Equipment Failure",
    emoji: "⚙️",
    severity: "minor",
    effectText: "The Workbench jams and is unusable next round.",
    preventionText: "Pay 1 Gold for repairs.",
    preventionCost: { gold: 1 },
    flavor: "The bellows wheeze, the clamps slip, the work waits.",
  },
  // ── Major ────────────────────────────────────────────────
  {
    id: "hydrochloricSpill",
    name: "Hydrochloric Acid Spill",
    emoji: "🫗",
    severity: "major",
    effectText: "One working alchemist becomes Injured and you lose 1 Ingredient.",
    preventionText: "Neutralize with soda stock: pay 1 Gold.",
    preventionCost: { gold: 1 },
    flavor: "The caustic fumes eat away at both flesh and fabric.",
  },
  {
    id: "mercuryVapor",
    name: "Mercury Vapor Leak",
    emoji: "☿",
    severity: "major",
    effectText: "Quicksilver haze: every working alchemist becomes Sickened.",
    preventionText: "Seal the retort with lead and pay to vent the vapors: 1 Metal and 1 Gold.",
    preventionCost: { metals: 1, gold: 1 },
    flavor: "The toxic mercury seeps into every crevice, contaminating all it touches.",
  },
  {
    id: "chlorineGas",
    name: "Chlorine Gas",
    emoji: "☁️",
    severity: "major",
    effectText: "Green cloud: every alchemist's condition worsens one step.",
    preventionText: "Wet cloths over every face: pay 2 Ingredients.",
    preventionCost: { ingredients: 2 },
    flavor: "The poisonous gas chokes and debilitates, leaving them gasping for breath.",
  },
  {
    id: "arsenicExposure",
    name: "Arsenic Exposure",
    emoji: "☠️",
    severity: "major",
    effectText: "One working alchemist becomes Sickened and you lose 1 Potion.",
    preventionText: "Prophylactic dose: pay 1 Medicine.",
    preventionCost: { medicine: 1 },
    flavor: "The poison seeps into every concoction, rendering them useless.",
  },
  // ── Catastrophic ─────────────────────────────────────────
  {
    id: "crucibleExplosion",
    name: "Crucible Explosion",
    emoji: "💥",
    severity: "catastrophic",
    effectText: "Molten spray: one working alchemist becomes Critical; the Crucible is unusable next round.",
    preventionText: "Swap in a Hessian crucible, proof against thermal shock: pay 2 Gold and 1 Metal.",
    preventionCost: { gold: 2, metals: 1 },
    flavor: "The blast sends molten metal everywhere, sparing no one.",
  },
  {
    id: "nitricBurn",
    name: "Nitric Acid Burn",
    emoji: "🧪",
    severity: "catastrophic",
    effectText: "Aqua fortis erupts: one working alchemist becomes Critical.",
    preventionText: "Milk and soda bath: pay 1 Gold and 1 Ingredient.",
    preventionCost: { gold: 1, ingredients: 1 },
    flavor: "A sudden eruption of acid renders both flesh and elixir useless.",
  },
  {
    id: "dimethylmercury",
    name: "Dimethylmercury Incident",
    emoji: "🧤",
    severity: "catastrophic",
    effectText: "A drop through the glove: one alchemist becomes Critical.",
    preventionText: "Immediate chelation: pay 1 Medicine.",
    preventionCost: { medicine: 1 },
    flavor: "The highly toxic spill leaves a trail of sickness and delay.",
  },
  {
    id: "fumeBackflow",
    name: "Fume Backflow",
    emoji: "🌫️",
    severity: "catastrophic",
    effectText: "The hood reverses: every working alchemist becomes Sickened. The Fume Hood cannot negate this.",
    preventionText: "Vent the chimney flue: pay 2 Ingredients.",
    preventionCost: { ingredients: 2 },
    flavor: "The lingering stench saps the vitality of any who enter.",
  },
];

export const DISASTER_BY_ID = new Map(DISASTERS.map((d) => [d.id, d]));
export const FURNITURE_BY_ID = new Map(FURNITURE.map((f) => [f.id, f]));
