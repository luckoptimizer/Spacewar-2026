/* Multi-touch claw deck for SPACEWAR! 2026 */
window.TouchBus = {
  moveX: 0, thrust: 0, aiming: false, aimAngle: 0,
  fire: false, beam: false, drone: false, hyper: false,
  scope: false, pinchZoom: 0, active: false
};

(() => {
  const bus = window.TouchBus;
  const layer = document.getElementById("touch-layer");
  if (!layer) return;
  const moveBase = document.getElementById("stick-move");
  const moveKnob = document.getElementById("stick-move-knob");
  const aimBase = document.getElementById("stick-aim");
  const aimKnob = document.getElementById("stick-aim-knob");
  const pointers = new Map();
  let pinch0 = 0;
  const isCoarse = () => window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  function showDeck(on) {
    layer.classList.toggle("on", !!on && isCoarse());
    document.body.classList.toggle("touch-on", layer.classList.contains("on"));
  }
  window.TouchDeck = { setPlaying(playing) { showDeck(playing); } };
  function rel(el, x, y) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width * 0.38;
    let dx = x - cx, dy = y - cy;
    const mag = Math.hypot(dx, dy) || 1;
    const used = Math.min(mag, max);
    dx = (dx / mag) * used; dy = (dy / mag) * used;
    return { nx: dx / max, ny: dy / max, dx, dy };
  }
  function setKnob(el, dx, dy) { el.style.transform = "translate(" + dx + "px, " + dy + "px)"; }
  function applyMove(p) {
    const v = rel(moveBase, p.x, p.y);
    bus.moveX = Math.abs(v.nx) > 0.12 ? v.nx : 0;
    bus.thrust = v.ny < -0.12 ? Math.min(1, -v.ny) : 0;
    setKnob(moveKnob, v.dx, v.dy);
  }
  function applyAim(p) {
    const v = rel(aimBase, p.x, p.y);
    const mag = Math.hypot(v.nx, v.ny);
    bus.aiming = mag > 0.18;
    if (bus.aiming) bus.aimAngle = Math.atan2(v.ny, v.nx);
    bus.scope = bus.scope || mag > 0.82;
    setKnob(aimKnob, v.dx, v.dy);
  }
  function clearMove() { bus.moveX = 0; bus.thrust = 0; setKnob(moveKnob, 0, 0); }
  function clearAim() {
    bus.aiming = false;
    if (!document.getElementById("btn-scope") || !document.getElementById("btn-scope").classList.contains("hot")) bus.scope = false;
    setKnob(aimKnob, 0, 0);
  }
  function bindBtn(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    const down = (e) => { e.preventDefault(); e.stopPropagation(); bus[key] = true; el.classList.add("hot"); if (window.AudioBusLite) window.AudioBusLite(); };
    const up = (e) => { e.preventDefault(); bus[key] = false; el.classList.remove("hot"); };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", (e) => { if (e.pointerType !== "mouse") up(e); });
  }
  bindBtn("btn-fire", "fire"); bindBtn("btn-beam", "beam"); bindBtn("btn-drone", "drone"); bindBtn("btn-hyper", "hyper"); bindBtn("btn-scope", "scope");
  function roleAt(x, y) {
    const aimBox = aimBase.getBoundingClientRect();
    if (x >= aimBox.left - 24 && x <= aimBox.right + 24 && y >= aimBox.top - 24 && y <= aimBox.bottom + 24) return "aim";
    const moveBox = moveBase.getBoundingClientRect();
    if (x >= moveBox.left - 24 && x <= moveBox.right + 24 && y >= moveBox.top - 24 && y <= moveBox.bottom + 24) return "move";
    return x < window.innerWidth * 0.46 ? "move" : "aim";
  }
  function updatePinch() {
    const pts = Array.from(pointers.values());
    if (pts.length >= 2) {
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (!pinch0) pinch0 = d;
      bus.pinchZoom = Math.max(-0.35, Math.min(0.7, (d - pinch0) / 280));
    } else {
      pinch0 = 0; bus.pinchZoom *= 0.85;
      if (Math.abs(bus.pinchZoom) < 0.02) bus.pinchZoom = 0;
    }
  }
  function onDown(e) {
    if (!layer.classList.contains("on")) return;
    if (e.target.closest(".pad-btn")) return;
    e.preventDefault();
    bus.active = true;
    const role = roleAt(e.clientX, e.clientY);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, role });
    if (layer.setPointerCapture) layer.setPointerCapture(e.pointerId);
    if (role === "move") applyMove(pointers.get(e.pointerId));
    if (role === "aim") applyAim(pointers.get(e.pointerId));
    updatePinch();
  }
  function onMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    p.x = e.clientX; p.y = e.clientY;
    if (p.role === "move") applyMove(p);
    if (p.role === "aim") applyAim(p);
    updatePinch();
  }
  function onUp(e) {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (!p) return;
    e.preventDefault();
    if (p.role === "move" && !Array.from(pointers.values()).some(function(q){ return q.role === "move"; })) clearMove();
    if (p.role === "aim" && !Array.from(pointers.values()).some(function(q){ return q.role === "aim"; })) clearAim();
    if (!pointers.size) bus.active = false;
    updatePinch();
  }
  layer.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  ["touchstart", "touchmove", "gesturestart"].forEach((type) => {
    document.addEventListener(type, (e) => { if (layer.classList.contains("on")) e.preventDefault(); }, { passive: false });
  });
  showDeck(false);
})();
