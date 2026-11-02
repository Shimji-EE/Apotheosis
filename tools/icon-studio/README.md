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
