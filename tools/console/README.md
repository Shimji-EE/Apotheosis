# DM console

A small app that runs on the DM's laptop during a session. It picks the live scene and
controls the scene music. Every player's browser, signed in to the Tavern, shows the scene
and plays the same track at the same moment.

Nothing on the laptop is opened to the internet. The console listens on `127.0.0.1:7777`
(this laptop only) and talks out to Supabase over HTTPS, signed in as the DM.

## First run

1. Install Node.js 22 LTS from https://nodejs.org (the default options are fine).
2. Double-click `start-console.bat` in this folder. The first run installs what it needs,
   then opens http://127.0.0.1:7777 in your browser.
3. Sign in with your Tavern DM username and password. The console remembers you in
   `.data/` (git-ignored), so you only do this once.

Keep the black console window open while you play. Close it (or press Ctrl+C) to stop.
The website keeps working without it; only scene and music changes need it.

## Scenes and music

- Music lives in `docs/soundtrack/`. See the README there for folder and file names.
- **New scene**: give it a name, a short description players see, optional art (a path under
  `docs/`, e.g. `assets/scenes/tavern.webp`), and pick its tracks. Tracks play in order and loop.
- **Go live** switches everyone to that scene and starts its first track.
- **Play/Pause, Prev, Next** and **Table volume** apply to every player.
- **Hear it on this laptop** plays the music here too, so you hear what the table hears.
- **End scene** clears it for everyone.

Players press **Turn on music** once in the Tavern (browsers block sound until you click),
and each player has their own volume slider.

New music and art must be committed and pushed to `main` before players can hear or see them.
The console reads them straight from your laptop, so it shows them as soon as they are in the folder.

## Settings

Optional. Copy `.env.example` to `.env` to change the port or Supabase project.
