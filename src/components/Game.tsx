"use client";

import { useEffect, useRef, useState } from "react";
import {
  BASE_BUILDABLE,
  BUILD_COST,
  COMMISSION_BY_ID,
  FURNITURE,
  GRAND_TRANSMUTATION_ROUND,
  MAX_ROUNDS,
  PATRONS,
  PATRON_BY_ID,
  PERSONA_BY_SLUG,
  RECIPES,
} from "@/lib/game/data";
import { canAfford, canWork, newGame, reduce } from "@/lib/game/engine";
import type {
  FurnitureId,
  GameState,
  RecipeId,
  Resources,
  WorkerHealth,
} from "@/lib/game/types";

const SAVE_KEY = "alchemists-lab-save-v1";

// Signature mechanic: worker tokens change color with their condition.
const HEALTH_STYLE: Record<WorkerHealth, { label: string; chip: string; dot: string }> = {
  healthy: { label: "Healthy", chip: "border-emerald-600 text-emerald-300", dot: "bg-emerald-400" },
  sickened: { label: "Sickened", chip: "border-yellow-600 text-yellow-300", dot: "bg-yellow-400" },
  injured: { label: "Injured", chip: "border-red-600 text-red-300", dot: "bg-red-500" },
  critical: { label: "CRITICAL", chip: "border-red-400 text-red-200 animate-pulse", dot: "bg-red-700" },
  dead: { label: "Dead", chip: "border-zinc-700 text-zinc-500 line-through", dot: "bg-zinc-700" },
};

const RESOURCE_META: { key: keyof Resources; label: string; emoji: string }[] = [
  { key: "ingredients", label: "Ingredients", emoji: "🌿" },
  { key: "metals", label: "Metals", emoji: "⛏️" },
  { key: "gold", label: "Gold", emoji: "🪙" },
  { key: "medicine", label: "Medicine", emoji: "💊" },
  { key: "potions", label: "Potions", emoji: "🧪" },
  { key: "advancedPotions", label: "Adv. Potions", emoji: "✨" },
];

const PHASE_META: Record<string, { label: string; color: string; hint: string }> = {
  patronSelect: {
    label: "Choose a Patron",
    color: "bg-purple-900/60 border-purple-700 text-purple-200",
    hint: "Every alchemist works for a prince. Choose your patron — and your contract.",
  },
  placement: {
    label: "Placement",
    color: "bg-sky-900/60 border-sky-700 text-sky-200",
    hint: "Select an alchemist, then build a new tile (dashed) or operate one you own. Confirm to run production.",
  },
  disaster: {
    label: "Disaster",
    color: "bg-red-900/60 border-red-700 text-red-200",
    hint: "Pay the prevention cost, or accept the consequences.",
  },
  healing: {
    label: "Healing",
    color: "bg-emerald-900/60 border-emerald-700 text-emerald-200",
    hint: "Spend Medicine to heal. CRITICAL alchemists die at the end of this phase.",
  },
  gameOver: { label: "Game Over", color: "bg-amber-900/60 border-amber-700 text-amber-200", hint: "" },
};

function costText(cost: Partial<Resources>): string {
  return RESOURCE_META.filter((m) => cost[m.key])
    .map((m) => `${cost[m.key]}${m.emoji}`)
    .join(" + ");
}

export default function Game() {
  // Fixed seed for the SSR pass so server and client markup match;
  // the mount effect swaps in the saved game or a random seed.
  const [s, setState] = useState<GameState>(() => newGame(1));
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [recipePickerOpen, setRecipePickerOpen] = useState(false);
  const [dailyInfo, setDailyInfo] = useState<{ date: string; seed: number } | null>(null);
  const hydrated = useRef(false);

  const dispatchAndClear = (action: Parameters<typeof reduce>[1]) => {
    setState((prev) => reduce(prev, action));
  };

  // Restore save once on mount; persist on every change after.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      // One-shot save restore on mount; SSR renders the fixed-seed placeholder.
      setState(() => {
        try {
          const raw = localStorage.getItem(SAVE_KEY);
          if (raw) {
            const saved = JSON.parse(raw) as GameState;
            if (saved && Array.isArray(saved.workers) && saved.phase) return saved;
          }
        } catch {
          /* corrupted save — start fresh */
        }
        return newGame();
      });
      return;
    }
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      /* storage full/blocked — play on without saving */
    }
  }, [s]);
  const phaseMeta = PHASE_META[s.phase];
  const patron = PATRON_BY_ID.get(s.patron)!;
  const placedCount = s.workers.filter((w) => w.placedOn !== null).length;
  const availableWorkers = s.workers.filter((w) => canWork(w) && w.placedOn === null);
  const grandAvailable =
    s.phase === "placement" &&
    s.round >= GRAND_TRANSMUTATION_ROUND &&
    !s.grandAttempted &&
    canAfford(s.resources, { potions: 1, metals: 2, gold: 1 }) &&
    s.workers.some((w) => w.health === "healthy" && w.placedOn === null && !w.exhausted);

  function onTileClick(tileId: FurnitureId) {
    if (s.phase !== "placement" || !selectedWorker) return;
    // Unbuilt tile → construct it; built active tile → operate it.
    if (!s.furniture.includes(tileId)) {
      dispatchAndClear({ type: "buildTile", workerId: selectedWorker, tileId });
      setSelectedWorker(null);
      return;
    }
    if (tileId === "crucible") {
      setRecipePickerOpen(true);
      return;
    }
    dispatchAndClear({ type: "placeWorker", workerId: selectedWorker, tileId });
    setSelectedWorker(null);
  }

  // All tiles that can appear on the board: the buildable base plus any research-
  // granted tiles already unlocked. Deduped, stable order.
  const boardTiles: FurnitureId[] = [
    ...BASE_BUILDABLE,
    ...s.furniture.filter((f) => !BASE_BUILDABLE.includes(f)),
  ];

  function buildCostText(tileId: FurnitureId): string {
    const cost = BUILD_COST[tileId];
    const parts = RESOURCE_META.filter((m) => cost[m.key]).map((m) => `${cost[m.key]}${m.emoji}`);
    return parts.length ? parts.join(" + ") : "free";
  }

  function commissionCostText(cost: Partial<Resources>): string {
    return RESOURCE_META.filter((m) => cost[m.key]).map((m) => `${cost[m.key]}${m.emoji}`).join(" + ");
  }

  const currentCommission = s.commissionDeck.length ? COMMISSION_BY_ID.get(s.commissionDeck[0]) : undefined;

  function onRecipePick(recipe: RecipeId) {
    if (!selectedWorker) return;
    dispatchAndClear({ type: "placeWorker", workerId: selectedWorker, tileId: "crucible", recipe });
    setSelectedWorker(null);
    setRecipePickerOpen(false);
  }

  async function startDaily() {
    try {
      const res = await fetch("/api/daily");
      const info = (await res.json()) as { date: string; seed: number };
      setDailyInfo(info);
      setState(newGame(info.seed));
      setSelectedWorker(null);
    } catch {
      /* offline — regular new game still works */
    }
  }

  function startNew() {
    setDailyInfo(null);
    setState(newGame());
    setSelectedWorker(null);
  }

  // ── Patron selection screen (v2.0) ──
  if (s.phase === "patronSelect") {
    return (
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4 text-amber-50">
        <header className="rounded-xl border-2 border-amber-800/60 bg-stone-900/80 px-4 py-3">
          <h1 className="font-serif text-2xl font-bold tracking-wide text-amber-200">⚗️ The Alchemist&apos;s Lab</h1>
          <p className="mt-1 text-sm text-purple-200">
            An alchemist works for a prince. Choose your patron — their stipend funds the lab, their
            contract sets your task, and their court can put you on trial. You play{" "}
            <b>{s.workers.map((w) => w.name).join(" & ")}</b>.
          </p>
        </header>
        <div className="grid gap-3 md:grid-cols-2">
          {PATRONS.map((p) => {
            const affinity = p.affinityPersona && s.workers.some((w) => w.persona === p.affinityPersona);
            return (
              <button
                key={p.id}
                onClick={() => {
                  setState(reduce(s, { type: "choosePatron", patron: p.id }));
                  setSelectedWorker(null);
                }}
                className="flex flex-col gap-2 rounded-xl border-2 border-amber-800/70 bg-stone-950 p-4 text-left transition hover:border-amber-500 hover:bg-amber-950/30"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-lg font-semibold text-amber-100">{p.name}</span>
                  <span className="text-xs text-stone-400">{p.court}</span>
                </div>
                <p className="text-xs leading-relaxed text-stone-300">{p.bio}</p>
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-amber-200/90">
                  <span>📜 {p.demand}</span>
                  <span>🎁 {p.reward}</span>
                  <span>💰 Stipend: {commissionCostText(p.stipend) || "—"}/round</span>
                  <span>⚖️ Trial at {p.suspicionThreshold} suspicion</span>
                </div>
                <p className="text-[11px] italic text-stone-500">⚠ {p.risk}</p>
                {affinity && (
                  <p className="text-[11px] text-emerald-400">
                    ✦ {p.affinityNote} — you begin with their favor (+2 standing).
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4 text-amber-50">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-800/60 bg-stone-900/80 px-4 py-3">
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-wide text-amber-200">
            ⚗️ The Alchemist&apos;s Lab
          </h1>
          <p className="text-xs text-amber-500/80">
            {dailyInfo ? `Daily challenge · ${dailyInfo.date}` : `Seed ${s.seed}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg border border-amber-700 bg-stone-800 px-3 py-1">
            Round <b>{s.round}</b>/{MAX_ROUNDS}
          </span>
          <span className={`rounded-lg border px-3 py-1 font-semibold ${phaseMeta.color}`}>
            {phaseMeta.label}
          </span>
          <span className="rounded-lg border border-amber-500 bg-amber-950 px-3 py-1 text-amber-200">
            🏆 <b>{s.vp}</b>/{patron.quota} Work
          </span>
          <button
            onClick={startNew}
            className="rounded-lg border border-stone-600 bg-stone-800 px-3 py-1 hover:bg-stone-700"
          >
            New Game
          </button>
          <button
            onClick={startDaily}
            className="rounded-lg border border-sky-700 bg-sky-950 px-3 py-1 text-sky-200 hover:bg-sky-900"
          >
            Daily
          </button>
        </div>
      </header>

      {/* Resources */}
      <div className="flex flex-wrap gap-2">
        {RESOURCE_META.map((m) => (
          <div
            key={m.key}
            className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900/80 px-3 py-1.5 text-sm"
            title={m.label}
          >
            <span>{m.emoji}</span>
            <span className="font-bold tabular-nums">{s.resources[m.key]}</span>
            <span className="text-xs text-stone-400">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Court / patronage bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-purple-900/70 bg-purple-950/30 px-4 py-2 text-sm">
        <span className="font-serif text-purple-100" title={patron.bio}>
          🏛️ {patron.name} <span className="text-xs text-purple-300/80">of {patron.court}</span>
        </span>
        <span className="text-xs text-purple-200/90">
          Contract: {s.vp}/{patron.quota} Work by round {patron.deadline}
        </span>
        <span className="text-xs text-emerald-300">🤝 Standing {s.standing}</span>
        <span
          className="flex items-center gap-1.5 text-xs"
          title="A death, a failed transmutation, or the rival court's denunciations raise Suspicion. Cross the threshold and you face a trial."
        >
          <span className={s.suspicion >= patron.suspicionThreshold - 2 ? "text-red-400" : "text-amber-300"}>
            👁️ Suspicion
          </span>
          <span className="flex h-2 w-24 overflow-hidden rounded-full bg-stone-800">
            <span
              className={`h-full ${s.suspicion >= patron.suspicionThreshold - 2 ? "bg-red-600" : "bg-amber-600"}`}
              style={{ width: `${Math.min(100, (s.suspicion / patron.suspicionThreshold) * 100)}%` }}
            />
          </span>
          <span className="tabular-nums text-stone-400">
            {s.suspicion}/{patron.suspicionThreshold}
          </span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,360px)]">
        <main className="flex flex-col gap-4">
          {/* Phase hint */}
          <p className={`rounded-lg border px-3 py-2 text-sm ${phaseMeta.color}`}>{phaseMeta.hint}</p>

          {/* Workers */}
          <section className="rounded-xl border-2 border-stone-700 bg-stone-900/60 p-3">
            <h2 className="mb-2 font-serif text-sm font-semibold uppercase tracking-widest text-stone-400">
              Alchemists
            </h2>
            <div className="flex flex-wrap gap-2">
              {s.workers.map((w) => {
                const hs = HEALTH_STYLE[w.health];
                const persona = PERSONA_BY_SLUG.get(w.persona);
                const selectable = s.phase === "placement" && canWork(w);
                const selected = selectedWorker === w.id;
                return (
                  <button
                    key={w.id}
                    disabled={!selectable && s.phase !== "healing"}
                    title={persona ? `${persona.bio}\n\n${persona.abilityName}: ${persona.abilityText}` : undefined}
                    onClick={() => {
                      if (s.phase === "placement") {
                        if (w.placedOn) {
                          dispatchAndClear({ type: "unplaceWorker", workerId: w.id });
                          setSelectedWorker(w.id);
                        } else {
                          setSelectedWorker(selected ? null : w.id);
                        }
                      } else if (s.phase === "healing") {
                        dispatchAndClear({ type: "healWorker", workerId: w.id });
                      }
                    }}
                    className={`flex flex-col gap-0.5 rounded-xl border-2 bg-stone-950 px-3 py-2 text-left transition ${hs.chip} ${
                      selected ? "ring-2 ring-sky-400" : ""
                    } ${selectable || s.phase === "healing" ? "hover:bg-stone-800" : "opacity-70"}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`inline-block h-3 w-3 rounded-full ${hs.dot}`} />
                      <span className="font-semibold">
                        {w.illuminated ? "🌟 " : ""}
                        {w.name}
                      </span>
                      <span className="text-xs">{hs.label}</span>
                      {w.placedOn && (
                        <span className="text-xs text-stone-400">→ {FURNITURE.find((f) => f.id === w.placedOn)?.name}</span>
                      )}
                      {w.exhausted && <span className="text-xs text-stone-500">(spent)</span>}
                    </span>
                    {persona && (
                      <span className="text-[11px] text-amber-500/90">✦ {persona.abilityName}</span>
                    )}
                  </button>
                );
              })}
              {s.phase === "healing" && (
                <span className="self-center text-xs text-stone-400">
                  💊 {s.resources.medicine} Medicine
                  {s.upgrades.includes("safetyShower") && !s.safetyShowerUsedThisRound
                    ? " · 🚿 free heal available"
                    : ""}{" "}
                  — click an ailing alchemist to heal one step.
                </span>
              )}
            </div>
          </section>

          {/* Lab tiles */}
          <section className="rounded-xl border-2 border-stone-700 bg-stone-900/60 p-3">
            <h2 className="mb-2 font-serif text-sm font-semibold uppercase tracking-widest text-stone-400">
              Laboratory
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {boardTiles.map((fid) => {
                const tile = FURNITURE.find((f) => f.id === fid)!;
                const built = s.furniture.includes(fid);
                const broken = s.brokenFurniture[fid] !== undefined;
                const occupant = s.workers.find((w) => w.placedOn === fid);
                const canBuildNow =
                  s.phase === "placement" &&
                  selectedWorker !== null &&
                  !built &&
                  canAfford(s.resources, BUILD_COST[fid]);
                const canOperate =
                  s.phase === "placement" && selectedWorker !== null && built && !tile.passive && !broken && !occupant;
                const targetable = canBuildNow || canOperate;
                return (
                  <div key={fid} className="relative">
                    <button
                      onClick={() => onTileClick(fid)}
                      disabled={!targetable}
                      className={`flex h-full w-full flex-col gap-1 rounded-xl border-2 p-3 text-left transition ${
                        !built
                          ? "border-dashed border-stone-600 bg-stone-950/40 opacity-90"
                          : broken
                            ? "border-red-900 bg-red-950/40 opacity-60"
                            : tile.passive
                              ? "border-stone-700 bg-stone-950/60"
                              : "border-amber-800/70 bg-stone-950"
                      } ${canBuildNow ? "cursor-pointer ring-1 ring-emerald-500/60 hover:bg-emerald-950/30" : ""} ${
                        canOperate ? "cursor-pointer ring-1 ring-sky-500/60 hover:bg-sky-950/40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl ${!built ? "grayscale" : ""}`}>{tile.emoji}</span>
                        <span className={`font-serif font-semibold ${built ? "text-amber-100" : "text-stone-400"}`}>
                          {tile.name}
                        </span>
                        {!built && (
                          <span className="ml-auto rounded border border-emerald-800 bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                            build {buildCostText(fid)}
                          </span>
                        )}
                        {broken && <span className="text-xs font-bold text-red-400">BROKEN</span>}
                        {built && tile.passive && <span className="text-[10px] uppercase text-stone-500">passive</span>}
                      </div>
                      <p className="text-xs text-stone-300">{tile.description}</p>
                      {fid === "patronsCabinet" && built && currentCommission && (
                        <p className="rounded border border-amber-800/60 bg-amber-950/40 px-1.5 py-1 text-[11px] text-amber-200">
                          Assay: <b>{currentCommission.name}</b> — spend {commissionCostText(currentCommission.cost)} for{" "}
                          <b>+{currentCommission.vp} VP</b>
                        </p>
                      )}
                      <p className="mt-auto text-[11px] italic text-stone-500">
                        &ldquo;{tile.flavor}&rdquo; — {tile.flavorSource}
                      </p>
                      <p className="text-[10px] text-amber-700/80">📖 {tile.scholarship}</p>
                      {occupant && (
                        <span className="absolute right-2 top-2 rounded-full border border-sky-600 bg-sky-950 px-2 py-0.5 text-xs text-sky-200">
                          {occupant.name}
                        </span>
                      )}
                    </button>
                    {/* Crucible recipe picker */}
                    {fid === "crucible" && recipePickerOpen && selectedWorker && (
                      <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-xl border-2 border-amber-700 bg-stone-900 p-2 shadow-xl">
                        <p className="mb-1 text-xs text-amber-300">What shall we fire this round?</p>
                        {RECIPES.map((r) => {
                          const affordable = canAfford(s.resources, r.cost);
                          return (
                            <button
                              key={r.id}
                              onClick={() => onRecipePick(r.id)}
                              className={`mb-1 flex w-full items-center justify-between rounded-lg border px-2 py-1.5 text-sm ${
                                affordable
                                  ? "border-amber-700 bg-stone-950 hover:bg-amber-950/50"
                                  : "border-stone-700 bg-stone-950 opacity-50"
                              }`}
                            >
                              <span>
                                {r.emoji} {r.name}
                              </span>
                              <span className="text-xs text-stone-400">
                                {costText(r.cost)} · {r.vpNote}
                              </span>
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setRecipePickerOpen(false)}
                          className="w-full rounded-lg border border-stone-700 px-2 py-1 text-xs text-stone-400 hover:bg-stone-800"
                        >
                          cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Actions */}
          {s.phase === "placement" && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setSelectedWorker(null);
                  setRecipePickerOpen(false);
                  dispatchAndClear({ type: "confirmPlacement" });
                }}
                className="rounded-xl border-2 border-amber-600 bg-amber-900/70 px-5 py-2 font-serif text-lg font-semibold text-amber-100 hover:bg-amber-800"
              >
                ⏳ Begin the Work ({placedCount} placed)
              </button>
              {grandAvailable && (
                <button
                  onClick={() => {
                    const worker = s.workers.find(
                      (w) => w.health === "healthy" && w.placedOn === null && !w.exhausted,
                    );
                    if (worker) dispatchAndClear({ type: "attemptGrandExperiment", workerId: worker.id });
                    setSelectedWorker(null);
                  }}
                  className="animate-pulse rounded-xl border-2 border-yellow-400 bg-yellow-950 px-5 py-2 font-serif text-lg font-semibold text-yellow-200 hover:bg-yellow-900"
                  title="Chrysopoeia — the gold-making Great Work. Costs 1 Potion + 2 Metals + 1 Gold. 50/50: +4 VP and Illumination, or your alchemist goes CRITICAL. (Principe reconstructed the 'Philosophers' Tree' by this route.)"
                >
                  🌟 The Chrysopoeia (1🧪+2⛏️+1🪙 — all or nothing)
                </button>
              )}
              {selectedWorker && (
                <button
                  onClick={() => {
                    dispatchAndClear({ type: "seekAudience", workerId: selectedWorker });
                    setSelectedWorker(null);
                  }}
                  className="rounded-xl border-2 border-purple-600 bg-purple-950/70 px-4 py-2 font-serif font-semibold text-purple-100 hover:bg-purple-900"
                  title={`Send the selected alchemist to court instead of the lab: −${3} Suspicion, +1 Standing. Costs their action this round.`}
                >
                  🏛️ Seek Audience (−suspicion)
                </button>
              )}
              {availableWorkers.length > 0 && !selectedWorker && (
                <span className="text-sm text-stone-400">
                  {availableWorkers.length} alchemist{availableWorkers.length > 1 ? "s" : ""} idle · select one to place or send to court
                </span>
              )}
            </div>
          )}
          {s.phase === "healing" && (
            <button
              onClick={() => dispatchAndClear({ type: "endHealing" })}
              className="self-start rounded-xl border-2 border-emerald-600 bg-emerald-900/70 px-5 py-2 font-serif text-lg font-semibold text-emerald-100 hover:bg-emerald-800"
            >
              🌙 End the Round
            </button>
          )}
        </main>

        {/* Chronicle (log) */}
        <aside className="flex max-h-[70vh] flex-col rounded-xl border-2 border-stone-700 bg-stone-900/60 p-3">
          <h2 className="mb-2 font-serif text-sm font-semibold uppercase tracking-widest text-stone-400">
            Laboratory Journal
          </h2>
          <div className="flex flex-col-reverse gap-1 overflow-y-auto text-sm">
            {[...s.log].reverse().map((entry, i) => (
              <p
                key={s.log.length - i}
                className={
                  entry.tone === "bad"
                    ? "text-red-300"
                    : entry.tone === "good"
                      ? "text-emerald-300"
                      : entry.tone === "gold"
                        ? "font-semibold text-amber-300"
                        : "text-stone-400"
                }
              >
                {entry.text}
              </p>
            ))}
          </div>
        </aside>
      </div>

      {/* Disaster modal — prevention cost always shown BEFORE the effect applies */}
      {s.phase === "disaster" && s.pendingDisaster && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border-4 border-red-800 bg-stone-950 p-5 shadow-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-red-400">
              {s.pendingDisaster.card.severity} disaster
            </p>
            <h3 className="mt-1 font-serif text-2xl font-bold text-red-200">
              {s.pendingDisaster.card.emoji} {s.pendingDisaster.card.name}
            </h3>
            <p className="mt-2 text-sm italic text-stone-400">&ldquo;{s.pendingDisaster.card.flavor}&rdquo;</p>
            <div className="mt-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-100">
              <b>If unchecked:</b> {s.pendingDisaster.card.effectText}
            </div>
            <div className="mt-2 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-100">
              <b>Prevention:</b> {s.pendingDisaster.card.preventionText}{" "}
              <span className="font-bold">({costText(s.pendingDisaster.card.preventionCost)})</span>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => dispatchAndClear({ type: "resolveDisaster", prevent: true })}
                disabled={!s.pendingDisaster.canPrevent}
                className={`flex-1 rounded-xl border-2 px-4 py-2 font-semibold ${
                  s.pendingDisaster.canPrevent
                    ? "border-emerald-600 bg-emerald-900/70 text-emerald-100 hover:bg-emerald-800"
                    : "border-stone-700 bg-stone-900 text-stone-500"
                }`}
              >
                Prevent {costText(s.pendingDisaster.card.preventionCost)}
              </button>
              <button
                onClick={() => dispatchAndClear({ type: "resolveDisaster", prevent: false })}
                className="flex-1 rounded-xl border-2 border-red-700 bg-red-950 px-4 py-2 font-semibold text-red-200 hover:bg-red-900"
              >
                Accept the Consequences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game over */}
      {s.phase === "gameOver" && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/80 p-4">
          <div
            className={`w-full max-w-md rounded-2xl border-4 p-6 text-center shadow-2xl ${
              s.outcome === "won"
                ? "border-amber-500 bg-amber-950"
                : s.trialOutcome === "execution"
                  ? "border-red-800 bg-red-950/60"
                  : "border-stone-600 bg-stone-950"
            }`}
          >
            <h3 className="font-serif text-3xl font-bold text-amber-100">
              {s.outcome === "won"
                ? "🌟 Your Independence"
                : s.trialOutcome === "execution"
                  ? "⚖️ The Day of Justice"
                  : s.trialOutcome === "exile"
                    ? "🚪 Banished"
                    : "🕯️ The Fire Goes Out"}
            </h3>
            <p className="mt-3 text-amber-200/90">{s.outcomeText}</p>
            <p className="mt-2 text-sm text-stone-400">
              Final score: <b className="text-amber-300">{s.vp} VP</b> · Seed {s.seed}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={startNew}
                className="rounded-xl border-2 border-amber-600 bg-amber-900/70 px-5 py-2 font-semibold text-amber-100 hover:bg-amber-800"
              >
                Once more into the athanor
              </button>
              <button
                onClick={startDaily}
                className="rounded-xl border-2 border-sky-700 bg-sky-950 px-5 py-2 font-semibold text-sky-200 hover:bg-sky-900"
              >
                Daily challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
