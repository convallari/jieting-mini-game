from __future__ import annotations

import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


FPS = 30
MAX_FRAMES = 96
FFMPEG = Path("node_modules/ffmpeg-static/ffmpeg.exe")
FRAME_ROOT = Path("output/reference/dedicated-glyph-frames")
OUT = Path("public/reference-glyphs")
JS_MANIFEST = Path("src/referenceGlyphManifest.js")


GLYPHS = {
    "qiang": {
        "label": "枪",
        "video": "C:/Users/zhangxiaoyu/Desktop/游戏动画/枪.mp4",
        "crop": [192, 192, 224, 224],
        "note": "单独重传视频，九宫格中心枪格；能清楚观察清晰竖枪、遮挡和突刺变化。",
    },
    "dao": {
        "label": "刀",
        "video": "C:/Users/zhangxiaoyu/Desktop/游戏动画/刀.mp4",
        "crop": [230, 230, 270, 270],
        "note": "单独重传视频，九宫格中心刀格；能清楚观察刀形、斩击遮挡和恢复。",
    },
    "gong": {
        "label": "弓",
        "video": "C:/Users/zhangxiaoyu/Desktop/游戏动画/弓.mp4",
        "crop": [230, 230, 270, 270],
        "note": "单独重传视频，九宫格中心弓格；重点观察本体离散姿势切换。",
    },
    "qi": {
        "label": "骑",
        "video": "C:/Users/zhangxiaoyu/Desktop/游戏动画/骑.mp4",
        "crop": [230, 246, 270, 270],
        "note": "单独重传视频，九宫格中心骑格；重点观察字本体与冲刺残影/遮挡关系。",
    },
}


def load_font(size: int = 14) -> ImageFont.ImageFont:
    for name in ("arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


FONT = load_font()


def extract_frames(key: str, config: dict) -> list[Path]:
    if not FFMPEG.exists():
        raise FileNotFoundError(f"Missing ffmpeg executable: {FFMPEG}")
    video = Path(config["video"])
    if not video.exists():
        raise FileNotFoundError(f"Missing source video: {video}")

    out_dir = FRAME_ROOT / key
    out_dir.mkdir(parents=True, exist_ok=True)
    for frame in out_dir.glob("frame-*.png"):
        frame.unlink()

    x, y, w, h = config["crop"]
    command = [
        str(FFMPEG),
        "-hide_banner",
        "-y",
        "-i",
        str(video),
        "-vf",
        f"fps={FPS},crop={w}:{h}:{x}:{y}",
        "-frames:v",
        str(MAX_FRAMES),
        str(out_dir / "frame-%03d.png"),
    ]
    result = subprocess.run(command, cwd=Path.cwd())
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed for {key}: {result.returncode}")
    frames = sorted(out_dir.glob("frame-*.png"))
    if not frames:
        raise RuntimeError(f"No frames extracted for {key}")
    return frames


def load_frames(paths: list[Path]) -> list[Image.Image]:
    return [Image.open(path).convert("RGBA") for path in paths]


def build_sheet(frames: list[Image.Image]) -> Image.Image:
    frame_w, frame_h = frames[0].size
    sheet = Image.new("RGBA", (frame_w * len(frames), frame_h), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.paste(frame, (index * frame_w, 0))
    return sheet


def build_contact(frames: list[Image.Image], label: str) -> Image.Image:
    picks = [round(i * (len(frames) - 1) / 11) for i in range(12)]
    scale = 0.82
    thumb_w = round(frames[0].width * scale)
    thumb_h = round(frames[0].height * scale)
    cell_w = thumb_w + 14
    cell_h = thumb_h + 26
    cols = 4
    rows = 3
    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "#f4ead8")
    draw = ImageDraw.Draw(sheet)
    for n, frame_index in enumerate(picks):
        thumb = frames[frame_index].convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.BICUBIC)
        x = (n % cols) * cell_w + 7
        y = (n // cols) * cell_h + 20
        sheet.paste(thumb, (x, y))
        draw.text((x, y - 16), f"{label} f{frame_index + 1:03d}", fill="#2a211b", font=FONT)
    return sheet


def js_string(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def write_js_manifest(manifest: dict) -> None:
    JS_MANIFEST.write_text(f"export const REFERENCE_GLYPHS = {js_string(manifest)};\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "fps": FPS,
        "description": "Single-glyph reference sheets cropped from dedicated center-cell recordings for animation-lab comparison.",
        "glyphs": {},
    }

    for key, config in GLYPHS.items():
        frame_paths = extract_frames(key, config)
        frames = load_frames(frame_paths)
        sheet = build_sheet(frames)
        contact = build_contact(frames, config["label"])
        sheet_path = OUT / f"{key}-sheet.png"
        contact_path = OUT / f"{key}-contact.png"
        sheet.save(sheet_path)
        contact.save(contact_path)
        frame_w, frame_h = frames[0].size
        manifest["glyphs"][key] = {
            "label": config["label"],
            "source": Path(config["video"]).name,
            "crop": config["crop"],
            "sheet": f"{key}-sheet.png",
            "contact": f"{key}-contact.png",
            "frameWidth": frame_w,
            "frameHeight": frame_h,
            "frames": len(frames),
            "note": config["note"],
        }

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_js_manifest(manifest)
    print(f"Wrote {len(GLYPHS)} glyph reference sheets to {OUT}")


if __name__ == "__main__":
    main()
