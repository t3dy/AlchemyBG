/* Puffers — shell: canvas setup, input, controls, the three time-loops, and the
 * on-screen how-to-play overlay.
 *
 * The ONLY real gameplay difference between the genre variants lives here:
 *   realtime  — sim advances every animation frame; no pause.
 *   pausable  — same, but Space freezes it so you can reassign in calm.
 *   tick      — sim is frozen until you press Step (0.5s); “Run” auto-steps.
 */
(function (global) {
  'use strict';
  const Sim = global.PuffersSim, Render = global.PuffersRender;
  const TICK_DT = 0.5, RUN_EVERY = 0.55; // tick variant: sim-seconds per step, real gap

  const MODE_NOTE = {
    pausable: 'This is the <b>Pausable</b> prototype — press <kbd>Space</kbd> anytime to ' +
      'freeze the lab and reassign gnomes in calm, then <kbd>Space</kbd> to resume.',
    realtime: 'This is the <b>Real-time</b> prototype — the heat never stops draining and ' +
      'you <b>cannot pause</b>. Pure scramble.',
    tick: 'This is the <b>Tick</b> prototype — nothing moves until you press <b>▶ Step</b> ' +
      '(½ second). Plan, step, watch, repeat — or press <b>▶▶ Run</b> to auto-advance.',
  };

  function overlayHTML(mode) {
    return '<div class="puffers-card">' +
      '<div class="puffers-eyebrow">Alchemical bellows-juggling</div>' +
      '<h2>How to play</h2>' +
      '<p class="puffers-goal">🎯 <b>Goal:</b> finish the three processes — <b>Alembic</b>, ' +
      '<b>Retort</b> and <b>Aludel</b> — by keeping each furnace inside its ' +
      '<span class="g">green band</span>. You <b>lose</b> if lab integrity hits 0.</p>' +
      '<ul>' +
      '<li><b>Pick up a gnome</b> (click it), then <b>click a furnace</b> to send it to the ' +
      'bellows — it jumps up and down to pump heat.</li>' +
      '<li><b>Watch the thermometer.</b> Too cold → the process stalls. Too hot → it ' +
      '<b>boils over</b>: lab damage, fumes that knock the gnome out, and it splashes onto ' +
      'the neighbouring furnaces.</li>' +
      '<li><b>Gnomes tire.</b> A winded gnome barely puffs — rest it by clicking it back to ' +
      'the bench up top.</li>' +
      '<li><b>❄ Quench</b> cools a furnace fast (short cooldown) to pull it back from the brink.</li>' +
      '<li><b>The Cradle</b> grows a <b>Homunculus</b>: a tireless, fume-proof helper — but ' +
      'it slowly destabilises and eventually pops.</li>' +
      '</ul>' +
      '<p class="puffers-mode">' + MODE_NOTE[mode] + '</p>' +
      '<button class="puffers-play">▶ Play</button>' +
      '</div>';
  }

  function boot(mode) {
    mode = mode || 'pausable';
    const root = document.getElementById('app') || document.body;

    const wrap = document.createElement('div'); wrap.className = 'puffers-wrap';
    const canvas = document.createElement('canvas'); canvas.className = 'puffers-canvas';
    const bar = document.createElement('div'); bar.className = 'puffers-bar';
    const hint = document.createElement('div'); hint.className = 'puffers-hint';
    const overlay = document.createElement('div'); overlay.className = 'puffers-overlay';
    overlay.innerHTML = overlayHTML(mode);
    wrap.appendChild(bar); wrap.appendChild(canvas); wrap.appendChild(overlay);
    wrap.appendChild(hint);
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

    let state, selected, paused, running, runAccum, lastNow, tickCount, started;
    function seedFromUrl() {
      const m = /[?&]seed=(\d+)/.exec(global.location.search);
      return m ? parseInt(m[1], 10) : Math.floor(Math.random() * 1e9);
    }
    let seed = seedFromUrl();

    function reset(newSeed) {
      if (newSeed != null) seed = newSeed;
      state = Sim.createState(seed);
      selected = null; runAccum = 0; tickCount = 0;
      paused = false; running = false; lastNow = null;
      syncBar();
    }

    // ---- Intro / help overlay --------------------------------------------
    function showIntro() { overlay.classList.remove('hidden'); if (mode !== 'realtime') paused = true; syncBar(); }
    function hideIntro() { overlay.classList.add('hidden'); }
    overlay.querySelector('.puffers-play').addEventListener('click', () => {
      hideIntro(); started = true; paused = false; lastNow = null; syncBar();
    });

    // ---- Input ------------------------------------------------------------
    function toLogical(ev) {
      const r = canvas.getBoundingClientRect();
      const p = ev.touches ? ev.touches[0] : ev;
      return { x: (p.clientX - r.left) / r.width * Render.W,
        y: (p.clientY - r.top) / r.height * Render.H };
    }
    function onDown(ev) {
      if (!overlay.classList.contains('hidden')) return; // overlay swallows input
      ev.preventDefault();
      if (state.status !== 'playing') return;
      const { x, y } = toLogical(ev);
      const hit = Render.hitTest(state, x, y);
      if (hit.type === 'worker') selected = (selected === hit.id) ? null : hit.id;
      else if (hit.type === 'quench') Sim.quench(state, hit.id);
      else if (hit.type === 'assign') { if (selected != null) { Sim.assign(state, selected, hit.id); selected = null; } }
      else if (hit.type === 'bench') { if (selected != null) { Sim.unassign(state, selected); selected = null; } }
      if (mode === 'tick') draw();
    }
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('touchstart', onDown, { passive: false });

    global.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') { reset(); return; }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!overlay.classList.contains('hidden')) { hideIntro(); started = true; paused = false; syncBar(); return; }
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
      const goal = document.createElement('span'); goal.className = 'puffers-goalchip';
      goal.textContent = 'Goal: finish 3 processes · keep the lab intact'; bar.appendChild(goal);
      if (mode === 'pausable') pauseBtn = mkBtn('⏸ Pause', () => { paused = !paused; syncBar(); });
      if (mode === 'tick') {
        mkBtn('▶ Step', stepOnce);
        mkBtn('⏩ ×3', () => { for (let i = 0; i < 3; i++) stepOnce(); });
        runBtn = mkBtn('▶▶ Run', () => { running = !running; runAccum = 0; syncBar(); });
      }
      mkBtn('↻ Restart', () => reset());
      mkBtn('🎲 New seed', () => reset(Math.floor(Math.random() * 1e9)));
      mkBtn('❔ How to play', showIntro);
    }
    function syncBar() {
      if (pauseBtn) pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
      if (runBtn) runBtn.textContent = running ? '⏸ Stop' : '▶▶ Run';
    }
    function setHint() {
      const common = 'Click a gnome, then click a furnace to send it to the bellows. ' +
        '❄ Quench cools a furnace before it boils over. Keep each thermometer in the green band.';
      const perMode = {
        realtime: ' Real-time: heat is always draining — no pausing, keep moving!',
        pausable: ' Pausable: press Space to freeze and reassign, Space again to resume.',
        tick: ' Tick: nothing moves until you press Step. Plan, step, watch — or hit Run.',
      };
      hint.textContent = common + (perMode[mode] || '');
    }

    function stepOnce() {
      if (!started || state.status !== 'playing') return;
      Sim.step(state, TICK_DT); tickCount++; draw();
    }

    // ---- Loop -------------------------------------------------------------
    function frame(now) {
      if (lastNow == null) lastNow = now;
      let dt = (now - lastNow) / 1000; lastNow = now;
      dt = Math.min(dt, 0.05);
      const live = started && overlay.classList.contains('hidden') && state.status === 'playing';
      if (live) {
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
        paused: mode === 'pausable' ? (paused && started) : false,
        tick: mode === 'tick' ? tickCount : null,
      });
    }

    started = false;
    buildBar(); setHint(); reset(); fitCanvas(); showIntro();
    global.requestAnimationFrame(frame);
  }

  global.Puffers = { boot };
})(typeof window !== 'undefined' ? window : globalThis);
