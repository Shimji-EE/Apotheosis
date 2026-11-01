# Soundtrack

Scene music for the campaign hub. Every player's browser plays these files in sync
when the DM picks a scene in the console on their laptop.

## Where files go

One folder per mood or scene, then the tracks inside it, numbered in play order:

```
docs/soundtrack/
  tavern/
    01-hearth-and-ale.ogg
    02-bard-in-the-corner.ogg
  travel/
    01-open-road.ogg
  combat/
    01-steel-drawn.ogg
    02-blood-on-snow.ogg
  boss/
  dungeon/
  town/
  wilds/
  rest/
  mystery/
  sorrow/
```

The folder names are suggestions. Make any folder you like; the console lists whatever it finds.

## Naming

- Lower case, words joined with hyphens, no spaces: `03-ash-falls-quietly.ogg`.
- Start with a two-digit number for the play order. The console and Tavern hide the number
  and hyphens, so `03-ash-falls-quietly.ogg` shows as "ash falls quietly".
- The name players see is the file name, so name it what you want them to read.

## Format and size

- `.ogg` (Opus or Vorbis) or `.mp3`. Aim for 96 to 128 kbps: about 1 MB per minute.
- GitHub rejects single files over 100 MB and warns over 50 MB; keep tracks well under that.
- The whole site should stay under 1 GB, so roughly 15 hours of music at 128 kbps.

## Rights

The website is public, so anyone can download these files. Only add music you made,
bought with a licence that allows this, or that is royalty free / Creative Commons.
Note the source and licence of each track in `CREDITS.md` in this folder.

## After uploading

Commit and push to `main`. GitHub Pages publishes within a minute or two, then the
tracks appear in the console's scene editor (it reads this folder from your laptop).
