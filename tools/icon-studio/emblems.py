"""Emblems: procedural flat designs for classes the game has no badge for (and redesigns), drawn as a
512 px mask in badge.py's style: one solid silhouette, thin cut gaps between parts, chipped edges.

A badge recipe uses one with "src": {"draw": NAME} (see DRAW). Each design is Apotheosis' own, made from
Charl's style references (2026-11-04), not traced from them.
"""
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

N = 512
C = N / 2


def canvas():
    m = Image.new("L", (N, N), 0)
    return m, ImageDraw.Draw(m)


def arr(m):
    return np.asarray(m) > 127


def img(a):
    return Image.fromarray(a.astype(np.uint8) * 255)


def polar(r, ang, c=(C, C)):
    return c[0] + r * np.cos(ang), c[1] + r * np.sin(ang)


def stroke(d, pts, w0, w1, fill=255):
    """A tapered stroke along a polyline: width w0 at the start, w1 at the end."""
    p = np.asarray(pts, float)
    t = np.gradient(p, axis=0)
    t /= np.linalg.norm(t, axis=1, keepdims=True) + 1e-9
    nrm = np.stack([-t[:, 1], t[:, 0]], 1)
    w = np.linspace(w0, w1, len(p))[:, None] / 2
    poly = np.vstack([p + nrm * w, (p - nrm * w)[::-1]])
    d.polygon([tuple(q) for q in poly], fill=fill)


def gap(a, part, px=6):
    """Lay `part` over `a` with a clean cut gap of `px` around it."""
    return (a & ~ndi.binary_dilation(part, iterations=px)) | part


def chip(a, n=10, size=10, seed=1):
    """Chipped edges: small triangular bites out of the silhouette's outline."""
    rng = np.random.default_rng(seed)
    edge = np.argwhere(a & ~ndi.binary_erosion(a, iterations=1))
    if not len(edge):
        return a
    m = img(a)
    d = ImageDraw.Draw(m)
    cy, cx = np.argwhere(a).mean(0)
    for y, x in edge[rng.choice(len(edge), n, replace=False)]:
        ang = np.arctan2(y - cy, x - cx) + rng.uniform(-0.5, 0.5)
        s = size * rng.uniform(0.6, 1.2)
        tip = (x - s * 1.4 * np.cos(ang), y - s * 1.4 * np.sin(ang))
        side = ang + np.pi / 2
        d.polygon([tip, (x + s * np.cos(side), y + s * np.sin(side)), (x - s * np.cos(side), y - s * np.sin(side))], fill=0)
    return arr(m)


def lens(d, cx, cy, w, h, fill=255):
    """An almond (eye) shape from two arcs."""
    t = np.linspace(0, np.pi, 40)
    top = [(cx - w / 2 + w * (1 - np.cos(a)) / 2, cy - h / 2 * np.sin(a)) for a in t]
    bot = [(cx + w / 2 - w * (1 - np.cos(a)) / 2, cy + h / 2 * np.sin(a)) for a in t]
    d.polygon(top + bot, fill=fill)


def gear_shape(d, cx, cy, r, teeth=10, depth=0.17, fill=255):
    pts = []
    k = teeth * 4
    for i in range(k):
        ang = 2 * np.pi * (i + 0.5) / k
        rr = r if (i // 2) % 2 == 0 else r * (1 - depth)
        pts.append((cx + rr * np.cos(ang), cy + rr * np.sin(ang)))
    d.polygon(pts, fill=fill)


def disc(d, cx, cy, r, fill=255):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)


def artificer():
    """A downward triangle frame (chipped), a cog breaking through it, a three-joint bolted linkage inside."""
    m, d = canvas()
    tri = [(52, 92), (460, 92), (256, 476)]
    d.polygon(tri, fill=255)
    inner = [(C + (x - C) * 0.72, 250 + (y - 250) * 0.72) for x, y in tri]
    d.polygon(inner, fill=0)
    frame = chip(arr(m), 9, 9, seed=3)
    g, gd = canvas()
    gear_shape(gd, C, 232, 128, teeth=10)
    disc(gd, C, 232, 82, fill=0)
    cog = arr(g)
    a = gap(frame, cog, 9)
    link, ld = canvas()
    j = [(212, 200), (300, 214), (238, 282)]
    for p, q in ((j[0], j[1]), (j[1], j[2])):
        stroke(ld, np.linspace(p, q, 20), 14, 14)
    for x, y in j:
        disc(ld, x, y, 16)
    link = arr(link)
    for x, y in j:  # bolt holes
        link &= np.hypot(*np.mgrid[0:N, 0:N][::-1] - np.array([x, y])[:, None, None]) > 6
    return a | link


def mystic():
    """A horned eye with a spiral iris inside a sharp eight-point star; dash rays and one drip below."""
    m, d = canvas()
    star = lambda R, r: [polar(R if i % 2 == 0 else r, np.pi / 8 * i - np.pi / 2) for i in range(16)]
    d.polygon(star(244, 150), fill=255)
    d.polygon(star(214, 128), fill=0)
    frame = arr(m)
    e, ed = canvas()
    lens(ed, C, C, 270, 112)
    for s in (-1, 1):  # horns curving up and out from the eye's top corners
        t = np.linspace(0, 1, 30)
        pts = np.stack([C + s * (52 + 70 * t + 18 * t ** 2), C - 40 - 90 * t + 40 * t ** 3], 1)
        stroke(ed, pts, 24, 3)
    eye = arr(e)
    i, idr = canvas()
    disc(idr, C, C, 46)
    th = np.linspace(0, 3.2 * np.pi, 160)
    sp = np.stack([C + (4 + 12.5 * th / np.pi) * np.cos(th), C + (4 + 12.5 * th / np.pi) * np.sin(th)], 1)
    stroke(idr, sp, 5, 9, fill=0)
    iris = arr(i)
    eye = (eye & ~ndi.binary_dilation(iris, iterations=7)) | iris
    r, rd = canvas()
    for ang in (-90, -60, -120, -35, -145, 35, 145):
        a0 = np.radians(ang)
        stroke(rd, [polar(96, a0), polar(126, a0)], 10, 6)
    t = np.linspace(0, 1, 20)
    stroke(rd, np.stack([np.full(20, C), C + 60 + 64 * t], 1), 12, 4)
    disc(rd, C, C + 132, 11)
    return gap(frame, eye, 8) | arr(r)


def tentacle(d, start, out, down, curl, w0=40, steps=70):
    """A tentacle leaving `start`, sweeping `out`/`down` and curling inward at the tip."""
    t = np.linspace(0, 1, steps)
    sx, sy = start
    base = np.stack([sx + out * t, sy + down * (t ** 1.4)], 1)
    ang = curl * np.clip((t - 0.45) / 0.55, 0, 1) ** 1.3 * 3.6
    r = 60 * np.clip((t - 0.45) / 0.55, 0, 1)
    tip = np.stack([np.sign(out) * r * np.sin(ang), -np.sign(down) * r * (1 - np.cos(ang))], 1)
    stroke(d, base + tip, w0, 5)


def warlock():
    """One open eye in a pointed lens; tentacles curling out to the sides and down; chipped, cut apart."""
    t, td = canvas()
    for s in (-1, 1):
        tentacle(td, (C + s * 70, C - 40), s * 120, -130, 1, w0=58)
        tentacle(td, (C + s * 90, C + 30), s * 115, 120, 1, w0=58)
    tent = chip(arr(t), 16, 8, seed=7)
    m, d = canvas()
    d.polygon([(110, C), (180, C - 74), (C, C - 96), (332, C - 74), (402, C), (332, C + 74), (C, C + 96), (180, C + 74)], fill=255)
    lens(d, C, C, 200, 92, fill=0)
    disc(d, C, C, 30)
    d.polygon([(140, C), (190, C - 56), (322, C - 56), (372, C), (322, C + 56), (190, C + 56)], outline=0, width=6)
    body = arr(m)
    return gap(tent, body, 7)


def blood_hunter():
    """Thorned spikes radiating from a centre, torn edges, an open eye at the heart."""
    m, d = canvas()
    for i in range(12):
        a0 = 2 * np.pi * i / 12 - np.pi / 2
        R = 238 if i % 2 == 0 else 178
        t = np.linspace(0, 1, 40)
        ang = a0 + 0.28 * t ** 1.5  # a slight swirl
        pts = np.stack([C + (70 + (R - 70) * t) * np.cos(ang), C + (70 + (R - 70) * t) * np.sin(ang)], 1)
        stroke(d, pts, 46 if i % 2 == 0 else 38, 2)
        for f, side in ((0.45, 1), (0.7, -1)) if i % 2 == 0 else ((0.55, 1),):  # thorns on the spike
            k = int(f * 39)
            p, q = pts[k], pts[k + 1]
            tv = (q - p) / (np.linalg.norm(q - p) + 1e-9)
            nv = np.array([-tv[1], tv[0]]) * side
            w = (46 if i % 2 == 0 else 38) * (1 - f) / 2
            base = p + nv * w * 0.8
            d.polygon([tuple(base - tv * 9), tuple(base + tv * 9), tuple(base + nv * 26 + tv * 18)], fill=255)
    disc(d, C, C, 92)
    spikes = chip(arr(m), 22, 7, seed=11)
    e, ed = canvas()
    lens(ed, C, C, 132, 58)
    eye = arr(e)
    p, pd = canvas()
    pd.ellipse([C - 9, C - 25, C + 9, C + 25], fill=255)
    return (spikes & ~eye) | arr(p)


def hand(d, cx, cy, s, flames=False, spread=1.0):
    """An upright open hand (palm centre cx, cy; scale s). With `flames` the fingers waver into flame tongues."""
    d.rounded_rectangle([cx - 62 * s, cy - 50 * s, cx + 62 * s, cy + 70 * s], radius=34 * s, fill=255)
    d.polygon([(cx - 44 * s, cy + 60 * s), (cx + 44 * s, cy + 60 * s), (cx + 38 * s, cy + 170 * s), (cx - 38 * s, cy + 170 * s)], fill=255)
    rng = np.random.default_rng(5)
    for k, (dx, ln) in enumerate(((-44, 120), (-15, 150), (15, 156), (44, 128))):
        t = np.linspace(0, 1, 50)
        lean = (dx / 44) * 18 * spread
        if flames:
            ln = ln * 1.3
            wav = np.sin(t * np.pi * 2.4 + k * 1.3) * 26 * t
        else:
            wav = 0 * t
        pts = np.stack([cx + dx * s + (lean * t + wav) * s, cy - 30 * s - ln * s * t], 1)
        stroke(d, pts, (40 if flames else 30) * s, (2 if flames else 22) * s)
        if not flames:
            disc(d, pts[-1][0], pts[-1][1], 11 * s)
    t = np.linspace(0, 1, 30)
    thumb = np.stack([cx - 58 * s - 52 * s * t, cy + 30 * s - 70 * s * t], 1)
    stroke(d, thumb, 34 * s, 22 * s)
    disc(d, thumb[-1][0], thumb[-1][1], 11 * s)


def sorcerer():
    """A hand whose fingers turn into flames: magic from the blood, not the book."""
    m, d = canvas()
    hand(d, C + 8, 300, 1.05, flames=True, spread=1.6)
    a = arr(m)
    c, cd = canvas()  # knuckle cuts where the fingers leave the palm, and the wrist line
    for dx in (-30, 0, 30):
        stroke(cd, [(C + 8 + dx * 1.05, 268), (C + 8 + dx * 1.05, 228)], 6, 3)
    stroke(cd, [(C - 40, 372), (C + 56, 372)], 6, 6)
    return a & ~arr(c)


def lycanthrope():
    """A snarling wolf head, maw forced open, a human hand bursting out of it: man becoming beast."""
    m, d = canvas()
    half = [(256, 150), (318, 146), (404, 34), (424, 178), (470, 246), (428, 262), (452, 318), (392, 336), (366, 440),
            (300, 486), (256, 496)]
    d.polygon(half + [(512 - x, y) for x, y in half[::-1]], fill=255)
    head = chip(arr(m), 14, 9, seed=21)
    c, cd = canvas()
    for s in (-1, 1):  # slanted eyes
        cd.polygon([(C + s * 52, 222), (C + s * 122, 196), (C + s * 108, 238)], fill=255)
    cd.ellipse([C - 82, 300, C + 82, 470], fill=255)  # the open maw
    cut = arr(c)
    f, fd = canvas()
    for x in (-50, 50):  # upper and lower fangs
        fd.polygon([(C + x - 18, 296), (C + x + 18, 296), (C + x * 1.05, 380)], fill=255)
        fd.polygon([(C + x * 0.9 - 15, 474), (C + x * 0.9 + 15, 474), (C + x * 0.9, 414)], fill=255)
    a = (head & ~cut) | (arr(f) & ndi.binary_dilation(head, iterations=2))
    h, hd = canvas()
    hand(hd, C, 452, 0.5, spread=2.0)
    hand_m = arr(h) & ~arr(_box(0, 470, N, N))
    return gap(a, hand_m, 6)


def _box(x0, y0, x1, y1):
    m, d = canvas()
    d.rectangle([x0, y0, x1, y1], fill=255)
    return m


DRAW = {"artificer": artificer, "mystic": mystic, "warlock": warlock, "blood hunter": blood_hunter,
        "sorcerer": sorcerer, "lycanthrope": lycanthrope}


def draw(name):
    return DRAW[name]()
