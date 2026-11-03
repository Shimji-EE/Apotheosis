"""Writes the class and subclass emblem recipes (Charl, 2026-11-03).

- A class emblem is the class's character symbol alone, with no frame (recipes/class-motifs.json:
  an axe in a fist, a lute, wild shape, a raven on a skull...).
- A subclass emblem is built to read as its class first: a round frame whose three accents are small
  outlines of the class's shape (notched ring for Barbarian, shield for Fighter, arch for Wizard...) around
  the class symbol,
  with a subclass crest breaking the top of the frame. The crest is another game icon chosen for the
  subclass's theme (recipes/subclass-themes.json -> recipes/theme-crests.json); no theme repeats in a class.
- forge.clear_of_frame shrinks or nudges the class symbol until it touches neither frame nor crest.

Run, then `forge.py make recipes/classes.json` and `forge.py make recipes/subclasses.json`.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from forge import clear_of_frame  # noqa: E402

R = Path(__file__).resolve().parent / "recipes"
FRAMES = {"Barbarian": "saw", "Bard": "quatrefoil", "Cleric": "sun", "Druid": "leaf", "Fighter": "shield",
          "Monk": "enso", "Paladin": "octagon", "Ranger": "triangle", "Rogue": "lozenge", "Sorcerer": "hexagon",
          "Warlock": "pentagon", "Wizard": "arch", "Carlislean Lycanthrope": "crescent", "Artificer": "cog",
          "Blood Hunter": "drop", "Mystic": "star8"}
# Frame size and centre; symbol size and centre, per frame (the crest takes the top).
FIT = {"triangle": (.84, .56, .44, .66), "drop": (.84, .56, .4, .68), "lozenge": (.84, .56, .46, .58),
       "arch": (.84, .56, .44, .62), "leaf": (.84, .56, .4, .58), "pentagon": (.84, .56, .48, .54)}


def main():
    load = lambda n: json.loads((R / n).read_text(encoding="utf-8"))
    classes, subs = load("classes.json"), load("subclasses.json")
    owner, motif = load("subclass-class.json"), load("class-motifs.json")
    theme, crest = load("subclass-themes.json"), load("theme-crests.json")
    for c in classes:
        c.update(weight=5, layers=[{"icon": motif[c["label"][6:]], "major": .9, "size": .84}])
    for s in subs:
        name = s["label"][9:]
        cls = owner[name]
        f = "round:" + FRAMES[cls]
        fs, fy, size, y = .86, .54, .62, .56
        s.update(weight=5, layers=clear_of_frame([
            {"frame": f, "line": 7, "size": fs, "y": fy},
            {"icon": crest[theme[name]], "major": .92, "size": .34, "y": .18, "knock": 10, "fixed": True},
            {"icon": motif[cls], "major": .9, "size": size, "y": y}]))
    for name, data in (("classes.json", classes), ("subclasses.json", subs)):
        (R / name).write_text(json.dumps(data, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
