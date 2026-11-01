// Spotify Web API client for the DM console.
// Uses the PKCE login flow, so no client secret is needed. Tokens stay on this
// computer in .data/spotify.json and are never sent to Supabase or the website.
import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";
const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

const b64url = (buf) => buf.toString("base64url");

export class Spotify {
  constructor({ clientId, redirectUri, dataDir }) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    this.file = `${dataDir}/spotify.json`;
    this.dataDir = dataDir;
    this.tokens = null;
    this.pending = new Map(); // state -> code verifier, for logins in progress
  }

  get configured() {
    return Boolean(this.clientId);
  }

  get linked() {
    return Boolean(this.tokens && this.tokens.refresh_token);
  }

  async load() {
    try {
      this.tokens = JSON.parse(await readFile(this.file, "utf8"));
    } catch {
      this.tokens = null;
    }
  }

  async save() {
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(this.file, JSON.stringify(this.tokens, null, 2));
  }

  async unlink() {
    this.tokens = null;
    await rm(this.file, { force: true });
  }

  loginUrl() {
    const verifier = b64url(randomBytes(48));
    const state = b64url(randomBytes(16));
    this.pending.set(state, verifier);
    const challenge = b64url(createHash("sha256").update(verifier).digest());
    const q = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      code_challenge_method: "S256",
      code_challenge: challenge,
      scope: SCOPES,
      state,
    });
    return `${ACCOUNTS}/authorize?${q}`;
  }

  async finishLogin(code, state) {
    const verifier = this.pending.get(state);
    this.pending.delete(state);
    if (!verifier) throw new Error("This Spotify login link expired. Start the login again.");
    await this.tokenRequest({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
      code_verifier: verifier,
    });
  }

  async tokenRequest(params) {
    const res = await fetch(`${ACCOUNTS}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: this.clientId, ...params }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Spotify login failed: ${body.error_description || body.error || res.status}`);
    this.tokens = {
      access_token: body.access_token,
      // Spotify may not send a new refresh token on refresh; keep the old one then.
      refresh_token: body.refresh_token || (this.tokens && this.tokens.refresh_token),
      expires_at: Date.now() + (body.expires_in - 60) * 1000,
    };
    await this.save();
  }

  async accessToken() {
    if (!this.linked) throw new Error("Spotify is not linked yet.");
    if (Date.now() >= this.tokens.expires_at) {
      await this.tokenRequest({ grant_type: "refresh_token", refresh_token: this.tokens.refresh_token });
    }
    return this.tokens.access_token;
  }

  // Calls the Web API. Returns parsed JSON, or null for empty replies (204).
  async call(method, path, body) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await this.accessToken()}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204 || res.status === 202) return null;
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || res.statusText;
      if (res.status === 404 && path.startsWith("/me/player")) {
        throw new Error("No active Spotify device. Open Spotify on this laptop (or pick a device) and try again.");
      }
      if (res.status === 403 && path.startsWith("/me/player")) {
        throw new Error(`Spotify refused playback control (${msg}). Playback control needs Spotify Premium.`);
      }
      throw new Error(`Spotify: ${msg} (${res.status})`);
    }
    return data;
  }

  async playlists() {
    const out = [];
    let path = "/me/playlists?limit=50";
    while (path && out.length < 300) {
      const page = await this.call("GET", path);
      for (const p of page.items || []) {
        if (!p) continue;
        out.push({ uri: p.uri, name: p.name, owner: p.owner && p.owner.display_name, image: p.images && p.images[0] && p.images[0].url });
      }
      path = page.next ? page.next.replace(API, "") : null;
    }
    return out;
  }

  async devices() {
    const data = await this.call("GET", "/me/player/devices");
    return (data.devices || []).map((d) => ({ id: d.id, name: d.name, type: d.type, active: d.is_active, volume: d.volume_percent }));
  }

  async playContext(contextUri, deviceId) {
    const q = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
    await this.call("PUT", `/me/player/play${q}`, { context_uri: contextUri });
  }

  async control(action, { deviceId, value } = {}) {
    const q = deviceId ? `device_id=${encodeURIComponent(deviceId)}` : "";
    switch (action) {
      case "resume": return this.call("PUT", `/me/player/play${q ? `?${q}` : ""}`);
      case "pause": return this.call("PUT", `/me/player/pause${q ? `?${q}` : ""}`);
      case "next": return this.call("POST", `/me/player/next${q ? `?${q}` : ""}`);
      case "previous": return this.call("POST", `/me/player/previous${q ? `?${q}` : ""}`);
      case "shuffle": return this.call("PUT", `/me/player/shuffle?state=${value ? "true" : "false"}${q ? `&${q}` : ""}`);
      case "volume": {
        const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
        return this.call("PUT", `/me/player/volume?volume_percent=${v}${q ? `&${q}` : ""}`);
      }
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  // What is playing now, trimmed to what the console and players need.
  async nowPlaying() {
    const data = await this.call("GET", "/me/player");
    if (!data || !data.item) return { playing: false };
    const t = data.item;
    return {
      playing: Boolean(data.is_playing),
      track: t.name,
      artist: (t.artists || []).map((a) => a.name).join(", "),
      track_url: t.external_urls && t.external_urls.spotify,
      art: t.album && t.album.images && t.album.images[0] && t.album.images[0].url,
      context_uri: data.context && data.context.uri,
      device: data.device && data.device.name,
      volume: data.device && data.device.volume_percent,
      shuffle: Boolean(data.shuffle_state),
    };
  }
}

// Turns an open.spotify.com link or a spotify: URI into a spotify: URI.
export function toSpotifyUri(input) {
  const s = String(input || "").trim();
  if (!s) return null;
  if (/^spotify:(playlist|album|artist|show):[A-Za-z0-9]+$/.test(s)) return s;
  const m = s.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|artist|show)\/([A-Za-z0-9]+)/);
  if (m) return `spotify:${m[1]}:${m[2]}`;
  throw new Error("That doesn't look like a Spotify playlist link. Paste a link from Share > Copy link.");
}
