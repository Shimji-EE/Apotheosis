"""Apotheosis Icon Studio publisher: watches the BG3 Icon Generator's exports and puts every icon
exported under the mod name "Apotheosis" on the site, then commits and pushes it.

Started by "Apotheosis Icon Studio.bat" with the generator's own Python (it has Pillow), so nothing
needs installing. Where an icon goes is read from its "Name in the game", first word first:

  Class / Species / Variant / Religion / Background / Ancestry ...  -> creator emblem, Grave Red glow
      e.g. "Species Snow Elf" fills the creator's Snow Elf emblem.
  Power ... / Feature ...   -> powers (game colours), matched by name on character sheets
  Resource ...              -> resources (game colours)
  Item ...                  -> items (game colours)
  Ui ... / Map ... / Journal ...  -> ui (Grave Red glow)
  anything else             -> generated (game colours)

Rule (Charl, 2026-11-02): one icon, one meaning. An export keeps its label; a second label for
the same export is refused. Re-exporting an icon replaces it.
"""
import argparse
import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools" / "icons"))
import icons  # noqa: E402  (glow, slug, key_of, SITE_ICONS)

MOD = "Apotheosis"
EMBLEM = {"class", "species", "variant", "religion", "background", "ancestry"}
ROUTES = {  # first word -> (folder, glow, keep the first word in the label)
    **{w: ("creator", True, True) for w in EMBLEM},
    "power": ("powers", False, False), "feature": ("powers", False, False),
    "resource": ("resources", False, False), "item": ("items", False, False),
    "ui": ("ui", True, False), "map": ("ui", True, True), "journal": ("ui", True, True),
}
SIZES = {"creator": 128, "ui": 128, "powers": 96, "resources": 96, "items": 96, "generated": 128}
PREFIXES = ("Spell_", "Action_", "TadpoleSuperPower_")


def words(key):
    name = key[len(MOD) + 1:] if key.startswith(MOD + "_") else key
    for p in PREFIXES:
        if name.startswith(p):
            name = name[len(p):]
    return re.findall(r"[A-Z]+(?![a-z])|[A-Z][a-z0-9']*|[a-z0-9']+", name.replace("_", " "))


def route(key):
    w = words(key)
    if not w:
        return None
    folder, glow, keep = ROUTES.get(w[0].lower(), ("generated", False, True))
    rest = w if keep else w[1:]
    if not rest:
        return None
    label = " ".join(rest)
    if folder == "creator":
        label = f"{w[0].lower()} {' '.join(w[1:])}"
    return folder, glow, label


def exports(png_dir):
    """{key: (newest mtime, largest transparent png)}"""
    newest, largest = {}, {}
    for f in png_dir.glob("*.png"):
        m = re.fullmatch(r"(.+)_(\d+)", f.stem)
        if not m or m.group(1).endswith("_hotbar"):
            continue
        key, size = m.group(1), int(m.group(2))
        newest[key] = max(newest.get(key, 0), f.stat().st_mtime)
        if size > largest.get(key, (0, None))[0]:
            largest[key] = (size, f)
    return {k: (newest[k], largest[k][1]) for k in newest}


def publish(key, art_path):
    r = route(key)
    if not r:
        print(f"  skipped {key}: give it a name such as 'Species Snow Elf' or 'Power Frost Ward'.")
        return None
    folder, glow, label = r
    from PIL import Image
    out_dir = icons.SITE_ICONS / folder
    out_dir.mkdir(parents=True, exist_ok=True)
    mpath = out_dir / "manifest.json"
    manifest = json.loads(mpath.read_text(encoding="utf-8")) if mpath.exists() else {}
    src = f"gen:{MOD}/{key}"
    for k, v in manifest.items():
        if v.get("from") == src and k != icons.key_of(label):
            print(f"  refused {key}: it is already the icon for '{v['label']}'. Make a new icon instead.")
            return None
    art = Image.open(art_path).convert("RGBA")
    size = SIZES[folder]
    img = icons.glow(art, "#e0303f", size) if glow else art.resize((size, size), Image.LANCZOS)
    file = f"{icons.slug(label)}.webp"
    img.save(out_dir / file, "WEBP", quality=90)
    entry = {"label": label, "file": file, "from": src}
    if folder in ("powers", "resources"):
        entry.update({"cat": "Generated", "stone": False})
    if folder == "items":
        entry["group"] = "Generated"
    manifest[icons.key_of(label)] = entry
    mpath.write_text(json.dumps(manifest, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"  {folder}/{file}  <- {key}" + ("  (glow)" if glow else ""))
    return [out_dir / file, mpath]


def git(*args):
    return subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True)


def push(paths, names):
    rel = [str(p.relative_to(ROOT)) for p in paths]
    git("add", "--", *rel)
    if git("diff", "--cached", "--quiet").returncode == 0:
        return
    msg = "Icon Studio: " + ", ".join(names[:6]) + (" and more" if len(names) > 6 else "")
    c = git("commit", "-m", msg, "--", *rel)
    if c.returncode:
        print("  commit failed:", c.stderr.strip() or c.stdout.strip())
        return
    p = git("push")
    if p.returncode:
        git("pull", "--rebase", "--autostash")
        p = git("push")
    print("  pushed to the site." if p.returncode == 0 else "  push failed (the icons are committed locally):\n  " + p.stderr.strip())


def alive(port):
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=2)
        return True
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gen", required=True, help="the BG3 Icon Generator folder")
    ap.add_argument("--port", type=int, default=7788)
    ap.add_argument("--once", action="store_true", help="publish what is there and stop")
    ap.add_argument("--no-push", action="store_true", help="copy into the site but leave git alone")
    a = ap.parse_args()
    png_dir = Path(a.gen) / "outputs" / "editor" / MOD / "png"
    seen_file = Path(a.gen) / "outputs" / "editor" / MOD / ".published.json"
    seen = json.loads(seen_file.read_text()) if seen_file.exists() else {}
    print(f"Apotheosis Icon Studio publisher: export under the mod name '{MOD}' and the icon goes to the site.")
    down_since = None
    while True:
        changed, names = [], []
        if png_dir.exists():
            time.sleep(1)  # let an export finish writing
            for key, (t, f) in sorted(exports(png_dir).items()):
                if seen.get(key) == t:
                    continue
                print(f"New export: {key}")
                files = publish(key, f)
                seen[key] = t
                if files:
                    changed += files
                    names.append(route(key)[2])
            seen_file.parent.mkdir(parents=True, exist_ok=True)
            seen_file.write_text(json.dumps(seen))
        if changed and not a.no_push:
            push(sorted(set(changed)), names)
        if a.once:
            return
        if alive(a.port):
            down_since = None
        else:
            down_since = down_since or time.time()
            if time.time() - down_since > 30:
                print("The editor has stopped; the publisher stops too.")
                return
        time.sleep(2)


if __name__ == "__main__":
    main()
