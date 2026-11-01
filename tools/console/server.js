// Apotheosis DM console: a small local server for Charl's laptop.
// It serves the console page on 127.0.0.1 only, signs in to Supabase as the DM,
// manages scenes, drives Spotify, and publishes the live scene and "now playing"
// to Supabase so every player's browser updates through Realtime.
import http from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, normalize, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { Spotify, toSpotifyUri } from "./spotify.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, "public");
const SITE = join(HERE, "..", "..", "docs"); // the website, for scene art previews
const DATA = join(HERE, ".data");
const PORT = Number(process.env.PORT) || 7777;
const HOST = "127.0.0.1";
const ORIGIN = `http://${HOST}:${PORT}`;
const EMAIL_DOMAIN = "members.apotheosis.invalid";
const POLL_MS = 5000;

const SUPABASE_URL = process.env.SUPABASE_URL || "https://aagtsdqgleopualsallg.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_Q-DgGy_SToy1bpobL5UoJw_8piwAcA2";

// Keep the DM session in .data/ so the console stays signed in between runs.
const fileStorage = {
  file: join(DATA, "supabase-session.json"),
  async all() {
    try { return JSON.parse(await readFile(this.file, "utf8")); } catch { return {}; }
  },
  async getItem(k) { return (await this.all())[k] ?? null; },
  async setItem(k, v) {
    const all = await this.all();
    all[k] = v;
    await mkdir(DATA, { recursive: true });
    await writeFile(this.file, JSON.stringify(all));
  },
  async removeItem(k) {
    const all = await this.all();
    delete all[k];
    await mkdir(DATA, { recursive: true });
    await writeFile(this.file, JSON.stringify(all));
  },
};

const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage: fileStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

const spotify = new Spotify({
  clientId: process.env.SPOTIFY_CLIENT_ID || "",
  redirectUri: `${ORIGIN}/callback`,
  dataDir: DATA,
});

let dm = null; // { id, username, display_name } once signed in as the DM

async function loadDm() {
  const { data } = await db.auth.getSession();
  if (!data.session) return (dm = null);
  const { data: me, error } = await db.from("profiles").select("id, username, display_name, role").eq("id", data.session.user.id).single();
  if (error || !me || me.role !== "dm") {
    await db.auth.signOut();
    return (dm = null);
  }
  return (dm = me);
}

function requireDm() {
  if (!dm) throw httpError(401, "Sign in as the DM first.");
}

function requireSpotify() {
  if (!spotify.configured) throw httpError(400, "Add SPOTIFY_CLIENT_ID to tools/console/.env, then restart the console.");
  if (!spotify.linked) throw httpError(400, "Link Spotify first.");
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

const openUrl = (uri) => {
  const m = String(uri || "").match(/^spotify:(\w+):(\w+)$/);
  return m ? `https://open.spotify.com/${m[1]}/${m[2]}` : null;
};

// ---- Scenes and live state ----

const SCENE_COLS = "id, name, description, image, playlist_uri, playlist_name, sort";

async function listScenes() {
  const { data, error } = await db.from("scenes").select(SCENE_COLS).order("sort").order("name");
  if (error) throw error;
  return data;
}

async function saveScene(body) {
  const name = String(body.name || "").trim();
  if (!name) throw httpError(400, "Give the scene a name.");
  const row = {
    name: name.slice(0, 80),
    description: String(body.description || "").trim() || null,
    image: String(body.image || "").trim() || null,
    playlist_uri: toSpotifyUri(body.playlist_uri),
    playlist_name: String(body.playlist_name || "").trim() || null,
    sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
    updated_at: new Date().toISOString(),
  };
  const q = body.id ? db.from("scenes").update(row).eq("id", body.id) : db.from("scenes").insert(row);
  const { data, error } = await q.select(SCENE_COLS).single();
  if (error) throw error;
  return data;
}

async function deleteScene(id) {
  const { error } = await db.from("scenes").delete().eq("id", id);
  if (error) throw error;
}

async function getState() {
  const { data, error } = await db.from("session_state").select("scene_id, music, updated_at").eq("id", 1).single();
  if (error) throw error;
  return data;
}

async function writeState(patch) {
  const { error } = await db.from("session_state").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) throw error;
}

// Switch the table to a scene: publish it, then start its playlist.
async function activateScene(id, deviceId) {
  const { data: scene, error } = await db.from("scenes").select(SCENE_COLS).eq("id", id).single();
  if (error) throw error;
  const music = scene.playlist_uri
    ? { context_uri: scene.playlist_uri, context_url: openUrl(scene.playlist_uri), context_name: scene.playlist_name, playing: true }
    : { playing: false };
  await writeState({ scene_id: scene.id, music });
  lastMusicKey = "";

  let warning = null;
  if (scene.playlist_uri) {
    if (!spotify.linked) warning = "Scene is live. Spotify isn't linked, so no music started.";
    else {
      try {
        await spotify.playContext(scene.playlist_uri, deviceId);
      } catch (err) {
        warning = `Scene is live, but the music didn't start: ${err.message}`;
      }
    }
  }
  return { scene, warning };
}

async function clearScene() {
  await writeState({ scene_id: null, music: { playing: false } });
  lastMusicKey = "";
}

// ---- Now playing: the console polls Spotify so players' browsers never have to ----

let lastMusicKey = "";
let lastNow = null;

async function pollNowPlaying() {
  if (!dm || !spotify.linked) return;
  try {
    const now = await spotify.nowPlaying();
    lastNow = now;
    const key = [now.playing, now.track, now.artist, now.context_uri].join("|");
    if (key === lastMusicKey) return;
    lastMusicKey = key;
    const state = await getState();
    const music = {
      ...(state.music || {}),
      playing: now.playing,
      track: now.track || null,
      artist: now.artist || null,
      track_url: now.track_url || null,
      art: now.art || null,
    };
    if (now.context_uri) {
      music.context_uri = now.context_uri;
      music.context_url = openUrl(now.context_uri);
    }
    await writeState({ music });
  } catch (err) {
    lastNow = { playing: false, error: err.message };
  }
}

// ---- HTTP ----

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

async function serveFile(res, root, rel) {
  const path = normalize(join(root, rel));
  if (!path.startsWith(root)) throw httpError(404, "Not found");
  try {
    const body = await readFile(path);
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(body);
  } catch {
    throw httpError(404, "Not found");
  }
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw httpError(413, "Request too large");
  }
  return raw ? JSON.parse(raw) : {};
}

// Only this console's own page may call the API. Other websites open in the same
// browser can't, because they fail the Host, Origin and JSON content-type checks.
function guard(req) {
  const host = req.headers.host;
  if (host !== `${HOST}:${PORT}` && host !== `localhost:${PORT}`) throw httpError(403, "Wrong host");
  if (req.method !== "GET") {
    const origin = req.headers.origin;
    if (origin && origin !== ORIGIN && origin !== `http://localhost:${PORT}`) throw httpError(403, "Wrong origin");
    if (!String(req.headers["content-type"] || "").startsWith("application/json")) throw httpError(415, "JSON only");
  }
}

async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  const body = req.method === "GET" ? {} : await readJson(req);
  const sceneId = url.pathname.match(/^\/api\/scenes\/([0-9a-f-]{36})(\/activate)?$/);

  if (route === "GET /api/status") {
    return { dm, spotify: { configured: spotify.configured, linked: spotify.linked }, now: lastNow };
  }
  if (route === "POST /api/login") {
    const username = String(body.username || "").trim().toLowerCase();
    const { error } = await db.auth.signInWithPassword({ email: `${username}@${EMAIL_DOMAIN}`, password: String(body.password || "") });
    if (error) throw httpError(401, "Wrong username or password.");
    if (!(await loadDm())) throw httpError(403, "That account isn't the DM.");
    return { dm };
  }
  if (route === "POST /api/logout") {
    await db.auth.signOut();
    dm = null;
    return { ok: true };
  }
  if (route === "POST /api/spotify/unlink") {
    await spotify.unlink();
    return { ok: true };
  }

  requireDm();
  if (route === "GET /api/scenes") return { scenes: await listScenes(), state: await getState() };
  if (route === "POST /api/scenes") return { scene: await saveScene(body) };
  if (route === "POST /api/scenes/clear") {
    await clearScene();
    return { ok: true };
  }
  if (sceneId && req.method === "DELETE") {
    await deleteScene(sceneId[1]);
    return { ok: true };
  }
  if (sceneId && sceneId[2] && req.method === "POST") return activateScene(sceneId[1], body.deviceId);

  requireSpotify();
  if (route === "GET /api/spotify/playlists") return { playlists: await spotify.playlists() };
  if (route === "GET /api/spotify/devices") return { devices: await spotify.devices() };
  if (route === "GET /api/spotify/now") return { now: (lastNow = await spotify.nowPlaying()) };
  if (route === "POST /api/spotify/control") {
    await spotify.control(String(body.action), { deviceId: body.deviceId, value: body.value });
    setTimeout(pollNowPlaying, 600);
    return { ok: true };
  }
  throw httpError(404, "Not found");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  try {
    guard(req);
    if (url.pathname.startsWith("/api/")) return sendJson(res, 200, await api(req, res, url));
    if (url.pathname === "/spotify/login") {
      if (!spotify.configured) throw httpError(400, "Add SPOTIFY_CLIENT_ID to tools/console/.env, then restart the console.");
      res.writeHead(302, { Location: spotify.loginUrl() });
      return res.end();
    }
    if (url.pathname === "/callback") {
      const err = url.searchParams.get("error");
      if (err) throw httpError(400, `Spotify login was cancelled (${err}).`);
      await spotify.finishLogin(url.searchParams.get("code"), url.searchParams.get("state"));
      res.writeHead(302, { Location: "/" });
      return res.end();
    }
    if (url.pathname.startsWith("/site/")) return await serveFile(res, SITE, decodeURIComponent(url.pathname.slice(6)));
    const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    return await serveFile(res, PUBLIC, rel);
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error(err);
    if (url.pathname.startsWith("/api/")) return sendJson(res, status, { error: err.message || String(err) });
    res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`${err.message || err}\n\nBack to the console: ${ORIGIN}/`);
  }
});

await spotify.load();
await loadDm().catch(() => (dm = null));
setInterval(pollNowPlaying, POLL_MS);

server.listen(PORT, HOST, () => {
  console.log(`Apotheosis DM console: ${ORIGIN}`);
  console.log(dm ? `Signed in as ${dm.display_name}.` : "Not signed in yet. Open the console to sign in.");
  if (!spotify.configured) console.log("Spotify: add SPOTIFY_CLIENT_ID to .env to enable music.");
  console.log("Leave this window open during the session. Ctrl+C stops the console.");
});
