"""Thematic subclass frames (Charl, 2026-11-03): the class symbol sits inside, and the frame tells the
subclass apart (flame for Wildfire, eclipse for Shadow, laurel for Glory...). Light, intentional line work:
one main ring or outline, an optional fine inner line, and the theme's own motif. Drawn white on clear at
4x, then scaled to 512. forge.py uses these through a {"theme": NAME} layer."""
import math

from PIL import Image, ImageDraw

N, K = 512, 4
W = N * K
C = W / 2


def _pt(r, a, cx=C, cy=C):
    return (cx + r * math.sin(a), cy - r * math.cos(a))


def draw(name, line=7):
    im = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(im)
    lw = line * K
    R = W / 2 * .9  # outer reach of motifs
    ring_r = R * .84

    def ring(r=ring_r, w=lw, a0=0, a1=360):
        if a1 - a0 >= 360:
            d.ellipse([C - r, C - r, C + r, C + r], outline=255, width=round(w))
        else:
            d.arc([C - r, C - r, C + r, C + r], a0, a1, fill=255, width=round(w))

    def poly(pts, w=lw, closed=True):
        d.line(pts + ([pts[0], pts[1]] if closed else []), fill=255, width=round(w), joint="curve")

    def fill(pts):
        d.polygon(pts, fill=255)

    def leaf(x, y, a, L, Wd):  # a leaf pointing along angle a
        pts = []
        for i in range(21):
            t = i / 20
            off = math.sin(t * math.pi) * Wd
            px, py = x + L * t * math.sin(a), y - L * t * math.cos(a)
            pts.append((px + off * math.cos(a), py + off * math.sin(a)))
        for i in range(20, -1, -1):
            t = i / 20
            off = math.sin(t * math.pi) * Wd
            px, py = x + L * t * math.sin(a), y - L * t * math.cos(a)
            pts.append((px - off * math.cos(a), py - off * math.sin(a)))
        fill(pts)

    def inner():
        ring(ring_r * .9, lw * .35)

    n = name
    if n == "flame":
        ring(); inner()
        for i in range(12):
            a = 2 * math.pi * i / 12
            b = [_pt(ring_r, a - .13), _pt(R * (1.0 if i % 2 == 0 else .94), a + .05), _pt(ring_r, a + .13)]
            poly(b, lw * .8, False)
    elif n == "storm":  # lightning forks off the rim
        ring(); inner()
        for i in range(4):
            a = 2 * math.pi * i / 4 + math.pi / 4
            poly([_pt(ring_r, a), _pt(R * .93, a + .16), _pt(R * .9, a - .02), _pt(R * 1.02, a + .14)], lw * .8, False)
    elif n == "shadow":  # eclipse
        ring()
        d.ellipse([C - ring_r * .9 + R * .1, C - ring_r * .9 - R * .06, C + ring_r * .9 + R * .1, C + ring_r * .9 - R * .06], outline=255, width=round(lw * .35))
        ring(R * .97, lw * .6, 200, 340)
    elif n == "radiant":
        ring(); inner()
        for i in range(16):
            a = 2 * math.pi * i / 16
            poly([_pt(ring_r * 1.06, a), _pt(R * (1 if i % 2 == 0 else .95), a)], lw * (.7 if i % 2 == 0 else .45), False)
    elif n == "wreath":  # nature: full ring of leaves
        ring(ring_r * .95, lw * .6)
        for i in range(18):
            a = 2 * math.pi * i / 18
            x, y = _pt(ring_r * .95, a)
            leaf(x, y, a + math.pi / 2 + .5, R * .17, R * .045)
    elif n == "laurel":  # two branches open at the top
        for side in (-1, 1):
            pts = [_pt(ring_r, side * math.radians(t)) for t in range(25, 181, 5)]
            poly(pts, lw * .7, False)
            for t in range(35, 176, 18):
                a = side * math.radians(t)
                x, y = _pt(ring_r, a)
                leaf(x, y, a - side * .9 + (math.pi if side < 0 else 0) * 0, R * .15, R * .04)
                leaf(x, y, a + side * 2.2, R * .13, R * .035)
    elif n == "beast":  # claw marks across the rim
        ring()
        for k in (-1, 0, 1):
            a = math.radians(35) + k * .16
            poly([_pt(R * .99, a - .25), _pt(R * .9, a), _pt(R * .76, a + .3)], lw * (1 if k == 0 else .8), False)
        inner()
    elif n == "barbs":  # thorns
        ring(); inner()
        for i in range(10):
            a = 2 * math.pi * i / 10
            fill([_pt(ring_r - lw / 2, a - .07), _pt(R, a + .06), _pt(ring_r - lw / 2, a + .1)])
    elif n == "giant":  # mountain
        pts = [(C, C - R), (C + R * .98, C + R * .7), (C - R * .98, C + R * .7)]
        poly(pts)
        poly([(C - R * .5, C - R * .1), (C - R * .3, C + R * .02), (C - R * .1, C - R * .14), (C + R * .1, C), (C + R * .3, C - R * .14), (C + R * .5, C - R * .02)], lw * .35, False) if False else None
        poly([(C, C - R * .78), (C + R * .78, C + R * .58), (C - R * .78, C + R * .58)], lw * .35)
    elif n == "wings":
        ring(); inner()
        for side in (-1, 1):
            for j in range(5):
                a = side * math.radians(65 + j * 18)
                L = R * (.32 - j * .04)
                x, y = _pt(ring_r, a)
                ang = a + side * math.radians(-30 + j * 8)
                poly([(x, y), (x + L * math.sin(ang), y - L * math.cos(ang))], lw * .7, False)
    elif n == "stars":
        ring(); inner()
        for i in range(4):
            a = 2 * math.pi * i / 4 + math.pi / 4
            x, y = _pt(ring_r, a); s = R * .1
            fill([(x, y - s), (x + s * .25, y - s * .25), (x + s, y), (x + s * .25, y + s * .25), (x, y + s), (x - s * .25, y + s * .25), (x - s, y), (x - s * .25, y - s * .25)])
    elif n == "sea":  # wave ring
        pts = [_pt(ring_r + R * .06 * math.sin(10 * 2 * math.pi * i / 360), 2 * math.pi * i / 360) for i in range(360)]
        poly(pts); inner()
    elif n == "song":  # lyre horns
        ring(ring_r, lw, 200, 340); ring(ring_r, lw, 20, 160)
        for side in (-1, 1):
            poly([_pt(ring_r, side * math.radians(70 + t)) if False else (C + side * (ring_r + R * .12 * math.sin(math.radians(t))), C - ring_r * math.cos(math.radians(t))) for t in range(0, 181, 6)], lw * .6, False)
    elif n == "fey":  # quatrefoil
        pts = [_pt(R * (.74 + .26 * abs(math.cos(2 * t))) * .98, t) for t in [2 * math.pi * i / 360 for i in range(360)]]
        poly(pts); ring(ring_r * .8, lw * .35)
    elif n == "knowledge":  # octagon with rune ticks
        pts = [_pt(R * .95, math.pi / 8 + 2 * math.pi * i / 8) for i in range(8)]
        poly(pts)
        for i in range(8):
            a = 2 * math.pi * i / 8
            poly([_pt(R * .74, a), _pt(R * .82, a)], lw * .5, False)
    elif n == "ripples":
        ring(ring_r, lw * .8); ring(ring_r * 1.1, lw * .45); ring(ring_r * 1.19, lw * .25)
    elif n == "war":  # crossed blades behind a ring
        for side in (-1, 1):
            a = side * math.radians(45)
            poly([_pt(R, a), _pt(R, a + math.pi)], lw * .55, False)
            x, y = _pt(R * .78, a + math.pi); gx, gy = R * .1 * math.cos(a), R * .1 * math.sin(a)
            poly([(x - gx, y - gy), (x + gx, y + gy)], lw * .8, False)
        d.ellipse([C - ring_r * .82, C - ring_r * .82, C + ring_r * .82, C + ring_r * .82], fill=0)
        ring(ring_r * .82)
    elif n == "dashed":  # illusion, whispers: a broken ring
        for i in range(12):
            ring(ring_r, lw, i * 30 + 4, i * 30 + 22)
        ring(ring_r * .88, lw * .35)
    elif n == "arcane":  # heptagram
        pts = [_pt(R, 2 * math.pi * i / 7) for i in range(7)]
        poly([pts[(i * 3) % 7] for i in range(7)], lw * .5)
        d.ellipse([C - R * .62, C - R * .62, C + R * .62, C + R * .62], fill=0)
        ring(R * .62 + lw, lw * .7)
    elif n == "cog":
        pts = []
        for i in range(12):
            for k, rr in ((0, ring_r * .92), (.18, ring_r * .92), (.3, R), (.7, R), (.82, ring_r * .92)):
                pts.append(_pt(rr, 2 * math.pi * (i + k) / 12))
        poly(pts); inner()
    elif n == "arch":  # gothic window
        w = R * .66; ys = C - R + 1.732 * w
        d.arc([C + w - 2 * w, ys - 2 * w, C + w + 2 * w, ys + 2 * w], 180, 240, fill=255, width=lw)
        d.arc([C - w - 2 * w, ys - 2 * w, C - w + 2 * w, ys + 2 * w], 300, 360, fill=255, width=lw)
        poly([(C - w, ys), (C - w, C + R), (C + w, C + R), (C + w, ys)], lw, False)
    elif n == "order":  # square around a circle
        s = R * .82
        poly([(C - s, C - s), (C + s, C - s), (C + s, C + s), (C - s, C + s)])
        ring(s * .98, lw * .35)
    elif n == "halo":
        ring(); d.ellipse([C - R * .5, C - R * 1.0, C + R * .5, C - R * .78], outline=255, width=round(lw * .6))
    elif n == "twilight":  # a sun ring set on a horizon, rays above
        ring(); inner()
        hy = C + ring_r * .62
        poly([(C - R, hy), (C + R, hy)], lw * .7, False)
        for i in range(-4, 5):
            a = math.radians(i * 20)
            poly([_pt(ring_r * 1.07, a), _pt(R * (1 if i % 2 == 0 else .95), a)], lw * .5, False)
    elif n == "moon":
        ring(ring_r, lw, 120, 420)
        d.arc([C - ring_r * .78 + R * .2, C - ring_r * .78 - R * .1, C + ring_r * .78 + R * .2, C + ring_r * .78 - R * .1], 150, 390, fill=255, width=round(lw * .4)) if False else ring(ring_r * .9, lw * .35, 135, 405)
        x, y = _pt(ring_r, math.radians(30)); s = R * .08
        fill([(x, y - s), (x + s * .3, y), (x, y + s), (x - s * .3, y)])
    elif n == "crown":
        ring(); inner()
        for i in (-2, -1, 0, 1, 2):
            a = math.radians(i * 22)
            fill([_pt(ring_r, a - .09), _pt(R * (1.02 if i == 0 else .97), a), _pt(ring_r, a + .09)])
    elif n == "tentacle":  # arms curling up from below
        ring(); inner()
        for side in (-1, 1):
            for j, a0 in enumerate((150, 120)):
                pts = []
                for t in range(0, 41):
                    tt = t / 40
                    ang = side * math.radians(a0 - 50 * tt)
                    rr = ring_r + (R - ring_r) * math.sin(tt * math.pi) * (1.2 - j * .3)
                    pts.append(_pt(rr, ang))
                poly(pts, lw * (.75 - j * .2), False)
                x, y = pts[-1]; q = R * .03
                d.ellipse([x - q, y - q, x + q, y + q], fill=255)
    elif n == "horns":
        ring(); inner()
        for side in (-1, 1):
            pts = [(C + side * (ring_r * .55 + R * .45 * t ** 1.4), C - ring_r * .8 - R * .25 * math.sin(t * math.pi * .9)) for t in [i / 20 for i in range(21)]]
            poly(pts, lw * .9, False)
    elif n == "eye":  # vesica
        dy = R * .55; Rr = math.hypot(dy, R)
        t = math.degrees(math.atan2(R, dy))
        d.arc([C - Rr, C + dy - Rr, C + Rr, C + dy + Rr], 270 - t, 270 + t, fill=255, width=lw)
        d.arc([C - Rr, C - dy - Rr, C + Rr, C - dy + Rr], 90 - t, 90 + t, fill=255, width=lw)
    elif n == "drops":
        ring(); inner()
        for i in (-1, 0, 1):
            a = math.pi + i * .4
            x, y = _pt(ring_r, a); s = R * (.09 if i == 0 else .07)
            fill([(x, y)] + [(x + s * math.cos(math.radians(q)), y + s * 1.2 + s * math.sin(math.radians(q))) for q in range(-30, 211, 10)])
    elif n == "shield":
        s = R * .9
        pts = [(C - s * .85, C - s * .9), (C + s * .85, C - s * .9)]
        pts += [(C + s * .85 * math.cos(i / 20 * math.pi / 2), C - s * .2 + s * 1.2 * math.sin(i / 20 * math.pi / 2)) for i in range(1, 20)]
        pts.append((C, C + s)); pts += [(2 * C - x, y) for x, y in reversed(pts[2:-1])]
        poly(pts)
    elif n == "spiral":
        pts = [_pt(R * (.62 + .38 * i / 540), math.radians(i)) for i in range(0, 541, 4)]
        poly(pts, lw * .8, False)
    else:
        raise SystemExit(f"Unknown theme {name!r}")
    return im.resize((N, N), Image.LANCZOS)


THEMES = ["flame", "storm", "shadow", "radiant", "wreath", "laurel", "beast", "barbs", "giant", "wings", "stars",
          "sea", "song", "fey", "knowledge", "ripples", "war", "dashed", "arcane", "cog", "arch", "order", "halo",
          "twilight", "moon", "crown", "tentacle", "horns", "eye", "drops", "shield", "spiral"]
