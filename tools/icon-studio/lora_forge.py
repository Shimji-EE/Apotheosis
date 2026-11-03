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
  python tools/icon-studio/lora_forge.py make recipes/lora-example.json [--dry] [-o sheet.png]

A recipe is a list of icons:
  [{"label": "subclass Order of the Lycan", "to": "creator", "style": "glow",
    "prompt": "wolf head with a crescent moon", "seed": 7, "pick": 0}]
  prompt: the subject only; the tool adds the LoRA trigger words and the negative prompt.
  seed / n / pick: generate n candidates from seed and publish candidate `pick` (default 0).
  Other keys (to, style, weight, kind) work as in forge.py. Same one-icon-one-meaning rule.

Runs on CUDA when available, else CPU (slow: minutes per image at 512 px).
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
STYLE = "bg3 action icon, white line art glyph on dark background, simple, centered, high contrast"
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


def generate(pipe, dev, prompt, seed=0, n=1, steps=24, size=512, cfg=7.0):
    import torch
    out = []
    for i in range(n):
        # DirectML has no device-side generator; seed on the CPU (same images for a given seed).
        g = torch.Generator(device=dev if dev == "cuda" else "cpu").manual_seed(seed + i)
        out.append(pipe(f"{STYLE}, {prompt}", negative_prompt=NEGATIVE, num_inference_steps=steps,
                        guidance_scale=cfg, width=size, height=size, generator=g).images[0])
    return out


def to_lineart(img, lo=0.35, hi=0.75):
    """The generated tile as forge line art (white strokes, alpha from brightness), 512 px, cropped to the
    glyph and centred so forge.render can thicken and glow it."""
    g = np.asarray(img.convert("L").resize((forge.N, forge.N), Image.LANCZOS)).astype(np.float64) / 255
    # The LoRA sometimes draws dark line art on a pale tile: judge by the border and invert those.
    edge = np.concatenate([g[:16].ravel(), g[-16:].ravel(), g[:, :16].ravel(), g[:, -16:].ravel()])
    if np.median(edge) > 0.5:
        g = 1 - g
    a = np.clip((g - lo) / (hi - lo), 0, 1)
    # Drop anything touching the border (tile edges and corner marks of the game's frame).
    m = 8
    a[:m], a[-m:], a[:, :m], a[:, -m:] = 0, 0, 0, 0
    im = Image.fromarray((np.dstack([np.ones_like(a)] * 3 + [a]) * 255).astype(np.uint8), "RGBA")
    bb = im.getchannel("A").getbbox()
    if not bb:
        return im
    im = im.crop(bb)
    s = 0.84 * forge.N / max(im.size)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new("RGBA", (forge.N, forge.N), (0, 0, 0, 0))
    c.paste(im, ((forge.N - im.width) // 2, (forge.N - im.height) // 2), im)
    return c


def sheet(images, path, tile=160):
    s = Image.new("RGBA", (len(images) * (tile + 6), tile + 6), (20, 15, 15, 255))
    for i, im in enumerate(images):
        s.alpha_composite(im.convert("RGBA").resize((tile, tile)), (i * (tile + 6) + 3, 3))
    s.save(path)
    print(path)


def cmd_try(a):
    pipe, dev = pipeline(a.base, a.lora, a.scale)
    raw = generate(pipe, dev, a.prompt, a.seed, a.n, a.steps)
    finished = [forge.render(to_lineart(r), "glow", 128) for r in raw]
    sheet(raw + finished, a.out)


def cmd_make(a):
    items = json.loads(Path(a.recipe).read_text(encoding="utf-8"))
    pipe, dev = pipeline(a.base, a.lora, a.scale)
    previews = []
    for item in items:
        raw = generate(pipe, dev, item["prompt"], item.get("seed", 0), item.get("n", 1), a.steps)
        art = to_lineart(raw[item.get("pick", 0)])
        img = forge.render(art, item.get("style", "glow"), forge.SIZES.get(item["to"], 128),
                           item.get("kind", "Spell"), item.get("weight", 5))
        previews.append(img)
        if not a.dry:
            # The digest keys on the prompt and seed, so one generated icon cannot carry two meanings.
            forge.publish(dict(item, layers=[{"lora": item["prompt"], "seed": item.get("seed", 0),
                                              "pick": item.get("pick", 0)}]), img)
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
    p.add_argument("--seed", type=int, default=0); p.add_argument("-o", "--out", default="lora-try.png"); p.set_defaults(fn=cmd_try)
    p = sub.add_parser("make"); p.add_argument("recipe"); p.add_argument("--dry", action="store_true")
    p.add_argument("-o", "--out"); p.set_defaults(fn=cmd_make)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
