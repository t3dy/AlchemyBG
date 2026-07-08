/* Puffers simulation tests — run with `npm test` (node --test, no deps). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Sim from './sim.js';

test('initial state: two gnomes, four furnaces, three required processes', () => {
  const s = Sim.createState(1);
  assert.equal(s.workers.length, 2);
  assert.equal(s.furnaces.length, 4);
  assert.equal(s.furnaces.filter((f) => !f.cradle).length, 3);
  assert.equal(s.status, 'playing');
  assert.equal(s.integrity, 100);
});

test('a pumping gnome heats its furnace; the process advances only in-band', () => {
  const s = Sim.createState(1);
  const f = s.furnaces[0];
  Sim.assign(s, 0, 0);
  const t0 = f.temp, p0 = f.progress;
  Sim.step(s, 1);
  assert.ok(f.temp > t0, 'temperature rose while pumping');
  assert.ok(f.progress > p0, 'progress advanced while in band');
});

test('an unattended furnace cools and its process stalls', () => {
  const s = Sim.createState(1);
  const f = s.furnaces[0];
  const t0 = f.temp;
  Sim.step(s, 2); // nobody assigned
  assert.ok(f.temp < t0, 'temperature fell with no pumper');
});

test('overheating a furnace boils over: integrity drops, batch spoils, gnome KO', () => {
  const s = Sim.createState(1);
  Sim.assign(s, 0, 0);
  const f = s.furnaces[0];
  // Pump relentlessly past the band until it cascades.
  let guard = 0;
  while (s.integrity === 100 && guard++ < 2000) {
    Sim.assign(s, 0, 0);        // re-mount if fumes threw us off
    Sim.step(s, 1 / 30);
  }
  assert.ok(s.integrity < 100, 'a boil-over cost lab integrity');
  const gnome = s.workers.find((w) => w.id === 0);
  assert.ok(gnome.ko > 0 || gnome.furnace == null, 'fumes knocked the gnome off the bellows');
});

test('the cradle births a homunculus; it is tireless, fume-immune, then pops', () => {
  const s = Sim.createState(7);
  const c = s.furnaces[3];
  let guard = 0;
  while (s.homunculiBirthed < 1 && guard++ < 4000) {
    if (c.temp < (c.bandMin + c.bandMax) / 2 - 4) Sim.assign(s, 0, 3);
    else Sim.unassign(s, 0);
    Sim.step(s, 1 / 30);
  }
  assert.equal(s.homunculiBirthed, 1);
  const hom = s.workers.find((w) => w.kind === 'homunculus');
  assert.ok(hom, 'a homunculus worker exists');
  assert.equal(hom.stamina, undefined, 'homunculus has no stamina (tireless)');
  const int0 = s.integrity;
  let g2 = 0;
  while (s.workers.some((w) => w.kind === 'homunculus') && g2++ < 4000) Sim.step(s, 1 / 20);
  assert.ok(s.integrity < int0, 'the homunculus popped and cost integrity');
});

test('deterministic: identical seed → identical trajectory', () => {
  const run = () => {
    const s = Sim.createState(42);
    for (let i = 0; i < 200; i++) {
      if (i % 20 === 0) Sim.assign(s, i % 2, (i / 20) % 4 | 0);
      Sim.step(s, 1 / 30);
    }
    return s.furnaces.map((f) => [f.temp, f.progress, f.overheat]);
  };
  assert.deepEqual(run(), run());
});

test('winnable: a competent policy completes the three required processes', () => {
  const s = Sim.createState(3);
  let e = 0;
  while (s.status === 'playing' && e < 120) {
    if (Math.round(e * 10) % 3 === 0) {
      for (const f of s.furnaces) if (f.overheat > 65 && f.quenchCd <= 0) Sim.quench(s, f.id);
      const req = s.furnaces.filter((f) => !f.cradle && !f.done);
      const free = s.workers.filter((w) => w.ko <= 0 && w.kind === 'gnome');
      const need = (f) => (f.overheat > 50 ? -100 : (f.bandMin + f.bandMax) / 2 - f.temp);
      const order = req.slice().sort((a, b) => need(b) - need(a));
      let ti = 0;
      for (const w of free) {
        let t = null;
        for (; ti < order.length; ti++) if (need(order[ti]) > -8) { t = order[ti++]; break; }
        t ? Sim.assign(s, w.id, t.id) : Sim.unassign(s, w.id);
      }
    }
    Sim.step(s, 0.1); e += 0.1;
  }
  assert.equal(s.status, 'won');
});

test('losable: relentless overheating destroys the lab', () => {
  const s = Sim.createState(1);
  let guard = 0;
  while (s.status === 'playing' && guard++ < 20000) {
    for (const f of s.furnaces) {
      const w = s.workers.find((x) => x.ko <= 0);
      if (w) Sim.assign(s, w.id, f.id); // pile everyone onto hot furnaces, never quench
    }
    Sim.step(s, 1 / 30);
  }
  assert.equal(s.status, 'lost');
});
