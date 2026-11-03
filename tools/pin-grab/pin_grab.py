#!/usr/bin/env python3
"""Download every image on a Pinterest board, for art reference.

    python pin_grab.py https://pin.it/1okTtMLvv
    python pin_grab.py https://www.pinterest.com/<user>/<board>/ --out art-inspo

The images go into a folder named after the board, with an index.html
contact sheet to browse them. Run it on your own computer: Pinterest
refuses requests from servers. The download itself is done by gallery-dl
(pip install gallery-dl), which knows how to page through a board.
"""
import argparse
import html
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def resolve(url):
    """Turn a pin.it short link into the pinterest.com URL it points to."""
    url = url.strip()
    if not url.startswith("http"):
        url = "https://" + url
    host = urllib.parse.urlparse(url).netloc.lower()
    if host.endswith("pin.it"):
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            url = resp.geturl()
    return clean(url)


def clean(url):
    """Drop tracking parameters and point at www.pinterest.com."""
    parts = urllib.parse.urlparse(url)
    if "pinterest." in parts.netloc.lower():
        return "https://www.pinterest.com" + parts.path.rstrip("/") + "/"
    return url


def board_name(url):
    bits = [b for b in urllib.parse.urlparse(url).path.split("/") if b]
    name = "-".join(bits[-2:]) if len(bits) >= 2 else (bits[-1] if bits else "board")
    return re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-") or "board"


def download(url, outdir, cookies_from=None):
    try:
        import gallery_dl  # noqa: F401
    except ImportError:
        sys.exit("gallery-dl is not installed. Run:  python -m pip install gallery-dl")
    cmd = [sys.executable, "-m", "gallery_dl", "-D", str(outdir),
           "--filename", "{id}.{extension}", "--no-mtime"]
    if cookies_from:
        cmd += ["--cookies-from-browser", cookies_from]
    cmd.append(url)
    print("Downloading", url, "into", outdir)
    return subprocess.call(cmd)


def contact_sheet(outdir, title):
    images = sorted(p for p in outdir.iterdir() if p.suffix.lower() in IMAGE_TYPES)
    cells = "\n".join(
        f'<a href="{html.escape(p.name)}"><img loading="lazy" src="{html.escape(p.name)}" '
        f'alt="{html.escape(p.stem)}"></a>' for p in images)
    page = f"""<!doctype html><meta charset="utf-8">
<title>{html.escape(title)}</title>
<style>
body{{margin:0;padding:16px;background:#0b0a08;color:#d8d2c6;font-family:sans-serif}}
h1{{font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#d0313f;font-size:18px}}
.grid{{columns:240px;column-gap:10px}}
.grid a{{display:block;margin:0 0 10px;break-inside:avoid}}
.grid img{{width:100%;display:block}}
</style>
<h1>{html.escape(title)} &middot; {len(images)} images</h1>
<div class="grid">
{cells}
</div>
"""
    (outdir / "index.html").write_text(page, encoding="utf-8")
    return len(images)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("link", nargs="?", help="board link (pin.it or pinterest.com)")
    ap.add_argument("--out", default="art-inspo", help="parent folder (default: art-inspo)")
    ap.add_argument("--cookies-from", metavar="BROWSER",
                    help="use your browser's Pinterest login, for secret boards "
                         "(chrome, firefox, edge, ...)")
    args = ap.parse_args()
    link = args.link or input("Pinterest board link: ")
    url = resolve(link)
    outdir = Path(args.out) / board_name(url)
    outdir.mkdir(parents=True, exist_ok=True)
    code = download(url, outdir, args.cookies_from)
    n = contact_sheet(outdir, board_name(url))
    print(f"{n} images in {outdir.resolve()}  (open index.html to browse)")
    sys.exit(code if n == 0 else 0)


if __name__ == "__main__":
    main()
