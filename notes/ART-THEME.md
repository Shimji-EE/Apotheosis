# Apotheosis Manual: art theme

A style guide for the manual's illustrations. It is drawn from the 23 images the manual uses today (in `notes/Images/`), so new art can match them and existing art can be graded to fit. It sits alongside the Grave Red theme for the page itself (`/website-theme/grave-red.md`).

## In one line

Painted, semi-realistic **tarot cards**, in the style of the Dragon Age tarot. Each has a dark ground, one figure or relic, one saturated accent colour, and a thin line-art frame with halos, moons and geometric sigils.

## The look

- **Format:** portrait, about 2:3, like a tarot card. Every image has a thin inner frame line, often with notched or stepped corners, a circle or halo behind the head, and small marks along the frame (dots, crescents, ticks).
- **Rendering:** semi-realistic digital painting with visible brushwork. Faces and hands are detailed, while backgrounds dissolve into texture, smoke or flat colour.
- **Composition:** one subject, centred or cut off at the waist, facing or turned three-quarters to the viewer. There's little scenery; the subject is the card.
- **Symbols:** halos and rings, crescent and full moons, drawn swords, flames, webs, crystal shards, eyes and many-eyed motifs. Geometry is drawn as thin line art over the painting, not painted into the scene.
- **Mood:** grim, sacred and uncanny, combining body horror with devotion. Expressions are still or haunted. There are no bright skies and no comedy.

## Palette

Measured across all 23 images (share of pixels):

| Role | Hex | Share |
|---|---|---|
| Soot (deepest ground) | `#130A0D` | 10% |
| Smoke black | `#1C1511` | 11% |
| Charcoal grey | `#434341` | 13% |
| Old-blood brown | `#2F1D1B` | 10% |
| Dried maroon | `#441E1F` | 9% |
| Rust | `#7C4E42` | 9% |
| **Grave crimson (main accent)** | `#771F25` | 7% |
| Ash grey | `#887C6E` | 13% |
| Bone/parchment | `#CAB7A4` | 12% |

About 70% of every image is dark (soot, smoke, charcoal and old blood). Light comes from one accent and from bone-coloured skin and parchment.

### Accent colours (one per card)

Each card has one saturated accent, used on a weapon, a flame, a halo or an eye glow, and almost nothing else. The accent matches the card's subject:

| Accent | Used for | Cards |
|---|---|---|
| Crimson, blood red | vampires, blood, Red Rot, Red Lyrium, the Purgeflame | VAMP, bloodhunter, red_lyr, rot, rotten_one, Dhampir, web, wolf, gestalt |
| Ember orange and gold flame | fire, frenzy, infernal power | fr_fl, frenzy_inf, romulon |
| Gold | knights, holy relics, divine light | Black_Knight, argonian, drow_assassin |
| Lyrium cyan | Blue Lyrium, arcane and mage power | lyrium, chym_possible, saarebas |
| Violet | the uncanny, possession, otherworldly | menari |
| No accent (sepia, silver) | beasts, lycanthropes, the natural | Werwulf, bat, cthonic, drider |

Keep an image to one accent. Two accents only appear where two powers clash on purpose (for example gestalt, which has red slashes on teal).

## On the page

- **Blending:** every image inside a `figure` fades softly into the paper (`\fadedart` in `apotheosis-gravered.sty`). Use `\plainart{...}` to keep the hard edges of a card that should look like a held card, such as a full tarot frame.
- **Size:** in-column images are 0.6 to 0.75 of the column width. Side-by-side pairs are about 0.22 of the text width each.
- **Placement:** put the image after the subsection it illustrates, near its sidebar. Pairs show two forms of one thing, such as Dhampir and bat, or chymaera and menari.

## When adding or grading art

1. Pick art that fits the tarot look: one subject, a dark ground, and a single accent chosen from the table by subject.
2. If a piece is too bright or too colourful, grade it towards the palette. Pull the shadows to soot or old blood, desaturate everything except the accent, and warm the highlights to bone.
3. Skip images with photographic realism, cartoon or anime styles, busy landscapes, or several competing accent colours.
4. Save the file in `notes/Images/` with a short lowercase name that says what it shows (e.g. `red_lyr.jpeg`).
