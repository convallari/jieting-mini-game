from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "reference-glyphs" / "qiang-sheet.png"
OUTPUT = ROOT / "public" / "original-glyphs" / "qiang-full-review-sheet.png"
CONTACT = ROOT / "public" / "review-contacts" / "qiang-full-review-contact.png"
FRAME_WIDTH = 224
FRAME_HEIGHT = 224
FRAME_COUNT = 96


def extract(frame_image: Image.Image) -> Image.Image:
    frame = np.array(frame_image.convert("RGBA"), dtype=np.uint8)
    rgb = frame[..., :3].astype(np.int32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    luma = (r * 299 + g * 587 + b * 114) // 1000
    saturation = np.max(rgb, axis=2) - np.min(rgb, axis=2)

    dark_alpha = np.clip((166 - luma) * 3.0, 0, 255)
    yellow = (r > 155) & (g > 105) & (b < 135) & (saturation > 42)
    yellow_alpha = np.clip((r + g - b - 190) * 1.7, 0, 240)
    alpha = np.maximum(dark_alpha, np.where(yellow, yellow_alpha, 0))

    # Remove only the known paper border and level-number region. Unlike the old
    # extractor, do not delete stable edge pixels: those include the animated 木
    # radical and the long spear stroke as they travel toward the card edge.
    keep = np.zeros((FRAME_HEIGHT, FRAME_WIDTH), dtype=bool)
    keep[20:203, 20:201] = True
    keep[20:75, 171:201] = False
    alpha = np.where(keep, alpha, 0)
    alpha = np.where(alpha >= 20, alpha, 0).astype(np.uint8)
    frame[..., 3] = alpha
    return Image.fromarray(frame, "RGBA")


def main():
    source = Image.open(SOURCE).convert("RGBA")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    CONTACT.parent.mkdir(parents=True, exist_ok=True)
    frames = []
    sheet = Image.new("RGBA", (FRAME_WIDTH * FRAME_COUNT, FRAME_HEIGHT), (0, 0, 0, 0))
    for index in range(FRAME_COUNT):
        raw = source.crop((index * FRAME_WIDTH, 0, (index + 1) * FRAME_WIDTH, FRAME_HEIGHT))
        frame = extract(raw)
        frames.append(frame)
        sheet.alpha_composite(frame, (index * FRAME_WIDTH, 0))
    sheet.save(OUTPUT)

    shown_frames = frames[:24]
    cell = 190
    columns = 6
    rows = 4
    contact = Image.new("RGBA", (columns * cell, rows * cell), (236, 232, 215, 255))
    draw = ImageDraw.Draw(contact)
    for index, frame in enumerate(shown_frames):
        thumb = frame.resize((170, 170), Image.Resampling.LANCZOS)
        x = index % columns * cell + 10
        y = index // columns * cell + 16
        contact.alpha_composite(thumb, (x, y))
        draw.text((x, y - 12), f"f{index:02d}", fill=(120, 45, 25, 255))
    contact.save(CONTACT)


if __name__ == "__main__":
    main()
