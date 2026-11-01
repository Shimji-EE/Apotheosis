// Scene music player shared by the Tavern and the DM console.
// The DM console publishes one small "music" object to Supabase:
//   { tracks: ["soundtrack/…ogg", …], start_index, started_at (ms), playing, paused_offset_ms, volume (0-1) }
// Every browser works out the current track and position from that object and its
// own clock, so all players hear the same moment without streaming anything.
window.SceneAudio = (() => {
  const FADE_MS = 1800;
  const RESYNC_MS = 10000;
  const DRIFT_S = 2.5;
  const durations = new Map(); // url -> seconds (0 when the file fails to load)

  function loadDuration(url) {
    if (durations.has(url)) return Promise.resolve(durations.get(url));
    return new Promise((resolve) => {
      const a = new Audio();
      a.preload = "metadata";
      const done = (d) => {
        durations.set(url, d);
        resolve(d);
      };
      a.addEventListener("loadedmetadata", () => done(Number.isFinite(a.duration) ? a.duration : 0), { once: true });
      a.addEventListener("error", () => done(0), { once: true });
      a.src = url;
    });
  }

  // Where the music should be right now: { index, offset } in seconds, or null.
  function position(music, lengths, now = Date.now()) {
    const n = (music.tracks || []).length;
    const total = lengths.reduce((s, d) => s + d, 0);
    if (!n || !total) return null;
    let t = (music.playing ? now - (music.started_at ?? now) : music.paused_offset_ms || 0) / 1000;
    t = ((t % total) + total) % total;
    let i = ((music.start_index || 0) % n + n) % n;
    for (let guard = 0; guard < n * 2; guard++) {
      if (lengths[i] > 0 && t < lengths[i]) return { index: i, offset: t };
      t -= lengths[i];
      i = (i + 1) % n;
    }
    return null;
  }

  function fade(audio, to, ms) {
    cancelAnimationFrame(audio._fade);
    const from = audio.volume;
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now) => {
        const k = Math.min(1, (now - start) / ms);
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * k));
        if (k < 1) audio._fade = requestAnimationFrame(step);
        else resolve();
      };
      audio._fade = requestAnimationFrame(step);
    });
  }

  // base: URL prefix for track paths (the website root). onChange gets { track, index, playing }.
  function create({ base, onChange = () => {} }) {
    let music = { tracks: [], playing: false };
    let lengths = [];
    let current = null; // { audio, url, index }
    let unlocked = false;
    let localVolume = 1;
    let timer = null;
    let token = 0;

    try {
      const v = parseFloat(localStorage.getItem("apotheosis-volume"));
      if (Number.isFinite(v)) localVolume = Math.max(0, Math.min(1, v));
    } catch {}

    const url = (path) => new URL(path, base).href;
    const level = () => Math.max(0, Math.min(1, (music.volume ?? 1) * localVolume));
    const name = (path) => decodeURIComponent(String(path).split("/").pop().replace(/\.[^.]+$/, "")).replace(/[-_]+/g, " ");

    function report() {
      const i = current ? current.index : null;
      onChange({ index: i, track: i == null ? null : name(music.tracks[i]), playing: Boolean(music.playing && current && unlocked), unlocked });
    }

    async function stopCurrent() {
      if (!current) return;
      const old = current.audio;
      current = null;
      await fade(old, 0, FADE_MS);
      old.pause();
      old.removeAttribute("src");
      old.load();
    }

    async function sync() {
      const my = ++token;
      lengths = await Promise.all((music.tracks || []).map((p) => loadDuration(url(p))));
      if (my !== token) return; // a newer update arrived while durations loaded

      const pos = music.playing ? position(music, lengths) : null;
      if (!pos || !unlocked) {
        await stopCurrent();
        return report();
      }
      const target = url(music.tracks[pos.index]);
      if (current && current.url === target) {
        const drift = Math.abs(current.audio.currentTime - pos.offset);
        if (drift > DRIFT_S) current.audio.currentTime = pos.offset;
        if (current.audio.paused) current.audio.play().catch(() => {});
        fade(current.audio, level(), 400);
        return report();
      }

      // Crossfade to the new track.
      stopCurrent();
      const audio = new Audio(target);
      audio.preload = "auto";
      audio.volume = 0;
      current = { audio, url: target, index: pos.index };
      audio.addEventListener("ended", () => current && current.audio === audio && sync());
      audio.addEventListener("loadedmetadata", () => {
        const p = position(music, lengths); // recompute: loading took a moment
        if (p && p.index === pos.index) audio.currentTime = p.offset;
      }, { once: true });
      try {
        await audio.play();
        fade(audio, level(), FADE_MS);
      } catch {
        unlocked = false; // the browser wants a click first
      }
      report();
    }

    return {
      // Feed the latest music object from Supabase.
      update(next) {
        music = next || { tracks: [], playing: false };
        clearInterval(timer);
        if (music.playing) timer = setInterval(sync, RESYNC_MS);
        return sync();
      },
      // Call from a click handler: browsers only allow sound after a user gesture.
      enable() {
        unlocked = true;
        return sync();
      },
      disable() {
        unlocked = false;
        return sync();
      },
      get enabled() {
        return unlocked;
      },
      setLocalVolume(v) {
        localVolume = Math.max(0, Math.min(1, Number(v) || 0));
        try { localStorage.setItem("apotheosis-volume", String(localVolume)); } catch {}
        if (current) current.audio.volume = level();
      },
      get localVolume() {
        return localVolume;
      },
      // For the console: where the music is now, using known track lengths.
      async where(m = music) {
        const ls = await Promise.all((m.tracks || []).map((p) => loadDuration(url(p))));
        const pos = position(m, ls);
        return pos && { ...pos, lengths: ls };
      },
      trackName: name,
    };
  }

  return { create, position };
})();
