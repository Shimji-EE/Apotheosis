"""Icon forge: Claude's headless use of the BG3 Icon Generator's engine.

Builds new icons out of the game's own line art (whole icons, or chosen strokes of them),
colours them with the game's recipes or the site's Grave Red glow, and publishes them to
docs/hub/icons with the manifests the site reads. Needs the generator's data folder (Charl's
data.zip in the project files, unzipped into the generator folder) and numpy, scipy, Pillow.

  python tools/icon-studio/forge.py find WORDS...         game icons whose name or title matches
  python tools/icon-studio/forge.py sheet NAME... -o F    contact sheet of game icons, strokes numbered
  python tools/icon-studio/forge.py make RECIPE.json [--dry] [-o preview.png]

A recipe is a list of icons:
  [{"label": "species Snow Elf", "to": "creator", "style": "glow",
    "layers": [{"icon": "Spell_Illusion_DisguiseSelf_Elf_Female", "strokes": [1, 2, 3],
                "x": 0.5, "y": 0.5, "size": 0.8, "rot": 0, "flip": false}]}]
  style: "glow" (the creator's Grave Red emblems) or a game colour preset such as "Cold blue".
  strokes: stroke ids from the sheet (omit for the whole icon). x, y: centre (0-1).
  size: longest side as a share of the icon. Layers later in the list are drawn on top.
  weight (glow only, default 7): how much the strokes are thickened, in pixels at 512.
  Extras: "major": 0-1 keeps the largest strokes up to that share of the ink; "mirror": "left"/"right"
  makes the glyph symmetric from that half; "solid": 0-1 drops faint washes. A layer {"frame": NAME,
  "line": px, "size": 0-1} draws a procedural frame instead (see frame(); used by heraldry.py).

Rule (Charl, 2026-11-02): one icon, one meaning. A composition already published under one
label is refused for another.
"""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
GEN = next((d for d in (ROOT / "tools" / "bg3-icon-generator", ROOT / "BG3-Icon-Generator")
            if (d / "data" / "editor").exists()), ROOT / "tools" / "bg3-icon-generator")
DATA = GEN / "data" / "editor"
sys.path.insert(0, str(GEN))
sys.path.insert(0, str(ROOT / "tools" / "icons"))
import icons  # noqa: E402

N = 512


def index():
    return json.loads((DATA / "index.json").read_text(encoding="utf-8"))["icons"]


def lineart(name):
    """(grey, alpha, stroke ids) at 512 px for one game icon"""
    a = np.asarray(Image.open(DATA / "icons" / f"{name}.png").convert("RGB")).astype(np.float64) / 255
    lab = np.asarray(Image.open(DATA / "icons" / f"{name}.lab.png").convert("RGB")).astype(np.int32)
    return a[..., 0], a[..., 1], lab[..., 0] + 256 * lab[..., 1]


def _shape(name, c, r):
    """Outline(s) of a class frame as polylines: (points, closed). Also returns the jewel points."""
    import math
    pol = lambda rho, n=360: [(c + rho(2 * math.pi * i / n) * math.sin(2 * math.pi * i / n),
                               c - rho(2 * math.pi * i / n) * math.cos(2 * math.pi * i / n)) for i in range(n)]
    poly = lambda n, rot=0, rr=r: [(c + rr * math.sin(rot + 2 * math.pi * i / n), c - rr * math.cos(rot + 2 * math.pi * i / n)) for i in range(n)]
    arcpts = lambda cx, cy, rr, a0, a1, n=60: [(cx + rr * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
                                                cy + rr * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
    if name == "saw":  # Barbarian: notched ring
        pts = [(c + (r if i % 2 else r * .9) * math.sin(math.pi * i / 24), c - (r if i % 2 else r * .9) * math.cos(math.pi * i / 24)) for i in range(48)]
        return [(pts, True)], pts[1::4]
    if name == "quatrefoil":  # Bard
        pts = pol(lambda t: r * (.74 + .26 * abs(math.cos(2 * t))) / 1.0)
        return [(pts, True)], poly(4, 0, r)
    if name == "sun":  # Cleric
        return [(pol(lambda t: r * .84), True)], poly(8, 0, r * .84)
    if name == "leaf":  # Druid: vesica
        dx = r * .6; R = math.hypot(dx, r); t = math.degrees(math.atan2(r, dx))
        return [(arcpts(c + dx, c, R, 180 - t, 180 + t) + arcpts(c - dx, c, R, -t, t), True)], [(c, c - r), (c, c + r)]
    if name == "shield":  # Fighter: heater
        pts = [(c - r * .82, c - r * .86), (c + r * .82, c - r * .86)]
        pts += [(c + r * .82 * math.cos(i / 20 * math.pi / 2), c - r * .2 + r * 1.16 * math.sin(i / 20 * math.pi / 2)) for i in range(1, 20)]
        pts.append((c, c + r * .96)); pts += [(2 * c - x, y) for x, y in reversed(pts[2:-1])]
        return [(pts, True)], [pts[0], pts[1], (c, c + r * .96)]
    if name == "enso":  # Monk: open double ring
        return [(arcpts(c, c, r * .96, -60, 230), False), (arcpts(c, c, r * .86, 120, 410), False)], [arcpts(c, c, r * .96, -60, 230)[0]]
    if name == "octagon":  # Paladin
        pts = poly(8, math.pi / 8); return [(pts, True)], poly(4, 0, r * .96)
    if name == "triangle":  # Ranger
        pts = poly(3); return [(pts, True)], pts
    if name == "lozenge":  # Rogue
        pts = [(c, c - r), (c + r * .72, c), (c, c + r), (c - r * .72, c)]; return [(pts, True)], pts
    if name == "hexagon":  # Sorcerer
        pts = poly(6); return [(pts, True)], pts
    if name == "pentagon":  # Warlock: inverted
        pts = poly(5, math.pi); return [(pts, True)], pts
    if name == "arch":  # Wizard: pointed gothic window
        w = r * .62; ys = c - r + 1.732 * w
        pts = [(c - w, c + r)] + arcpts(c + w, ys, 2 * w, 180, 240, 30) + arcpts(c - w, ys, 2 * w, 300, 360, 30) + [(c + w, c + r)]
        return [(pts, True)], [(c, c - r), (c - w, ys), (c + w, ys)]
    if name == "crescent":  # Lycanthrope
        return [(arcpts(c, c, r, 200, 520), False), (arcpts(c, c, r * .86, 230, 490), False)], [arcpts(c, c, r, 200, 520)[0], arcpts(c, c, r, 200, 520)[-1]]
    if name == "cog":  # Artificer
        pts = []
        for i in range(12):
            for k, rr in ((0, r * .84), (.18, r * .84), (.3, r), (.7, r), (.82, r * .84)):
                a = 2 * math.pi * (i + k) / 12; pts.append((c + rr * math.sin(a), c - rr * math.cos(a)))
        return [(pts, True)], []
    if name == "drop":  # Blood Hunter
        rr = r * .62; cy = c + r * .34
        pts = [(c, c - r)] + [(c + rr * math.cos(math.radians(a)), cy + rr * math.sin(math.radians(a))) for a in range(-35, 216, 5)]
        return [(pts, True)], [(c, c - r)]
    if name == "star8":  # Mystic
        return [(poly(4), True), (poly(4, math.pi / 4), True)], poly(8)
    sys.exit(f"Unknown frame {name!r}")


def frame(name, line=9, size=0.96):
    """A procedural engraved frame (white strokes on clear), drawn 4x and scaled down: the class outline,
    an inner hairline, a bead band between them, jewels at the corners and a few class-specific extras."""
    import math
    K = 4; W = N * K; c = W / 2; r = size * W / 2; lw = line * K
    im = Image.new("L", (W, W), 0); d = ImageDraw.Draw(im)

    def stroke(pts, closed, width):
        d.line(pts + ([pts[0], pts[1]] if closed else []), fill=255, width=max(1, round(width)), joint="curve")

    def walk(pts, closed, step):  # points spaced evenly along a polyline
        P = pts + ([pts[0]] if closed else []); out = []; left = 0
        for (x0, y0), (x1, y1) in zip(P, P[1:]):
            L = math.hypot(x1 - x0, y1 - y0); t = left
            while t < L:
                out.append((x0 + (x1 - x0) * t / L, y0 + (y1 - y0) * t / L)); t += step
            left = t - L
        return out

    def jewel(x, y, h):
        dx, dy = x - c, y - c; L = math.hypot(dx, dy) or 1; ux, uy = dx / L, dy / L
        d.polygon([(x + ux * h, y + uy * h), (x - uy * h * .5, y + ux * h * .5), (x - ux * h, y - uy * h), (x + uy * h * .5, y - ux * h * .5)], fill=255)
        d.ellipse([x - h * .28, y - h * .28, x + h * .28, y + h * .28], fill=0)

    lines, jewels = _shape(name, c, r)
    scale = lambda pts, f: [(c + (x - c) * f, c + (y - c) * f) for x, y in pts]
    for pts, closed in lines:
        stroke(pts, closed, lw)                           # the outline
        stroke(scale(pts, .8), closed, lw * .45)          # inner hairline
        for x, y in walk(scale(pts, .9), closed, lw * 3.6):  # bead band
            q = lw * .38; d.ellipse([x - q, y - q, x + q, y + q], fill=255)
    for x, y in jewels:
        jewel(x, y, lw * 2.4)
    if name == "sun":  # Cleric: alternating rays
        for i in range(24):
            a = 2 * math.pi * i / 24; r1 = r if i % 2 == 0 else r * .93
            d.line([(c + r * .87 * math.sin(a), c - r * .87 * math.cos(a)), (c + r1 * math.sin(a), c - r1 * math.cos(a))], fill=255, width=round(lw * (.8 if i % 2 == 0 else .5)))
    if name == "cog":  # Artificer: rivets on the hub ring
        for x, y in walk([(c + r * .7 * math.sin(2 * math.pi * i / 60), c - r * .7 * math.cos(2 * math.pi * i / 60)) for i in range(60)], True, lw * 4):
            q = lw * .25; d.ellipse([x - q, y - q, x + q, y + q], fill=255)
    if name == "enso":  # Monk: brush-end knots
        for x, y in (lines[0][0][-1], lines[1][0][0], lines[1][0][-1]):
            q = lw * .9; d.ellipse([x - q, y - q, x + q, y + q], fill=255)
    a = np.asarray(im.resize((N, N), Image.LANCZOS)).astype(np.float64) / 255
    return Image.fromarray((np.dstack([np.ones_like(a)] * 3 + [a]) * 255).astype(np.uint8), "RGBA")


def layer(spec):
    if spec.get("frame"):
        return frame(spec["frame"], spec.get("line", 9), spec.get("size", 0.96))
    g, al, lab = lineart(spec["icon"])
    if spec.get("strokes"):
        keep = np.isin(lab, spec["strokes"])
        al = np.where(keep, al, 0)
    if spec.get("solid"):  # drop faint washes behind the strokes
        al = np.where(al * g > spec["solid"], al, 0)
    if spec.get("major"):
        # Keep only the largest strokes (dropping the game's sparks and filler) up to this share of the ink.
        ids, areas = np.unique(lab[al > 0.5], return_counts=True)
        order = np.argsort(-areas); cum = np.cumsum(areas[order]) / areas.sum()
        al = np.where(np.isin(lab, ids[order][: int(np.searchsorted(cum, spec["major"])) + 1]), al, 0)
    im = Image.fromarray(np.dstack([g, g, g, al]).__mul__(255).clip(0, 255).astype(np.uint8), "RGBA")
    bb = im.getchannel("A").getbbox()
    if not bb:
        sys.exit(f"{spec['icon']}: those strokes are empty.")
    im = im.crop(bb)
    if spec.get("mirror"):
        # Heraldic symmetry: one half of the glyph reflected onto the other.
        h = im.width // 2
        half = im.crop((0, 0, h, im.height)) if spec["mirror"] == "left" else im.crop((im.width - h, 0, im.width, im.height)).transpose(Image.FLIP_LEFT_RIGHT)
        im = Image.new("RGBA", (h * 2, im.height), (0, 0, 0, 0))
        im.paste(half, (0, 0)); im.paste(half.transpose(Image.FLIP_LEFT_RIGHT), (h, 0))
    if spec.get("flip"):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if spec.get("rot"):
        im = im.rotate(-spec["rot"], expand=True, resample=Image.BICUBIC)
    s = spec.get("size", 0.8) * N / max(im.size)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    c.paste(im, (round(spec.get("x", 0.5) * N - im.width / 2), round(spec.get("y", 0.5) * N - im.height / 2)), im)
    return c


def compose(layers):
    out = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    for spec in layers:
        out.alpha_composite(layer(spec))
    return out


def render(art, style, size, kind="Spell", weight=7):
    if style == "glow":
        # Thicken the game's strokes first so they hold up at emblem size beside the filled pack glyphs.
        from PIL import ImageFilter
        if weight > 1:
            art = Image.merge("RGBA", (*art.convert("RGB").filter(ImageFilter.MaxFilter(weight)).split(),
                                       art.getchannel("A").filter(ImageFilter.MaxFilter(weight))))
        return icons.glow(art, "#e0303f", size)
    from iconkit import editor as E
    from iconkit.variants import master, recipe, sized
    S = E.state()
    if style not in S["PR"]:
        sys.exit(f"Unknown style {style!r}. Use glow or one of: {', '.join(S['PR'])}")
    a = np.asarray(art).astype(np.float64) / 255
    la = np.dstack([a[..., :1].repeat(3, -1), a[..., 3]])
    return sized(master(la, S["PR"][style], recipe(S["glyph"], kind, style)), size, False)


SIZES = {"creator": 128, "ui": 128, "powers": 96, "resources": 96, "items": 96}


def digest(layers):
    return hashlib.sha1(json.dumps(layers, sort_keys=True).encode()).hexdigest()[:12]


def publish(item, img):
    folder = item["to"]
    out_dir = icons.SITE_ICONS / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    mpath = out_dir / "manifest.json"
    manifest = json.loads(mpath.read_text(encoding="utf-8")) if mpath.exists() else {}
    src = f"forge:{digest(item['layers'])}"
    key = icons.key_of(item["label"])
    for k, v in manifest.items():
        if v.get("from") == src and k != key:
            sys.exit(f"That composition is already the icon for {v['label']!r}; change it for {item['label']!r}.")
    file = f"{icons.slug(item['label'])}.webp"
    img.save(out_dir / file, "WEBP", quality=90)
    entry = {"label": item["label"], "file": file, "from": src}
    if folder in ("powers", "resources"):
        entry.update({"cat": "Forged", "stone": False})
    if folder == "items":
        entry["group"] = "Forged"
    manifest[key] = entry
    mpath.write_text(json.dumps(manifest, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"{folder}/{file}  <- {item['label']}")


def cmd_find(a):
    words = [w.lower() for w in a.words]
    for x in index():
        hay = f"{x['n']} {x['t']} {x.get('s', '')}".lower()
        if all(w in hay for w in words):
            print(f"{x['n']}\t{x['t']}\t{x['p']}")


def cmd_sheet(a):
    tiles = []
    for n in a.names:
        g, al, lab = lineart(n)
        im = Image.fromarray((np.dstack([g, g, g]) * al[..., None] * 255).astype(np.uint8)).resize((384, 384))
        d = ImageDraw.Draw(im)
        for sid in np.unique(lab[al > 0.5]):
            ys, xs = np.nonzero((lab == sid) & (al > 0.5))
            if len(xs) > 30:
                d.text((xs.mean() * 0.75, ys.mean() * 0.75), str(sid), fill=(255, 60, 60))
        d.text((4, 4), n[:52], fill=(120, 200, 255))
        tiles.append(im)
    cols = min(4, len(tiles))
    sheet = Image.new("RGB", (cols * 388, ((len(tiles) + cols - 1) // cols) * 388), (16, 16, 16))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % cols) * 388, (i // cols) * 388))
    sheet.save(a.out)
    print(a.out)


def cmd_make(a):
    items = json.loads(Path(a.recipe).read_text(encoding="utf-8"))
    previews = []
    for item in items:
        art = compose(item["layers"])
        img = render(art, item.get("style", "glow"), SIZES.get(item["to"], 128), item.get("kind", "Spell"), item.get("weight", 7))
        previews.append(img)
        if not a.dry:
            publish(item, img)
    if a.out:
        sheet = Image.new("RGBA", (len(previews) * 136, 136), (20, 15, 15, 255))
        for i, p in enumerate(previews):
            sheet.alpha_composite(p.resize((128, 128)), (i * 136 + 4, 4))
        sheet.save(a.out)
        print(a.out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("find"); p.add_argument("words", nargs="+"); p.set_defaults(fn=cmd_find)
    p = sub.add_parser("sheet"); p.add_argument("names", nargs="+"); p.add_argument("-o", "--out", default="forge-sheet.png"); p.set_defaults(fn=cmd_sheet)
    p = sub.add_parser("make"); p.add_argument("recipe"); p.add_argument("--dry", action="store_true"); p.add_argument("-o", "--out"); p.set_defaults(fn=cmd_make)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
