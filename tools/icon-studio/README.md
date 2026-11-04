# Apotheosis Icon Studio

Double-click **`Apotheosis Icon Studio.bat`**. It:

1. starts the BG3 Icon Generator (found in `tools\bg3-icon-generator`, or in `BG3-Icon-Generator`
   at the root of the Apotheosis folder) in the background;
2. opens it in its own app window (Edge or Chrome, no browser tabs);
3. starts the publisher, which watches for exports.

Make an icon, set its **Name in the game**, and **Export** under the mod name **`Apotheosis`**.
Within a few seconds the icon is on the site: copied into `docs/hub/icons/`, committed and pushed.
GitHub Pages then updates in a minute or two.

## Naming decides where an icon goes

| Name in the game starts with | Goes to | Look |
|---|---|---|
| Class, Species, Variant, Religion, Background, Ancestry | character creator emblems | Grave Red glow |
| Power, Feature | powers (character sheets match them by name) | game colours |
| Resource | resources | game colours |
| Item | items | game colours |
| Ui, Map, Journal | ui | Grave Red glow |
| anything else | generated | game colours |

Examples: `Species Snow Elf`, `Class Blood Hunter`, `Variant Reborn`, `Variant None`,
`Power Frost Ward`, `Map Hold Romulon`.

Re-exporting the same icon replaces it. One icon has one meaning: the publisher refuses to give an
export a second label. Two windows stay minimised while you work (the editor and the publisher);
closing the editor stops both.

## Forge: icons Claude makes without the editor

`forge.py` drives the generator's engine headlessly, so Claude can build icons from the game's own
line art and publish them. It needs the generator's `data` folder (Charl's `data.zip` in the project
files, unzipped into the generator folder) and numpy, scipy and Pillow.

    python tools/icon-studio/forge.py find snow                  # game icons by name
    python tools/icon-studio/forge.py sheet ICON... -o sheet.png # stroke numbers, to pick parts
    python tools/icon-studio/forge.py make tools/icon-studio/recipes/creator-emblems.json

Recipes in `recipes/` record how each forged icon was built, so it can be remade or adjusted.

## LoRA forge (headless generation)

`lora_forge.py` generates new glyphs with Stable Diffusion 1.5 and Charl's BG3 action-icon LoRA
(`bg3_actions_offset.safetensors`, kept in the git-ignored `models/` folder), then finishes and
publishes them like `forge.py` (Grave Red glow or a game colour preset, same manifests, same
one-icon-one-meaning rule). `try PROMPT -n 4` makes a candidate sheet; `make RECIPE.json` publishes.
Needs `pip install -r lora-requirements.txt` and the SD 1.5 base model (Hugging Face download on
first run, or `--base` to a local checkpoint). Fast on a CUDA GPU; minutes per image on CPU.

**Fuse** (how emblems are made): plain prompts give messy, off-style glyphs, so a recipe item gives
forge `layers` (a game glyph, optionally an accent) and the LoRA redraws that composition at
`strength` (.45-.6) with the prompt's custom detail. A cleanup pass then drops grey washes, specks and
strokes that wander off the composition, and `pick: "auto"` keeps the candidate that holds the
composition with the fewest strokes. `guide: "self"` redraws a cleaned first pass when no game glyph
fits. `try PROMPT --icon GAME_ICON` tests one.

## Badge (flat emblems)

`badge.py make RECIPE.json` makes flat 2D class/subclass emblems in the style of Charl's flattened BG3
badge sheet: one solid silhouette, 3-8 thin cut lines, tapered points, a few four-point sparkles, an
optional ring for subclasses. Sources are BG3 badge PNGs (reference only, in the git-ignored
icon-packs/bg3-badges) or forge/LoRA art; `add`/`remove` customise a traced base so each icon is an
Apotheosis version, not a copy. Writes an SVG to badges/ and the site webp. Needs `pip install potracer`.
