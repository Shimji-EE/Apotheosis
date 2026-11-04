import sys, numpy as np
sys.path.insert(0, "tools/icon-studio")
import badge, forge
from PIL import Image
from scipy import ndimage as ndi
R = "/mnt/project-files/icon-references/"
def rgb(p): return np.asarray(Image.open(R + p).convert("RGB")).astype(float)
def mask_of(name):
    if name == "Blood Hunter":
        a = rgb("homebrew-classes/blood-hunter/arathaka-thorn-eye.png"); return a.max(-1) < 90
    if name == "Warlock":
        a = rgb("homebrew-classes/warlock/tentacle-eye-emblem.png"); return (a[..., 1] > 150) & (a[..., 0] < 170)
    if name == "Mystic":
        a = rgb("homebrew-classes/mystic/spiral-eye-star.png"); return a.mean(-1) > 175
    if name == "Carlislean Lycanthrope":
        a = rgb("homebrew-classes/lycanthrope/hands-wolf-maw.png"); return (a[..., 0] > 60) & (a[..., 0] > 2 * a[..., 1])
    if name == "Artificer":
        a = rgb("homebrew-classes/artificer/gear-triangle.png"); return a.mean(-1) > 165
    if name == "Sorcerer":
        a = rgb("classes/sorcerer/flame-hand.png"); return ndi.gaussian_filter(a.mean(-1), 1.5) < 150
def clean(m, keep_frac=0.0015):
    lab, n = ndi.label(m)
    sizes = ndi.sum(m, lab, range(1, n + 1))
    big = sizes.max()
    return np.isin(lab, 1 + np.flatnonzero(sizes >= keep_frac * big * 10))
names = sys.argv[1:]
tiles = []
for nm in names:
    m = clean(mask_of(nm)) if nm != "Carlislean Lycanthrope" else mask_of(nm)
    if nm == "Carlislean Lycanthrope":
        lab, n = ndi.label(m); sz = ndi.sum(m, lab, range(1, n + 1)); m = np.isin(lab, 1 + np.flatnonzero(sz >= 40))  # thin wolf linework gets weight so it reads beside the solid hands
        solid_parts = ndi.binary_opening(m, iterations=6)
        lines = m & ~ndi.binary_dilation(solid_parts, iterations=1)
        m = (ndi.binary_dilation(lines, iterations=4) & ~ndi.binary_dilation(solid_parts, iterations=4)) | solid_parts
    a = Image.fromarray(m.astype(np.uint8) * 255)
    im = Image.merge("RGBA", (a, a, a, a))
    solid = np.asarray(badge.fit(im, 0.88).getchannel("A")) > 127
    final = Image.fromarray(solid.astype(np.uint8) * 255)
    img = badge.raster(final, 128)
    tiles.append(img)
    globals().setdefault("OUT", []).append((nm, final, img))
s = Image.new("RGBA", (len(tiles) * 134, 134), (20, 15, 15, 255))
for i, t in enumerate(tiles): s.alpha_composite(t.convert("RGBA").resize((128, 128)), (i * 134 + 3, 3))
s.save("trace-sheet.png")
from pathlib import Path
for nm, final, img in OUT:
    label = f"class {nm}"
    (Path("tools/icon-studio/badges") / f"{forge.icons.slug(label)}.svg").write_text(badge.to_svg(final), encoding="utf-8")
    forge.publish({"label": label, "to": "creator", "layers": [{"trace": nm, "ref": "icon-references (Charl, licensed)"}]}, img)
