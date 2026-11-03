"""LoRA forge: headless icon generation with Stable Diffusion 1.5 plus Charl's BG3 action-icon LoRA
(bg3_actions_offset.safetensors), then the same finish and publish path as forge.py.

The LoRA is a kohya-format SD 1.x LoRA (text encoder + UNet, no training metadata). It draws BG3-style
action glyphs: pale line art on a dark tile. This tool generates candidates from prompts, keeps the line
art (the dark tile is dropped by brightness), and turns it into the site's Grave Red glow or one of the
game colour presets through forge.render.

Setup (once):
  pip install -r tools/icon-studio/lora-requirements.txt      (NVIDIA: use the CUDA torch wheel)
  AMD/Intel on Windows: Python 3.12 and lora-requirements-directml.txt (torch-directml; fp32, ~12 s/image on an RX 6800)
  put bg3_actions_offset.safetensors in tools/icon-studio/models/   (git-ignored)
  base model: the Hugging Face id stable-diffusion-v1-5/stable-diffusion-v1-5 (downloaded on first run),
  or --base PATH to a local SD 1.5 .safetensors / .ckpt file.

Use:
  python tools/icon-studio/lora_forge.py try "a wolf head, howling" -n 4 -o sheet.png
  python tools/icon-studio/lora_forge.py cands recipes/lora-classes.json -o lora-cands   (one sheet per icon)
  python tools/icon-studio/lora_forge.py make recipes/lora-example.json [--dry] [-o sheet.png]

Prompts: describe the subject concretely (objects, pose, what is held, what surrounds it), not a word
like "barbarian"; generic prompts give generic glyphs (Charl, 2026-11-03).

A recipe is a list of icons:
  [{"label": "subclass Order of the Lycan", "to": "creator", "style": "glow",
    "prompt": "wolf head with a crescent moon", "seed": 7, "pick": 0}]
  prompt: the subject only; the tool adds the LoRA trigger words and the negative prompt.
  seed / n / pick: generate n candidates from seed and publish candidate `pick` (default 0).
  Other keys (to, style, weight, kind) work as in forge.py. Same one-icon-one-meaning rule.

Fuse (the default for emblems): give an item forge `layers` (a game glyph, optionally an accent glyph)
and the LoRA redraws that composition at `strength` (.45-.6) with the prompt's custom detail; clean()
then drops washes, specks and strokes that stray off the composition. `pick: "auto"` keeps the candidate
that holds the composition with the fewest strokes. Use `guide: "self"` when no game glyph fits.

Runs on CUDA, else DirectML (AMD/Intel), else CPU (slow: minutes per image at 512 px).
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import forge  # noqa: E402

LORA = HERE / "models" / "bg3_actions_offset.safetensors"
BASE = "stable-diffusion-v1-5/stable-diffusion-v1-5"
# The subject leads the prompt; the style words follow so they don't flatten it into a generic glyph.
STYLE = "bg3 action icon, white line art on dark background, centered, high contrast, detailed"
NEGATIVE = "text, letters, watermark, signature, frame, border, photo, realistic, blurry, colourful, gradient"


def pipeline(base=BASE, lora=LORA, scale=0.9):
    import torch
    from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    if dev == "cpu":
        try:  # AMD/Intel GPUs on Windows: pip install -r lora-requirements-directml.txt
            import torch_directml
            dev = torch_directml.device()
        except ImportError:
            pass
    dtype = torch.float16 if dev == "cuda" else torch.float32
    if Path(base).is_file():
        pipe = StableDiffusionPipeline.from_single_file(base, torch_dtype=dtype)
    else:
        pipe = StableDiffusionPipeline.from_pretrained(base, torch_dtype=dtype, safety_checker=None)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
    if not Path(lora).is_file():
        sys.exit(f"LoRA not found: {lora}")
    pipe.load_lora_weights(str(Path(lora).parent), weight_name=Path(lora).name, adapter_name="bg3")
    pipe.set_adapters(["bg3"], adapter_weights=[scale])
    pipe.set_progress_bar_config(disable=True)
    return pipe.to(dev), dev


def img2img(pipe):
    from diffusers import StableDiffusionImg2ImgPipeline
    i2i = StableDiffusionImg2ImgPipeline(**pipe.components)
    i2i.set_progress_bar_config(disable=True)
    return i2i


def generate(pipe, dev, prompt, seed=0, n=1, steps=24, size=512, cfg=7.0, init=None, strength=0.55):
    """txt2img, or img2img from `init` (a guide tile) when given."""
    import torch
    out = []
    for i in range(n):
        # DirectML has no device-side generator; seed on the CPU (same images for a given seed).
        g = torch.Generator(device=dev if dev == "cuda" else "cpu").manual_seed(seed + i)
        kw = dict(negative_prompt=NEGATIVE, num_inference_steps=steps, guidance_scale=cfg, generator=g)
        if init is None:
            out.append(pipe(f"{prompt}, {STYLE}", width=size, height=size, **kw).images[0])
        else:
            out.append(pipe(f"{prompt}, {STYLE}", image=init, strength=strength, **kw).images[0])
    return out


def guide_tile(art):
    """Forge line art (RGBA) as the LoRA's own kind of tile: pale strokes on a near-black square."""
    from PIL import ImageFilter
    a = art.getchannel("A").filter(ImageFilter.MaxFilter(3))
    tile = Image.new("RGB", (forge.N, forge.N), (16, 13, 13))
    tile.paste(Image.new("RGB", tile.size, (235, 228, 214)), (0, 0), a)
    return tile


def to_lineart(img, lo=0.35, hi=0.75):
    """The generated tile as forge line art (white strokes, alpha from brightness), 512 px."""
    g = np.asarray(img.convert("L").resize((forge.N, forge.N), Image.LANCZOS)).astype(np.float64) / 255
    # The LoRA sometimes draws dark line art on a pale tile: judge by the border and invert those.
    edge = np.concatenate([g[:16].ravel(), g[-16:].ravel(), g[:, :16].ravel(), g[:, -16:].ravel()])
    if np.median(edge) > 0.5:
        g = 1 - g
    a = np.clip((g - lo) / (hi - lo), 0, 1)
    # Drop anything touching the border (tile edges and corner marks of the game's frame).
    m = 8
    a[:m], a[-m:], a[:, :m], a[:, -m:] = 0, 0, 0, 0
    return a


def clean(a, guide=None, min_area=0.0015):
    """Cleanup that makes generated glyphs read as deliberate: hysteresis threshold (no grey washes), drop
    specks, fill pinholes, and with a guide keep only strokes that sit on the guide's composition.
    Returns (alpha, number of strokes, guide cover)."""
    from scipy import ndimage as ndi
    lab, n = ndi.label(a > 0.35)
    if n:  # hysteresis: faint ink survives only where it joins a strong stroke; then drop specks
        strong = ndi.maximum(a > 0.7, lab, range(1, n + 1))
        size = ndi.sum(np.ones_like(a), lab, range(1, n + 1))
        ink = np.isin(lab, 1 + np.flatnonzero(strong & (size >= min_area * a.size)))
    else:
        ink = lab > 0
    holes, h = ndi.label(~ink)
    if h:  # fill pinholes
        small = 1 + np.flatnonzero(ndi.sum(np.ones_like(a), holes, range(1, h + 1)) < 64)
        ink |= np.isin(holes, small)
    cover = 1.0
    if guide is not None:
        g = ndi.binary_dilation(guide > 0.3, iterations=18)
        lab, n = ndi.label(ink)
        if n:
            on = ndi.sum(g, lab, range(1, n + 1)) / ndi.sum(np.ones_like(g), lab, range(1, n + 1))
            ink = np.isin(lab, 1 + np.flatnonzero(on > 0.6))
        gi = guide > 0.3
        cover = (ndi.binary_dilation(ink, iterations=10) & gi).sum() / max(1, gi.sum())
    n = ndi.label(ink)[1]
    # Soft edges inside the kept strokes, nothing outside them.
    alpha = np.where(ndi.binary_dilation(ink, iterations=1), a, 0)
    alpha = np.where(ink, np.maximum(alpha, 0.85), alpha)
    return alpha, n, cover


def centred(alpha, fill=0.84):
    im = Image.fromarray((np.dstack([np.ones_like(alpha)] * 3 + [alpha]) * 255).astype(np.uint8), "RGBA")
    bb = im.getchannel("A").getbbox()
    if not bb:
        return im
    im = im.crop(bb)
    s = fill * forge.N / max(im.size)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new("RGBA", (forge.N, forge.N), (0, 0, 0, 0))
    c.paste(im, ((forge.N - im.width) // 2, (forge.N - im.height) // 2), im)
    return c


def candidates(pipes, dev, item, steps):
    """Generate an item's candidates and clean them. Returns [(raw, art, score)].

    `layers` (forge layers, e.g. a game glyph plus an accent) become the composition the LoRA redraws at
    `strength` (default .55): game-accurate structure, custom detail. `guide: "self"` does a first txt2img
    pass, cleans it and redraws that. Without either it is plain txt2img, cleaned."""
    pipe, i2i = pipes
    seed, n, prompt = item.get("seed", 0), item.get("n", 4), item["prompt"]
    strength = item.get("strength", 0.55)
    out = []
    if item.get("layers"):
        art = forge.compose(item["layers"])
        guide = np.asarray(art.getchannel("A")).astype(np.float64) / 255
        raws = generate(i2i, dev, prompt, seed, n, steps, init=guide_tile(art), strength=strength)
        pairs = [(r, guide) for r in raws]
    elif item.get("guide") == "self":
        pairs = []
        for k, first in enumerate(generate(pipe, dev, prompt, seed, n, steps)):
            g, _, _ = clean(to_lineart(first))
            art = Image.fromarray((np.dstack([np.ones_like(g)] * 3 + [g]) * 255).astype(np.uint8), "RGBA")
            r = generate(i2i, dev, prompt, seed + k, 1, steps, init=guide_tile(art), strength=strength)[0]
            pairs.append((r, g))
    else:
        pairs = [(r, None) for r in generate(pipe, dev, prompt, seed, n, steps)]
    for raw, guide in pairs:
        alpha, strokes, cover = clean(to_lineart(raw), guide)
        # Prefer candidates that keep the composition and read as few, deliberate strokes.
        out.append((raw, centred(alpha), cover - 0.015 * strokes))
    return out


def choose(item, cands):
    p = item.get("pick", "auto")
    return max(range(len(cands)), key=lambda i: cands[i][2]) if p == "auto" else p


def sheet(images, path, tile=160):
    s = Image.new("RGBA", (len(images) * (tile + 6), tile + 6), (20, 15, 15, 255))
    for i, im in enumerate(images):
        s.alpha_composite(im.convert("RGBA").resize((tile, tile)), (i * (tile + 6) + 3, 3))
    s.save(path)
    print(path)


def pipes(a):
    pipe, dev = pipeline(a.base, a.lora, a.scale)
    return (pipe, img2img(pipe)), dev


def cmd_try(a):
    ps, dev = pipes(a)
    item = {"prompt": a.prompt, "seed": a.seed, "n": a.n}
    if a.icon:
        item["layers"] = [{"icon": a.icon, "major": 0.9, "size": 0.84}]
        item["strength"] = a.strength
    cs = candidates(ps, dev, item, a.steps)
    sheet([c[0] for c in cs] + [forge.render(c[1], "glow", 128, weight=5) for c in cs], a.out)


def cmd_cands(a):
    """One sheet per recipe item (raw candidates over their cleaned glow finish); prints the auto pick."""
    items = json.loads(Path(a.recipe).read_text(encoding="utf-8"))
    out = Path(a.out_dir); out.mkdir(parents=True, exist_ok=True)
    ps, dev = pipes(a)
    for item in items:
        cs = candidates(ps, dev, item, a.steps)
        sheet([c[0] for c in cs] + [forge.render(c[1], "glow", 128, weight=item.get("weight", 5)) for c in cs],
              out / f"{forge.icons.slug(item['label'])}.png")
        print(item["label"], "auto pick", choose(dict(item, pick="auto"), cs), [round(c[2], 3) for c in cs])


def cmd_make(a):
    items = json.loads(Path(a.recipe).read_text(encoding="utf-8"))
    ps, dev = pipes(a)
    previews = []
    for item in items:
        cs = candidates(ps, dev, item, a.steps)
        k = choose(item, cs)
        img = forge.render(cs[k][1], item.get("style", "glow"), forge.SIZES.get(item["to"], 128),
                           item.get("kind", "Spell"), item.get("weight", 5))
        previews.append(img)
        print(item["label"], "pick", k)
        if not a.dry:
            # The digest keys on the guide, prompt and seed, so one generated icon cannot carry two meanings.
            forge.publish(dict(item, layers=[{"lora": item["prompt"], "seed": item.get("seed", 0), "pick": k,
                                              "guide": item.get("layers") or item.get("guide"),
                                              "strength": item.get("strength", 0.55)}]), img)
    if a.out:
        sheet(previews, a.out, 128)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", default=BASE, help="SD 1.5 Hugging Face id or local checkpoint file")
    ap.add_argument("--lora", default=str(LORA))
    ap.add_argument("--scale", type=float, default=0.9, help="LoRA strength")
    ap.add_argument("--steps", type=int, default=24)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("try"); p.add_argument("prompt"); p.add_argument("-n", type=int, default=4)
    p.add_argument("--icon", help="game glyph to redraw (img2img guide)"); p.add_argument("--strength", type=float, default=0.55)
    p.add_argument("--seed", type=int, default=0); p.add_argument("-o", "--out", default="lora-try.png"); p.set_defaults(fn=cmd_try)
    p = sub.add_parser("cands"); p.add_argument("recipe"); p.add_argument("-o", "--out-dir", default="lora-cands")
    p.set_defaults(fn=cmd_cands)
    p = sub.add_parser("make"); p.add_argument("recipe"); p.add_argument("--dry", action="store_true")
    p.add_argument("-o", "--out"); p.set_defaults(fn=cmd_make)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
