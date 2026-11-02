"""Faint engraved background art for the character creator's tabs (Charl, 2026-11-02).

Like the Vladimir UI / Dawnwalker menus: a large, worn line engraving sits behind the options, barely
there. Each tab gets its own: Species a double helix of bone, Class an astrolabe of arms, Background a
compass over a map, Abilities a six-point Vitruvian sigil, Feats a laurel crown, Belief the sun-and-moon
halo. Fine geometric line work is drawn here; the centrepieces are the BG3 line art (via forge.py).

  python tools/icon-studio/tab_art.py            writes docs/hub/create/art/<tab>.webp
  python tools/icon-studio/tab_art.py --preview  also writes a contact sheet to tab-art-preview.png
"""
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import forge  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "hub" / "create" / "art"
W, H = 1600, 1000
SS = 2  # supersampling
INK = (222, 208, 186)


class Plate:
    def __init__(self):
        self.im = Image.new("L", (W * SS, H * SS), 0)
        self.d = ImageDraw.Draw(self.im)

    def line(self, pts, w=2, a=255):
        self.d.line([(x * SS, y * SS) for x, y in pts], fill=a, width=max(1, round(w * SS)), joint="curve")

    def circle(self, cx, cy, r, w=2, a=255, dash=0):
        if not dash:
            self.d.ellipse([(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS], outline=a, width=max(1, round(w * SS)))
            return
        n = max(8, int(2 * math.pi * r / dash))
        for i in range(0, n, 2):
            t0, t1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            self.arc(cx, cy, r, t0, t1, w, a)

    def arc(self, cx, cy, r, t0, t1, w=2, a=255, steps=24):
        self.line([(cx + r * math.cos(t0 + (t1 - t0) * k / steps), cy + r * math.sin(t0 + (t1 - t0) * k / steps)) for k in range(steps + 1)], w, a)

    def ray(self, cx, cy, r0, r1, t, w=1.5, a=255):
        self.line([(cx + r0 * math.cos(t), cy + r0 * math.sin(t)), (cx + r1 * math.cos(t), cy + r1 * math.sin(t))], w, a)

    def star(self, x, y, r, a=255):
        self.line([(x - r, y), (x + r, y)], 1.2, a)
        self.line([(x, y - r * 1.6), (x, y + r * 1.6)], 1.2, a)

    def leaf(self, x, y, t, s, a=255):
        # a pointed leaf along angle t, outlined, with a midrib
        ux, uy, vx, vy = math.cos(t), math.sin(t), -math.sin(t), math.cos(t)
        pts = []
        for k in range(13):
            u = k / 12
            wv = math.sin(math.pi * u) * s * 0.32
            pts.append((x + ux * u * s + vx * wv, y + uy * u * s + vy * wv))
        for k in range(12, -1, -1):
            u = k / 12
            wv = math.sin(math.pi * u) * s * 0.32
            pts.append((x + ux * u * s - vx * wv, y + uy * u * s - vy * wv))
        self.line(pts, 1.6, a)
        self.line([(x, y), (x + ux * s * 0.9, y + uy * s * 0.9)], 1, a)

    def glyph(self, icon, strokes, cx, cy, size, a=255, rot=0):
        spec = {"icon": icon, "x": 0.5, "y": 0.5, "size": 1.0, "rot": rot}
        if strokes:
            spec["strokes"] = strokes
        art = forge.layer(spec).getchannel("A")
        art = art.resize((round(size * SS), round(size * SS)), Image.LANCZOS)
        art = art.point(lambda v: v * a // 255)
        self.im.paste(255, (round((cx - size / 2) * SS), round((cy - size / 2) * SS)), art)

    def hatch(self, poly_fn, n, w=1, a=160):
        for i in range(n):
            self.line(poly_fn(i / max(1, n - 1)), w, a)

    def finish(self):
        m = self.im.resize((W, H), Image.LANCZOS)
        # Wear: break the lines with grain and fade them toward the edges, like an old engraving.
        rng = np.random.default_rng(7)
        a = np.asarray(m).astype(np.float32) / 255
        grain = Image.fromarray((rng.random((H // 3, W // 3)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.2))
        g = np.asarray(grain).astype(np.float32) / 255
        a *= np.clip(0.45 + g * 0.9, 0, 1)
        yy, xx = np.mgrid[0:H, 0:W]
        vign = np.clip(1.25 - np.hypot((xx - W / 2) / (W * 0.55), (yy - H / 2) / (H * 0.6)), 0, 1)
        a *= vign
        glow = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
        alpha = np.clip(a + glow * 0.35, 0, 1)
        rgb = np.zeros((H, W, 3), np.uint8)
        rgb[..., :] = INK
        return Image.fromarray(np.dstack([rgb, (alpha * 255).astype(np.uint8)]), "RGBA")


def species():
    p = Plate()
    # A double helix laid across the page, its rungs small bones.
    x0, x1, cy, amp, turns = 160, 1440, 500, 150, 2.6
    for strand in (0, math.pi):
        for off in (-5, 5):
            p.line([(x, cy + off + amp * math.sin((x - x0) / (x1 - x0) * turns * 2 * math.pi + strand) * (0.55 + 0.45 * math.sin(math.pi * (x - x0) / (x1 - x0)))) for x in range(x0, x1 + 1, 4)], 2)
    for k in range(34):
        x = x0 + (x1 - x0) * (k + 0.5) / 34
        env = 0.55 + 0.45 * math.sin(math.pi * (x - x0) / (x1 - x0))
        t = (x - x0) / (x1 - x0) * turns * 2 * math.pi
        y1, y2 = cy + amp * env * math.sin(t), cy + amp * env * math.sin(t + math.pi)
        if abs(y1 - y2) < 20:
            continue
        top, bot = min(y1, y2) + 8, max(y1, y2) - 8
        p.line([(x - 2, top + 6), (x - 2, bot - 6)], 1.4, 220)
        p.line([(x + 2, top + 6), (x + 2, bot - 6)], 1.4, 220)
        for yy in (top, bot):  # bone knuckles
            p.circle(x - 4, yy, 4, 1.3, 220)
            p.circle(x + 4, yy, 4, 1.3, 220)
    for _ in range(26):
        p.star(random.uniform(120, 1480), random.uniform(120, 880), random.uniform(3, 7), 170)
    return p.finish()


def klass():
    p = Plate()
    cx, cy = 800, 500
    for r, w, dash in ((400, 2, 0), (380, 1, 0), (330, 1.5, 6), (230, 2, 0), (210, 1, 0)):
        p.circle(cx, cy, r, w, 230, dash)
    for k in range(72):
        t = 2 * math.pi * k / 72
        p.ray(cx, cy, 380, 400 if k % 6 else 420, t, 1.3, 220)
    for k in range(12):  # twelve spokes for twelve callings
        t = 2 * math.pi * k / 12 - math.pi / 2
        p.ray(cx, cy, 230, 330, t, 1.2, 200)
        p.circle(cx + 355 * math.cos(t), cy + 355 * math.sin(t), 11, 1.5, 230)
    sword(p, cx, cy, 190, -math.pi / 4)
    staff(p, cx, cy, 190, math.pi / 4)
    return p.finish()


def background():
    p = Plate()
    rng = random.Random(3)
    # Map contours: wavy rings around a few hills.
    for hx, hy in ((360, 300), (1180, 650), (1250, 260), (420, 760)):
        for k in range(1, 7):
            r = 34 * k
            ph = rng.uniform(0, 6)
            p.line([(hx + (r + 9 * math.sin(3 * t + ph) + 5 * math.sin(7 * t)) * math.cos(t), hy + (r * 0.8 + 7 * math.sin(4 * t + ph)) * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 120)], 1.1, 150)
    # A dashed road between them.
    road = [(200 + 1200 * u, 520 + 160 * math.sin(u * 5.2) + 40 * math.sin(u * 13)) for u in np.linspace(0, 1, 160)]
    for i in range(0, len(road) - 4, 6):
        p.line(road[i:i + 4], 1.6, 190)
    # Compass rose.
    cx, cy = 800, 500
    p.circle(cx, cy, 250, 2, 230)
    p.circle(cx, cy, 236, 1, 200)
    p.circle(cx, cy, 120, 1.2, 200, 6)
    for k in range(32):
        p.ray(cx, cy, 236, 250 if k % 4 else 270, 2 * math.pi * k / 32, 1.2, 200)
    for k in range(8):
        t = math.pi / 4 * k - math.pi / 2
        L = 230 if k % 2 == 0 else 150
        s = 26 if k % 2 == 0 else 18
        tip = (cx + L * math.cos(t), cy + L * math.sin(t))
        l = (cx + s * math.cos(t - math.pi / 2), cy + s * math.sin(t - math.pi / 2))
        r = (cx + s * math.cos(t + math.pi / 2), cy + s * math.sin(t + math.pi / 2))
        p.line([l, tip, r], 2, 235)
        p.line([(cx, cy), tip], 1, 180)
    p.star(cx, cy - 300, 10, 230)
    return p.finish()


def abilities():
    p = Plate()
    cx, cy = 800, 500
    p.circle(cx, cy, 360, 2, 230)
    p.circle(cx, cy, 344, 1, 190)
    p.line([(cx - 300, cy - 300), (cx + 300, cy - 300), (cx + 300, cy + 300), (cx - 300, cy + 300), (cx - 300, cy - 300)], 1.6, 200)
    nodes = [(cx + 300 * math.cos(-math.pi / 2 + k * math.pi / 3), cy + 300 * math.sin(-math.pi / 2 + k * math.pi / 3)) for k in range(6)]
    for i in range(6):  # hexagram through the six abilities
        p.line([nodes[i], nodes[(i + 2) % 6]], 1.3, 190)
        p.line([nodes[i], nodes[(i + 1) % 6]], 1, 140)
    for x, y in nodes:
        p.circle(x, y, 34, 2, 230)
        p.circle(x, y, 26, 1, 180, 4)
    p.circle(cx, cy, 120, 1.6, 220)
    p.circle(cx, cy, 104, 1, 170, 5)
    for r in (80, 56, 32):  # nested hexagons, one ring per pair of abilities
        p.line([(cx + r * math.cos(math.pi / 6 + k * math.pi / 3), cy + r * math.sin(math.pi / 6 + k * math.pi / 3)) for k in range(7)], 1.6, 220)
    p.circle(cx, cy, 6, 3, 235)
    for k in range(120):
        p.ray(cx, cy, 344, 352 if k % 5 else 362, 2 * math.pi * k / 120, 1, 200)
    return p.finish()


def feats():
    p = Plate()
    cx, cy, R = 800, 520, 330
    for side in (-1, 1):  # laurel: leaves along two arcs that meet at the top
        for k in range(16):
            u = k / 15
            t = math.pi / 2 + side * (0.25 + u * 2.45)
            x, y = cx + R * math.cos(t), cy + R * math.sin(t)
            tang = t + side * math.pi / 2
            p.leaf(x, y, tang - side * 0.6, 62 - 18 * u, 220)
            p.leaf(x, y, tang + side * 0.5, 54 - 16 * u, 200)
        p.arc(cx, cy, R, math.pi / 2 + side * 0.2, math.pi / 2 + side * 2.75, 2, 220)
    p.line([(cx - 40, cy + R + 10), (cx, cy + R - 10), (cx + 40, cy + R + 10)], 2, 220)  # the tie
    for k in range(40):
        t = -math.pi / 2 + (k - 20) * 0.045
        p.ray(cx, cy - 40, 200, 255 + (k % 2) * 20, t, 1, 170)
    rose(p, cx, cy, 150, 8)
    p.circle(cx, cy, 170, 1.2, 190, 6)
    return p.finish()


def belief():
    p = Plate()
    cx, cy = 800, 540
    p.circle(cx, cy, 400, 2, 220)
    for k in range(180):  # long thin rays like the meditation screen
        t = 2 * math.pi * k / 180
        if 1.2 < (t % (2 * math.pi)) < 1.95:
            continue  # leave the bottom open for the seated figure's space
        p.ray(cx, cy, 120 + (k % 3) * 30, 300 + (k % 4) * 30, t, 0.9, 150 + (k % 2) * 50)
    p.glyph("Spell_Evocation_Moonbeam", [7], cx, cy - 400, 130, 230, rot=-30)
    p.circle(cx, cy - 250, 34, 2, 230)
    for k in range(24):
        p.ray(cx, cy - 250, 44, 62 if k % 2 else 78, 2 * math.pi * k / 24, 1.4, 220)
    for x, y in ((cx - 140, cy - 330), (cx + 150, cy - 320), (cx - 230, cy - 200), (cx + 240, cy - 190)):
        p.star(x, y, 9, 220)
    p.circle(cx, cy, 110, 1.4, 200)
    p.circle(cx, cy, 96, 1, 160, 5)
    eye(p, cx, cy, 70)
    return p.finish()


def sword(p, cx, cy, L, t):
    ux, uy, vx, vy = math.cos(t), math.sin(t), -math.sin(t), math.cos(t)
    at = lambda a, b: (cx + ux * a + vx * b, cy + uy * a + vy * b)
    p.line([at(-L * 0.55, -10), at(L * 0.85, -10), at(L, 0), at(L * 0.85, 10), at(-L * 0.55, 10)], 2, 235)  # blade
    p.line([at(-L * 0.5, 0), at(L * 0.9, 0)], 1, 180)  # fuller
    p.line([at(-L * 0.55, -48), at(-L * 0.55, 48)], 2.4, 235)  # guard
    p.line([at(-L * 0.6, -6), at(-L * 0.9, -6), at(-L * 0.9, 6), at(-L * 0.6, 6)], 1.6, 220)  # grip
    p.circle(*at(-L * 0.97, 0), 12, 2, 235)  # pommel


def staff(p, cx, cy, L, t):
    ux, uy, vx, vy = math.cos(t), math.sin(t), -math.sin(t), math.cos(t)
    at = lambda a, b: (cx + ux * a + vx * b, cy + uy * a + vy * b)
    p.line([at(-L, -5), at(L * 0.75, -5)], 1.8, 220)
    p.line([at(-L, 5), at(L * 0.75, 5)], 1.8, 220)
    for k in range(6):
        a = -L * 0.8 + k * 30
        p.line([at(a, -5), at(a + 10, 5)], 1, 170)
    p.circle(*at(L * 0.92, 0), 26, 2, 235)
    p.circle(*at(L * 0.92, 0), 12, 1.4, 220)
    for k in range(8):
        p.ray(*at(L * 0.92, 0), 30, 44, 2 * math.pi * k / 8, 1.2, 200)


def eye(p, cx, cy, r):
    up = [(cx + r * math.cos(t), cy - r * 0.5 * math.sin(t)) for t in np.linspace(0, math.pi, 40)]
    dn = [(cx + r * math.cos(t), cy + r * 0.5 * math.sin(t)) for t in np.linspace(0, math.pi, 40)]
    p.line(up, 2, 235)
    p.line(dn, 2, 235)
    p.circle(cx, cy, r * 0.32, 2, 235)
    p.circle(cx, cy, r * 0.12, 3, 235)
    for k in range(9):
        t = math.pi + (k + 1) * math.pi / 10
        p.ray(cx, cy, r * 0.62, r * 0.85, t, 1, 180)


def rose(p, cx, cy, r, n):
    for k in range(n):
        t = 2 * math.pi * k / n - math.pi / 2
        for s, a in ((1, 235), (0.55, 190)):
            tip = (cx + r * s * math.cos(t), cy + r * s * math.sin(t))
            w = r * 0.16 * s
            l = (cx + w * math.cos(t - 0.9), cy + w * math.sin(t - 0.9))
            rr = (cx + w * math.cos(t + 0.9), cy + w * math.sin(t + 0.9))
            p.line([l, tip, rr], 1.6, a)
    p.circle(cx, cy, r * 0.14, 1.6, 220)


TABS = {"species": species, "class": klass, "background": background, "abilities": abilities, "feats": feats, "belief": belief}


def main():
    random.seed(11)
    OUT.mkdir(parents=True, exist_ok=True)
    imgs = {}
    for name, fn in TABS.items():
        im = fn()
        im.save(OUT / f"{name}.webp", "WEBP", quality=82)
        imgs[name] = im
        print(f"art/{name}.webp")
    if "--preview" in sys.argv:
        sheet = Image.new("RGB", (W, H * 2 // 2), (12, 10, 8))
        sheet = Image.new("RGB", (3 * 540, 2 * 340), (12, 10, 8))
        for i, im in enumerate(imgs.values()):
            t = im.resize((530, 331))
            bg = Image.new("RGB", t.size, (12, 10, 8))
            bg.paste(t, (0, 0), t)
            sheet.paste(bg, ((i % 3) * 540, (i // 3) * 340))
        sheet.save("tab-art-preview.png")
        print("tab-art-preview.png")


if __name__ == "__main__":
    main()
