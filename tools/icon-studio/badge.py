"""Badge: flat 2D emblem icons (one solid silhouette, thin cut lines, tapered points, a few sparkles),
the style of Charl's reference sheet of flattened BG3 class and subclass badges (2026-11-04).

Sources:
  - a painted badge PNG with transparency (BG3 "Class <Class> [<Subclass>] Badge Icon.png", kept in the
    git-ignored icon-packs/bg3-badges on Charl's PC; reference only, never committed): the silhouette is
    its solid part, and its strongest long inner edges become the cut lines;
  - or any RGBA art (forge line art, a LoRA result): closed shapes are filled, strokes cut back in.

A recipe is a list of icons:
  [{"label": "class Barbarian", "to": "creator", "src": "icon-packs/bg3-badges/Class_Barbarian_Badge_Icon.png",
    "cuts": 6, "add": [{"src": "...", "x": .7, "y": .2, "size": .3}], "remove": [[x0, y0, x1, y1]],
    "sparkles": [[.2, .25, .06]], "ring": false}]
  cuts: how many inner edge lines to keep (3-8 reads best). add: extra silhouettes (customise a traced base).
  remove: boxes (0-1 coords) cleared from the silhouette. sparkles: [x, y, size] four-point stars.
  ring: a thick round ring behind (subclass badges); the object breaks out of it at the top.

Use:
  python tools/icon-studio/badge.py make RECIPE.json [--dry] [-o sheet.png]   writes SVG + site webp
Needs: numpy scipy pillow potracer
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
import forge  # noqa: E402

N = 512
RED = "#e0303f"


def load(src):
    p = Path(src)
    if not p.is_absolute():
        p = ROOT / p
    if p.suffix in (".png", ".webp") and p.exists():
        return Image.open(p).convert("RGBA")
    return forge.compose([{"icon": src, "major": 0.9, "size": 0.84}])  # a game line-art name


def fit(im, size=0.84, x=0.5, y=0.5):
    bb = im.getchannel("A").getbbox()
    im = im.crop(bb)
    s = size * N / max(im.size)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    c.paste(im, (round(x * N - im.width / 2), round(y * N - im.height / 2)), im)
    return c


def silhouette(im, cuts=6):
    """(solid mask, cut-line mask) from RGBA art."""
    a = np.asarray(im.getchannel("A")).astype(float) / 255
    g = np.asarray(im.convert("L")).astype(float) / 255
    solid = a > 0.5
    if solid.mean() < 0.12:  # line art: fill closed shapes, cut the strokes back in
        lines = ndi.binary_closing(solid, iterations=2)
        solid = ndi.binary_fill_holes(lines)
        inner = lines & ndi.binary_erosion(solid, iterations=5)
    else:  # painted badge: long, strong luminance edges inside the shape
        e = np.hypot(ndi.sobel(ndi.gaussian_filter(g, 2), 0), ndi.sobel(ndi.gaussian_filter(g, 2), 1))
        e = (e > np.percentile(e[solid], 92)) & ndi.binary_erosion(solid, iterations=8)
        inner = e
    lab, n = ndi.label(ndi.binary_dilation(inner, iterations=1))
    if n:
        sizes = ndi.sum(np.ones_like(a), lab, range(1, n + 1))
        keep = 1 + np.argsort(-sizes)[:cuts]
        inner = np.isin(lab, keep)
    cut = ndi.binary_erosion(ndi.binary_dilation(inner, iterations=3), iterations=1)
    solid = ndi.binary_opening(solid, iterations=2)
    return solid, cut


def sparkle(d, x, y, r):
    """Four-point star with concave sides."""
    pts = []
    for k in range(8):
        ang = np.pi / 4 * k
        rr = r if k % 2 == 0 else r * 0.22
        pts.append((x + rr * np.sin(ang), y - rr * np.cos(ang)))
    d.polygon(pts, fill=255)


def build(item):
    base = fit(load(item["src"]), item.get("size", 0.84), item.get("x", 0.5), item.get("y", 0.5))
    solid, cut = silhouette(base, item.get("cuts", 6))
    for extra in item.get("add", []):
        s2, c2 = silhouette(fit(load(extra["src"]), extra.get("size", 0.3), extra.get("x", 0.5), extra.get("y", 0.5)),
                            extra.get("cuts", 3))
        gap = ndi.binary_dilation(s2, iterations=6)  # a clean gap where the added part overlaps
        solid = (solid & ~gap) | s2
        cut = (cut & ~gap) | c2
    for x0, y0, x1, y1 in item.get("remove", []):
        solid[round(y0 * N):round(y1 * N), round(x0 * N):round(x1 * N)] = False
    m = Image.fromarray((solid & ~cut).astype(np.uint8) * 255)
    d = ImageDraw.Draw(m)
    if item.get("ring"):
        ring = Image.new("L", (N, N), 0); rd = ImageDraw.Draw(ring)
        r, w = N * 0.40, N * 0.055
        rd.ellipse([N / 2 - r, N / 2 - r, N / 2 + r, N / 2 + r], outline=255, width=round(w))
        obj = ndi.binary_dilation(np.asarray(m) > 0, iterations=8)
        ring = np.asarray(ring) > 0
        m = Image.fromarray(((np.asarray(m) > 0) | (ring & ~obj)).astype(np.uint8) * 255)
        d = ImageDraw.Draw(m)
    for x, y, s in item.get("sparkles", []):
        sparkle(d, x * N, y * N, s * N)
    return m


def to_svg(mask, colour=RED):
    import potrace
    bm = potrace.Bitmap(np.asarray(mask) <= 127)  # potracer traces the False pixels
    path = bm.trace(turdsize=40, alphamax=1.0, opticurve=True, opttolerance=0.3)
    parts = []
    for curve in path:
        p0 = curve.start_point
        seg = [f"M{p0.x:.1f},{p0.y:.1f}"]
        for s in curve.segments:
            if s.is_corner:
                seg.append(f"L{s.c.x:.1f},{s.c.y:.1f}L{s.end_point.x:.1f},{s.end_point.y:.1f}")
            else:
                seg.append(f"C{s.c1.x:.1f},{s.c1.y:.1f} {s.c2.x:.1f},{s.c2.y:.1f} {s.end_point.x:.1f},{s.end_point.y:.1f}")
        parts.append("".join(seg) + "Z")
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {N} {N}">'
            f'<path fill="{colour}" fill-rule="evenodd" d="{"".join(parts)}"/></svg>')


def raster(mask, size=128):
    """The site webp: flat Grave Red fill with the soft glow the other creator icons use."""
    a = mask.convert("L")
    art = Image.merge("RGBA", (a, a, a, a))
    return forge.icons.glow(art, RED, size)


def cmd_make(a):
    items = json.loads(Path(a.recipe).read_text(encoding="utf-8"))
    sheet = []
    for item in items:
        m = build(item)
        img = raster(m, forge.SIZES.get(item.get("to", "creator"), 128))
        sheet.append(img)
        if a.dry:
            continue
        svg_dir = HERE / "badges"; svg_dir.mkdir(exist_ok=True)
        (svg_dir / f"{forge.icons.slug(item['label'])}.svg").write_text(to_svg(m), encoding="utf-8")
        forge.publish(dict(item, layers=[{"badge": {k: v for k, v in item.items() if k not in ("label", "to")}}]), img)
    if a.out:
        s = Image.new("RGBA", (len(sheet) * 134, 134), (20, 15, 15, 255))
        for i, im in enumerate(sheet):
            s.alpha_composite(im.convert("RGBA").resize((128, 128)), (i * 134 + 3, 3))
        s.save(a.out)
        print(a.out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("make"); p.add_argument("recipe"); p.add_argument("--dry", action="store_true")
    p.add_argument("-o", "--out"); p.set_defaults(fn=cmd_make)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
