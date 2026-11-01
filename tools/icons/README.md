# Icon tool

`icons.py` finds and publishes icons for the Tavern dashboard from the two icon packs:

- `All_Icons.zip…` (BG3Icons: Spell, Action, Passive_feature, Item and more, `.webp`/`.png`)
- `monti_icon_pack_bg3_v1.0.7z` (Monti Icon Pack BG3: `Override/` and `Extra/`, `.tga`)

**Rule:** if an icon exists in the packs, use it directly. Make new icons only for custom requests.

The packs are not committed. Keep them in `icon-packs/` at the repo root (git-ignored), or pass `--packs <folder>`.
On Charl's PC that is `F:\Projects\Apotheosis\icon-packs`. Needs Python 3 with Pillow, plus `py7zr` for the Monti pack (`pip install pillow py7zr`).

| Command | What it does |
| --- | --- |
| `python tools/icons/icons.py catalogue` | Index both packs into `catalogue.tsv.gz` (committed, about 170 KB). Rerun when a pack changes. |
| `python tools/icons/icons.py find frost ray` | Search icon names. No images are opened. `--cat Spell` narrows it. |
| `python tools/icons/icons.py sheet frost -o frost.png` | Contact sheet of matches, numbered, to choose by eye. `--unfaded` shows only the versions on stone. |
| `python tools/icons/icons.py powers` | Publish every skill, power and effect icon to `docs/hub/icons/powers/` with `manifest.json`. |
| `python tools/icons/icons.py add all:Item/…png --to items` | Copy one icon (an item, say) into the site and print its path. |
| `python tools/icons/icons.py custom tools/icons/custom.json` | Build custom icons from pack glyphs: recolour, scale, rotate and layer them. |

On the character sheet, each feature, action, bonus action and reaction finds its icon by name ("Sacred Flame" finds the Sacred Flame icon). The Icon field in Edit mode picks another one by name.

Custom recipe example (`custom.json`):

```json
{
  "grave-bell": {
    "label": "Toll of the Drowned Bell",
    "base": "all:Spell/Toll_the_Dead_Unfaded_Icon.webp",
    "layers": [{ "id": "all:Spell/Ray_of_Frost_Icon.webp", "colour": "#5fe3ff", "scale": 0.7, "opacity": 0.8 }]
  }
}
```
