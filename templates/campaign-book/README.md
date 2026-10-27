# Apotheosis campaign book template

A LaTeX class in the style of the official fifth edition paperbacks, in a
dark theme, with art that fades into the page.

* Charred parchment pages with bone-coloured text (dark is the default; the
  `light` option gives the classic aged parchment), the gold scroll footer,
  two columns.
* Ember-red small-caps headings, gold rules under sections, Royal drop caps.
* Bookman-style body (TeX Gyre Bonum), Gill-style sans for tables and stat
  blocks (Gillius).
* Classic boxes: read-aloud, sidebar, comment, tables striped in the theme
  colour, and stat blocks with the orange ribbons and tapering red rules.
* **Art blends into the page.** Every `\includegraphics` inside a `figure`
  is drawn with soft, faded edges automatically. Use the `framedart` class
  option to turn that off.

It keeps the features of the Dragonbane Supplement class and the D&D 5e
LaTeX template, and the old command names still work (`DndReadAloud`,
`DndSidebar`, `DndComment`, `DndTable`, `\DndSetThemeColor`, `\DndSpellHeader`,
`\DndDropCapLine`, `monsterbox`, `rpg-monsteraction`, `\rpgmonstersection`,
`\rpghline`, `\basics`, `\stats`, `\details`, `\stat`, `\rpgdice`; and
`dragonbox`, `demonbox`, `emptybox`, `tablebox`, `segment`, `\partcolor`,
`\bolditem`, `\coloritem`, `\secretitem`).

## Using it on the campaign notes

Change the class line of `Apotheosis.tex` to

```latex
\documentclass{apotheosis-book}
```

and drop `\usepackage[utf8]{inputenc}`. Nothing else in the notes needs to
change. `notes-preview/` is a copy of the notes set up exactly like that;
`preview/` has the compiled result.

Compile with **XeLaTeX** (on Overleaf, set the compiler to XeLaTeX). Keep
`apotheosis-book.cls`, `apo-paper-dark.jpg`, `apo-paper.jpg` and
`apo-footerscroll.pdf` next to
the document, or on `TEXINPUTS` as `notes-preview/latexmkrc` does.

```sh
cd notes-preview && latexmk
```

## Options

`light` (classic parchment), `print` (white pages, no textures),
`onecolumn`, `framedart`, `a4paper`.

## Extra commands

| Command | What it does |
| --- | --- |
| `\chapterart[keys]{file}` | Art across the top of the next chapter opener |
| `\columnart[keys]{file}` | Soft-edged art inside a column |
| `\pagetopart` / `\pagebottomart` | Full-bleed bands painted behind the current page |
| `\fullpageart{file}[caption]` | A page that is only art |
| `\partimage{file}` before `\part` | Full-bleed part page |
| `\coverimage{file}`, `\logo{file}` | Cover art and logo for `\maketitle` |
| `\makecredits` | Credits page (Dragonbane title block) |
| `\fadedart[keys]{file}` | The faded image box behind all of these |
| `\shorttitle{...}` | Title used in the running foot |

Fade keys: `fade=soft|all|bottom|top|sides|left|right|none`, or `top`,
`bottom`, `left`, `right` (0 to 0.5), plus `width`, `height`, `focus`,
`opacity`.

## History

Approved versions are kept in `history/`.
