# Backup: manual style v1 (maroon outlines, white boxes)

The manual's look as merged in PR #27 (2026-11-01), saved before the Grave Red
restyle. To go back to it, copy these files over the ones in `notes/`:

- `apotheosis-gravered.sty` → `notes/apotheosis-gravered.sty`
- `lib/*.sty` → `notes/lib/`
- `img/footerscroll.pdf` → `notes/img/footerscroll.pdf`
- `Apotheosis.tex` is only here for reference (its preamble at that time).

Or, in git: `git revert -m 1 <merge commit of the restyle PR>`.
