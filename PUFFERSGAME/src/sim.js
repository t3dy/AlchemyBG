/* Puffers — pure simulation core (no DOM, deterministic).
 *
 * The "puffer" (souffleur / Bläser) is the period slur for the charlatan who
 * just worked the bellows hoping for gold. Here: too few gnomes, too many
 * bellows, and a lab full of glass that boils over into Rube-Goldberg
 * catastrophe the moment a furnace drifts out of its temperature band.
 *
 * This module is the single source of truth for the RULES. All three genre
 * variants (tick / real-time / pausable) drive THIS exact simulation; they
 * only differ in how they call step(). Keep it free of window/document/canvas
 * so it can be unit-tested under node.
 */
(function (global) {
  'use strict';

  // Seeded RNG (mulberry32) — matches the root project's determinism ethos.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // ---- Tuning (all rates are per real second) -----------------------------
  const T = {
    gnomePump: 19,      // temp/s a fresh gnome adds while jumping the bellows
    homPump: 23,        // homunculus pumps harder...
    windedMult: 0.32,   // ...a winded gnome barely puffs
    staminaMax: 100,
    staminaDrain: 12,   // while pumping
    staminaRefill: 16,  // while resting
    windedRecover: 26,  // stamina above this clears the "winded" flag
    processRate: 7,     // progress/s while temp is inside the band (per furnace override below)
    overFactor: 0.9,    // overheat gained per (degree-over-band) per second
    coolFactor: 22,     // overheat bled off per second when back in band
    quenchTemp: 48,     // a quench drops this much temperature
    quenchOver: 60,     // ...and this much overheat
    quenchCd: 5,        // seconds before a furnace can be quenched again
    cascadeInt: 20,     // lab integrity lost per boil-over
    cascadeIntAcid: 32, // ...worse for the acid retort
    spoil: 42,          // process progress destroyed by a boil-over
    fumeKo: 4.0,        // seconds a gnome is knocked out by fumes
    fumeKoAcid: 5.5,
    spreadOver: 30,     // overheat splashed onto each neighbour
    spreadTemp: 16,     // temp spike splashed onto each neighbour
    boilCool: 46,       // temp lost by the furnace that boiled over
    homLife: 46,        // seconds before a homunculus destabilises and pops
    homPop: 12,         // integrity lost when a homunculus pops
    tempMax: 138,
  };

  // Four furnaces. Ids are also their left-to-right order (neighbours = id±1).
  // Bands, heat-loss and product are grounded in the real apparatus.
  const FURNACE_DEFS = [
    { id: 0, name: 'Alembic',  op: 'Distillation', product: 'Spirit of Wine',
      bandMin: 46, bandMax: 76, heatLoss: 5.5, rate: 7.0, acid: false, cradle: false },
    { id: 1, name: 'Retort',   op: 'Aqua Fortis',  product: 'Aqua Fortis',
      bandMin: 66, bandMax: 86, heatLoss: 6.5, rate: 6.6, acid: true,  cradle: false },
    { id: 2, name: 'Aludel',   op: 'Sublimation',  product: 'Flowers of Sulphur',
      bandMin: 40, bandMax: 64, heatLoss: 5.0, rate: 7.0, acid: false, cradle: false },
    { id: 3, name: 'Cradle',   op: 'Generation',   product: 'Homunculus',
      bandMin: 30, bandMax: 52, heatLoss: 4.0, rate: 5.4, acid: false, cradle: true },
  ];

  const GNOME_NAMES = ['Blort', 'Pib', 'Gnorm', 'Wick', 'Snuff'];
  const HOM_QUIPS = [
    'It looks... judgmental.',
    'It smells of wet dog and ambition.',
    'It blinks too many times.',
    'It is already unionising.',
  ];

  function makeGnome(id, name) {
    return { id, kind: 'gnome', name, furnace: null, stamina: T.staminaMax,
      winded: false, ko: 0 };
  }
  function makeHomunculus(id) {
    return { id, kind: 'homunculus', name: 'Homunculus', furnace: null,
      ko: 0, destabilize: 0 };
  }

  function createState(seed) {
    seed = (seed >>> 0) || 1;
    const rng = mulberry32(seed);
    const furnaces = FURNACE_DEFS.map((d) => ({
      ...d,
      temp: d.bandMin + 2,   // start just inside the band: a grace, then it drifts
      overheat: 0,
      progress: 0,
      done: false,
      quenchCd: 0,
      flash: 0,              // visual boil-over flash timer (render only)
    }));
    const state = {
      seed, rng, t: 0, integrity: 100, status: 'playing',
      furnaces,
      workers: [makeGnome(0, GNOME_NAMES[0]), makeGnome(1, GNOME_NAMES[1])],
      messages: [], homunculiBirthed: 0, nextWorkerId: 2, score: 0, ticks: 0,
    };
    say(state, 'Two gnomes. Four bellows. Keep every furnace in its green band.', 'info');
    return state;
  }

  function say(state, text, tone) {
    state.messages.push({ t: state.t, text, tone: tone || 'info' });
    if (state.messages.length > 7) state.messages.shift();
  }

  // ---- Player actions ------------------------------------------------------
  function assign(state, workerId, furnaceId) {
    if (state.status !== 'playing') return false;
    const w = state.workers.find((x) => x.id === workerId);
    if (!w || w.ko > 0) return false;
    // One worker per bellows: bump whoever is already there back to the bench.
    const prev = state.workers.find((x) => x.furnace === furnaceId && x.id !== workerId);
    if (prev) prev.furnace = null;
    w.furnace = furnaceId;
    return true;
  }
  function unassign(state, workerId) {
    const w = state.workers.find((x) => x.id === workerId);
    if (w) w.furnace = null;
  }
  function quench(state, furnaceId) {
    if (state.status !== 'playing') return false;
    const f = state.furnaces[furnaceId];
    if (!f || f.quenchCd > 0) return false;
    f.temp = clamp(f.temp - T.quenchTemp, 0, T.tempMax);
    f.overheat = clamp(f.overheat - T.quenchOver, 0, 100);
    f.quenchCd = T.quenchCd;
    say(state, `Quench! ${f.name} hisses and settles.`, 'good');
    return true;
  }

  const neighbours = (state, f) =>
    state.furnaces.filter((o) => Math.abs(o.id - f.id) === 1);

  function activePumper(state, furnaceId) {
    return state.workers.find((w) => w.furnace === furnaceId && w.ko <= 0);
  }

  // ---- The simulation ------------------------------------------------------
  // step() sub-steps in small fixed slices so large dt (the tick variant's
  // half-second) stays numerically identical to real-time's per-frame dt.
  function step(state, dt) {
    if (state.status !== 'playing') return state;
    // Sub-step in fixed 1/60 slices so a big dt (the tick variant's 0.5s) is
    // numerically identical to real-time's per-frame dt. Cap only against a
    // pathological jump (e.g. the tab was backgrounded for seconds).
    let remaining = Math.min(dt, 1);
    const H = 1 / 60;
    while (remaining > 1e-6) {
      const h = Math.min(H, remaining);
      stepOnce(state, h);
      remaining -= h;
      if (state.status !== 'playing') break;
    }
    return state;
  }

  function stepOnce(state, h) {
    state.t += h;

    // Workers -------------------------------------------------------------
    const popped = [];
    for (const w of state.workers) {
      if (w.ko > 0) { w.ko = Math.max(0, w.ko - h); continue; }
      if (w.kind === 'gnome') {
        if (w.furnace != null) {
          w.stamina -= T.staminaDrain * h;
          if (w.stamina <= 0) { w.stamina = 0; w.winded = true; }
        } else {
          w.stamina = Math.min(T.staminaMax, w.stamina + T.staminaRefill * h);
          if (w.stamina > T.windedRecover) w.winded = false;
        }
      } else { // homunculus: tireless & fume-immune, but destabilises
        w.destabilize += (100 / T.homLife) * h;
        if (w.destabilize >= 100) popped.push(w);
      }
    }
    for (const w of popped) popHomunculus(state, w);

    // Furnaces ------------------------------------------------------------
    for (const f of state.furnaces) {
      if (f.quenchCd > 0) f.quenchCd = Math.max(0, f.quenchCd - h);
      if (f.flash > 0) f.flash = Math.max(0, f.flash - h);

      const w = activePumper(state, f.id);
      if (w) {
        const p = w.kind === 'homunculus'
          ? T.homPump
          : (w.winded ? T.gnomePump * T.windedMult : T.gnomePump);
        f.temp += p * h;
      }
      f.temp = clamp(f.temp - f.heatLoss * h, 0, T.tempMax);

      // Process advances only inside the band.
      if (!f.done && f.temp >= f.bandMin && f.temp <= f.bandMax) {
        f.progress += f.rate * h;
        if (f.progress >= 100) {
          if (f.cradle) { f.progress = 0; birthHomunculus(state, f); }
          else { f.progress = 100; f.done = true;
            say(state, `${f.name} yields ${f.product}! ✔`, 'good'); }
        }
      }

      // Overheat accrues above the band, cools inside it.
      if (f.temp > f.bandMax) f.overheat += (f.temp - f.bandMax) * T.overFactor * h;
      else f.overheat -= T.coolFactor * h;
      f.overheat = clamp(f.overheat, 0, 100);
      if (f.overheat >= 100) cascade(state, f);
    }

    // Win / lose ----------------------------------------------------------
    if (state.integrity <= 0) {
      state.integrity = 0; state.status = 'lost';
      say(state, 'The whole lab goes up. The puffers flee. 💥', 'bad');
    } else if (state.furnaces.every((f) => f.cradle || f.done)) {
      state.status = 'won';
      state.score = Math.max(0,
        Math.round(state.integrity * 10 - state.t * 2 + state.homunculiBirthed * 40));
      say(state, `The Work is complete! Score ${state.score}. 🏆`, 'good');
    }
  }

  function cascade(state, f) {
    state.integrity -= f.acid ? T.cascadeIntAcid : T.cascadeInt;
    if (!f.done) f.progress = Math.max(0, f.progress - T.spoil);
    const koT = f.acid ? T.fumeKoAcid : T.fumeKo;

    // Fumes throw the gnome off this bellows (homunculi shrug it off).
    const here = activePumper(state, f.id);
    if (here && here.kind === 'gnome') { here.ko = koT; here.furnace = null; }
    if (f.acid) {
      for (const n of neighbours(state, f)) {
        const nw = activePumper(state, n.id);
        if (nw && nw.kind === 'gnome') { nw.ko = koT; nw.furnace = null; }
      }
    }
    // Splash onto the neighbours — the Rube-Goldberg chain.
    for (const n of neighbours(state, f)) {
      n.overheat = Math.min(100, n.overheat + T.spreadOver);
      n.temp = Math.min(T.tempMax, n.temp + T.spreadTemp);
    }
    f.overheat = 0;
    f.temp = Math.max(0, f.temp - T.boilCool);
    f.flash = 0.7;
    say(state, f.acid
      ? `The ${f.name} belches aqua fortis! Fumes everywhere. ☠`
      : `Boil-over at the ${f.name}! Glass everywhere. 💨`, 'bad');
  }

  function birthHomunculus(state, cradle) {
    const w = makeHomunculus(state.nextWorkerId++);
    state.workers.push(w);
    state.homunculiBirthed++;
    const quip = HOM_QUIPS[Math.floor(state.rng() * HOM_QUIPS.length)];
    say(state, `A homunculus quivers into being. ${quip}`, 'good');
  }

  function popHomunculus(state, w) {
    const i = state.workers.indexOf(w);
    if (i >= 0) state.workers.splice(i, 1);
    state.integrity -= T.homPop;
    say(state, 'The homunculus dissolves into a puddle of regret. 🫠', 'bad');
  }

  const API = {
    createState, step, assign, unassign, quench,
    neighbours, activePumper, TUNING: T, FURNACE_DEFS,
  };
  global.PuffersSim = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
