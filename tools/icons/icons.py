#!/usr/bin/env python3
"""Icon tool for the Apotheosis Tavern dashboard.

Rule (Charl, 2026-11-02): never reuse one pack icon for two different things.
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
  items                Publish every item's painted art to docs/hub/icons/items/ with manifest.json.
                       Items on the sheet find their texture by name.
  publish CAT --to DIR Publish a whole pack category, e.g. "publish Resource --to resources"
                       (action, bonus action, reaction, Channel Divinity charge, spell slot…).
  add ID [--to DIR] [--name N]
                       Copy one catalogue icon (any pack, any kind, e.g. an item) into the site
                       as .webp and print the path to use.
  custom RECIPE.json   Build custom icons from pack glyphs: recolour, scale, rotate, layer.
  glow MAP.json --to DIR
                       Turn flat white pack glyphs (class, species, deity…) into the site's
                       glowing Grave Red emblems: a red-hot core with a soft neon halo. MAP is
                       {"file-name": "catalogue id"}; writes DIR/manifest.json too.
  generated --to DIR [--mod M] [--map MAP.json] [--glow]
                       Publish icons made in the BG3 Icon Generator (tools/bg3-icon-generator,
                       exported under mod name M, default Apotheosis) into docs/hub/icons/DIR.
                       --glow turns them into Grave Red emblems like the creator's; without it
                       they keep the game's colours. MAP is {"label": "IconKey"}; without one,
                       every exported icon is published under its own key.

Examples
  python3 tools/icons/icons.py find sacred flame
  python3 tools/icons/icons.py sheet frost -o /tmp/frost.png
  python3 tools/icons/icons.py add all:Item/Weapon/Mace/WPN_Mace_Unfaded_Icon.png --to items
  python3 tools/icons/icons.py custom tools/icons/custom.json
  python3 tools/icons/icons.py generated --to creator --glow --map tools/icons/creator-made.json
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
    "tiles": "Icon_pack-3125*.7z",              # BG3 icon tiles, 64px, unnamed: Icons/cutsprites{,2}/tileNNN.png
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
    import tempfile
    import py7zr
    with tempfile.TemporaryDirectory() as tmp, py7zr.SevenZipFile(path) as z:
        z.extract(path=tmp, targets=list(names))
        for n in names:
            out[n] = Image.open(Path(tmp) / n).convert("RGBA")
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
        prefix = {"all": "BG3Icons/", "monti": "Monti Icon Pack BG3 v1.0/"}.get(key, "")
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


def item_label(rel):
    stem = Path(rel).stem
    stem = re.sub(r"_Unfaded(_Icon)?$|_Icon$", "", stem)
    stem = re.sub(r"^(Item_)?[A-Z]{2,4}_", "", stem)            # POT_, ELX_, WPN_ …
    for word, n in (("PlusOne", "+1"), ("PlusTwo", "+2"), ("PlusThree", "+3")):
        stem = stem.replace(word, n)
    stem = re.sub(r"_\d+$", "", stem)                            # Chain_Mail_2 → Chain Mail
    return re.sub(r"_+", " ", stem).strip()


def cmd_items(args):
    """Publish every item's painted art (the 144 px version) as item textures, with a manifest."""
    chosen = {}
    for icon_id, cat, unfaded, label in load_catalogue():
        rel = icon_id.split(":", 1)[1]
        if not icon_id.startswith("all:") or cat != "Item" or rel.endswith("_Icon.png") or rel.endswith("_Icon.webp"):
            continue
        name = item_label(rel)
        k = key_of(name)
        if k and (k not in chosen or len(rel) < len(chosen[k][0])):
            chosen[k] = (rel, icon_id, name, "/".join(rel.split("/")[1:-1]))
    imgs = load_icons([v[1] for v in chosen.values()], args.packs)
    out_dir = SITE_ICONS / "items"
    manifest = {}
    for k, (rel, icon_id, name, group) in sorted(chosen.items()):
        file = f"{slug(name)}.webp"
        img = imgs[icon_id]
        img = img.resize((args.size, args.size), Image.LANCZOS)
        out_dir.mkdir(parents=True, exist_ok=True)
        img.save(out_dir / file, "WEBP", quality=80, method=4)
        manifest[k] = {"label": name, "file": file, "group": group}
    (out_dir / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")))
    total = sum(p.stat().st_size for p in out_dir.glob("*.webp"))
    print(f"published {len(manifest)} item textures to {out_dir.relative_to(ROOT)} ({total // 1024} KB)")


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


def glow(img, hex_colour="#e0303f", size=128, pad=0.16):
    """A flat glyph as a glowing emblem: white-hot core, red rim, blurred red halo."""
    from PIL import ImageFilter
    r, g, b = (int(hex_colour[i:i + 2], 16) for i in (1, 3, 5))
    alpha = img.getchannel("A") if img.mode == "RGBA" else ImageOps.grayscale(img)
    lum = ImageOps.grayscale(img.convert("RGB"))
    # Glyphs drawn on black (no alpha) take their shape from brightness.
    if alpha.getextrema()[0] == 255:
        alpha = lum
    box = alpha.getbbox() or (0, 0, *img.size)
    alpha, lum = alpha.crop(box), lum.crop(box)
    inner = int(size * (1 - 2 * pad))
    scale = inner / max(alpha.size)
    dims = (max(1, round(alpha.width * scale)), max(1, round(alpha.height * scale)))
    alpha, lum = alpha.resize(dims, Image.LANCZOS), lum.resize(dims, Image.LANCZOS)
    mask = Image.new("L", (size, size))
    mask.paste(alpha, ((size - dims[0]) // 2, (size - dims[1]) // 2))
    shade = Image.new("L", (size, size))
    shade.paste(lum, ((size - dims[0]) // 2, (size - dims[1]) // 2))
    halo = mask.filter(ImageFilter.GaussianBlur(size / 18)).point(lambda a: min(255, int(a * 1.5)))
    edge = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = Image.new("RGBA", (size, size), (r, g, b, 0))
    out.putalpha(halo.point(lambda a: int(a * 0.75)))
    rim = Image.new("RGBA", (size, size), (r, g, b, 0)); rim.putalpha(edge)
    out.alpha_composite(rim)
    # Core: the glyph's own shading, tinted from red (dark) to pale rose (bright).
    lut = [(min(255, int(r + (255 - r) * t ** 1.6 * 0.85)), min(255, int(g + (235 - g) * t ** 2 * 0.8)),
            min(255, int(b + (225 - b) * t ** 2 * 0.8))) for t in (v / 255 for v in range(256))]
    core = Image.new("RGBA", (size, size))
    core.putdata([lut[v] + (a,) for v, a in zip(shade.getdata(), mask.point(lambda a: int(a * 0.95)).getdata())])
    out.alpha_composite(core)
    return out


def cmd_glow(args):
    names = json.loads(Path(args.map).read_text())
    imgs = load_icons(sorted(set(names.values())), args.packs)
    out_dir = SITE_ICONS / args.to
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    # Charl (2026-11-02): never reuse a pack icon for two different things.
    used = {v["from"]: v["label"] for v in manifest.values()}
    for name, icon_id in names.items():
        other = used.get(icon_id)
        if other and other != name:
            sys.exit(f"{icon_id} is already the emblem for {other!r}; pick another icon for {name!r}.")
        used[icon_id] = name
    for name, icon_id in names.items():
        file = f"{slug(name)}.webp"
        glow(imgs[icon_id], args.colour, args.size).save(out_dir / file, "WEBP", quality=90)
        manifest[key_of(name)] = {"label": name, "file": file, "from": icon_id}
        print(f"glow {file}")
    manifest_path.write_text(json.dumps(manifest, separators=(",", ":"), ensure_ascii=False))


GEN_OUT = ROOT / "tools" / "bg3-icon-generator" / "outputs" / "editor"


def generated_art(mod, key):
    """The largest transparent export of one generator icon (not the faded tooltip copy)."""
    png = GEN_OUT / mod / "png"
    best = None
    for f in png.glob(f"{key}_*.png"):
        m = re.fullmatch(re.escape(key) + r"_(\d+)", f.stem)
        if m and (best is None or int(m.group(1)) > best[0]):
            best = (int(m.group(1)), f)
    if not best:
        sys.exit(f"No export of {key!r} in {png}. Export it from the generator under the mod name {mod!r} first.")
    return Image.open(best[1]).convert("RGBA")


def cmd_generated(args):
    png = GEN_OUT / args.mod / "png"
    if args.map:
        names = json.loads(Path(args.map).read_text())
    else:
        keys = sorted({re.sub(r"_(\d+)$", "", f.stem) for f in png.glob("*.png") if re.search(r"_\d+$", f.stem) and not re.search(r"_hotbar_\d+$", f.stem)})
        names = {k: k for k in keys}
    if not names:
        sys.exit(f"Nothing exported yet in {png}.")
    out_dir = SITE_ICONS / args.to
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    # Charl (2026-11-02): one icon, one meaning.
    used = {v["from"]: v["label"] for v in manifest.values()}
    for label, key in names.items():
        src = f"gen:{args.mod}/{key}"
        if used.get(src, label) != label:
            sys.exit(f"{key} is already the icon for {used[src]!r}; make a new one for {label!r}.")
        used[src] = label
    for label, key in names.items():
        art = generated_art(args.mod, key)
        file = f"{slug(label)}.webp"
        if args.glow:
            img = glow(art, args.colour, args.size)
        else:
            img = art.resize((args.size, args.size), Image.LANCZOS)
        img.save(out_dir / file, "WEBP", quality=90)
        manifest[key_of(label)] = {"label": label, "file": file, "from": f"gen:{args.mod}/{key}"}
        print(f"{'glow' if args.glow else 'icon'} {args.to}/{file}  <- {key}")
    manifest_path.write_text(json.dumps(manifest, separators=(",", ":"), ensure_ascii=False))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--packs", help="folder holding the icon pack archives")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("catalogue").set_defaults(fn=cmd_catalogue)
    p = sub.add_parser("find"); p.add_argument("words", nargs="+"); p.add_argument("--cat"); p.add_argument("--limit", type=int, default=40); p.set_defaults(fn=cmd_find)
    p = sub.add_parser("sheet"); p.add_argument("words", nargs="+"); p.add_argument("--cat"); p.add_argument("--unfaded", action="store_true"); p.add_argument("--limit", type=int, default=48); p.add_argument("-o", "--out", default="icon-sheet.png"); p.set_defaults(fn=cmd_sheet)
    sub.add_parser("powers").set_defaults(fn=cmd_powers)
    p = sub.add_parser("publish"); p.add_argument("cat"); p.add_argument("--to", required=True); p.add_argument("--size", type=int); p.set_defaults(fn=cmd_publish)
    p = sub.add_parser("items"); p.add_argument("--size", type=int, default=96); p.set_defaults(fn=cmd_items)
    p = sub.add_parser("add"); p.add_argument("id"); p.add_argument("--to", default="items"); p.add_argument("--name"); p.add_argument("--size", type=int); p.set_defaults(fn=cmd_add)
    p = sub.add_parser("custom"); p.add_argument("recipe"); p.set_defaults(fn=cmd_custom)
    p = sub.add_parser("glow"); p.add_argument("map"); p.add_argument("--to", required=True); p.add_argument("--colour", default="#e0303f"); p.add_argument("--size", type=int, default=128); p.set_defaults(fn=cmd_glow)
    p = sub.add_parser("generated"); p.add_argument("--to", required=True); p.add_argument("--mod", default="Apotheosis"); p.add_argument("--map")
    p.add_argument("--glow", action="store_true"); p.add_argument("--colour", default="#e0303f"); p.add_argument("--size", type=int, default=128); p.set_defaults(fn=cmd_generated)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
