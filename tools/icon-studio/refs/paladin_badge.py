import sys, numpy as np
sys.path.insert(0, "tools/icon-studio")
import badge
from PIL import Image
from scipy import ndimage as ndi
S = sys.argv[1]
im = Image.open("/mnt/project-files/icon-references/classes/paladin/bg3-paladin-badge.png").convert("RGBA")
rgb = np.asarray(im.convert("RGB")).astype(float)
hsv = np.asarray(im.convert("HSV")).astype(float) / 255
notwhite = rgb.min(-1) < 232
shield = badge._poly(im.size, [(.27, .38), (.73, .38), (.74, .70), (.5, .97), (.26, .70)])
inner = badge._poly(im.size, [(.31, .43), (.69, .43), (.69, .69), (.5, .91), (.31, .69)])
gold = (hsv[..., 1] > .33) & (hsv[..., 0] > .05) & (hsv[..., 0] < .18)
wings = badge._poly(im.size, [(.01, .44), (.12, .30), (.30, .26), (.45, .30), (.55, .30), (.70, .26), (.88, .30), (.99, .44), (.80, .56), (.62, .62), (.38, .62), (.20, .56)])
low = (hsv[..., 1] < .22) & (hsv[..., 2] < .93)
wi = wings & low & ~shield
lab, n = ndi.label(wi); sz = ndi.sum(wi, lab, range(1, n + 1))
wi = np.isin(lab, 1 + np.flatnonzero(sz > 25))
wingink = ndi.binary_opening(ndi.binary_fill_holes(ndi.binary_closing(wi, iterations=6)), iterations=2)
stripes = wingink & ~ndi.binary_dilation(wi, iterations=1)
stripes = ndi.binary_opening(stripes, iterations=1)
keep = ndi.binary_fill_holes(notwhite & shield) | wingink
gc = ndi.binary_opening(inner & gold & (hsv[..., 2] > .6), iterations=1)
gl, gn = ndi.label(gc); gs = ndi.sum(gc, gl, range(1, gn + 1))
cross = gl == 1 + int(np.argmax(gs))
from PIL import ImageDraw
W, H = im.size
cm = Image.new("L", im.size, 0); cd = ImageDraw.Draw(cm)
cx, cy = .5 * W, .585 * H
def arm(dx, dy, L, w):  # a flared arm ending in a point, like the badge's cross flory
    px, py = -dy, dx
    pts = [(cx + px * w * .45, cy + py * w * .45), (cx + dx * L * .78 + px * w, cy + dy * L * .78 + py * w),
           (cx + dx * L, cy + dy * L), (cx + dx * L * .78 - px * w, cy + dy * L * .78 - py * w),
           (cx - px * w * .45, cy - py * w * .45)]
    cd.polygon(pts, fill=255)
for dx, dy, L in ((0, -1, .15 * H), (0, 1, .22 * H), (1, 0, .14 * W), (-1, 0, .14 * W)):
    arm(dx, dy, L, .045 * W)
cd.ellipse([cx - .035 * W, cy - .035 * W, cx + .035 * W, cy + .035 * W], fill=255)
rim = badge._poly(im.size, [(.315, .435), (.685, .435), (.685, .69), (.5, .915), (.315, .69)])
rim = rim & ~ndi.binary_erosion(rim, iterations=3)
keep &= ~((np.asarray(cm) > 0) | rim)          # the cross (and gold inner details) become holes
lab, n = ndi.label(keep); sz = ndi.sum(keep, lab, range(1, n + 1))
keep = np.isin(lab, 1 + np.flatnonzero(sz > 0.01 * keep.sum()))
keep = ndi.binary_opening(keep, iterations=1)
a = Image.fromarray(keep.astype(np.uint8) * 255)
src = Image.merge("RGBA", (a, a, a, a))
# feather grooves: dark lines inside the wings become cut lines
g = rgb.mean(-1) / 255
dark = ndi.binary_erosion(wingink, iterations=3) & ~ndi.binary_dilation(wi, iterations=1)
out = np.asarray(im).copy(); out[..., 3] = keep * 255
base = badge.fit(Image.fromarray(out), .9)
solid = np.asarray(base.getchannel("A")) > 127
d = Image.fromarray(dark.astype(np.uint8) * 255); d = badge.fit(Image.merge("RGBA", (d, d, d, Image.fromarray(keep.astype(np.uint8)*255))), .9)
cut = (np.asarray(d.convert("L")) > 127) & solid
cut = ndi.binary_opening(cut, iterations=2)
final = Image.fromarray((solid & ~cut).astype(np.uint8) * 255)
final.save(f"{S}/pal_mask.png"); Image.fromarray((wi*255).astype(np.uint8)).save(f"{S}/wi.png")
img = badge.raster(final, 128)
bg = Image.new("RGBA", (256, 256), (20, 15, 15, 255)); bg.alpha_composite(img.convert("RGBA").resize((256, 256))); bg.save(f"{S}/pal2.png")
import forge
from pathlib import Path
Path("tools/icon-studio/badges/class-paladin.svg").write_text(badge.to_svg(final), encoding="utf-8")
forge.publish({"label": "class Paladin", "to": "creator", "layers": [{"trace": "Paladin", "ref": "BG3 Paladin badge", "v": 3}]}, img)
