"""Writes the class and subclass emblem recipes (Charl, 2026-11-03).

- A class emblem is the class's character motif alone, with no frame (recipes/class-motifs.json:
  an axe in a fist, a lute, a raven on a skull...).
- A subclass emblem keeps that class motif at its centre inside a thematic frame from themes.py
  (recipes/subclass-themes.json: flame for Wildfire, eclipse for Shadow, laurel for Glory...). No two
  subclasses of one class share a theme.
- forge.clear_of_frame shrinks or nudges each motif until no ink touches its frame (no clipping).

Run, then `forge.py make recipes/classes.json` and `forge.py make recipes/subclasses.json`.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from forge import clear_of_frame  # noqa: E402

R = Path(__file__).resolve().parent / "recipes"
# Where the motif sits inside frames that are not round: size, y.
FIT = {"giant": (.5, .62), "arch": (.5, .6), "eye": (.5, .5), "twilight": (.56, .46), "shield": (.6, .48)}


def main():
    load = lambda n: json.loads((R / n).read_text(encoding="utf-8"))
    classes, subs = load("classes.json"), load("subclasses.json")
    owner, motif, theme = load("subclass-class.json"), load("class-motifs.json"), load("subclass-themes.json")
    for c in classes:
        c.update(weight=5, layers=[{"icon": motif[c["label"][6:]], "major": .9, "size": .84}])
    for s in subs:
        name = s["label"][9:]
        t = theme[name]
        size, y = FIT.get(t, (.62, .5))
        s.update(weight=5, layers=clear_of_frame([{"theme": t, "line": 7},
                                                  {"icon": motif[owner[name]], "major": .9, "size": size, "y": y}]))
    for name, data in (("classes.json", classes), ("subclasses.json", subs)):
        (R / name).write_text(json.dumps(data, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
