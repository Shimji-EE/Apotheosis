"""Writes the class and subclass emblem recipes as Apotheosis heraldry (Charl, 2026-11-03: the plain
game glyphs read too much like BG3 icons).

Each class owns a procedural frame (forge.py `frame`). A class emblem is its frame around a mirrored,
pared-down copy of its glyph; a subclass emblem is its class's frame, drawn finer, around its own glyph,
also mirrored and pared down. Run, then `forge.py make recipes/classes.json` and `... subclasses.json`.
"""
import json
from pathlib import Path

R = Path(__file__).resolve().parent / "recipes"
FRAMES = {"Barbarian": "saw", "Bard": "quatrefoil", "Cleric": "sun", "Druid": "leaf", "Fighter": "shield",
          "Monk": "enso", "Paladin": "octagon", "Ranger": "triangle", "Rogue": "lozenge", "Sorcerer": "hexagon",
          "Warlock": "pentagon", "Wizard": "arch", "Carlislean Lycanthrope": "crescent", "Artificer": "cog",
          "Blood Hunter": "drop", "Mystic": "star8"}
# Where the glyph sits inside narrow frames: size, y.
FIT = {"triangle": (.42, .6), "drop": (.4, .62), "lozenge": (.44, .5), "arch": (.42, .58), "leaf": (.42, .5),
       "pentagon": (.46, .46), "quatrefoil": (.46, .5)}
# Per-emblem fixes after looking at the sheet.
TWEAK = {"subclass Drakewarden": {"mirror": "right"}, "subclass Twilight Domain": {"solid": .55}}


def glyph(icon, label, frame, major):
    size, y = FIT.get(frame, (.54, .5))
    return {"icon": icon, "major": major, "mirror": "left", "size": size, "y": y, **TWEAK.get(label, {})}


def main():
    classes = json.loads((R / "classes.json").read_text(encoding="utf-8"))
    subs = json.loads((R / "subclasses.json").read_text(encoding="utf-8"))
    owner = json.loads((R / "subclass-class.json").read_text(encoding="utf-8"))
    src = lambda item: next(l["icon"] for l in item["layers"] if "icon" in l)
    for c in classes:
        f = FRAMES[c["label"][6:]]
        c.update(weight=5, layers=[{"frame": f, "line": 9}, glyph(src(c), c["label"], f, .88)])
    for s in subs:
        f = FRAMES[owner[s["label"][9:]]]
        s.update(weight=5, layers=[{"frame": f, "line": 6, "size": .94}, glyph(src(s), s["label"], f, .9)])
    for name, data in (("classes.json", classes), ("subclasses.json", subs)):
        (R / name).write_text(json.dumps(data, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
