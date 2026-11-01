#!/usr/bin/env python3
"""Icon tool for the Apotheosis Tavern dashboard.

Rule (Charl, 2026-11-01): if an icon exists in the icon packs, use it
directly. Only make new icons for custom requests.

The packs are not committed (they are large and are not ours). Point the
tool at them with --packs, or keep them in the default places below.

Commands
  catalogue            Index every icon in the packs into catalogue.tsv.gz (run once per pack update).
  find WORDS...        Search the catalogue by name. Cheap: no images are opened.
  sheet WORDS... -o F  Make a contact sheet (PNG) of the matches, to pick from by eye.
  powers               Publish every skill, power and effect icon to docs/hub/icons/powers/
                       with manifest.json. The dashboard matches feature names against it.
  publish CAT --to DIR Publish a whole pack category, e.g. "publish Resource --to resources"
                       (action, bonus action, reaction, Channel Divinity charge, spell slot…).
  add ID [--to DIR] [--name N]
                       Copy one catalogue icon (any pack, any kind, e.g. an item) into the site
                       as .webp and print the path to use.
  custom RECIPE.json   Build custom icons from pack glyphs: recolour, scale, rotate, layer.

Examples
  python3 tools/icons/icons.py find sacred flame
  python3 tools/icons/icons.py sheet frost -o /tmp/frost.png
  python3 tools/icons/icons.py add all:Item/Weapon/Mace/WPN_Mace_Unfaded_Icon.png --to items
  python3 tools/icons/icons.py custom tools/icons/custom.json
"""
import argparse
import colorsys
import gzip
import io
import json
import re
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CATALOGUE = HERE / "catalogue.tsv.gz"
SITE_ICONS = ROOT / "docs" / "hub" / "icons"

# Where the packs live. The first that exists wins; --packs overrides.
DEFAULT_PACKS = [
    Path("/mnt/project-files"),                 # project files (cloud)
    Path("F:/Projects/Apotheosis/icon-packs"),  # Charl's PC
    ROOT / "icon-packs",                        # local, git-ignored
]
PACKS = {
    "all": "All_Icons.zip*",                    # BG3Icons/<Category>/...  (webp/png)
    "monti": "monti_icon_pack_bg3_v1*.7z",      # Monti Icon Pack BG3: Override/ and Extra/ (tga)
}

# Skill, power and effect categories, in the order a duplicate name is resolved.
POWER_CATS = ["Spell", "Action", "Weapon_action", "Passive_feature", "Skill", "Generic_condition",
              "Legendary_action", "Generic", "Damage_type"]


# ---------- pack access ----------

def find_pack(base: Path, pattern: str):
    hits = sorted(base.glob(pattern))
    return hits[0] if hits else None


def open_packs(packs_dir):
    bases = [Path(packs_dir)] if packs_dir else DEFAULT_PACKS
    found = {}
    for key, pattern in PACKS.items():
        for base in bases:
            p = find_pack(base, pattern) if base.exists() else None
            if p:
                found[key] = p
                break
    if not found:
        sys.exit("No icon packs found. Pass --packs <folder holding All_Icons.zip… and monti_icon_pack….7z>.")
    return found


def list_pack(key, path):
    if path.suffix == ".zip":
        with zipfile.ZipFile(path) as z:
            return [n for n in z.namelist() if not n.endswith("/")]
    import py7zr  # pip install py7zr
    with py7zr.SevenZipFile(path) as z:
        return [n for n in z.getnames() if n.lower().endswith((".tga", ".png", ".webp", ".jpg"))]


def read_many(path, names):
    """Return {name: PIL.Image} for names inside one pack."""
    out = {}
    if path.suffix == ".zip":
        with zipfile.ZipFile(path) as z:
            for n in names:
                out[n] = Image.open(io.BytesIO(z.read(n))).convert("RGBA")
        return out
    import py7zr
    with py7zr.SevenZipFile(path) as z:
        for n, bio in z.read(targets=list(names)).items():
            out[n] = Image.open(bio).convert("RGBA")
    return out


# ---------- catalogue ----------

def clean_name(file_name):
    stem = Path(file_name).stem
    stem = re.sub(r"(_Unfaded)?(_Icons?)?$", "", stem)
    stem = re.sub(r"^(icon_bg3_|icon_|it_|is_|ife_|ia_|ig_)", "", stem, flags=re.I)
    return re.sub(r"[_\-]+", " ", stem).strip()


def key_of(label):
    return re.sub(r"[^a-z0-9]+", " ", label.lower()).strip()


def strip_prefix(name):
    for prefix in ("BG3Icons/", "Monti Icon Pack BG3 v1.0/"):
        if name.startswith(prefix):
            return name[len(prefix):]
    return name


def cmd_catalogue(args):
    packs = open_packs(args.packs)
    rows = []
    for key, path in packs.items():
        names = list_pack(key, path)
        for n in names:
            rel = strip_prefix(n)
            cat = rel.split("/")[0]
            rows.append((f"{key}:{rel}", cat, "unfaded" if "Unfaded" in rel else "", clean_name(rel)))
        print(f"{key}: {len(names)} files from {path.name}")
    with gzip.open(CATALOGUE, "wt", encoding="utf-8") as f:
        for r in rows:
            f.write("\t".join(r) + "\n")
    print(f"wrote {CATALOGUE.relative_to(ROOT)} ({len(rows)} icons)")


def load_catalogue():
    if not CATALOGUE.exists():
        sys.exit("No catalogue yet. Run: icons.py catalogue")
    with gzip.open(CATALOGUE, "rt", encoding="utf-8") as f:
        return [line.rstrip("\n").split("\t") for line in f]


def search(words, cat=None):
    words = [w.lower() for w in words]
    hits = []
    for icon_id, c, unfaded, label in load_catalogue():
        hay = f"{label} {c}".lower()
        if all(w in hay for w in words) and (not cat or c.lower() == cat.lower()):
            hits.append((icon_id, c, unfaded, label))
    return hits


def cmd_find(args):
    hits = search(args.words, args.cat)
    for icon_id, c, unfaded, label in hits[: args.limit]:
        print(f"{icon_id}\t{label}")
    if len(hits) > args.limit:
        print(f"… {len(hits) - args.limit} more (use --limit)")


def load_icons(ids, packs_dir=None):
    packs = open_packs(packs_dir)
    by_pack = {}
    for icon_id in ids:
        key, rel = icon_id.split(":", 1)
        prefix = "BG3Icons/" if key == "all" else "Monti Icon Pack BG3 v1.0/"
        by_pack.setdefault(key, {})[prefix + rel] = icon_id
    out = {}
    for key, names in by_pack.items():
        for n, img in read_many(packs[key], names.keys()).items():
            out[names[n]] = img
    return out


def cmd_sheet(args):
    hits = search(args.words, args.cat)
    if args.unfaded:
        hits = [h for h in hits if h[2]]
    hits = hits[: args.limit]
    if not hits:
        sys.exit("No matches.")
    imgs = load_icons([h[0] for h in hits], args.packs)
    cell, cols = 128, 8
    rows = (len(hits) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell, rows * (cell + 18)), (18, 15, 12, 255))
    from PIL import ImageDraw
    draw = ImageDraw.Draw(sheet)
    for i, h in enumerate(hits):
        x, y = (i % cols) * cell, (i // cols) * (cell + 18)
        im = imgs[h[0]].copy()
        im.thumbnail((cell - 8, cell - 8))
        sheet.alpha_composite(im, (x + (cell - im.width) // 2, y + 4))
        draw.text((x + 4, y + cell), f"{i + 1}. {h[3][:18]}", fill=(200, 190, 175, 255))
    sheet.convert("RGB").save(args.out)
    for i, h in enumerate(hits):
        print(f"{i + 1}. {h[0]}")
    print(f"wrote {args.out}")


# ---------- publishing ----------

def save_webp(img, dest, size=None):
    if size:
        img = img.resize((size, size), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=88, method=6)


def slug(label):
    return re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")


def cmd_powers(args):
    """Publish every skill, power and effect icon, preferring the version on stone (Unfaded)."""
    rank = {c: i for i, c in enumerate(POWER_CATS)}
    chosen = {}
    for icon_id, cat, unfaded, label in load_catalogue():
        if not icon_id.startswith("all:") or cat not in rank:
            continue
        k = key_of(label)
        score = (rank[cat], 0 if unfaded else 1)
        if k not in chosen or score < chosen[k][0]:
            chosen[k] = (score, icon_id, cat, bool(unfaded), label)
    imgs = load_icons([v[1] for v in chosen.values()], args.packs)
    out_dir = SITE_ICONS / "powers"
    manifest = {}
    for k, (_, icon_id, cat, stone, label) in sorted(chosen.items()):
        file = f"{slug(label)}.webp"
        img = imgs[icon_id]
        # Stone versions are 64 px; glyph-only ones are 144 px and sit on the page's own stone tile.
        save_webp(img, out_dir / file, None if stone else 96)
        manifest[k] = {"label": label, "file": file, "cat": cat, "stone": stone}
    (out_dir / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")))
    total = sum(p.stat().st_size for p in out_dir.glob("*.webp"))
    print(f"published {len(manifest)} icons to {out_dir.relative_to(ROOT)} ({total // 1024} KB)")


def cmd_publish(args):
    """Publish a whole pack category (e.g. Resource) to docs/hub/icons/<to>/ with a manifest."""
    hits = [h for h in load_catalogue() if h[0].startswith("all:") and h[1] == args.cat]
    imgs = load_icons([h[0] for h in hits], args.packs)
    out_dir = SITE_ICONS / args.to
    manifest = {}
    for icon_id, cat, unfaded, label in hits:
        file = f"{slug(label)}.webp"
        save_webp(imgs[icon_id], out_dir / file, args.size)
        manifest[key_of(label)] = {"label": label, "file": file, "cat": cat, "stone": bool(unfaded)}
    (out_dir / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")))
    print(f"published {len(manifest)} icons to {out_dir.relative_to(ROOT)}")


def cmd_add(args):
    img = load_icons([args.id], args.packs)[args.id]
    name = args.name or slug(clean_name(args.id.split(":", 1)[1]))
    dest = SITE_ICONS / args.to / f"{name}.webp"
    save_webp(img, dest, args.size)
    print(dest.relative_to(ROOT / "docs" / "hub"))


# ---------- custom icons ----------

def recolour(img, hex_colour):
    """Retint a glowing glyph: keep its brightness (the white-hot core), swap its hue."""
    r, g, b = (int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, s, _ = colorsys.rgb_to_hsv(r, g, b)
    gray = ImageOps.grayscale(img)
    lut = []
    for v in range(256):
        t = v / 255
        # dark → saturated colour, bright → near white, like the originals
        cr, cg, cb = colorsys.hsv_to_rgb(h, s * (1 - t ** 3 * 0.85), min(1, t * 1.25))
        lut.append((int(cr * 255), int(cg * 255), int(cb * 255)))
    out = Image.new("RGBA", img.size)
    px = [lut[v] + (a,) for v, a in zip(gray.getdata(), img.getchannel("A").getdata())]
    out.putdata(px)
    return out


def cmd_custom(args):
    """Recipe: {"name": {"base": ID|null, "size": 144, "layers": [{"id": ID, "colour": "#hex",
    "scale": 1, "rotate": 0, "dx": 0, "dy": 0, "opacity": 1}], "label": "…"}}"""
    recipes = json.loads(Path(args.recipe).read_text())
    ids = {l["id"] for r in recipes.values() for l in r["layers"]} | {r["base"] for r in recipes.values() if r.get("base")}
    imgs = load_icons(sorted(ids), args.packs)
    out_dir = SITE_ICONS / "powers"
    manifest_path = out_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    for name, r in recipes.items():
        size = r.get("size", 144)
        canvas = imgs[r["base"]].resize((size, size)) if r.get("base") else Image.new("RGBA", (size, size))
        for l in r["layers"]:
            g = imgs[l["id"]]
            if l.get("colour"):
                g = recolour(g, l["colour"])
            s = int(size * l.get("scale", 1))
            g = g.resize((s, s), Image.LANCZOS).rotate(l.get("rotate", 0), resample=Image.BICUBIC, expand=False)
            if l.get("opacity", 1) < 1:
                g.putalpha(g.getchannel("A").point(lambda a: int(a * l["opacity"])))
            canvas.alpha_composite(g, ((size - s) // 2 + l.get("dx", 0), (size - s) // 2 + l.get("dy", 0)))
        label = r.get("label", name)
        file = f"custom-{slug(name)}.webp"
        save_webp(canvas, out_dir / file, 96 if not r.get("base") else 64)
        manifest[key_of(label)] = {"label": label, "file": file, "cat": "Custom", "stone": bool(r.get("base"))}
        print(f"built {file}")
    manifest_path.write_text(json.dumps(manifest, separators=(",", ":")))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--packs", help="folder holding the icon pack archives")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("catalogue").set_defaults(fn=cmd_catalogue)
    p = sub.add_parser("find"); p.add_argument("words", nargs="+"); p.add_argument("--cat"); p.add_argument("--limit", type=int, default=40); p.set_defaults(fn=cmd_find)
    p = sub.add_parser("sheet"); p.add_argument("words", nargs="+"); p.add_argument("--cat"); p.add_argument("--unfaded", action="store_true"); p.add_argument("--limit", type=int, default=48); p.add_argument("-o", "--out", default="icon-sheet.png"); p.set_defaults(fn=cmd_sheet)
    sub.add_parser("powers").set_defaults(fn=cmd_powers)
    p = sub.add_parser("publish"); p.add_argument("cat"); p.add_argument("--to", required=True); p.add_argument("--size", type=int); p.set_defaults(fn=cmd_publish)
    p = sub.add_parser("add"); p.add_argument("id"); p.add_argument("--to", default="items"); p.add_argument("--name"); p.add_argument("--size", type=int); p.set_defaults(fn=cmd_add)
    p = sub.add_parser("custom"); p.add_argument("recipe"); p.set_defaults(fn=cmd_custom)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
