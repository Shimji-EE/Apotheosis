// The Tavern lobby: the party line-up, who has loaded in, and the character each
// member brings. Who is online travels over Supabase Realtime presence, so nothing
// is stored for it; a member drops out of the lobby when they close the page.
(() => {
  const { db, $, el } = window.Hub;
  let me = null;
  let profiles = [];
  let chars = [];
  let online = {}; // member id → their presence payload
  let ready = false;
  let channel = null;
  let quietUntil = 0; // presence replays everyone on join; keep that out of the feed
  const fresh = new Set(); // members who just loaded in, for the slide-in animation

  const pickKey = () => `tavern.char.${me.id}`;
  function storedPick() {
    try { return localStorage.getItem(pickKey()); } catch { return null; }
  }
  function storePick(id) {
    try { localStorage.setItem(pickKey(), id); } catch { /* private window: the choice lasts this visit */ }
  }

  const charsOf = (id) => chars.filter((c) => c.owner_id === id);
  function myPick() {
    if (isDM()) return null;
    const mine = charsOf(me.id);
    return mine.find((c) => c.id === storedPick()) || mine[0] || null;
  }
  // The character a member brings: what they picked if they are here, else their first.
  function broughtBy(p) {
    const pick = online[p.id] && online[p.id].char;
    const theirs = charsOf(p.id);
    return theirs.find((c) => c.id === pick) || theirs[0] || null;
  }
  const subLine = (c) => [c.species, c.class, c.level ? `Level ${c.level}` : ""].filter(Boolean).join(" · ");
  const initial = (s) => String(s || "?").trim().slice(0, 1).toUpperCase();
  const nameOf = (id) => (profiles.find((p) => p.id === id) || {}).display_name || "Someone";

  function art(node, c, fallback) {
    if (c && /^https:\/\//i.test(c.portrait || "")) {
      node.style.backgroundImage = `url("${encodeURI(c.portrait)}")`;
      node.classList.add("has-art");
    } else {
      node.append(el("span", { class: "seat-sigil", text: fallback }));
    }
    return node;
  }

  const isDM = () => me && me.role === "dm";
  const charArt = (c) => art(el("span", { class: "rail-char-art", "aria-hidden": "true" }), c, initial(c.name));
  const charText = (c, sub) => el("span", { class: "rail-char-text" },
    el("span", { class: "rail-char-name", text: c.name }),
    el("span", { class: "rail-char-sub", text: sub }));

  function drawRail() {
    const list = $("my-chars");
    // The DM brings no character: their column lists every sheet at the table instead.
    if (isDM()) {
      $("chars-head").textContent = "The party's characters";
      $("chars-note").textContent = "Open any sheet. The DM runs the table and brings no character.";
      const party = chars.filter((c) => (profiles.find((p) => p.id === c.owner_id) || {}).role !== "dm");
      list.replaceChildren(...party.map((c) => el("li", { class: "is-link" },
        el("a", { class: "rail-char", href: `character/?id=${c.id}` }, charArt(c), charText(c, `${nameOf(c.owner_id)} · ${subLine(c)}`)))));
      if (!party.length) list.append(el("li", { class: "rail-note", text: "No player characters yet." }));
      return;
    }
    const pick = myPick();
    const mine = charsOf(me.id);
    list.replaceChildren(...mine.map((c) => {
      const chosen = pick && pick.id === c.id;
      const choose = el("button", { type: "button", class: `rail-char${chosen ? " is-chosen" : ""}`, "aria-pressed": String(!!chosen) },
        charArt(c), charText(c, subLine(c)));
      choose.addEventListener("click", () => {
        storePick(c.id);
        drawRail();
        drawLineup();
        share();
      });
      return el("li", {}, choose, el("a", { class: "rail-open", href: `character/?id=${c.id}`, title: `Open ${c.name}'s sheet`, text: "Sheet" }));
    }));
    if (!mine.length) list.append(el("li", { class: "rail-note", text: "No characters yet." }));
  }

  function drawLineup() {
    const order = [...profiles].sort((a, b) =>
      (a.role === "dm" ? 0 : 1) - (b.role === "dm" ? 0 : 1) ||
      (online[a.id] ? 0 : 1) - (online[b.id] ? 0 : 1) ||
      a.display_name.localeCompare(b.display_name));
    $("lineup").replaceChildren(...order.map((p) => {
      const here = !!online[p.id];
      const isReady = here && online[p.id].ready;
      const dm = p.role === "dm";
      const c = dm ? null : broughtBy(p);
      const cls = ["seat", here ? "is-online" : "is-away", isReady ? "is-ready" : "", p.id === me.id ? "is-me" : "", dm ? "is-dm" : "", fresh.has(p.id) ? "just-in" : ""];
      const title = c ? el("a", { class: "seat-char", href: `character/?id=${c.id}`, text: c.name })
        : el("span", { class: "seat-char", text: dm ? "Dungeon Master" : "No character" });
      return el("li", { class: cls.filter(Boolean).join(" ") },
        art(el("div", { class: "seat-art", "aria-hidden": "true" }), c, dm ? "◉" : initial(c ? c.name : p.display_name)),
        c && c.level ? el("span", { class: "seat-level", title: `Level ${c.level}`, text: String(c.level) }) : "",
        el("div", { class: "seat-plate" },
          title,
          el("span", { class: "seat-sub", text: c ? [c.species, c.class].filter(Boolean).join(" · ") : dm ? "Runs the table" : "" }),
          el("a", { class: "seat-player", href: `profile/?u=${encodeURIComponent(p.username)}` },
            el("span", { text: p.display_name }), el("span", { class: "handle", text: ` @${p.username}` }))),
        el("span", { class: "seat-status", text: isReady ? "Ready" : here ? "In the tavern" : "Away" }));
    }));
    const here = profiles.filter((p) => online[p.id]).length;
    const readyCount = profiles.filter((p) => online[p.id] && online[p.id].ready).length;
    $("lobby-count").textContent = `${here} of ${profiles.length} here · ${readyCount} ready`;
    const btn = $("ready");
    btn.textContent = ready ? "Ready" : "Ready up";
    btn.setAttribute("aria-pressed", String(ready));
    btn.classList.toggle("is-on", ready);
  }

  function feed(text) {
    const list = $("lobby-feed");
    list.prepend(el("li", { text }));
    while (list.children.length > 4) list.lastChild.remove();
  }

  function share() {
    const pick = myPick();
    if (channel) channel.track({ char: pick ? pick.id : null, ready, at: Date.now() });
  }

  function join() {
    if (channel) return;
    channel = db.channel("tavern-lobby", { config: { presence: { key: me.id } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        online = Object.fromEntries(Object.entries(state).map(([id, metas]) => [id, metas[metas.length - 1] || {}]));
        drawLineup();
      })
      .on("presence", { event: "join" }, ({ key, currentPresences }) => {
        if (Date.now() < quietUntil || key === me.id || (currentPresences || []).length) return;
        fresh.add(key);
        setTimeout(() => { fresh.delete(key); }, 1200);
        feed(`${nameOf(key)} loaded in`);
      })
      .on("presence", { event: "leave" }, ({ key, currentPresences }) => {
        if (key === me.id || (currentPresences || []).length) return;
        feed(`${nameOf(key)} left the tavern`);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          quietUntil = Date.now() + 1500;
          share();
        }
      });
  }

  function leave() {
    if (channel) db.removeChannel(channel);
    channel = null;
    online = {};
    ready = false;
  }

  async function loadChars() {
    const { data } = await db
      .from("characters")
      .select("id, owner_id, name, species, class, level, portrait:data->>portrait")
      .order("created_at");
    chars = data || [];
  }

  async function onMembers(detail) {
    if (!detail) {
      me = null;
      leave();
      return;
    }
    const first = !me || !detail.me || me.id !== detail.me.id;
    ({ me, profiles } = detail);
    if (!me) return;
    if (first) await loadChars();
    drawRail();
    drawLineup();
    join();
  }
  window.addEventListener("hub:members", (e) => onMembers(e.detail));
  if (window.Hub.members) onMembers(window.Hub.members);

  $("ready").addEventListener("click", () => {
    if (!me) return;
    ready = !ready;
    drawLineup();
    share();
  });
})();
