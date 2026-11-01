"""Build the skill, power and effect icons for the Tavern dashboard.

Each icon is a set of brush strokes: a centre line (smoothed through its
points) with a width that swells and tapers, like a painted glyph. The
strokes become filled outlines, and docs/hub/power-icons.js injects them
as an SVG sprite. The neon look (bloom, hot core) comes from the #brush
filter defined in that sprite.

Run:  python3 tools/icons/build_power_icons.py
"""
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "docs" / "hub" / "power-icons.js"


def catmull(points, steps=10):
    if len(points) < 3:
        (x0, y0), (x1, y1) = points
        return [(x0 + (x1 - x0) * t / steps, y0 + (y1 - y0) * t / steps) for t in range(steps + 1)]
    pts = [points[0]] + points + [points[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(tuple(
                0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                       + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)
                for k in (0, 1)))
    out.append(points[-1])
    return out


PROFILES = {
    "taper": lambda t: max(0.08, math.sin(math.pi * t) ** 0.55),
    "head": lambda t: max(0.08, (1 - t) ** 0.7 * min(1, t * 6 + 0.35)),   # thick start, sharp end
    "tail": lambda t: max(0.08, t ** 0.7 * min(1, (1 - t) * 6 + 0.35)),   # sharp start, thick end
    "even": lambda t: 0.55 + 0.45 * math.sin(math.pi * t) ** 0.3,
}


WIDTH_SCALE = 1.4  # bolder strokes read better at small sizes


def brush(points, width, profile="taper"):
    width *= WIDTH_SCALE
    line = catmull([tuple(p) for p in points])
    n = len(line)
    # arc length for the profile
    dist = [0.0]
    for a, b in zip(line, line[1:]):
        dist.append(dist[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    total = dist[-1] or 1
    left, right = [], []
    for i, (x, y) in enumerate(line):
        a = line[max(0, i - 1)]
        b = line[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(dx, dy) or 1
        nx, ny = -dy / ln, dx / ln
        w = width / 2 * PROFILES[profile](dist[i] / total)
        left.append((x + nx * w, y + ny * w))
        right.append((x - nx * w, y - ny * w))
    poly = left + right[::-1]
    return "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in poly) + "Z"


def dot(x, y, r):
    return f"M{x - r:.1f} {y:.1f}a{r} {r} 0 1 0 {2 * r} 0a{r} {r} 0 1 0 {-2 * r} 0Z"


def ring(cx, cy, r, width, start=0, sweep=360, profile="even", steps=24):
    pts = [(cx + r * math.cos(math.radians(start + sweep * i / steps)),
            cy + r * math.sin(math.radians(start + sweep * i / steps))) for i in range(steps + 1)]
    return brush(pts, width, profile)


def rays(cx, cy, r0, r1, count, width, start=-90, jitter=0.0):
    out = []
    for i in range(count):
        a = math.radians(start + 360 * i / count)
        k = 1 + (jitter if i % 2 else 0)
        out.append(brush([(cx + r0 * math.cos(a), cy + r0 * math.sin(a)),
                          (cx + r1 * k * math.cos(a), cy + r1 * k * math.sin(a))], width, "head"))
    return out


# ---------- The icons (100 x 100 grid). Original designs in the painted-glyph style. ----------
ICONS = {}

ICONS["slash"] = ("#ff6a3d", [
    brush([(22, 84), (40, 56), (62, 32), (84, 14)], 10, "tail"),
    brush([(12, 70), (30, 48), (52, 26), (70, 10)], 7, "tail"),
    brush([(34, 92), (54, 68), (74, 46), (92, 30)], 7, "tail"),
    brush([(56, 50), (66, 54), (76, 52)], 4), brush([(48, 40), (40, 30), (42, 20)], 3.5),
    dot(80, 64, 2.4), dot(24, 30, 2), dot(88, 44, 1.6),
])

ICONS["arrow"] = ("#ffd25a", [
    brush([(14, 86), (40, 60), (70, 30)], 6, "even"),
    brush([(86, 14), (64, 24), (70, 30), (76, 36), (86, 14)], 6, "even"),
    brush([(14, 86), (10, 72), (22, 70)], 5), brush([(14, 86), (28, 90), (30, 78)], 5),
    brush([(30, 52), (10, 52)], 4, "head"), brush([(40, 40), (18, 36)], 3.5, "head"),
    brush([(48, 72), (46, 92)], 4, "head"), brush([(60, 62), (62, 82)], 3.5, "head"),
])

ICONS["fire"] = ("#ff8a2a", [
    brush([(52, 92), (28, 84), (18, 62), (28, 40), (38, 50), (40, 30), (54, 10), (58, 34), (72, 30), (82, 52), (76, 78), (52, 92)], 7, "even"),
    brush([(50, 80), (38, 72), (38, 58), (48, 50), (50, 62), (60, 54), (64, 70), (50, 80)], 5, "even"),
    brush([(84, 28), (90, 16)], 3.5, "head"), brush([(20, 34), (14, 22)], 3, "head"), dot(70, 12, 2), dot(30, 18, 1.8),
])

ICONS["frost"] = ("#5fe3ff", [
    *[brush([(50, 50), (50 + 40 * math.cos(math.radians(a)), 50 + 40 * math.sin(math.radians(a)))], 7, "head") for a in range(-90, 270, 60)],
    *[brush([(50 + 24 * math.cos(math.radians(a)), 50 + 24 * math.sin(math.radians(a))),
             (50 + 24 * math.cos(math.radians(a)) + 12 * math.cos(math.radians(a + s)), 50 + 24 * math.sin(math.radians(a)) + 12 * math.sin(math.radians(a + s)))], 4, "head")
      for a in range(-90, 270, 60) for s in (-40, 40)],
    ring(50, 50, 9, 4),
])

ICONS["lightning"] = ("#6ea8ff", [
    brush([(66, 4), (38, 42), (60, 44), (28, 96)], 12, "tail"),
    brush([(40, 40), (22, 46), (12, 40)], 4, "tail"), brush([(58, 44), (76, 52), (84, 66)], 4.5, "tail"),
    brush([(44, 70), (60, 74)], 3.5, "tail"), dot(20, 20, 2), dot(84, 26, 2.4), dot(76, 86, 1.8),
])

ICONS["radiant"] = ("#ffd34d", [
    ring(50, 50, 13, 6),
    *rays(50, 50, 20, 44, 16, 5.5, jitter=-0.3),
    dot(50, 50, 4),
])

ICONS["necrotic"] = ("#b06cff", [
    brush([(30, 52), (24, 34), (32, 16), (50, 10), (68, 16), (76, 34), (70, 52)], 7, "even"),
    brush([(30, 52), (34, 62), (42, 64), (42, 74)], 6, "even"), brush([(70, 52), (66, 62), (58, 64), (58, 74)], 6, "even"),
    ring(39, 36, 7, 5), ring(61, 36, 7, 5), brush([(50, 44), (46, 54), (54, 54)], 4, "even"),
    brush([(46, 66), (46, 74)], 3), brush([(54, 66), (54, 74)], 3),
    brush([(30, 66), (28, 88)], 4, "head"), brush([(70, 66), (74, 92)], 4.5, "head"), brush([(50, 78), (50, 94)], 3.5, "head"),
])

ICONS["heal"] = ("#5ff08a", [
    brush([(50, 86), (22, 60), (14, 40), (22, 22), (38, 18), (50, 32)], 8, "even"),
    brush([(50, 32), (62, 18), (78, 22), (86, 40), (78, 60), (50, 86)], 8, "even"),
    brush([(50, 40), (50, 68)], 6, "even"), brush([(38, 52), (62, 52)], 6, "even"),
    dot(14, 14, 2), dot(86, 12, 2.4), dot(90, 80, 1.8),
])

ICONS["ward"] = ("#ffcf5a", [
    brush([(50, 10), (30, 18), (16, 18), (18, 52), (30, 74), (50, 90), (70, 74), (82, 52), (84, 18), (70, 18), (50, 10)], 7, "even"),
    brush([(50, 26), (50, 74)], 5, "taper"), brush([(32, 42), (68, 42)], 5, "taper"),
    ring(50, 42, 9, 3.5), *rays(50, 42, 14, 22, 8, 2.6),
])

ICONS["bless"] = ("#ffe08a", [
    brush([(40, 90), (36, 64), (40, 44), (48, 30), (50, 46)], 7, "even"),
    brush([(60, 90), (64, 64), (60, 44), (52, 30), (50, 46)], 7, "even"),
    brush([(36, 64), (28, 56)], 4, "head"), brush([(64, 64), (72, 56)], 4, "head"),
    *[brush([(50 + 18 * math.cos(math.radians(a)), 22 + 18 * math.sin(math.radians(a))),
             (50 + 34 * math.cos(math.radians(a)), 22 + 34 * math.sin(math.radians(a)))], 4, "head") for a in range(-170, 0, 20)],
])

ICONS["hex"] = ("#ff4fa3", [
    brush([(10, 50), (30, 30), (50, 24), (70, 30), (90, 50)], 6, "taper"),
    brush([(10, 50), (30, 70), (50, 76), (70, 70), (90, 50)], 6, "taper"),
    brush([(50, 50), (56, 48), (58, 54), (52, 60), (42, 56), (40, 46), (48, 38), (60, 38), (66, 48)], 4.5, "tail"),
    brush([(30, 18), (24, 6)], 3.5, "head"), brush([(50, 14), (50, 2)], 3.5, "head"), brush([(70, 18), (76, 6)], 3.5, "head"),
    brush([(44, 76), (40, 96)], 4, "head"), brush([(58, 76), (62, 92)], 3.5, "head"),
])

ICONS["poison"] = ("#a8f04a", [
    brush([(50, 8), (40, 30), (26, 50), (24, 68), (36, 84), (50, 88), (64, 84), (76, 68), (74, 50), (60, 30), (50, 8)], 7, "even"),
    ring(42, 62, 6, 4), ring(58, 62, 6, 4), brush([(44, 76), (56, 76)], 4),
    brush([(84, 30), (86, 46)], 4, "tail"), dot(86, 52, 3), dot(16, 36, 2.4), dot(14, 50, 1.6),
])

ICONS["psychic"] = ("#ff6be0", [
    brush([(30, 88), (30, 70), (20, 62), (22, 48), (18, 40), (24, 22), (42, 10), (62, 12), (76, 26), (78, 46), (70, 60), (68, 88)], 7, "even"),
    brush([(48, 40), (54, 38), (56, 44), (50, 50), (42, 46), (40, 36), (48, 28), (60, 30), (66, 40), (62, 54)], 4.5, "tail"),
    brush([(84, 20), (94, 12)], 3.5, "tail"), brush([(88, 36), (98, 36)], 3.5, "tail"), brush([(84, 52), (94, 58)], 3.5, "tail"),
])

ICONS["thunder"] = ("#8f8cff", [
    ring(50, 50, 10, 6),
    ring(50, 50, 24, 5, -60, 120, "taper"), ring(50, 50, 24, 5, 120, 120, "taper"),
    ring(50, 50, 38, 4.5, -50, 100, "taper"), ring(50, 50, 38, 4.5, 130, 100, "taper"),
    brush([(50, 4), (50, 18)], 4, "tail"), brush([(50, 96), (50, 82)], 4, "tail"),
])

ICONS["dash"] = ("#7af0d0", [
    brush([(30, 30), (44, 32), (60, 26), (80, 30)], 6, "even"),
    brush([(28, 30), (34, 54), (30, 76), (44, 80), (70, 82), (80, 74), (60, 66), (50, 52), (52, 34)], 6, "even"),
    brush([(22, 44), (4, 44)], 4.5, "head"), brush([(22, 58), (8, 60)], 4, "head"), brush([(24, 72), (12, 76)], 3.5, "head"),
    brush([(60, 26), (70, 10), (84, 8)], 4.5, "tail"), brush([(68, 28), (82, 18), (94, 20)], 4, "tail"),
])

ICONS["stealth"] = ("#9aa8ff", [
    brush([(16, 90), (22, 60), (30, 34), (50, 12), (70, 34), (78, 60), (84, 90)], 7, "even"),
    brush([(32, 70), (36, 48), (50, 34), (64, 48), (68, 70)], 5, "even"),
    brush([(40, 54), (46, 56)], 4), brush([(54, 56), (60, 54)], 4),
    brush([(10, 40), (2, 30)], 3, "head"), brush([(90, 40), (98, 30)], 3, "head"), dot(50, 82, 2),
])

ICONS["beast"] = ("#ffb04a", [
    *[brush([(28 + 14 * i, 88), (24 + 16 * i, 60), (30 + 16 * i, 34), (44 + 14 * i, 12)], 8 - i, "tail") for i in range(3)],
    brush([(14, 50), (6, 36)], 3.5, "head"), dot(90, 70, 2.4), dot(84, 84, 1.8),
])

ICONS["arcane"] = ("#d07cff", [
    ring(50, 50, 36, 4.5),
    brush([(50, 18), (78, 66), (22, 66), (50, 18)], 5, "even"),
    brush([(22, 34), (78, 34), (50, 82), (22, 34)], 4, "even"),
    dot(50, 50, 4), *rays(50, 50, 40, 48, 12, 3),
])

ICONS["rune"] = ("#ff5a5a", [
    brush([(50, 6), (50, 94)], 7, "taper"),
    brush([(50, 30), (28, 16)], 5, "head"), brush([(50, 30), (72, 16)], 5, "head"),
    brush([(50, 56), (24, 44), (20, 30)], 4.5, "head"), brush([(50, 56), (76, 44), (80, 30)], 4.5, "head"),
    brush([(50, 76), (32, 88)], 4, "head"), brush([(50, 76), (68, 88)], 4, "head"),
    ring(50, 44, 7, 3.5),
])

LABELS = {
    "slash": "Strike", "arrow": "Shot", "fire": "Fire", "frost": "Frost", "lightning": "Lightning",
    "radiant": "Radiant", "necrotic": "Necrotic", "heal": "Healing", "ward": "Ward", "bless": "Blessing",
    "hex": "Hex", "poison": "Poison", "psychic": "Psychic", "thunder": "Thunder", "dash": "Movement",
    "stealth": "Stealth", "beast": "Beast", "arcane": "Arcane", "rune": "Feature",
}

symbols = "".join(
    f'<symbol id="p-{k}" viewBox="0 0 100 100"><path d="{"".join(paths)}"/></symbol>'
    for k, (_, paths) in ICONS.items()
)
# Bloom under a saturated body with a white-hot core, like a neon brush stroke.
FILTER = (
    '<filter id="brush" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">'
    '<feGaussianBlur in="SourceGraphic" stdDeviation="6" result="wide"/>'
    '<feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="near"/>'
    '<feMorphology in="SourceGraphic" operator="erode" radius="1.6" result="thin"/>'
    '<feColorMatrix in="thin" values="0.25 0 0 0 0.78  0 0.25 0 0 0.76  0 0 0.25 0 0.7  0 0 0 1 0" result="core"/>'
    '<feMorphology in="SourceAlpha" operator="dilate" radius="1.4" result="fat"/>'
    '<feColorMatrix in="fat" values="0 0 0 0 0.02  0 0 0 0 0.01  0 0 0 0 0.01  0 0 0 0.75 0" result="edge"/>'
    '<feMerge><feMergeNode in="wide"/><feMergeNode in="wide"/><feMergeNode in="edge"/><feMergeNode in="near"/>'
    '<feMergeNode in="SourceGraphic"/><feMergeNode in="core"/></feMerge></filter>'
)
sprite = f'<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">{FILTER}{symbols}</svg>'
meta = {k: {"label": LABELS[k], "color": c} for k, (c, _) in ICONS.items()}

OUT.write_text(
    "// Generated by tools/icons/build_power_icons.py. Do not edit by hand.\n"
    "// Skill, power and effect icons: painted neon glyphs, injected as an SVG sprite.\n"
    f"window.PowerIcons = {json.dumps(meta)};\n"
    f"document.body.insertAdjacentHTML(\"afterbegin\", {json.dumps(sprite)});\n"
)
print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB, {len(ICONS)} icons)")
