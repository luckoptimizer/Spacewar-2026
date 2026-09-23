/* SPACEWAR! 2026 — Space Force Edition
   Inspired by the 1962 PDP-1 original (public domain; see CREDITS.md). */

(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const overlay = {
    boot: document.getElementById("boot"),
    menu: document.getElementById("menu"),
    brief: document.getElementById("brief"),
    briefTitle: document.getElementById("brief-title"),
    briefBody: document.getElementById("brief-body"),
    end: document.getElementById("end"),
    endTitle: document.getElementById("end-title"),
    endBody: document.getElementById("end-body"),
    p1hp: document.getElementById("p1hp"),
    p1fuel: document.getElementById("p1fuel"),
    p1heat: document.getElementById("p1heat"),
    p2hp: document.getElementById("p2hp"),
    p2fuel: document.getElementById("p2fuel"),
    p2heat: document.getElementById("p2heat"),
    theater: document.getElementById("theater"),
    ticker: document.getElementById("ticker"),
  };

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const wrapAng = (a) => {
    while (a > Math.PI) a -= TAU;
    while (a < -Math.PI) a += TAU;
    return a;
  };

  let W = 1280, H = 720, DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  const AudioBus = {
    ctx: null,
    ensure() {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume();
    },
    beep(freq, dur, type, gain) {
      this.ensure();
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.value = gain || 0.04;
      o.connect(g); g.connect(this.ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      o.stop(this.ctx.currentTime + dur + 0.02);
    },
    thrust() { this.beep(90 + Math.random() * 40, 0.06, "sawtooth", 0.015); },
    shot() { this.beep(420, 0.08, "square", 0.05); this.beep(180, 0.12, "triangle", 0.03); },
    beam() { this.beep(880, 0.05, "sine", 0.03); },
    boom() { this.beep(70, 0.4, "sawtooth", 0.08); this.beep(40, 0.55, "square", 0.05); },
    jump() { this.beep(240, 0.2, "sine", 0.05); this.beep(720, 0.15, "triangle", 0.03); },
    fanfare() {
      [392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.beep(f, 0.22, "triangle", 0.05), i * 140));
    }
  };

  const keys = Object.create(null);
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === "Space") keys[" "] = true;
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase()) || e.code === "Space") e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.code === "Space") keys[" "] = false;
  });

  const THEATERS = [
    { id: "SF-01", name: "LEO / GOLD DOME", blurb: "Low Earth orbit. Two hulls. One well. Prove the 1962 duel still decides a 2026 fight.", gravity: 9800, sunR: 34, sunColor: ["#ffb347", "#ff5a1f"], drones: 0, ai: 0.55, asteroids: 0, storms: false },
    { id: "SF-02", name: "LUNAR LAGRANGE", blurb: "Quiet gravity. The opposing wedge no longer comes alone — Sentinel drones detach and hunt.", gravity: 4200, sunR: 26, sunColor: ["#cfd8e6", "#7a8799"], drones: 2, ai: 0.7, asteroids: 0, storms: false },
    { id: "SF-03", name: "MARS APPROACH", blurb: "A heavier well and an AEGIS battery. Heat-manage the beam or it dies when you need it.", gravity: 12000, sunR: 40, sunColor: ["#ff6b3d", "#8b1e12"], drones: 1, ai: 0.8, asteroids: 3, storms: false },
    { id: "SF-04", name: "BELT AMBUSH", blurb: "Rocks do not take sides. They take hull. Sling them or die on them.", gravity: 7000, sunR: 22, sunColor: ["#e8c36a", "#6a4a12"], drones: 2, ai: 0.85, asteroids: 9, storms: false },
    { id: "SF-05", name: "JOVIAN GATE", blurb: "The well is cruel. The AI leads every shot and calls the swarm. Finish the exercise.", gravity: 16000, sunR: 52, sunColor: ["#e8d5a3", "#c47a2a"], drones: 4, ai: 1, asteroids: 4, storms: true }
  ];

  const state = {
    screen: "boot", mode: "campaign", mission: 0, t: 0, shake: 0,
    ships: [], shots: [], drones: [], rocks: [], fx: [], stars: [],
    sun: { x: 0, y: 0, r: 36, g: 10000 }, winner: null, twoPlayer: false, campaignWon: false
  };

  function seedStars() {
    state.stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * 4000 - 2000, y: Math.random() * 4000 - 2000,
      z: 0.3 + Math.random() * 1.4, s: Math.random() < 0.08 ? 2 : 1
    }));
  }
  seedStars();

  function addFx(x, y, n, color, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = (speed || 80) * (0.3 + Math.random());
      state.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.6, color: color || "#ffd27a", r: 1 + Math.random() * 2 });
    }
  }

  function makeShip(side) {
    const left = side === 0;
    return {
      side, name: left ? "GOLD EAGLE" : "CRIMSON WEDGE",
      x: left ? W * 0.22 : W * 0.78, y: left ? H * 0.62 : H * 0.38,
      vx: 0, vy: 0, a: left ? 0 : Math.PI, hp: 100, fuel: 100, heat: 0,
      torps: 24, drones: 3, cooldown: 0, beamCd: 0, droneCd: 0, hyperCd: 0,
      thrusting: false, alive: true, hyperspace: 0,
      color: left ? "#d4af37" : "#ff4d4d", accent: left ? "#fff3c4" : "#ffd0d0"
    };
  }

  function resetArena() {
    const th = THEATERS[state.mission] || THEATERS[0];
    state.sun = { x: W * 0.5, y: H * 0.5, r: th.sunR, g: th.gravity, color: th.sunColor };
    state.ships = [makeShip(0), makeShip(1)];
    state.shots = []; state.drones = []; state.rocks = []; state.fx = [];
    state.winner = null; state.shake = 0;
    for (let i = 0; i < th.asteroids; i++) {
      const ang = (i / th.asteroids) * TAU + Math.random() * 0.4;
      const rad = 160 + Math.random() * Math.min(W, H) * 0.32;
      state.rocks.push({ x: state.sun.x + Math.cos(ang) * rad, y: state.sun.y + Math.sin(ang) * rad, vx: Math.cos(ang + 1.2) * (20 + Math.random() * 30), vy: Math.sin(ang + 1.2) * (20 + Math.random() * 30), r: 10 + Math.random() * 18, spin: (Math.random() - 0.5) * 2, a: Math.random() * TAU });
    }
    if (state.mode === "campaign" && th.drones) {
      for (let i = 0; i < th.drones; i++) spawnDrone(state.ships[1]);
    }
    overlay.theater.textContent = th.id + "  \u00b7  " + th.name;
  }

  function spawnDrone(owner) {
    if (!owner.alive) return;
    const a = owner.a + Math.PI + (Math.random() - 0.5);
    state.drones.push({ x: owner.x + Math.cos(a) * 28, y: owner.y + Math.sin(a) * 28, vx: owner.vx, vy: owner.vy, a, hp: 18, side: owner.side, cd: 0.6, life: 28, color: owner.side === 0 ? "#9be7ff" : "#ff8aa0" });
  }

  function fireTorp(ship) {
    if (!ship.alive || ship.cooldown > 0 || ship.torps <= 0) return;
    ship.torps--; ship.cooldown = 0.28;
    const speed = 320;
    state.shots.push({ x: ship.x + Math.cos(ship.a) * 18, y: ship.y + Math.sin(ship.a) * 18, vx: ship.vx + Math.cos(ship.a) * speed, vy: ship.vy + Math.sin(ship.a) * speed, life: 1.6, side: ship.side, kind: "torp", r: 2.4 });
    AudioBus.shot();
    addFx(ship.x + Math.cos(ship.a) * 16, ship.y + Math.sin(ship.a) * 16, 6, ship.color, 40);
  }

  function fireBeam(ship, target) {
    if (!ship.alive || ship.beamCd > 0 || ship.heat > 86) return;
    ship.heat = Math.min(100, ship.heat + 18); ship.beamCd = 0.16;
    const reach = 240;
    const aim = target ? angTo(ship, target) : ship.a;
    const hx = ship.x + Math.cos(aim) * reach;
    const hy = ship.y + Math.sin(aim) * reach;
    state.shots.push({ x: ship.x, y: ship.y, x2: hx, y2: hy, life: 0.08, side: ship.side, kind: "beam", aim, reach });
    AudioBus.beam();
    const victims = state.ships.concat(state.drones);
    for (const v of victims) {
      if (v.side === ship.side) continue;
      if (v.hp !== undefined && v.hp <= 0) continue;
      const d = pointSegDist(v.x, v.y, ship.x, ship.y, hx, hy);
      if (d < 14) damage(v, 9, ship);
    }
  }

  function pointSegDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function hyperspace(ship) {
    if (!ship.alive || ship.hyperCd > 0) return;
    ship.hyperCd = 3.2; ship.hyperspace = 0.35;
    AudioBus.jump(); addFx(ship.x, ship.y, 28, "#9be7ff", 160);
    if (Math.random() < 0.08) { damage(ship, 100, null); overlay.ticker.textContent = ship.name + "  \u00b7  HYPERSPACE COLLAPSE"; return; }
    ship.x = 80 + Math.random() * (W - 160);
    ship.y = 80 + Math.random() * (H - 160);
    ship.vx *= 0.25; ship.vy *= 0.25;
    addFx(ship.x, ship.y, 22, ship.color, 120);
  }

  function damage(unit, amt) {
    unit.hp -= amt;
    state.shake = Math.min(14, state.shake + amt * 0.12);
    addFx(unit.x, unit.y, 8, unit.color || "#fff", 70);
    if (unit.hp <= 0) {
      unit.alive = false; unit.hp = 0;
      AudioBus.boom();
      addFx(unit.x, unit.y, 50, "#ffd27a", 180);
      addFx(unit.x, unit.y, 24, unit.color || "#fff", 90);
    }
  }

  function applyGravity(o, dt) {
    const dx = state.sun.x - o.x, dy = state.sun.y - o.y;
    const r2 = dx * dx + dy * dy;
    const r = Math.sqrt(r2) || 1;
    const acc = state.sun.g / r2;
    o.vx += (dx / r) * acc * dt;
    o.vy += (dy / r) * acc * dt;
    if (r < state.sun.r + (o.r || 10)) {
      if (o.hp !== undefined) damage(o, 200);
      else o.life = 0;
    }
  }

  function wrap(o) {
    const m = 24;
    if (o.x < -m) o.x = W + m;
    if (o.x > W + m) o.x = -m;
    if (o.y < -m) o.y = H + m;
    if (o.y > H + m) o.y = -m;
  }

  function thinkAI(me, foe, dt) {
    const th = THEATERS[state.mission] || THEATERS[0];
    const skill = th.ai;
    if (!me.alive || !foe) return;
    const sunD = dist(me, state.sun);
    const toSun = angTo(me, state.sun);
    const toFoe = angTo(me, foe);
    const foeD = dist(me, foe);
    let desired = toFoe;
    if (sunD < state.sun.r + 90) desired = wrapAng(toSun + Math.PI);
    else if (foeD < 90) desired = wrapAng(toFoe + 0.9);
    else if (foeD > 280) desired = toFoe;
    else desired = wrapAng(toFoe + Math.sin(state.t * 1.4) * 0.35);
    const err = wrapAng(desired - me.a);
    if (err > 0.08) me.a += 2.6 * dt;
    else if (err < -0.08) me.a -= 2.6 * dt;
    const shouldThrust = (foeD > 140 && Math.abs(err) < 0.45) || sunD < state.sun.r + 110;
    if (shouldThrust && me.fuel > 0) {
      me.vx += Math.cos(me.a) * 140 * dt;
      me.vy += Math.sin(me.a) * 140 * dt;
      me.fuel = Math.max(0, me.fuel - 8 * dt);
      me.thrusting = true;
    }
    const leadT = foeD / 320;
    const pred = { x: foe.x + foe.vx * leadT * skill, y: foe.y + foe.vy * leadT * skill };
    const aimErr = Math.abs(wrapAng(angTo(me, pred) - me.a));
    if (foeD < 360 && aimErr < 0.18 + (1 - skill) * 0.2) fireTorp(me);
    if (foeD < 220 && aimErr < 0.25 && me.heat < 70) fireBeam(me, foe);
    if (me.drones > 0 && me.droneCd <= 0 && foeD < 420 && Math.random() < dt * 0.6 * skill) {
      me.drones--; me.droneCd = 2.4; spawnDrone(me);
    }
    if (me.hp < 28 && sunD < 160 && me.hyperCd <= 0) hyperspace(me);
  }

  function thinkDrone(d, dt) {
    const foe = state.ships.find((s) => s.side !== d.side && s.alive);
    if (!foe) return;
    const desired = angTo(d, foe);
    const err = wrapAng(desired - d.a);
    d.a += clamp(err, -4 * dt, 4 * dt);
    d.vx += Math.cos(d.a) * 90 * dt;
    d.vy += Math.sin(d.a) * 90 * dt;
    d.vx *= 0.992; d.vy *= 0.992;
    d.cd -= dt;
    if (d.cd <= 0 && dist(d, foe) < 260) {
      d.cd = 0.55;
      state.shots.push({ x: d.x, y: d.y, vx: d.vx + Math.cos(d.a) * 280, vy: d.vy + Math.sin(d.a) * 280, life: 0.9, side: d.side, kind: "torp", r: 1.6 });
    }
  }

  function controlHuman(ship, map, dt) {
    if (!ship.alive) return;
    if (keys[map.left]) ship.a -= 2.8 * dt;
    if (keys[map.right]) ship.a += 2.8 * dt;
    if (keys[map.thrust] && ship.fuel > 0) {
      ship.vx += Math.cos(ship.a) * 155 * dt;
      ship.vy += Math.sin(ship.a) * 155 * dt;
      ship.fuel = Math.max(0, ship.fuel - 9 * dt);
      ship.thrusting = true;
      if (Math.random() < 0.3) AudioBus.thrust();
    }
    if (keys[map.fire]) fireTorp(ship);
    if (keys[map.beam]) fireBeam(ship, state.ships[1 - ship.side]);
    if (keys[map.drone] && ship.drones > 0 && ship.droneCd <= 0) { ship.drones--; ship.droneCd = 1.8; spawnDrone(ship); }
    if (keys[map.hyper]) hyperspace(ship);
  }

  const P1 = { left: "a", right: "d", thrust: "w", fire: " ", beam: "e", drone: "q", hyper: "s" };
  const P2 = { left: "j", right: "l", thrust: "i", fire: "k", beam: "o", drone: "u", hyper: "m" };

  function step(dt) {
    state.t += dt;
    state.shake = Math.max(0, state.shake - dt * 18);
    const p1 = state.ships[0], p2 = state.ships[1];
    if (!p1) return;
    p1.thrusting = false; if (p2) p2.thrusting = false;
    controlHuman(p1, P1, dt);
    if (keys["f"]) fireTorp(p1);
    if (state.twoPlayer && p2) {
      controlHuman(p2, P2, dt);
      if (keys[";"]) fireTorp(p2);
      if (keys[","]) hyperspace(p2);
    } else if (p2) thinkAI(p2, p1, dt);

    for (const ship of state.ships) {
      if (!ship.alive) continue;
      ship.cooldown = Math.max(0, ship.cooldown - dt);
      ship.beamCd = Math.max(0, ship.beamCd - dt);
      ship.droneCd = Math.max(0, ship.droneCd - dt);
      ship.hyperCd = Math.max(0, ship.hyperCd - dt);
      ship.heat = Math.max(0, ship.heat - 16 * dt);
      ship.hyperspace = Math.max(0, ship.hyperspace - dt);
      applyGravity(ship, dt);
      ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship);
      if (ship.thrusting) addFx(ship.x - Math.cos(ship.a) * 12, ship.y - Math.sin(ship.a) * 12, 1, ship.color, 50);
    }
    for (const d of state.drones) {
      d.life -= dt; applyGravity(d, dt); thinkDrone(d, dt);
      d.x += d.vx * dt; d.y += d.vy * dt; wrap(d);
      if (d.life <= 0) d.hp = 0;
    }
    for (const r of state.rocks) {
      applyGravity(r, dt); r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.spin * dt; wrap(r);
      for (const s of state.ships) {
        if (s.alive && dist(r, s) < r.r + 12) { damage(s, 18); r.vx *= -0.6; r.vy *= -0.6; addFx(s.x, s.y, 12, "#e8c36a", 90); }
      }
    }
    for (const sh of state.shots) {
      sh.life -= dt;
      if (sh.kind === "torp") {
        applyGravity(sh, dt); sh.x += sh.vx * dt; sh.y += sh.vy * dt; wrap(sh);
        for (const s of state.ships) { if (s.alive && s.side !== sh.side && dist(sh, s) < 14) { damage(s, 22); sh.life = 0; } }
        for (const d of state.drones) { if (d.hp > 0 && d.side !== sh.side && dist(sh, d) < 10) { d.hp = 0; sh.life = 0; addFx(d.x, d.y, 14, d.color, 80); } }
        for (const r of state.rocks) { if (dist(sh, r) < r.r) { sh.life = 0; r.r *= 0.7; addFx(r.x, r.y, 10, "#ccc", 60); } }
      }
    }
    state.shots = state.shots.filter((s) => s.life > 0);
    state.drones = state.drones.filter((d) => d.hp > 0 && d.life > 0);
    state.rocks = state.rocks.filter((r) => r.r > 6);
    for (const f of state.fx) { f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.98; f.vy *= 0.98; }
    state.fx = state.fx.filter((f) => f.life > 0);
    if (!state.winner) {
      const a1 = state.ships[0] && state.ships[0].alive;
      const a2 = state.ships[1] && state.ships[1].alive;
      if (a1 && !a2) finish("GOLD EAGLE HOLDS THE HIGH GROUND", true);
      else if (!a1 && a2) finish("CRIMSON WEDGE TAKES THE FIELD", false);
      else if (!a1 && !a2) finish("MUTUAL KILL — BOTH HULLS LOST", false);
    }
    paintHud();
  }

  function finish(title, win) {
    state.winner = title;
    overlay.endTitle.textContent = title;
    if (state.mode === "campaign" && win) {
      if (state.mission >= THEATERS.length - 1) {
        state.campaignWon = true;
        overlay.endBody.textContent = "Operation HIGH GROUND complete. Five theaters. One service. The 1962 duel still writes the last line.";
      } else overlay.endBody.textContent = "Theater secured. Advance the Gold Eagle to the next well.";
    } else if (state.mode === "campaign") overlay.endBody.textContent = "Hull lost. Re-run the theater. The high ground is not a speech.";
    else overlay.endBody.textContent = "Duel complete. Reset the well or return to the flag deck.";
    overlay.end.classList.remove("hidden");
    document.getElementById("next-mission").classList.toggle("hidden", !(state.mode === "campaign" && win && state.mission < THEATERS.length - 1));
  }

  function paintHud() {
    const p1 = state.ships[0], p2 = state.ships[1];
    if (!p1 || !p2) return;
    overlay.p1hp.style.width = p1.hp + "%"; overlay.p1fuel.style.width = p1.fuel + "%"; overlay.p1heat.style.width = p1.heat + "%";
    overlay.p2hp.style.width = p2.hp + "%"; overlay.p2fuel.style.width = p2.fuel + "%"; overlay.p2heat.style.width = p2.heat + "%";
    const th = THEATERS[state.mission];
    overlay.ticker.textContent = th.id + "  \u00b7  TORPS " + p1.torps + "  \u00b7  DRONES " + p1.drones + "  \u00b7  HYPER " + (p1.hyperCd > 0 ? p1.hyperCd.toFixed(1) : "READY");
  }

  function drawShip(s) {
    if (!s.alive && s.hyperspace <= 0) return;
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a);
    ctx.globalAlpha = s.hyperspace > 0 ? 0.35 : 1;
    ctx.shadowColor = s.color; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-12, 9); ctx.lineTo(-7, 0); ctx.lineTo(-12, -9); ctx.closePath();
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-4, 3); ctx.lineTo(-4, -3); ctx.closePath(); ctx.fillStyle = s.accent; ctx.fill();
    if (s.thrusting) {
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-22 - Math.random() * 8, 4); ctx.lineTo(-18, 0); ctx.lineTo(-22 - Math.random() * 8, -4); ctx.closePath();
      ctx.fillStyle = s.side === 0 ? "#ffe08a" : "#ff8a6a"; ctx.fill();
    }
    ctx.restore();
  }

  function draw() {
    const sx = (Math.random() - 0.5) * state.shake, sy = (Math.random() - 0.5) * state.shake;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.translate(sx, sy);
    ctx.fillStyle = "#04060f"; ctx.fillRect(-20, -20, W + 40, H + 40);
    for (const st of state.stars) {
      const x = (st.x + state.t * 6 * st.z) % W, y = (st.y + state.t * 3 * st.z) % H;
      ctx.globalAlpha = 0.35 + st.z * 0.4; ctx.fillStyle = "#e8eefc";
      ctx.fillRect((x + W) % W, (y + H) % H, st.s, st.s);
    }
    ctx.globalAlpha = 1;
    const th = THEATERS[state.mission] || THEATERS[0];
    if (th.storms) {
      ctx.strokeStyle = "rgba(232,213,163,0.08)"; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.ellipse(state.sun.x, state.sun.y, 210 + Math.sin(state.t) * 8, 70, 0.4, 0, TAU); ctx.stroke();
    }
    const g = ctx.createRadialGradient(state.sun.x, state.sun.y, 4, state.sun.x, state.sun.y, state.sun.r * 3.2);
    g.addColorStop(0, th.sunColor[0]); g.addColorStop(0.35, th.sunColor[1]); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(state.sun.x, state.sun.y, state.sun.r * 3.2, 0, TAU); ctx.fill();
    ctx.shadowColor = th.sunColor[0]; ctx.shadowBlur = 40; ctx.fillStyle = th.sunColor[0];
    ctx.beginPath(); ctx.arc(state.sun.x, state.sun.y, state.sun.r, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    for (const r of state.rocks) {
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a); ctx.strokeStyle = "#c9b48a"; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU; const rr = r.r * (0.75 + ((i * 3) % 4) * 0.08);
        i === 0 ? ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    }
    for (const sh of state.shots) {
      if (sh.kind === "beam") {
        ctx.strokeStyle = sh.side === 0 ? "rgba(158,231,255,0.85)" : "rgba(255,120,120,0.85)";
        ctx.lineWidth = 2.5; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x2, sh.y2); ctx.stroke(); ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "#fff6d2"; ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r || 2, 0, TAU); ctx.fill();
      }
    }
    for (const d of state.drones) {
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.a); ctx.strokeStyle = d.color; ctx.lineWidth = 1.4;
      ctx.strokeRect(-5, -3, 10, 6); ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(9, 0); ctx.stroke(); ctx.restore();
    }
    for (const s of state.ships) drawShip(s);
    for (const f of state.fx) { ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = f.color; ctx.fillRect(f.x, f.y, f.r, f.r); }
    ctx.globalAlpha = 1; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  let last = performance.now();
  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.033);
    last = now;
    if (state.screen === "play") step(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }
  function openMenu() { state.screen = "menu"; hide(overlay.boot); hide(overlay.brief); hide(overlay.end); show(overlay.menu); }
  function openBrief(i) {
    state.mission = i; const th = THEATERS[i];
    overlay.briefTitle.textContent = th.id + "  —  " + th.name;
    overlay.briefBody.textContent = th.blurb;
    hide(overlay.menu); hide(overlay.end); show(overlay.brief);
  }
  function launch(mode, twoPlayer) {
    AudioBus.ensure(); AudioBus.fanfare();
    state.mode = mode; state.twoPlayer = !!twoPlayer;
    if (mode === "duel") state.mission = 0;
    hide(overlay.menu); hide(overlay.brief); hide(overlay.end); hide(overlay.boot);
    resetArena(); state.screen = "play"; overlay.ticker.textContent = "WEAPONS FREE";
  }
  setTimeout(() => { hide(overlay.boot); openMenu(); }, 2800);
  document.getElementById("btn-campaign").onclick = () => { AudioBus.ensure(); state.mission = 0; openBrief(0); };
  document.getElementById("btn-duel-ai").onclick = () => launch("duel", false);
  document.getElementById("btn-duel-p2").onclick = () => launch("duel", true);
  document.getElementById("btn-launch").onclick = () => launch("campaign", false);
  document.getElementById("btn-back").onclick = () => openMenu();
  document.getElementById("btn-menu").onclick = () => openMenu();
  document.getElementById("btn-retry").onclick = () => { hide(overlay.end); launch(state.mode, state.twoPlayer); };
  document.getElementById("next-mission").onclick = () => { hide(overlay.end); state.mission = Math.min(THEATERS.length - 1, state.mission + 1); openBrief(state.mission); };
  window.addEventListener("pointerdown", () => AudioBus.ensure(), { once: true });
})();
