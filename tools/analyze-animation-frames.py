from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFont, ImageStat


ROOT = Path("output/reference/animation-frames")
OUT = Path("output/reference/animation-analysis")
SAMPLE_COUNT = 12


def load_font(size=12):
    for name in ("arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


FONT = load_font(12)


def fit(img, max_w=180, max_h=140):
    scale = min(max_w / img.width, max_h / img.height, 1.0)
    return img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.Resampling.BICUBIC)


def frame_score(a, b):
    diff = ImageChops.difference(a.convert("RGB"), b.convert("RGB")).convert("L")
    return ImageStat.Stat(diff).mean[0]


def make_contact_sheet(name, frames):
    indices = evenly_spaced(len(frames), SAMPLE_COUNT)
    samples = [(i, fit(Image.open(frames[i]).convert("RGB"))) for i in indices]
    cell_w = max(img.width for _, img in samples) + 12
    cell_h = max(img.height for _, img in samples) + 26
    cols = 4
    rows = (len(samples) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "#f5efe3")
    draw = ImageDraw.Draw(sheet)
    for n, (idx, img) in enumerate(samples):
        x = (n % cols) * cell_w + 6
        y = (n // cols) * cell_h + 20
        sheet.paste(img, (x, y))
        draw.text((x, y - 16), f"f{idx + 1:03d}  t+{idx / 30:.2f}s", fill="#2b211b", font=FONT)
    sheet.save(OUT / f"{name}-contact.jpg", quality=92)


def make_diff_sheet(name, frames):
    indices = evenly_spaced(len(frames), SAMPLE_COUNT)
    base = Image.open(frames[0]).convert("RGB")
    samples = []
    for i in indices:
        img = Image.open(frames[i]).convert("RGB")
        diff = ImageChops.difference(base, img).convert("L")
        diff = ImageEnhance.Contrast(diff).enhance(3.5)
        colored = Image.new("RGB", diff.size, "#111111")
        hot = Image.new("RGB", diff.size, "#ffcc30")
        colored.paste(hot, mask=diff)
        samples.append((i, fit(colored)))
    cell_w = max(img.width for _, img in samples) + 12
    cell_h = max(img.height for _, img in samples) + 26
    cols = 4
    rows = (len(samples) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "#1d1814")
    draw = ImageDraw.Draw(sheet)
    for n, (idx, img) in enumerate(samples):
        x = (n % cols) * cell_w + 6
        y = (n // cols) * cell_h + 20
        sheet.paste(img, (x, y))
        draw.text((x, y - 16), f"f{idx + 1:03d} vs f001", fill="#f5ead8", font=FONT)
    sheet.save(OUT / f"{name}-diff.jpg", quality=92)


def evenly_spaced(total, count):
    if total <= count:
        return list(range(total))
    return [round(i * (total - 1) / (count - 1)) for i in range(count)]


def analyze_clip(path):
    frames = sorted(path.glob("frame-*.png"))
    if len(frames) < 2:
        return None
    OUT.mkdir(parents=True, exist_ok=True)
    make_contact_sheet(path.name, frames)
    make_diff_sheet(path.name, frames)
    images = [Image.open(frame).convert("RGB") for frame in frames]
    scores = [frame_score(images[i - 1], images[i]) for i in range(1, len(images))]
    peaks = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:6]
    return {
        "name": path.name,
        "size": f"{images[0].width}x{images[0].height}",
        "frames": len(frames),
        "mean": sum(scores) / len(scores),
        "max": max(scores),
        "peaks": [(i + 2, scores[i]) for i in peaks],
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for clip in sorted(p for p in ROOT.iterdir() if p.is_dir()):
        result = analyze_clip(clip)
        if result:
            rows.append(result)

    lines = [
        "# Animation Frame Analysis Index",
        "",
        "Generated from `output/reference/animation-frames`.",
        "",
        "| Clip | Size | Frames | Mean frame diff | Max frame diff | Diff peaks |",
        "| --- | ---: | ---: | ---: | ---: | --- |",
    ]
    for item in rows:
        peaks = ", ".join(f"f{frame:03d}:{score:.1f}" for frame, score in item["peaks"])
        lines.append(f"| {item['name']} | {item['size']} | {item['frames']} | {item['mean']:.2f} | {item['max']:.2f} | {peaks} |")
    (OUT / "index.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} clip analyses to {OUT}")


if __name__ == "__main__":
    main()
