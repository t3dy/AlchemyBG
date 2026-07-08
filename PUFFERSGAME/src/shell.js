/* Puffers — shell: canvas setup, input, controls, and the three time-loops.
 * The ONLY real difference between the genre variants lives here:
 *   realtime  — sim advances every animation frame; no pause.
 *   pausable  — same, but Space freezes it so you can reassign in calm.
 *   tick      — sim is frozen until you press Step (0.5s); “Run” auto-steps.
 */
(function (global) {
  'use strict';
  const Sim = global.PuffersSim, Render = global.PuffersRender;
  const TICK_DT = 0.5, RUN_EVERY = 0.55; // tick variant: sim-seconds per step, real gap

  function boot(mode) {
    mode = mode || 'pausable';
    const root = document.getElementById('app') || document.body;

    const wrap = document.createElement('div'); wrap.className = 'puffers-wrap';
    const canvas = document.createElement('canvas'); canvas.className = 'puffers-canvas';
    const bar = document.createElement('div'); bar.className = 'puffers-bar';
    const hint = document.createElement('div'); hint.className = 'puffers-hint';
    wrap.appendChild(bar); wrap.appendChild(canvas); wrap.appendChild(hint);
    root.appendChild(wrap);

    const ctx = canvas.getContext('2d');
    function fitCanvas() {
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const cssW = Math.min(Render.W, wrap.clientWidth || Render.W);
      const cssH = cssW * (Render.H / Render.W);
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px';
      canvas.width = Math.round(Render.W * dpr); canvas.height = Math.round(Render.H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    global.addEventListener('resize', fitCanvas);

    let state, selected, paused, running, runAccum, lastNow, tickCount;
    function seedFromUrl() {
      const m = /[?&]seed=(\d+)/.exec(global.location.search);
      return m ? parseInt(m[1], 10) : Math.floor(Math.random() * 1e9);
    }
    let seed = seedFromUrl();

    function reset(newSeed) {
      if (newSeed != null) seed = newSeed;
      state = Sim.createState(seed);
      selected = null; runAccum = 0; tickCount = 0;
      paused = (mode === 'pausable'); // pausable starts paused so you can plan the opening
      running = false;
      lastNow = null;
      syncBar();
    }

    // ---- Input ------------------------------------------------------------
    function toLogical(ev) {
      const r = canvas.getBoundingClientRect();
      const p = ev.touches ? ev.touches[0] : ev;
      return { x: (p.clientX - r.left) / r.width * Render.W,
        y: (p.clientY - r.top) / r.height * Render.H };
    }
    function onDown(ev) {
      ev.preventDefault();
      if (state.status !== 'playing') return;
      const { x, y } = toLogical(ev);
      const hit = Render.hitTest(state, x, y);
      if (hit.type === 'worker') {
        selected = (selected === hit.id) ? null : hit.id;
      } else if (hit.type === 'quench') {
        Sim.quench(state, hit.id);
      } else if (hit.type === 'assign') {
        if (selected != null) { Sim.assign(state, selected, hit.id); selected = null; }
      } else if (hit.type === 'bench') {
        if (selected != null) { Sim.unassign(state, selected); selected = null; }
      }
      if (mode === 'tick') draw(); // reflect assignment immediately while frozen
    }
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('touchstart', onDown, { passive: false });

    global.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') { reset(); return; }
      if (e.code === 'Space') {
        e.preventDefault();
        if (mode === 'pausable') { paused = !paused; syncBar(); }
        else if (mode === 'tick') stepOnce();
      }
    });

    // ---- Controls ---------------------------------------------------------
    let pauseBtn, runBtn;
    function mkBtn(label, fn) {
      const b = document.createElement('button'); b.textContent = label;
      b.className = 'puffers-btn'; b.onclick = fn; bar.appendChild(b); return b;
    }
    function buildBar() {
      bar.innerHTML = '';
      const title = document.createElement('span'); title.className = 'puffers-title';
      title.textContent = 'PUFFERS · ' + mode; bar.appendChild(title);
      if (mode === 'pausable') pauseBtn = mkBtn('▶ Resume', () => { paused = !paused; syncBar(); });
      if (mode === 'tick') {
        mkBtn('▶ Step', stepOnce);
        mkBtn('⏩ ×3', () => { for (let i = 0; i < 3; i++) stepOnce(); });
        runBtn = mkBtn('▶▶ Run', () => { running = !running; runAccum = 0; syncBar(); });
      }
      mkBtn('↻ Restart', () => reset());
      mkBtn('🎲 New seed', () => reset(Math.floor(Math.random() * 1e9)));
    }
    function syncBar() {
      if (pauseBtn) pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
      if (runBtn) runBtn.textContent = running ? '⏸ Stop' : '▶▶ Run';
    }
    function setHint() {
      const common = 'Click a gnome to pick it up, click a furnace to send it to the bellows. ' +
        'Click ❄ Quench to cool a furnace before it boils over. Keep each thermometer in the green band.';
      const perMode = {
        realtime: ' Real-time: heat is always draining — no pausing, keep moving!',
        pausable: ' Pausable: press Space to freeze and reassign, Space again to resume.',
        tick: ' Tick: nothing moves until you press Step (½ second). Plan, step, watch, repeat — or hit Run.',
      };
      hint.textContent = common + (perMode[mode] || '');
    }

    function stepOnce() {
      if (state.status !== 'playing') return;
      Sim.step(state, TICK_DT); tickCount++; draw();
    }

    // ---- Loop -------------------------------------------------------------
    function frame(now) {
      if (lastNow == null) lastNow = now;
      let dt = (now - lastNow) / 1000; lastNow = now;
      dt = Math.min(dt, 0.05);
      if (state.status === 'playing') {
        if (mode === 'realtime') Sim.step(state, dt);
        else if (mode === 'pausable') { if (!paused) Sim.step(state, dt); }
        else if (mode === 'tick' && running) {
          runAccum += dt;
          if (runAccum >= RUN_EVERY) { runAccum = 0; Sim.step(state, TICK_DT); tickCount++; }
        }
      }
      draw();
      global.requestAnimationFrame(frame);
    }

    function draw() {
      Render.draw(ctx, state, {
        selected, mode,
        paused: mode === 'pausable' ? paused : false,
        tick: mode === 'tick' ? tickCount : null,
      });
    }

    buildBar(); setHint(); reset(); fitCanvas();
    global.requestAnimationFrame(frame);
  }

  global.Puffers = { boot };
})(typeof window !== 'undefined' ? window : globalThis);
