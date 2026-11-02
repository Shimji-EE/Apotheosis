// Shared Supabase client and helpers for every Tavern page.
// Public values only: the publishable key is safe in the browser, and row level
// security in the database decides what each signed-in member can see or change.
window.Hub = (() => {
  const SUPABASE_URL = "https://aagtsdqgleopualsallg.supabase.co";
  const SUPABASE_KEY = "sb_publishable_Q-DgGy_SToy1bpobL5UoJw_8piwAcA2";
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = (id) => document.getElementById(id);

  function say(text, isError = false) {
    const status = $("status");
    if (!status) return;
    status.textContent = text;
    status.classList.toggle("is-error", isError);
  }

  // Build an element with text and attributes, never innerHTML, so names stay inert.
  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    node.append(...children);
    return node;
  }

  // Returns { session, me } or sends a signed-out visitor back to the Tavern door.
  async function requireMember(base = "../") {
    const { data } = await db.auth.getSession();
    if (!data.session) {
      location.href = base;
      return null;
    }
    const { data: me } = await db
      .from("profiles")
      .select("id, username, display_name, role")
      .eq("id", data.session.user.id)
      .single();
    return { session: data.session, me };
  }

  return { SUPABASE_URL, SUPABASE_KEY, db, $, say, el, requireMember };
})();

// Motion (Charl, 2026-11-02: "animate all UI"). Panels the pages rebuild fade in with a short stagger,
// but only when what they show changes (a new tab, a new card), never on a simple pick inside them.
// prefers-reduced-motion turns it off (style.css also stops every animation then).
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const BOXES = ["list", "info", "tabs", "my-chars", "characters", "abilities", "side", "tables",
    "basics", "inventory", "inspiration", "journal", "manage", "dm-panel"];
  const ITEMS = ".tile-opt, .check-opt, .list-group, li, .feat-row, .frow, .irow, .cell, .slot, .goal, .jquest, .chip, .ability, .char-item";
  // A page can name what a box shows (data-view); otherwise the first children's ids and headings do.
  // Picks, counts and "is-on" classes are left out, so choosing something never replays the panel.
  const sigOf = (box) => box.dataset.view || [...box.children].slice(0, 8).map((c) =>
    c.dataset.set || c.dataset.tab || c.id || `${c.tagName}:${(c.querySelector("h2, h3, .info-head, strong") || c).textContent.slice(0, 32)}`).join("|");
  // The thing just clicked gets a short pulse once the page has redrawn it.
  let picked = null;
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-set], [data-inherit], [data-skill], [data-feat], .check-opt");
    if (!b) return;
    const attr = ["data-set", "data-inherit", "data-skill", "data-feat"].find((a) => b.hasAttribute(a));
    picked = attr ? `[${attr}="${CSS.escape(b.getAttribute(attr))}"]` : null;
  }, true);
  const pulse = () => {
    if (!picked) return;
    const n = document.querySelector(picked);
    picked = null;
    const t = n && (n.closest(".tile-opt, .check-opt") || n);
    if (t) { t.classList.remove("m-pick"); void t.offsetWidth; t.classList.add("m-pick"); }
  };
  function play(box) {
    let n = 0;
    for (const c of box.children) {
      const parts = c.matches(ITEMS) ? [c] : [c, ...c.querySelectorAll(ITEMS)];
      for (const p of parts) {
        p.style.setProperty("--m-i", Math.min(n++, 18));
        p.classList.remove("m-in");
        void p.offsetWidth;
        p.classList.add("m-in");
      }
    }
  }
  function watch(box) {
    if (!box || box.dataset.motion) return;
    box.dataset.motion = "1";
    let last = sigOf(box);
    const swap = box.id === "info";
    new MutationObserver(() => {
      const now = sigOf(box);
      if (box.id === "list") requestAnimationFrame(pulse);
      if (now === last) return;
      last = now;
      if (swap) { box.classList.remove("m-swap"); void box.offsetWidth; box.classList.add("m-swap"); }
      else play(box);
    }).observe(box, { childList: true });
    if (box.children.length && !swap) play(box);
  }
  const start = () => {
    document.body.classList.add("m-ready");
    BOXES.forEach((id) => watch(document.getElementById(id)));
    // Boxes some pages only make later (panels.js builds its tabs on first open).
    new MutationObserver(() => BOXES.forEach((id) => watch(document.getElementById(id))))
      .observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

// Living page (Charl, 2026-11-02: "not live enough"): embers rise like the landing page's dust, and
// cards lean toward the pointer. Off under prefers-reduced-motion.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const go = () => {
    const cv = document.createElement("canvas");
    cv.id = "embers"; cv.setAttribute("aria-hidden", "true");
    let hz = document.querySelector(".haze");
    if (!hz) { hz = document.createElement("div"); hz.className = "haze"; hz.setAttribute("aria-hidden", "true"); document.body.prepend(hz); }
    hz.after(cv);
    const cx = cv.getContext("2d");
    let w = 0, h = 0;
    const fit = () => { const d = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; cv.width = w * d; cv.height = h * d; cx.setTransform(d, 0, 0, d, 0, 0); };
    fit(); addEventListener("resize", fit);
    const N = Math.round(Math.min(70, (innerWidth * innerHeight) / 22000));
    const spawn = (p = {}) => Object.assign(p, { x: Math.random() * w, y: h + Math.random() * h * 0.3, r: 0.6 + Math.random() * 1.8,
      v: 0.25 + Math.random() * 0.7, sway: Math.random() * 6.28, life: 0, max: 400 + Math.random() * 600, hot: Math.random() < 0.25 });
    const ps = Array.from({ length: N }, () => { const p = spawn(); p.y = Math.random() * h; return p; });
    let last = 0;
    const tick = (t) => {
      requestAnimationFrame(tick);
      if (document.hidden || t - last < 30) return;
      last = t;
      cx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.life++; p.y -= p.v; p.sway += 0.02; p.x += Math.sin(p.sway) * 0.35;
        if (p.y < -10 || p.life > p.max) spawn(p);
        const a = Math.min(1, p.life / 60) * Math.max(0, 1 - p.life / p.max) * (0.55 + 0.45 * Math.sin(p.life * 0.1));
        cx.beginPath(); cx.arc(p.x, p.y, p.r, 0, 6.283);
        cx.fillStyle = p.hot ? `rgba(255,150,120,${a})` : `rgba(236,74,86,${a * 0.8})`;
        cx.shadowColor = "rgba(236,74,86,0.9)"; cx.shadowBlur = p.r * 6;
        cx.fill();
      }
    };
    requestAnimationFrame(tick);
    if (!matchMedia("(hover: hover)").matches) return;
    const TILT = ".seat, .tile-opt, .item-card";
    addEventListener("pointermove", (e) => {
      const c = e.target.closest && e.target.closest(TILT);
      document.querySelectorAll(".m-tilt").forEach((x) => { if (x !== c) { x.classList.remove("m-tilt"); x.style.removeProperty("--tx"); x.style.removeProperty("--ty"); } });
      if (!c) return;
      const b = c.getBoundingClientRect();
      const k = c.classList.contains("seat") ? 7 : 9;
      c.classList.add("m-tilt");
      c.style.setProperty("--tx", `${(((e.clientX - b.left) / b.width) - 0.5) * k}deg`);
      c.style.setProperty("--ty", `${(0.5 - ((e.clientY - b.top) / b.height)) * k}deg`);
    }, { passive: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
