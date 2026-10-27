# Apotheosis campaign book template

A LaTeX class for a full campaign book in a clean, minimalist dark fantasy
style. Art fades into the page instead of sitting in a frame, the way it does
in the official fifth edition books.

It carries over everything from the two templates the campaign already used:

| From | Kept as |
| --- | --- |
| Dragonbane Supplement | parts with full-page art, `\partcolor`, `segment`, `dragonbox`, `demonbox`, `emptybox`, `tablebox`, `\bolditem` / `\coloritem` / `\secretitem`, epigraph `quote`, credits block, black & white option |
| D&D 5e LaTeX template | read-aloud text, sidebars, rollable tables, stat blocks (`\basics`, `\stats`, `\details`, `\stat`, `\rpgdice`, CR to XP), spell headers, drop caps, keyed areas |

The old command names still work (`DndReadAloud`, `DndSidebar`, `DndTable`,
`monsterbox`, `rpg-monsteraction`, `\rpgmonstersection`, `\rpghline`,
`\DndSpellHeader`, `\DndDropCapLine`, `\DndSetThemeColor`), so chapters from
the Apotheosis notes can be pasted in with few edits.

## Building

Use **XeLaTeX** (or LuaLaTeX). Every font ships with TeX Live, and Overleaf
works if you set the compiler to XeLaTeX.

```sh
latexmk                 # writes build/campaign.pdf
# or
xelatex campaign.tex && xelatex campaign.tex
```

## Themes

```latex
\documentclass{apotheosis-book}           % dark (default)
\documentclass[vermis]{apotheosis-book}   % aged gamebook paper, after Vermis
\documentclass[light]{apotheosis-book}    % ink on warm parchment
\documentclass[print]{apotheosis-book}    % white paper, no textures
```

Add `a4paper` for A4. Letter is the default.

* **dark**: bone text on near-black grain, Cinzel titles, Crimson Pro body,
  hairline rules that fade out at the ends.
* **vermis**: yellowed paper, coral Kooper titles, IM Fell body, rounded
  panels (coral read-aloud, black sidebars and stat blocks, green optional
  rules), printed double rules.

Previews of both are in `preview/`.

## Art that blends in

| Command | What it does |
| --- | --- |
| `\coverimage{file}` | Full-bleed cover behind `\maketitle` |
| `\partimage{file}` | Full-bleed art for the next `\part` page |
| `\chapterart[keys]{file}` | Art across the top of the next chapter opener, title set below it |
| `\columnart[keys]{file}` | Soft-edged art inside a column |
| `\pagetopart[keys]{file}` / `\pagebottomart[keys]{file}` | Full-bleed bands painted behind the current page |
| `\fullpageart[keys]{file}[caption]` | A page that is only art |
| `\fadedart[keys]{file}` | The faded image box all of the above use |

Keys:

* `fade=soft|all|bottom|top|sides|left|right|none`: presets
* `top`, `bottom`, `left`, `right`: fade depth per edge, 0 to 0.5 of the size
* `width`, `height`: the image is cropped to cover this box
* `focus`: where to crop vertically, 0 is the top, 1 is the bottom
* `opacity`

The fade is a real soft mask, so the page texture shows through and PNGs with
their own transparency fade too.

## Boxes and blocks

```latex
\begin{readaloud} ... \end{readaloud}
\begin{sidebar}{Title} ... \end{sidebar}
\begin{variantrule}{Title} ... \end{variantrule}
\begin{note}{Title} ... \end{note}
\begin{rolltable}[Title]{c L} \colhead{d6} & \colhead{Effect} \\ ... \end{rolltable}
\begin{monster}{Name} \monstertype{...} \basics[...] \stats[...] \details[...] ... \end{monster}
\spellheader{Name}{Level & school}{Casting time}{Range}{Components}{Duration}
\itemheader{Name}{Wondrous item, rare}
\area{The Nave}  \subarea{The Font}
\dropcap{T}{he first words}
```

## Colour

`\partcolor{Name}` (new page) or `\setaccent{Name}` with Ember, Coral, Ochre,
Blood, Bile, Mustard, Frost, Amethyst or Lyrium.

## Layout

Text sits in `segment` environments (two columns). Put `\chapter` and `\part`
outside segments; a wide box placed outside a segment spans both columns.
