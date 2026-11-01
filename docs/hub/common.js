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
