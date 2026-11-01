"""Build docs/hub/srd.json: official D&D rules text for the character sheet.

Source: the System Reference Document 5.1 by Wizards of the Coast, licensed
CC-BY-4.0, as JSON from the 5e-bits/5e-database project. The sheet uses it to
describe spells, class features, species traits, feats, conditions, weapons,
armour and magic items that a character lists by their official name.

Run:  python3 tools/srd/build_srd.py
"""
import json
import re
import urllib.request
from pathlib import Path

BASE = "https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/en/5e-SRD-{}.json"
OUT = Path(__file__).resolve().parents[2] / "docs" / "hub" / "srd.json"
ORDER = ["Spells", "Features", "Traits", "Feats", "Conditions", "Magic-Items", "Equipment"]
ATTRIBUTION = ("This work includes material taken from the System Reference Document 5.1 (\"SRD 5.1\") by "
               "Wizards of the Coast LLC, available at https://dnd.wizards.com/resources/systems-reference-document. "
               "The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License.")


def fetch(name):
    with urllib.request.urlopen(BASE.format(name)) as r:
        return json.load(r)


def key_of(s):
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def text(desc):
    if isinstance(desc, str):
        desc = [desc]
    return "\n\n".join(d.strip() for d in desc or [] if d and d.strip())


def ordinal(n):
    return {1: "1st", 2: "2nd", 3: "3rd"}.get(n, f"{n}th")


def spell_meta(s):
    level = "Cantrip" if s["level"] == 0 else f"{ordinal(s['level'])}-level"
    school = s["school"]["name"].lower()
    head = f"{school.capitalize()} cantrip" if s["level"] == 0 else f"{level} {school}"
    comps = ", ".join(s.get("components", []))
    bits = [head, s.get("casting_time"), s.get("range"), comps, s.get("duration")]
    if s.get("concentration"):
        bits[-1] = f"Concentration, {s['duration'].lower()}"
    if s.get("ritual"):
        bits[0] += " (ritual)"
    return " · ".join(b for b in bits if b)


def equipment_meta(e):
    bits = [e["equipment_category"]["name"]]
    if e.get("damage"):
        bits.append(f"{e['damage']['damage_dice']} {e['damage']['damage_type']['name'].lower()}")
    if e.get("armor_class"):
        ac = e["armor_class"]
        bits.append(f"AC {ac['base']}" + (" + Dex" if ac.get("dex_bonus") else "") + (f" (max {ac['max_bonus']})" if ac.get("max_bonus") else ""))
    if e.get("properties"):
        bits.append(", ".join(p["name"] for p in e["properties"]))
    if e.get("weight"):
        bits.append(f"{e['weight']} lb")
    return " · ".join(bits)


def main():
    out = {"_source": ATTRIBUTION}
    for name in ORDER:
        for e in fetch(name):
            kind = {"Spells": "spell", "Features": "feature", "Traits": "trait", "Feats": "feat",
                    "Conditions": "condition", "Magic-Items": "item", "Equipment": "item"}[name]
            if name == "Spells":
                meta = spell_meta(e)
                desc = text(e.get("desc"))
                if e.get("higher_level"):
                    desc += "\n\nAt higher levels. " + text(e["higher_level"])
                extra = {"lv": e["level"]}
            elif name == "Features":
                meta = f"{e['class']['name']} feature, level {e['level']}" + (f" ({e['subclass']['name']})" if e.get("subclass") else "")
                desc, extra = text(e.get("desc")), {}
            elif name == "Traits":
                meta = "Trait: " + ", ".join(r["name"] for r in e.get("races", []) + e.get("subraces", []))
                desc, extra = text(e.get("desc")), {}
            elif name == "Magic-Items":
                meta = f"{e['equipment_category']['name']}, {e['rarity']['name'].lower()}"
                desc, extra = text(e.get("desc")[1:] if len(e.get("desc", [])) > 1 else e.get("desc")), {}
            elif name == "Equipment":
                meta = equipment_meta(e)
                desc, extra = text(e.get("desc")), {}
            else:
                meta = name[:-1]
                desc, extra = text(e.get("desc")), {}
            entry = {"n": e["name"], "t": kind, "m": meta, "d": desc, **extra}
            # A name can mean several things (Darkvision the spell and the trait): keep one of each kind.
            for k in {key_of(e["name"]), key_of(re.sub(r"\s*\(.*?\)", "", e["name"]))}:
                if k and not any(x["t"] == kind for x in out.setdefault(k, [])):
                    out[k].append(entry)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {OUT} ({len(out) - 1} entries, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
