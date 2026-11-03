# Cards

Item and spell cards in the Grave Red theme, used online by the website interface during play.

## Layout

```
cards/
  cards.json      the data the website reads (one entry per card)
  items/          finished item card images
  spells/         finished spell card images
  art/            card art, one file per card
  source/         the LaTeX layout and fonts the images are rendered from
```

## Conventions

- **Size:** poker card, 63.5 x 88.9 mm (2.5 x 3.5 in). Images are rendered at 300 dpi, so 750 x 1050 px.
- **Names:** lowercase with hyphens, the same slug everywhere: `items/amulet-of-health.png`, `art/amulet-of-health.jpg`, and `"id": "amulet-of-health"` in `cards.json`.
- **Art:** portrait, about 5:7, at least 750 x 1050 px. It fills the whole card, so keep faces and the main subject out of the top 20% (title) and the bottom 40% (rules box).
- **Text:** the rules text on a card is written out in `cards.json` too, so the site can search it.

## `cards.json`

```json
{
  "cards": [
    {
      "id": "amulet-of-health",
      "kind": "item",
      "name": "Amulet of Health",
      "type": "Wondrous Item",
      "rarity": "Rare",
      "attunement": true,
      "art": "art/amulet-of-health.jpg",
      "image": "items/amulet-of-health.png",
      "text": "Your Constitution is 19 while you wear this amulet."
    },
    {
      "id": "blight",
      "kind": "spell",
      "name": "Blight",
      "level": 4,
      "school": "Necromancy",
      "classes": ["Wizard", "Druid"],
      "casting_time": "Action",
      "range": "30 ft",
      "components": "V, S, M",
      "duration": "Instantaneous",
      "art": "art/blight.jpg",
      "image": "spells/blight.png",
      "text": "..."
    }
  ]
}
```

## Rendering

The layout is `source/apotheosis-cards.sty` (XeLaTeX, fonts in `source/fonts/`). `source/cards-demo.tex` shows every option, with placeholder art.

```
cd source
xelatex cards-demo.tex
pdftoppm -r 300 -png cards-demo.pdf card
```

Each card is one page, so each page becomes one image to rename into `items/` or `spells/`. Pass a picture with `art={../art/amulet-of-health.jpg}`.

## Credits and licence

Rules text on the cards from the SRD is CC-BY-4.0. Card art belongs to its artists: only add art you have the right to use, and say who made it in `cards.json` (add an `"art_credit"` field). Fonts are Barlow and Crimson Pro, both under the SIL Open Font License.
