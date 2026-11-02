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


def layer(spec):
    g, al, lab = lineart(spec["icon"])
    if spec.get("strokes"):
        keep = np.isin(lab, spec["strokes"])
        al = np.where(keep, al, 0)
    im = Image.fromarray(np.dstack([g, g, g, al]).__mul__(255).clip(0, 255).astype(np.uint8), "RGBA")
    bb = im.getchannel("A").getbbox()
    if not bb:
        sys.exit(f"{spec['icon']}: those strokes are empty.")
    im = im.crop(bb)
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
