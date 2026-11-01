// DM console page. Talks only to the local console server, which talks to Supabase.
(() => {
  const $ = (id) => document.getElementById(id);
  const REFRESH_MS = 4000;

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    node.append(...children);
    return node;
  }

  function say(text, isError = false) {
    $("status").textContent = text || "";
    $("status").classList.toggle("is-error", isError);
  }

  async function call(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  async function act(task, done) {
    try {
      say("");
      await task();
      if (done) say(done);
    } catch (err) {
      say(err.message || String(err), true);
    }
  }

  // Local preview uses the same player the Tavern uses, reading files from this laptop.
  const player = SceneAudio.create({ base: `${location.origin}/site/`, onChange: () => {} });
  let scenes = [];
  let state = { scene_id: null, music: {} };
  let files = { audio: [], images: [] };
  let picked = [];
  let timer = null;

  const trackName = player.trackName;
  const music = () => state.music || {};

  // ---- Live panel ----

  async function renderLive() {
    const live = scenes.find((s) => s.id === state.scene_id);
    $("live-scene").textContent = live ? live.name : "No scene";
    $("live-art").style.backgroundImage = live && live.image ? `url("/site/${encodeURI(live.image)}")` : "";
    const m = music();
    $("playpause").textContent = m.playing ? "Pause" : "Play";
    $("volume").value = Number.isFinite(m.volume) ? m.volume : 0.8;
    const has = (m.tracks || []).length > 0;
    for (const id of ["prev", "playpause", "next"]) $(id).disabled = !has;
    $("clear").disabled = !live;
    if (!has) {
      $("live-track").textContent = "Silence";
    } else {
      const pos = await player.where(m);
      const name = pos ? trackName(m.tracks[pos.index]) : "Tracks not found in docs/soundtrack";
      $("live-track").textContent = `${m.playing ? "Playing" : "Paused"}: ${name}`;
    }
    for (const li of document.querySelectorAll(".scene-list li")) li.classList.toggle("is-live", li.dataset.id === state.scene_id);
  }

  async function refreshState() {
    const { state: s } = await call("GET", "/api/state");
    state = s;
    player.update(music());
    await renderLive();
  }

  async function setMusic(patch) {
    const { music: m } = await call("POST", "/api/music", patch);
    state.music = m;
    player.update(m);
    await renderLive();
  }

  $("playpause").addEventListener("click", () => act(() => {
    const m = music();
    return m.playing
      ? setMusic({ playing: false, paused_offset_ms: Date.now() - (m.started_at || Date.now()) })
      : setMusic({ playing: true, started_at: Date.now() - (m.paused_offset_ms || 0) });
  }));

  async function skip(step) {
    const m = music();
    const pos = await player.where(m);
    const n = (m.tracks || []).length;
    if (!pos || !n) return;
    // "Prev" restarts the track first, like any music player, unless it just began.
    const index = step < 0 && pos.offset > 5 ? pos.index : (pos.index + step + n) % n;
    await setMusic({ start_index: index, started_at: Date.now(), paused_offset_ms: 0, playing: true });
  }
  $("next").addEventListener("click", () => act(() => skip(1)));
  $("prev").addEventListener("click", () => act(() => skip(-1)));

  let volumeTimer = null;
  $("volume").addEventListener("input", (e) => {
    clearTimeout(volumeTimer);
    volumeTimer = setTimeout(() => act(() => setMusic({ volume: Number(e.target.value) })), 250);
  });

  $("hear").addEventListener("change", (e) => (e.target.checked ? player.enable() : player.disable()));

  $("clear").addEventListener("click", () => act(async () => {
    await call("POST", "/api/scenes/clear", {});
    await refreshState();
  }, "Scene ended. Players see the empty tavern again."));

  // ---- Scene list ----

  function renderScenes() {
    const list = $("scenes");
    list.replaceChildren();
    if (!scenes.length) list.append(el("li", { class: "empty", text: "No scenes yet. Make one with New scene." }));
    for (const s of scenes) {
      const n = (s.tracks || []).length;
      list.append(el("li", { "data-id": s.id },
        el("div", {},
          el("div", { class: "scene-name", text: s.name }),
          el("div", { class: "scene-meta", text: `${n} track${n === 1 ? "" : "s"}${s.description ? ` · ${s.description}` : ""}` })),
        el("div", { class: "scene-actions" },
          el("button", { class: "button", type: "button", text: "Go live", onclick: () => act(async () => {
            const r = await call("POST", `/api/scenes/${s.id}/activate`, {});
            state = { scene_id: r.scene.id, music: r.music };
            player.update(r.music);
            await renderLive();
          }, `${s.name} is live.`) }),
          el("button", { class: "button button-quiet", type: "button", text: "Edit", onclick: () => openEditor(s) }),
          el("button", { class: "button button-quiet", type: "button", text: "Delete", onclick: () => {
            if (!confirm(`Delete the scene "${s.name}"? The music files stay in docs/soundtrack.`)) return;
            act(async () => {
              await call("DELETE", `/api/scenes/${s.id}`, {});
              await loadScenes();
            }, "Scene deleted.");
          } }))));
    }
    renderLive();
  }

  async function loadScenes() {
    const r = await call("GET", "/api/scenes");
    scenes = r.scenes;
    state = r.state;
    player.update(music());
    renderScenes();
  }

  // ---- Scene editor ----

  function renderPicked() {
    const ol = $("picked");
    ol.replaceChildren();
    if (!picked.length) ol.append(el("li", { class: "empty", text: "No tracks yet. Add some from the folders below." }));
    picked.forEach((t, i) => {
      const move = (d) => {
        const j = i + d;
        if (j < 0 || j >= picked.length) return;
        [picked[i], picked[j]] = [picked[j], picked[i]];
        renderPicked();
      };
      ol.append(el("li", {},
        el("span", { text: trackName(t), title: t }),
        el("button", { type: "button", text: "Up", onclick: () => move(-1) }),
        el("button", { type: "button", text: "Down", onclick: () => move(1) }),
        el("button", { type: "button", text: "Remove", onclick: () => { picked.splice(i, 1); renderPicked(); } })));
    });
  }

  function renderLibrary() {
    const lib = $("library");
    lib.replaceChildren();
    if (!files.audio.length) {
      lib.append(el("p", { class: "empty", text: "No music found in docs/soundtrack yet. Add files there (see its README), then reopen this editor." }));
      return;
    }
    const folders = new Map();
    for (const f of files.audio) {
      const folder = f.split("/").slice(1, -1).join("/") || "(top level)";
      if (!folders.has(folder)) folders.set(folder, []);
      folders.get(folder).push(f);
    }
    for (const [folder, tracks] of folders) {
      lib.append(el("div", { class: "folder" },
        el("div", { class: "folder-head" },
          el("span", { text: folder }),
          el("button", { type: "button", text: "Add all", onclick: () => { picked.push(...tracks.filter((t) => !picked.includes(t))); renderPicked(); } })),
        el("ul", {}, ...tracks.map((t) => el("li", {},
          el("button", { type: "button", text: `+ ${trackName(t)}`, title: t, onclick: () => { picked.push(t); renderPicked(); } }))))));
    }
  }

  async function openEditor(scene = null) {
    files = await call("GET", "/api/files").catch(() => files);
    const f = $("scene-form");
    f.reset();
    f.id.value = scene ? scene.id : "";
    f.name.value = scene ? scene.name : "";
    f.description.value = scene ? scene.description || "" : "";
    f.image.value = scene ? scene.image || "" : "";
    f.sort.value = scene ? scene.sort : scenes.length;
    picked = scene ? [...(scene.tracks || [])] : [];
    $("image-files").replaceChildren(...files.images.map((p) => el("option", { value: p })));
    $("editor-title").textContent = scene ? `Edit ${scene.name}` : "New scene";
    renderPicked();
    renderLibrary();
    $("editor").hidden = false;
    $("editor").scrollIntoView({ behavior: "smooth" });
  }

  $("new-scene").addEventListener("click", () => act(() => openEditor()));
  $("cancel-edit").addEventListener("click", () => ($("editor").hidden = true));

  $("scene-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    act(async () => {
      await call("POST", "/api/scenes", {
        id: f.id.value || undefined,
        name: f.name.value,
        description: f.description.value,
        image: f.image.value,
        sort: f.sort.value,
        tracks: picked,
      });
      $("editor").hidden = true;
      await loadScenes();
    }, "Scene saved.");
  });

  // ---- Sign in ----

  async function boot() {
    const { dm } = await call("GET", "/api/status");
    $("login-panel").hidden = !!dm;
    $("app").hidden = !dm;
    $("who").hidden = !dm;
    clearInterval(timer);
    if (!dm) return;
    $("who-name").textContent = dm.display_name;
    await loadScenes();
    // Pick up changes made elsewhere (another console tab, the website).
    timer = setInterval(() => refreshState().catch(() => {}), REFRESH_MS);
  }

  $("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    act(async () => {
      await call("POST", "/api/login", { username: f.username.value, password: f.password.value });
      f.reset();
      await boot();
    });
  });

  $("logout").addEventListener("click", () => act(async () => {
    await call("POST", "/api/logout", {});
    player.disable();
    await boot();
  }));

  boot().catch((err) => say(err.message, true));
})();
