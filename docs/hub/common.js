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
  const sigOf = (box) => [...box.children].slice(0, 8).map((c) =>
    c.dataset.set || c.dataset.tab || c.id || `${c.className}:${(c.textContent || "").slice(0, 32)}`).join("|");
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
