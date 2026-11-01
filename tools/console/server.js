// Apotheosis DM console: a small local server for Charl's laptop.
// It serves the console page on 127.0.0.1 only, signs in to Supabase as the DM,
// manages scenes, reads the soundtrack and scene art straight from the repo's
// docs/ folder, and publishes the live scene and music state to Supabase so every
// player's browser updates through Realtime and plays the same track in sync.
import http from "node:http";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, normalize, extname, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, "public");
const SITE = join(HERE, "..", "..", "docs"); // the website, for scene art previews
const DATA = join(HERE, ".data");
const PORT = Number(process.env.PORT) || 7777;
const HOST = "127.0.0.1";
const ORIGIN = `http://${HOST}:${PORT}`;
const EMAIL_DOMAIN = "members.apotheosis.invalid";

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

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// ---- Files in the repo: soundtrack and scene art ----

const AUDIO = new Set([".ogg", ".opus", ".mp3", ".m4a", ".wav", ".flac"]);
const IMAGES = new Set([".webp", ".jpg", ".jpeg", ".png", ".avif"]);

async function walk(dir) {
  const out = [];
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(relative(SITE, full).split(sep).join("/"));
  }
  return out;
}

async function listFiles() {
  const audio = (await walk(join(SITE, "soundtrack"))).filter((f) => AUDIO.has(extname(f).toLowerCase())).sort();
  const images = (await walk(join(SITE, "assets"))).filter((f) => IMAGES.has(extname(f).toLowerCase())).sort();
  return { audio, images };
}

// Track paths must be files under docs/soundtrack/, written as the site sees them.
function cleanTracks(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((t) => String(t || "").trim().replace(/^\/+/, ""))
    .filter((t) => /^soundtrack\/[^\0]+$/.test(t) && !t.includes("..") && AUDIO.has(extname(t).toLowerCase()))
    .slice(0, 50);
}

// ---- Scenes and live state ----

const SCENE_COLS = "id, name, description, image, tracks, sort";

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
    tracks: cleanTracks(body.tracks),
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

// Switch the table to a scene: publish it and start its tracks from the top.
async function activateScene(id) {
  const { data: scene, error } = await db.from("scenes").select(SCENE_COLS).eq("id", id).single();
  if (error) throw error;
  const { music: old } = await getState();
  const music = {
    tracks: scene.tracks || [],
    start_index: 0,
    started_at: Date.now(),
    playing: (scene.tracks || []).length > 0,
    paused_offset_ms: 0,
    volume: old && Number.isFinite(old.volume) ? old.volume : 0.8,
  };
  await writeState({ scene_id: scene.id, music });
  return { scene, music };
}

async function clearScene() {
  const { music: old } = await getState();
  await writeState({ scene_id: null, music: { tracks: [], playing: false, volume: old && old.volume } });
}

// Music changes come from the console page, which knows the track lengths.
// Only these fields are accepted, with sane ranges.
async function updateMusic(patch) {
  const { music: old } = await getState();
  const music = { ...(old || {}) };
  if ("playing" in patch) music.playing = Boolean(patch.playing);
  if ("start_index" in patch) music.start_index = Math.max(0, Math.floor(Number(patch.start_index) || 0));
  if ("started_at" in patch) music.started_at = Math.floor(Number(patch.started_at) || Date.now());
  if ("paused_offset_ms" in patch) music.paused_offset_ms = Math.max(0, Math.floor(Number(patch.paused_offset_ms) || 0));
  if ("volume" in patch) music.volume = Math.max(0, Math.min(1, Number(patch.volume) || 0));
  if ("tracks" in patch) music.tracks = cleanTracks(patch.tracks);
  await writeState({ music });
  return music;
}

// ---- HTTP ----

const TYPES = { ".ogg": "audio/ogg", ".opus": "audio/ogg", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".flac": "audio/flac", ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

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
    return { dm };
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
  if (sceneId && sceneId[2] && req.method === "POST") return activateScene(sceneId[1]);
  if (route === "GET /api/files") return listFiles();
  if (route === "GET /api/state") return { state: await getState() };
  if (route === "POST /api/music") return { music: await updateMusic(body) };
  throw httpError(404, "Not found");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, ORIGIN);
  try {
    guard(req);
    if (url.pathname.startsWith("/api/")) return sendJson(res, 200, await api(req, res, url));
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

await loadDm().catch(() => (dm = null));

server.listen(PORT, HOST, () => {
  console.log(`Apotheosis DM console: ${ORIGIN}`);
  console.log(dm ? `Signed in as ${dm.display_name}.` : "Not signed in yet. Open the console to sign in.");
  console.log("Leave this window open during the session. Ctrl+C stops the console.");
});
