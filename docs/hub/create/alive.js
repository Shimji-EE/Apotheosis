// Generative stage for the character creator (Charl, 2026-11-04: "make it feel alive").
// The centre of the stage is drawn from the build itself, so no two heroes look the same:
//   - a ring of twenty glyphs in the site's invented script (main.js), one per level. Which
//     glyphs appear is seeded by the name, species, class, subclass, background, belief and
//     alignment, so the ring rewrites itself as those change, and lights up as the hero levels;
//   - the hero's "soul": a hexagon of the six ability scores that swells and shrinks as they change;
//   - numbers that count to their new value, with a small +/- that rises off them;
//   - a short flare whenever the species or class emblem changes.
// Additive only: create.js calls these from renderStage. Off (drawn still) under prefers-reduced-motion.
window.CreatorAlive = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const svg = (tag, attrs = {}) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };
  // The same Glagolitic-in-brush-strokes glyphs as the landing page's hero columns.
  const GLYPHS = [
    "M10 3.5a2.6 2.6 0 1 0 0.01 0M3 11h14M10 11v6.5M6.5 17.5h7",
    "M6 3v14M14 3v14M6 3h8M10 15.5a1.8 1.8 0 1 0 0.01 0",
    "M4.5 4h11L10 11ZM4 14h12M7 17.5h6",
    "M5 4h10v8H5ZM10 8a1.6 1.6 0 1 0 0.01 0M10 12v5.5l-3 0.5",
    "M4 4h12M10 4v9M6 15a2 2 0 1 0 0.01 0M14 15a2 2 0 1 0 0.01 0",
    "M2.5 10h15M6 3.5a2.4 2.4 0 1 0 0.01 0M14 11.5a2.4 2.4 0 1 0 0.01 0",
    "M4 3v14M7 5h9M7 10h6M7 15h9M16 10a1.4 1.4 0 1 0 0.01 0",
    "M5 4h10v6H5v6h10M10 18.5a0.9 0.9 0 1 0 0.01 0",
    "M10 3.5a6 6 0 1 0 0.01 0M3.5 9.5h13M10 2v3",
    "M7 6v11M13 6v11M7 9h6M7 14h6M7 6l3-3.5L13 6",
    "M3.5 5h13l-2.5 3M10 5v12M6 12l-2.5 4M14 12l2.5 4",
    "M10 3v4M4 7h12M5.5 7v6a4.5 4.5 0 0 0 9 0V7M10 17v1.5",
  ];
  const ABIL = ["str", "dex", "con", "int", "wis", "cha"];
  const RING = 20, R_GLYPH = 103, G = 11; // glyph slots, ring radius, glyph size (viewBox units)
  const soulR = (v) => 30 + (Math.max(3, Math.min(20, v)) - 3) / 17 * 54; // score 3 → 30, 20 → 84
  const corner = (i, r) => { const a = (-90 + i * 60) * Math.PI / 180; return [Math.cos(a) * r, Math.sin(a) * r]; };
  const hexPts = (rs) => rs.map((r, i) => corner(i, r).map((n) => n.toFixed(2)).join(",")).join(" ");

  // String hash → seeded generator (mulberry32), so a build always writes the same ring.
  function rng(text) {
    let h = 1779033703 ^ text.length;
    for (let i = 0; i < text.length; i++) { h = Math.imul(h ^ text.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------- the sigil (persistent: create.js re-inserts the same node on every render) ---------- */

  const node = svg("svg", { class: "cc-sigil", viewBox: "-120 -120 240 240", "aria-hidden": "true", focusable: "false" });
  const turn = svg("g", { class: "sigil-turn" });
  const ring = svg("g", { class: "sigil-ring" });
  const guides = svg("g", { class: "sigil-guides" });
  for (const v of [10, 20]) guides.append(svg("polygon", { points: hexPts(ABIL.map(() => soulR(v))) }));
  for (let i = 0; i < 6; i++) { const [x, y] = corner(i, soulR(20)); guides.append(svg("line", { x1: 0, y1: 0, x2: x.toFixed(2), y2: y.toFixed(2) })); }
  const soul = svg("polygon", { class: "sigil-soul" });
  const dots = svg("g", { class: "sigil-dots" });
  const dot = ABIL.map(() => dots.appendChild(svg("circle", { r: 2.2 })));
  const labels = svg("g", { class: "sigil-labels" });
  const label = ABIL.map((a, i) => { const [x, y] = corner(i, soulR(20) + 8); const t = svg("text", { x: x.toFixed(1), y: y.toFixed(1) }); t.textContent = a; return labels.appendChild(t); });
  turn.append(ring);
  node.append(guides, soul, dots, labels, turn);
  // The glyph ring turns very slowly. Started from script (not CSS) so re-inserting the node keeps its place.
  if (!still && turn.animate) turn.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 240000, iterations: Infinity });

  let seedNow = null, levelNow = 0, soulNow = null, soulAnim = 0;

  function writeRing(seed) {
    const next = rng(seed);
    const slots = [];
    for (let i = 0; i < RING; i++) {
      const a = (i / RING) * 360; // clockwise from the top, level 1 first
      const g = svg("g", { class: "sigil-glyph", transform: `rotate(${a}) translate(0 ${-R_GLYPH}) scale(${G / 20}) translate(-10 -10)` });
      const p = svg("path", { d: GLYPHS[Math.floor(next() * GLYPHS.length)], pathLength: "1" });
      // A few glyphs are mirrored, so the same twelve shapes read as a larger script.
      if (next() < 0.3) p.setAttribute("transform", "translate(20 0) scale(-1 1)");
      g.append(p);
      slots.push(g);
    }
    ring.replaceChildren(...slots);
    if (still) return;
    slots.forEach((g, i) => g.firstChild.animate(
      [{ strokeDashoffset: 1, opacity: 0.2 }, { strokeDashoffset: 0, opacity: 1 }],
      { duration: 700, delay: i * 35, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
  }
  function lightRing(level) {
    [...ring.children].forEach((g, i) => g.classList.toggle("is-lit", i < level));
    if (!still && levelNow && level > levelNow) {
      for (let i = levelNow; i < level && i < RING; i++) {
        ring.children[i].animate([{ filter: "drop-shadow(0 0 0 rgba(236,74,86,0))" }, { filter: "drop-shadow(0 0 6px rgba(255,138,143,1))" }, { filter: "drop-shadow(0 0 0 rgba(236,74,86,0))" }],
          { duration: 900, delay: (i - levelNow) * 60 });
      }
    }
    levelNow = level;
  }
  function drawSoul(rs) {
    soul.setAttribute("points", hexPts(rs));
    rs.forEach((r, i) => { const [x, y] = corner(i, r); dot[i].setAttribute("cx", x.toFixed(2)); dot[i].setAttribute("cy", y.toFixed(2)); });
  }
  function shapeSoul(scores) {
    const to = ABIL.map((a) => soulR(scores[a]));
    ABIL.forEach((a, i) => label[i].classList.toggle("is-high", scores[a] >= 16));
    const from = soulNow || to.map(() => 30);
    soulNow = to;
    cancelAnimationFrame(soulAnim);
    if (still) return drawSoul(to);
    const t0 = performance.now(), D = 520;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
      drawSoul(from.map((f, i) => f + (to[i] - f) * e));
      if (k < 1) soulAnim = requestAnimationFrame(step);
    };
    soulAnim = requestAnimationFrame(step);
  }

  // seedParts: the choices that write the ring. scores: final ability scores. level: 1–20.
  function sigil({ seedParts, scores, level }) {
    const seed = seedParts.map((x) => String(x || "").trim().toLowerCase()).join("|");
    if (seed !== seedNow) { seedNow = seed; writeRing(seed); levelNow = 0; }
    lightRing(level);
    shapeSoul(scores);
    return node;
  }

  /* ---------- living numbers ---------- */

  const last = {};
  const numIn = (t) => { const m = /[-+]?\d+/.exec(t); return m ? Number(m[0]) : null; };
  // For every [data-k] in root: if its number changed since the last render, count up or down to it
  // and let a small +n / -n rise off it.
  function numbers(root) {
    for (const elm of root.querySelectorAll("[data-k]")) {
      const k = elm.dataset.k, text = elm.textContent, to = numIn(text), from = last[k];
      last[k] = to;
      if (from == null || to == null || from === to || still) continue;
      const up = to > from;
      const cell = elm.parentElement || elm;
      cell.classList.remove("is-up", "is-down"); void cell.offsetWidth; cell.classList.add(up ? "is-up" : "is-down");
      cell.append(Object.assign(document.createElement("span"), { className: `cc-delta${up ? "" : " is-down"}`, textContent: `${up ? "+" : "−"}${Math.abs(to - from)}`, ariaHidden: "true" }));
      const t0 = performance.now(), D = 420;
      const step = (t) => {
        if (!elm.isConnected) return;
        const k2 = Math.min(1, (t - t0) / D);
        const n = Math.round(from + (to - from) * (1 - Math.pow(1 - k2, 3)));
        elm.textContent = text.replace(/[-+]?\d+/, (m) => (/^[-+]/.test(m) && n >= 0 ? `+${n}` : `${n}`));
        if (k2 < 1) requestAnimationFrame(step); else elm.textContent = text;
      };
      requestAnimationFrame(step);
    }
  }

  /* ---------- emblem flare ---------- */

  let emblemNow = null;
  function flare(host, key) {
    if (emblemNow !== null && key !== emblemNow && !still) host.classList.add("is-reforged");
    emblemNow = key;
  }

  return { sigil, numbers, flare };
})();
