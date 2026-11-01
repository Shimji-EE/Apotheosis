(() => {
  const { SUPABASE_URL, SUPABASE_KEY, db, $ } = window.Hub;
  // Usernames map to a hidden email, so players only ever see username + password.
  const EMAIL_DOMAIN = "members.apotheosis.invalid";
  const status = $("status");

  function say(text, isError = false) {
    status.textContent = text;
    status.classList.toggle("is-error", isError);
    status.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Check the form ourselves so mistakes show as a message instead of a silent block.
  function checkMember(values, isNew) {
    values.username = (values.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(values.username)) {
      throw new Error("Usernames are 3 to 24 letters, numbers or underscores, with no spaces.");
    }
    if (isNew && (values.password || "").length < 8) throw new Error("Passwords need at least 8 characters.");
    if (!values.password) throw new Error("Enter a password.");
    return values;
  }

  const formValues = (form) => Object.fromEntries(new FormData(form).entries());
  const toEmail = (username) => `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;

  async function busy(form, task) {
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      await task();
    } catch (err) {
      say(err.message || String(err), true);
    } finally {
      button.disabled = false;
    }
  }

  async function callMembers(values, withSession) {
    const headers = { "Content-Type": "application/json", apikey: SUPABASE_KEY };
    if (withSession) {
      const { data } = await db.auth.getSession();
      if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-member`, {
      method: "POST",
      headers,
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status}).`);
    return body;
  }

  let me = null;
  let profiles = [];
  let characters = [];
  let lobby = null; // the Realtime presence channel
  let online = {}; // user id -> presence payload
  let firstSync = true;
  const { el } = window.Hub;
  const pickKey = (id) => `tavern.character.${id}`;

  function readPick(id) {
    try { return localStorage.getItem(pickKey(id)); } catch { return null; }
  }
  function writePick(id, charId) {
    try { localStorage.setItem(pickKey(id), charId); } catch { /* private window: presence still carries it */ }
  }

  // The character a member brings to the table: their live pick, else their first one.
  function seatCharacter(userId) {
    const p = profiles.find((x) => x.id === userId);
    if (p && p.role === "dm") return null; // the DM runs the table and brings no character
    const theirs = characters.filter((c) => c.owner_id === userId);
    const wanted = online[userId] && online[userId].character_id;
    return theirs.find((c) => c.id === wanted) || theirs[0] || null;
  }
  function myPick() {
    if (me.role === "dm") return null;
    const theirs = characters.filter((c) => c.owner_id === me.id);
    const saved = readPick(me.id);
    return (theirs.find((c) => c.id === saved) || theirs[0] || {}).id || null;
  }

  async function loadParty() {
    const [p, c] = await Promise.all([
      db.from("profiles").select("id, username, display_name, role").order("role").order("display_name"),
      db.from("characters").select("id, owner_id, name, species, class, level, portrait:data->>portrait").order("created_at"),
    ]);
    if (p.error) throw p.error;
    profiles = p.data;
    characters = c.error ? [] : c.data;
  }

  function feed(text) {
    const list = $("lobby-feed");
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    list.prepend(el("li", {}, el("time", { text: time }), document.createTextNode(text)));
    while (list.children.length > 5) list.lastChild.remove();
  }

  function sigil(cls) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", cls);
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#seat-sigil");
    svg.append(use);
    return svg;
  }

  // The line-up: you first, then whoever is here, then the empty seats of those who aren't.
  function drawSeats(arrived = new Set()) {
    if (!me) return;
    const here = (p) => !!online[p.id];
    const order = [...profiles].sort((a, b) =>
      (b.id === me.id) - (a.id === me.id) || here(b) - here(a) || (a.role === "dm" ? -1 : b.role === "dm" ? 1 : 0)
    );
    $("seats").replaceChildren(
      ...order.map((p) => {
        const c = seatCharacter(p.id);
        const art = el("div", { class: "seat-art" });
        if (c && c.portrait && /^https:\/\//i.test(c.portrait)) art.style.backgroundImage = `url("${encodeURI(c.portrait)}")`;
        else art.append(sigil("seat-sigil"));
        const tags = el("div", { class: "seat-tags" });
        if (p.role === "dm") tags.append(el("span", { class: "tab", text: "DM" }));
        if (p.id === me.id) tags.append(el("span", { class: "tab tab-you", text: "You" }));
        const seat = el("li", { style: `--i:${order.indexOf(p)}`, class: `seat${here(p) ? " is-here" : ""}${p.role === "dm" ? " is-dm" : ""}${arrived.has(p.id) ? " is-arriving" : ""}` },
          art,
          tags,
          el("div", { class: "seat-body" },
            el("span", { class: "seat-status", text: here(p) ? "At the table" : "Not here" }),
            c
              ? el("a", { class: "seat-char", href: `character/?id=${c.id}`, text: c.name })
              : el("span", { class: "seat-char is-none", text: p.role === "dm" ? "Dungeon Master" : "No character" }),
            el("span", { class: "seat-sub", text: c ? [c.species, c.class, `Level ${c.level}`].filter(Boolean).join(" · ") : "" }),
            el("a", { class: "seat-player", href: `profile/?u=${encodeURIComponent(p.username)}`, text: (online[p.id] && online[p.id].display_name) || p.display_name })
          )
        );
        return seat;
      })
    );
    const count = profiles.filter(here).length;
    $("stage-count").textContent = `${count} of ${profiles.length} at the table`;
  }

  function drawRail() {
    $("rail-name").textContent = me.display_name;
    $("rail-name").href = `profile/?u=${encodeURIComponent(me.username)}`;
    $("rail-handle").textContent = `@${me.username} · ${me.role === "dm" ? "DM" : "Player"}`;
    $("rail-profile").href = $("rail-name").href;
    $("rail-new-char").href = $("rail-name").href;
    $("rename-form").display_name.value = me.display_name;

    const isDm = me.role === "dm";
    $("rail-chars-title").textContent = isDm ? "Party sheets" : "Characters";
    $("rail-chars-note").textContent = isDm
      ? "Every player's character. Open a sheet to run it from the DM's side."
      : "Pick who you bring to the table. The others see them on your seat.";
    $("rail-new-char").hidden = isDm;
    if (isDm) return drawPartySheets();
    const mine = characters.filter((c) => c.owner_id === me.id);
    const picked = myPick();
    $("rail-chars").replaceChildren(
      ...mine.map((c) => {
        const radio = el("input", { type: "radio", name: "seat-char", value: c.id, "aria-label": `Bring ${c.name} to the table` });
        radio.checked = c.id === picked;
        radio.addEventListener("change", () => {
          writePick(me.id, c.id);
          if (lobby) lobby.track(presencePayload());
        });
        return el("li", {},
          el("label", { class: "rail-char" },
            radio,
            el("span", {},
              el("span", { class: "rail-char-name", text: c.name }),
              el("span", { class: "rail-char-sub", text: [c.class, `Level ${c.level}`].filter(Boolean).join(" · ") })
            )
          ),
          el("a", { class: "rail-sheet", href: `character/?id=${c.id}`, text: "Sheet" })
        );
      })
    );
    if (!mine.length) $("rail-chars").append(el("li", { class: "rail-note", text: "No characters yet." }));
  }

  // The DM's rail: every player's characters, grouped by player, each with its sheet.
  function drawPartySheets() {
    const players = profiles.filter((p) => p.role !== "dm");
    const items = [];
    for (const p of players) {
      for (const c of characters.filter((x) => x.owner_id === p.id)) {
        items.push(el("li", {},
          el("a", { class: "rail-char", href: `character/?id=${c.id}` },
            el("span", {},
              el("span", { class: "rail-char-name", text: c.name }),
              el("span", { class: "rail-char-sub", text: [p.display_name, c.class, `Level ${c.level}`].filter(Boolean).join(" · ") })
            )
          ),
          el("a", { class: "rail-sheet", href: `character/?id=${c.id}`, text: "Sheet" })
        ));
      }
    }
    $("rail-chars").replaceChildren(...items);
    if (!items.length) $("rail-chars").append(el("li", { class: "rail-note", text: "No player has made a character yet." }));
  }

  function presencePayload() {
    return { user_id: me.id, display_name: me.display_name, character_id: myPick(), at: new Date().toISOString() };
  }

  // Supabase Realtime presence: everyone in the lobby sees the others arrive and leave.
  function joinLobby() {
    firstSync = true;
    lobby = db.channel("tavern-lobby", { config: { presence: { key: me.id } } });
    lobby
      .on("presence", { event: "sync" }, async () => {
        const state = lobby.presenceState();
        const next = {};
        for (const [id, metas] of Object.entries(state)) next[id] = metas[metas.length - 1];
        const fresh = Object.keys(next).filter((id) => !online[id]);
        const arrived = new Set(fresh); // on the first sync everyone already here walks in
        const left = Object.keys(online).filter((id) => !next[id]);
        online = next;
        // Someone new signed up since we loaded: fetch the party again.
        if (Object.keys(next).some((id) => !profiles.find((p) => p.id === id))) await loadParty().catch(() => {});
        // Their character pick may be one we haven't loaded yet.
        else if (Object.values(next).some((m) => m.character_id && !characters.find((c) => c.id === m.character_id))) await loadParty().catch(() => {});
        const name = (id) => (profiles.find((p) => p.id === id) || {}).display_name || "Someone";
        if (!firstSync) fresh.forEach((id) => id !== me.id && feed(`${name(id)} sat down at the table.`));
        left.forEach((id) => id !== me.id && feed(`${name(id)} left the Tavern.`));
        firstSync = false;
        drawSeats(arrived);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") lobby.track(presencePayload());
      });
  }

  function leaveLobby() {
    if (lobby) db.removeChannel(lobby);
    lobby = null;
    online = {};
  }

  async function render() {
    const { data } = await db.auth.getSession();
    const session = data.session;
    $("login-panel").hidden = !!session;
    $("lobby").hidden = !session;
    document.body.classList.toggle("is-lobby", !!session);
    if (!session) {
      $("dm-panel").hidden = true;
      me = null;
      leaveLobby();
      return;
    }

    try {
      await loadParty();
    } catch (error) {
      return say(error.message, true);
    }

    me = profiles.find((p) => p.id === session.user.id);
    if (!me) return say("Your profile is missing. Ask the DM.", true);
    $("dm-panel").hidden = me.role !== "dm";
    drawRail();

    const manage = $("manage");
    manage.replaceChildren(
      ...(me.role === "dm" ? profiles.filter((p) => p.id !== me.id) : []).map((p) => {
        const li = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = p.display_name;
        const handle = document.createElement("span");
        handle.className = "handle";
        handle.textContent = `@${p.username}`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "link-button remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", async () => {
          if (!confirm(`Remove ${p.display_name} (@${p.username}) from the party? Their account is deleted.`)) return;
          remove.disabled = true;
          try {
            await callMembers({ action: "remove", id: p.id }, true);
            say(`Removed @${p.username}.`);
            await render();
          } catch (err) {
            say(err.message, true);
            remove.disabled = false;
          }
        });
        li.append(name, handle, remove);
        return li;
      })
    );
    if (!manage.children.length) {
      const li = document.createElement("li");
      li.className = "handle";
      li.textContent = "No players yet. Share the Tavern link so they can sign up.";
      manage.append(li);
    }

    drawSeats();
    if (!lobby) joinLobby();
    else lobby.track(presencePayload());
  }

  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    busy(form, async () => {
      const { username, password } = checkMember(formValues(form), false);
      const { error } = await db.auth.signInWithPassword({ email: toEmail(username), password });
      if (error) throw new Error("That username and password don't match.");
      form.reset();
      say("Welcome back.");
      await render();
    });
  });

  $("setup-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    busy(form, async () => {
      const values = checkMember(formValues(form), true);
      say("Creating your account…");
      const result = await callMembers(values, false);
      await db.auth.signInWithPassword({ email: toEmail(values.username), password: values.password });
      form.reset();
      say(result.role === "dm" ? "Welcome. The DM seat is yours." : "Welcome to the Tavern.");
      await render();
    });
  });

  $("rename-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    busy(form, async () => {
      const { display_name } = formValues(form);
      const { error } = await db.from("profiles").update({ display_name: display_name.trim() }).eq("id", me.id);
      if (error) throw error;
      say("Name saved.");
      await render();
    });
  });

  $("logout").addEventListener("click", async () => {
    await db.auth.signOut();
    say("Signed out.");
    await render();
  });

  render();
})();
