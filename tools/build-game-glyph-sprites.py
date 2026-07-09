import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "reference-glyphs"
MANIFEST = ASSET_DIR / "manifest.json"
CONTACT_FRAMES = [0, 9, 17, 26, 35, 43, 52, 60, 69, 78, 86, 95]


def build_alpha(frame):
    rgb = frame[..., :3].astype(np.int32)
    r = rgb[..., 0]
    g = rgb[..., 1]
    b = rgb[..., 2]
    luma = (r * 299 + g * 587 + b * 114) // 1000
    saturation = np.maximum.reduce([r, g, b]) - np.minimum.reduce([r, g, b])

    dark_alpha = np.clip((150 - luma) * 2.7, 0, 255)
    dark_mask = luma < 142

    yellow_mask = (r > 160) & (g > 116) & (b < 128) & ((r - b) > 58) & (saturation > 48)
    yellow_alpha = np.clip((r + g - b - 210) * 1.45, 0, 230)

    alpha = np.where(dark_mask, dark_alpha, 0)
    alpha = np.maximum(alpha, np.where(yellow_mask, yellow_alpha, 0))
    return alpha.astype(np.uint8)


def edge_mask(width, height):
    y, x = np.ogrid[:height, :width]
    mask = (x < width * 0.12) | (x > width * 0.74) | (y < height * 0.13) | (y > height * 0.84)
    mask[:3, :] = True
    mask[-3:, :] = True
    mask[:, :3] = True
    mask[:, -3:] = True
    return mask


def remove_corner_labels(alpha):
    labels, count = ndimage.label(alpha > 36)
    if count == 0:
        return alpha
    height, width = alpha.shape
    cleaned = alpha.copy()
    for index, bounds in enumerate(ndimage.find_objects(labels), start=1):
        if bounds is None:
            continue
        ys, xs = bounds
        area = np.count_nonzero(labels[bounds] == index)
        if area > width * height * 0.026:
            continue
        x0, x1 = xs.start, xs.stop
        y0, y1 = ys.start, ys.stop
        cx = (x0 + x1) * 0.5
        cy = (y0 + y1) * 0.5
        compact = (x1 - x0) < width * 0.22 and (y1 - y0) < height * 0.34
        in_corner = (cx > width * 0.8 and cy < height * 0.38) or (cx > width * 0.72 and cy > height * 0.48)
        if compact and in_corner:
            cleaned[labels == index] = 0
    return cleaned


def extract_game_sheet(item):
    sheet = Image.open(ASSET_DIR / item["sheet"]).convert("RGBA")
    frame_width = item["frameWidth"]
    frame_height = item["frameHeight"]
    frames = item["frames"]
    out = Image.new("RGBA", (frame_width * frames, frame_height), (0, 0, 0, 0))
    edge_area = edge_mask(frame_width, frame_height)
    frame_arrays = []
    alpha_frames = []

    for frame_index in range(frames):
        x = frame_index * frame_width
        frame = np.array(sheet.crop((x, 0, x + frame_width, frame_height)), dtype=np.uint8)
        alpha = build_alpha(frame)
        frame_arrays.append(frame)
        alpha_frames.append(alpha)

    stable_dark = np.mean(np.stack(alpha_frames) > 18, axis=0) > 0.44
    remove_stable_edge = stable_dark & edge_area

    for frame_index, frame in enumerate(frame_arrays):
        alpha = alpha_frames[frame_index]
        alpha = np.where(remove_stable_edge, 0, alpha)
        alpha = remove_corner_labels(alpha)
        alpha = np.where(alpha < 22, 0, alpha).astype(np.uint8)
        frame[..., 3] = alpha
        out.alpha_composite(Image.fromarray(frame, "RGBA"), (frame_index * frame_width, 0))

    return out


def make_contact(sheet, item):
    frame_width = item["frameWidth"]
    frame_height = item["frameHeight"]
    scale = 0.42
    thumb_w = round(frame_width * scale)
    thumb_h = round(frame_height * scale)
    pad = 10
    label_h = 18
    cols = 4
    rows = 3
    contact = Image.new(
        "RGBA",
        (cols * thumb_w + (cols + 1) * pad, rows * (thumb_h + label_h) + (rows + 1) * pad),
        (246, 238, 220, 255),
    )
    draw = ImageDraw.Draw(contact)
    font = ImageFont.load_default()
    for i, frame_index in enumerate(CONTACT_FRAMES):
        col = i % cols
        row = i // cols
        x = pad + col * (thumb_w + pad)
        y = pad + row * (thumb_h + label_h + pad)
        draw.text((x, y), f"f{frame_index + 1:03d}", fill=(54, 43, 36, 255), font=font)
        sx = frame_index * frame_width
        thumb = sheet.crop((sx, 0, sx + frame_width, frame_height)).resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        contact.alpha_composite(thumb, (x, y + label_h))
    return contact


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for key, item in manifest["glyphs"].items():
        game_sheet = extract_game_sheet(item)
        sheet_name = f"{key}-game-sheet.png"
        contact_name = f"{key}-game-contact.png"
        game_sheet.save(ASSET_DIR / sheet_name)
        make_contact(game_sheet, item).save(ASSET_DIR / contact_name)
        item["gameSheet"] = sheet_name
        item["gameContact"] = contact_name
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
