/* Puffers — canvas renderer + layout + hit-testing (browser only).
 * Pure drawing from the sim state; holds no game rules of its own.
 * Logical canvas is 960×600; the shell scales it to fit.
 */
(function (global) {
  'use strict';
  const W = 960, H = 600;
  const CX = [140, 360, 580, 800];      // furnace centres, left→right = id 0..3
  const TEMP_TOP = 150, TEMP_BOT = 300;  // thermometer pixel span
  const BENCH_Y = 60;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function rrect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---- Tiny pixel-art sprite engine ---------------------------------------
  // Sprites are char-grids; each glyph indexes a palette. '.'/' ' = transparent.
  // Drawn with integer coords and no smoothing for a crisp pixel look.
  function drawSprite(ctx, rows, pal, cx, footY, scale) {
    const w = rows[0].length, h = rows.length;
    const x0 = Math.round(cx - (w * scale) / 2);
    const y0 = Math.round(footY - h * scale);
    const s = Math.ceil(scale);
    for (let r = 0; r < h; r++) {
      const row = rows[r];
      for (let c = 0; c < row.length; c++) {
        const g = row[c];
        if (g === '.' || g === ' ') continue;
        const col = pal[g];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x0 + c * scale | 0, y0 + r * scale | 0, s, s);
      }
    }
  }

  // Classic garden-gnome: big pointy hat, round nose, huge beard, little boots.
  const GNOME = [
    '......HH......',
    '.....HHHH.....',
    '....HHHHHH....',
    '...HHHHHHHH...',
    '..HHHHHHHHHH..',
    '.HHHHHHHHHHHH.',
    '.hhhhhhhhhhhh.',
    '...BBBBBBBB...',
    '..BBEBBBBEBB..',
    '..BBBBNNBBBB..',
    '..BBBNNNNBBB..',
    '.BBBBBBBBBBBB.',
    '.BBBBBBBBBBBB.',
    '..BBBBBBBBBB..',
    '...LL....LL...',
    '...LL....LL...',
  ];
  const GNOME_PAL = { H: '#d8352a', h: '#9e241c', B: '#eef0f0', b: '#c2c6cc',
    N: '#f0b98a', E: '#231017', L: '#4a3728' };
  // Homunculus: same silhouette, sickly-green palette (a glass dome is added over it).
  const HOM_PAL = { H: '#63c873', h: '#39824c', B: '#d6efd6', b: '#a6cfa6',
    N: '#bfe39a', E: '#14300f', L: '#3a5a2a' };

  // ---- Layout: where everything sits (shared by draw + hitTest) -----------
  function layout(state) {
    const tempMax = state.furnaces[0] ? 138 : 138;
    const fur = state.furnaces.map((f) => {
      const cx = CX[f.id];
      return {
        id: f.id, cx,
        column: { x: cx - 96, y: 150, w: 192, h: 300 },     // click = assign here
        quench: { x: cx - 48, y: 500, w: 96, h: 34 },       // click = quench
        bellows: { x: cx, y: 424 },
      };
    });
    // Worker positions.
    const idle = state.workers.filter((w) => w.furnace == null);
    const n = idle.length;
    const workers = state.workers.map((w) => {
      if (w.furnace != null) {
        const bob = w.ko > 0 ? 0 : Math.abs(Math.sin(state.t * 9 + w.id)) * 9;
        return { id: w.id, x: CX[w.furnace], y: 424 - bob, r: 16 };
      }
      const k = idle.indexOf(w);
      const spread = 78;
      const x = W / 2 + (k - (n - 1) / 2) * spread;
      return { id: w.id, x, y: BENCH_Y + 14, r: 16 };
    });
    return { fur, workers, tempMax };
  }

  function hitTest(state, x, y) {
    const L = layout(state);
    for (const w of L.workers) {          // workers first (drawn on top)
      if ((x - w.x) ** 2 + (y - w.y) ** 2 <= (w.r + 6) ** 2)
        return { type: 'worker', id: w.id };
    }
    for (const f of L.fur) {
      const q = f.quench;
      if (x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h)
        return { type: 'quench', id: f.id };
    }
    for (const f of L.fur) {
      const c = f.column;
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h)
        return { type: 'assign', id: f.id };
    }
    if (y < 130) return { type: 'bench', id: -1 };  // drop a worker back to rest
    return { type: 'none', id: -1 };
  }

  function tempColor(f) {
    if (f.temp < f.bandMin) return '#5b8def';             // cold blue
    if (f.temp <= f.bandMax) return '#39d353';            // in-band green
    const over = clamp((f.temp - f.bandMax) / 30, 0, 1);
    return over < 0.5 ? '#ffb020' : '#ff3b30';           // hot → danger
  }

  // ---- Draw ----------------------------------------------------------------
  function draw(ctx, state, opts) {
    opts = opts || {};
    const L = layout(state);
    ctx.imageSmoothingEnabled = false; // crisp pixel-art scaling
    ctx.clearRect(0, 0, W, H);

    // Background stone wall + floor.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#241d24'); g.addColorStop(1, '#141014');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2b232b'; ctx.fillRect(0, 468, W, H - 468);
    ctx.strokeStyle = '#3a2f3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 468); ctx.lineTo(W, 468); ctx.stroke();

    for (const f of state.furnaces) drawFurnace(ctx, state, f, L);
    for (const w of state.workers) drawWorker(ctx, state, w, L, opts.selected);

    drawHud(ctx, state, opts);
    drawMessages(ctx, state);
    if (state.status !== 'playing') drawBanner(ctx, state);
    else if (opts.paused) drawPaused(ctx);
  }

  function drawFurnace(ctx, state, f, L) {
    const geo = L.fur[f.id];
    const cx = geo.cx;

    // Thermometer.
    const tx = cx - 82, tw = 16;
    rrect(ctx, tx, TEMP_TOP, tw, TEMP_BOT - TEMP_TOP, 8);
    ctx.fillStyle = '#0d0b0d'; ctx.fill();
    const mapY = (temp) => TEMP_BOT - (clamp(temp, 0, L.tempMax) / L.tempMax) * (TEMP_BOT - TEMP_TOP);
    // band zone
    ctx.fillStyle = 'rgba(57,211,83,0.22)';
    const by1 = mapY(f.bandMax), by2 = mapY(f.bandMin);
    ctx.fillRect(tx, by1, tw, by2 - by1);
    // temp fill
    const ty = mapY(f.temp);
    ctx.fillStyle = tempColor(f);
    rrect(ctx, tx, ty, tw, TEMP_BOT - ty, 8); ctx.fill();
    // band edges
    ctx.strokeStyle = 'rgba(57,211,83,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(tx - 3, by1); ctx.lineTo(tx + tw + 3, by1);
    ctx.moveTo(tx - 3, by2); ctx.lineTo(tx + tw + 3, by2); ctx.stroke();
    // overheat bar (right of thermometer)
    if (f.overheat > 1) {
      const ox = tx + tw + 6;
      ctx.fillStyle = '#3a0000'; ctx.fillRect(ox, TEMP_TOP, 6, TEMP_BOT - TEMP_TOP);
      const oh = (f.overheat / 100) * (TEMP_BOT - TEMP_TOP);
      ctx.fillStyle = f.overheat > 70 ? '#ff2d2d' : '#ff7a1a';
      ctx.fillRect(ox, TEMP_BOT - oh, 6, oh);
    }

    // Apparatus label.
    ctx.textAlign = 'center';
    ctx.fillStyle = f.cradle ? '#c9a6ff' : '#e8dfe8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(f.name, cx + 6, 176);
    ctx.fillStyle = '#9a8f9a'; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(f.op, cx + 6, 193);

    drawApparatus(ctx, f, cx + 6, 232);

    // Progress bar.
    const pbx = cx - 52, pby = 268, pbw = 104;
    rrect(ctx, pbx, pby, pbw, 12, 6); ctx.fillStyle = '#0d0b0d'; ctx.fill();
    ctx.fillStyle = f.done ? '#39d353' : (f.cradle ? '#a06bff' : '#d8b24a');
    rrect(ctx, pbx, pby, pbw * (f.progress / 100), 12, 6); ctx.fill();
    if (f.done) { ctx.fillStyle = '#39d353'; ctx.font = 'bold 13px system-ui';
      ctx.fillText('✔ ' + f.product, cx + 6, 264); }

    // Furnace body + flame.
    const bx = cx - 60, by = 300, bw = 120, bh = 90;
    ctx.save();
    rrect(ctx, bx, by, bw, bh, 8); ctx.fillStyle = '#3a2318'; ctx.fill(); ctx.clip();
    // Brick courses (pixel-art masonry), offset every other row.
    const brW = 24, brH = 12;
    for (let ry = 0, row = 0; ry < bh; ry += brH, row++) {
      const off = row % 2 ? -brW / 2 : 0;
      for (let rx = -brW; rx < bw + brW; rx += brW) {
        const px = bx + rx + off, py = by + ry;
        ctx.fillStyle = (row + (rx / brW | 0)) % 3 ? '#6e4130' : '#7d4a35';
        ctx.fillRect(px + 1, py + 1, brW - 2, brH - 2);
        ctx.fillStyle = '#8a5640'; ctx.fillRect(px + 1, py + 1, brW - 2, 2); // top highlight
      }
    }
    ctx.restore();
    ctx.strokeStyle = '#20160f'; ctx.lineWidth = 3; rrect(ctx, bx, by, bw, bh, 8); ctx.stroke();
    // dark hearth opening the flame sits inside
    ctx.fillStyle = '#180d07';
    rrect(ctx, bx + 15, by + 28, bw - 30, bh - 30, 7); ctx.fill();
    // mouth glow
    const heat = clamp(f.temp / 100, 0, 1.3);
    const fg = ctx.createLinearGradient(0, by + bh, 0, by + 20);
    const hot = f.temp > f.bandMax;
    fg.addColorStop(0, hot ? '#fff3c0' : '#ff9a3c');
    fg.addColorStop(1, `rgba(255,80,0,${0.15 + heat * 0.5})`);
    ctx.fillStyle = fg;
    const fl = 20 + heat * 44;
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const px = bx + 14 + (i / 6) * (bw - 28);
      const wob = Math.sin(state.t * 12 + i + f.id) * 6 * heat;
      const py = by + bh - 10 - (i % 2 ? fl : fl * 0.7) - wob;
      i === 0 ? ctx.moveTo(px, by + bh - 8) : ctx.lineTo(px, py);
    }
    ctx.lineTo(bx + bw - 14, by + bh - 8); ctx.closePath(); ctx.fill();
    if (f.overheat > 55) {  // danger pulse
      ctx.strokeStyle = `rgba(255,40,40,${0.3 + 0.4 * Math.abs(Math.sin(state.t * 10))})`;
      ctx.lineWidth = 4; rrect(ctx, bx - 3, by - 3, bw + 6, bh + 6, 10); ctx.stroke();
    }
    if (f.flash > 0) {  // boil-over flash
      ctx.fillStyle = `rgba(255,${f.acid ? 255 : 180},120,${f.flash})`;
      rrect(ctx, bx - 10, by - 30, bw + 20, bh + 40, 12); ctx.fill();
    }

    // Bellows (compresses when pumped).
    const pumper = state.workers.find((w) => w.furnace === f.id && w.ko <= 0);
    const squeeze = pumper ? (0.5 + 0.5 * Math.abs(Math.sin(state.t * 9 + f.id))) : 0.15;
    const bey = 396, beh = 30 - squeeze * 14;
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath();
    ctx.moveTo(cx - 34, bey + 30); ctx.lineTo(cx + 34, bey + 30);
    ctx.lineTo(cx + 20, bey + 30 - beh); ctx.lineTo(cx - 20, bey + 30 - beh);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a3624'; ctx.fillRect(cx + 30, bey + 20, 26, 8); // nozzle

    // Quench button.
    const q = geo.quench;
    const cd = f.quenchCd > 0;
    rrect(ctx, q.x, q.y, q.w, q.h, 8);
    ctx.fillStyle = cd ? '#20303a' : '#2f5c74'; ctx.fill();
    ctx.strokeStyle = cd ? '#2a3f4a' : '#4aa6c8'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = cd ? '#6f8a97' : '#dff3fb'; ctx.font = 'bold 13px system-ui';
    ctx.fillText(cd ? `❄ ${f.quenchCd.toFixed(1)}s` : '❄ Quench', cx, q.y + 22);
  }

  function drawApparatus(ctx, f, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#bfe3ff'; ctx.fillStyle = 'rgba(150,200,255,0.18)'; ctx.lineWidth = 2;
    if (f.name === 'Retort') {
      ctx.beginPath(); ctx.arc(-6, 6, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(26, 2, 30, 16); ctx.stroke();
    } else if (f.cradle) {
      ctx.beginPath(); ctx.ellipse(0, 6, 13, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9a6ff'; ctx.font = '14px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('⚗', 0, 12);
    } else if (f.name === 'Aludel') {
      ctx.beginPath(); ctx.moveTo(-11, 16); ctx.lineTo(11, 16); ctx.lineTo(6, -8);
      ctx.lineTo(-6, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else { // Alembic
      ctx.beginPath(); ctx.arc(0, 8, 12, 0, Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 8); ctx.lineTo(-12, -2);
      ctx.lineTo(12, -2); ctx.lineTo(12, 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -16); ctx.lineTo(16, -12); ctx.stroke();
    }
    ctx.restore();
  }

  function drawWorker(ctx, state, w, L, selected) {
    const pos = L.workers.find((p) => p.id === w.id);
    const ko = w.ko > 0;
    const hom = w.kind === 'homunculus';
    const scale = 2.4, sw = GNOME[0].length * scale, sh = GNOME.length * scale;
    const wob = hom && !ko ? Math.sin(state.t * 16 + w.id) * 2 : 0;
    const x = pos.x + wob;
    const footY = pos.y + 24;          // sprite stands with boots near here
    const cy = footY - sh / 2;

    if (selected === w.id) {           // selection halo
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pos.x, cy, sw * 0.7, 0, Math.PI * 2); ctx.stroke();
    }

    if (ko) {                          // knocked out: tip the sprite over, X eyes
      ctx.save(); ctx.translate(x, cy); ctx.rotate(1.3);
      drawSprite(ctx, GNOME, hom ? HOM_PAL : GNOME_PAL, 0, sh / 2, scale);
      ctx.restore();
      ctx.fillStyle = '#ff5555'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('✕✕', x, cy - 2);
    } else {
      drawSprite(ctx, GNOME, hom ? HOM_PAL : GNOME_PAL, x, footY, scale);
      if (hom) {                       // glass dome over the homunculus
        ctx.strokeStyle = 'rgba(190,230,255,0.65)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, cy - 2, sw * 0.52, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      }
      if (w.winded) {                  // sweat bead
        ctx.fillStyle = '#7fd0ff';
        ctx.beginPath(); ctx.arc(x + sw * 0.4, cy - sh * 0.15, 3, 0, 6.3); ctx.fill();
      }
    }

    // status bars + name
    const by = footY + 4;
    if (!ko) {
      if (hom) bar(ctx, pos.x - 16, by, 32, 4, w.destabilize / 100, '#b57bff', '#2a1840');
      else bar(ctx, pos.x - 16, by, 32, 4, w.stamina / 100,
        w.winded ? '#ff7a1a' : '#7fd0ff', '#20303a');
    }
    ctx.fillStyle = ko ? '#ff6b6b' : '#cbb8cb';
    ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(ko ? `KO ${w.ko.toFixed(0)}s` : w.name, pos.x, by + 14);
  }

  function bar(ctx, x, y, w, h, frac, fg, bg) {
    ctx.fillStyle = bg; rrect(ctx, x, y, w, h, 2); ctx.fill();
    ctx.fillStyle = fg; rrect(ctx, x, y, w * clamp(frac, 0, 1), h, 2); ctx.fill();
  }

  function drawHud(ctx, state, opts) {
    ctx.textAlign = 'left';
    // integrity
    ctx.fillStyle = '#e8dfe8'; ctx.font = 'bold 13px system-ui';
    ctx.fillText('Lab integrity', 18, 22);
    bar(ctx, 18, 28, 190, 12, state.integrity / 100,
      state.integrity > 40 ? '#39d353' : '#ff3b30', '#20303a');
    ctx.fillStyle = '#cbb8cb'; ctx.font = '12px system-ui';
    ctx.fillText(`${state.integrity | 0}%`, 214, 39);
    // right side
    ctx.textAlign = 'right';
    ctx.fillStyle = '#cbb8cb';
    ctx.fillText(`⏱ ${state.t.toFixed(1)}s`, W - 18, 22);
    ctx.fillText(`🧪 homunculi: ${state.homunculiBirthed}`, W - 18, 40);
    if (opts.mode) {
      ctx.fillStyle = '#8a7f8a';
      ctx.fillText(opts.mode.toUpperCase() + (opts.tick != null ? ` · tick ${opts.tick}` : ''),
        W - 18, 58);
    }
    ctx.textAlign = 'left';
  }

  function drawMessages(ctx, state) {
    const msgs = state.messages.slice(-4);
    ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    msgs.forEach((m, i) => {
      ctx.fillStyle = m.tone === 'good' ? '#7fe08a' : m.tone === 'bad' ? '#ff8a7a' : '#b7a9b7';
      ctx.fillText(m.text, 18, 512 + i * 20);
    });
  }

  function drawBanner(ctx, state) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    const won = state.status === 'won';
    ctx.fillStyle = won ? '#7fe08a' : '#ff6b6b';
    ctx.font = 'bold 44px system-ui';
    ctx.fillText(won ? 'THE WORK IS COMPLETE' : 'THE LAB IS LOST', W / 2, H / 2 - 12);
    ctx.fillStyle = '#e8dfe8'; ctx.font = '18px system-ui';
    ctx.fillText(won ? `Score ${state.score} · ${state.t.toFixed(1)}s · ${state.homunculiBirthed} homunculi`
      : 'The puffers flee into the night.', W / 2, H / 2 + 24);
    ctx.fillStyle = '#b7a9b7'; ctx.font = '14px system-ui';
    ctx.fillText('Press R or “Restart” to try again.', W / 2, H / 2 + 54);
    ctx.textAlign = 'left';
  }

  function drawPaused(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffd84a'; ctx.font = 'bold 40px system-ui';
    ctx.fillText('⏸ PAUSED', W / 2, H / 2 - 6);
    ctx.fillStyle = '#e8dfe8'; ctx.font = '15px system-ui';
    ctx.fillText('Reassign your gnomes, then press Space to resume.', W / 2, H / 2 + 26);
    ctx.textAlign = 'left';
  }

  const API = { draw, hitTest, layout, W, H };
  global.PuffersRender = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
