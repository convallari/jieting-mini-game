import json
import re
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output" / "reference" / "original-web"
OUTPUT = SOURCE / "extracted"
PUBLIC_OUTPUT = ROOT / "public" / "original-glyphs"
PUBLIC_CONTACTS = ROOT / "public" / "review-contacts"
PUBLIC_EFFECTS = ROOT / "public" / "original-effects"
PUBLIC_UNITS = ROOT / "public" / "original-units"
PUBLIC_PROPS = ROOT / "public" / "original-props"


def load_atlas(stem: str):
    atlas = json.loads((SOURCE / f"{stem}-AutoAtlas.atlas").read_text(encoding="utf-8"))
    image = Image.open(SOURCE / f"{stem}-AutoAtlas.png").convert("RGBA")
    return atlas["frames"], image


def restore_frame(sheet: Image.Image, item: dict) -> Image.Image:
    frame = item["frame"]
    source = item["sourceSize"]
    offset = item["spriteSourceSize"]
    crop = sheet.crop((frame["x"], frame["y"], frame["x"] + frame["w"], frame["y"] + frame["h"]))
    restored = Image.new("RGBA", (source["w"], source["h"]), (0, 0, 0, 0))
    restored.alpha_composite(crop, (offset["x"], offset["y"]))
    return restored


def numbered_entries(frames: dict, prefix: str):
    matches = []
    for name, item in frames.items():
        if not name.startswith(prefix) or not name.endswith(".png"):
            continue
        match = re.search(r"(\d+)\.png$", name)
        if not match:
            continue
        number = int(match.group(1))
        matches.append((number, name, item))
    return sorted(matches)


def make_contact(sheet: Image.Image, entries, destination: Path, cell=180, columns=6):
    if not entries:
        return
    rows = (len(entries) + columns - 1) // columns
    contact = Image.new("RGBA", (columns * cell, rows * cell), (236, 232, 215, 255))
    draw = ImageDraw.Draw(contact)
    for index, (number, _, item) in enumerate(entries):
        frame = restore_frame(sheet, item)
        scale = min((cell - 20) / frame.width, (cell - 26) / frame.height)
        shown = frame.resize((max(1, round(frame.width * scale)), max(1, round(frame.height * scale))), Image.Resampling.LANCZOS)
        x = (index % columns) * cell + (cell - shown.width) // 2
        y = (index // columns) * cell + (cell - shown.height) // 2
        contact.alpha_composite(shown, (x, y))
        draw.text((index % columns * cell + 6, index // columns * cell + 5), f"f{number:02d}", fill=(120, 45, 25, 255))
    contact.save(destination)


def make_sheet(sheet: Image.Image, entries, destination: Path):
    if not entries:
        return None
    restored = [restore_frame(sheet, item) for _, _, item in entries]
    width, height = restored[0].size
    spritesheet = Image.new("RGBA", (width * len(restored), height), (0, 0, 0, 0))
    for index, frame in enumerate(restored):
        spritesheet.alpha_composite(frame, (index * width, 0))
    spritesheet.save(destination)
    return {"frames": len(restored), "frameWidth": width, "frameHeight": height}


def make_qiang_frames(sheet: Image.Image, frames: dict, entries):
    base = restore_frame(sheet, frames["soldier/soldier_2.png"])
    wood = base.copy()
    # The source game stores 枪 as a static 木 radical plus an animated 仓 radical.
    # Keep the left radical from the 80x80 idle glyph and place the 41x68 animation
    # in the same right-hand region used by the original composite.
    pixels = wood.load()
    for y in range(wood.height):
        for x in range(wood.width):
            if x >= 36:
                pixels[x, y] = (0, 0, 0, 0)
    result = []
    for _, _, item in entries:
        frame = Image.new("RGBA", base.size, (0, 0, 0, 0))
        frame.alpha_composite(wood)
        frame.alpha_composite(restore_frame(sheet, item), (35, 6))
        result.append(frame)
    return result


def save_frames(frames, destination: Path):
    width, height = frames[0].size
    spritesheet = Image.new("RGBA", (width * len(frames), height), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        spritesheet.alpha_composite(frame, (index * width, 0))
    spritesheet.save(destination)
    return {"frames": len(frames), "frameWidth": width, "frameHeight": height}


def save_contact_frames(frames, destination: Path, cell=180, columns=6):
    rows = (len(frames) + columns - 1) // columns
    contact = Image.new("RGBA", (columns * cell, rows * cell), (236, 232, 215, 255))
    draw = ImageDraw.Draw(contact)
    for index, frame in enumerate(frames):
        scale = min((cell - 20) / frame.width, (cell - 26) / frame.height)
        shown = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
        x = index % columns * cell + (cell - shown.width) // 2
        y = index // columns * cell + (cell - shown.height) // 2
        contact.alpha_composite(shown, (x, y))
        draw.text((index % columns * cell + 6, index // columns * cell + 5), f"f{index:02d}", fill=(120, 45, 25, 255))
    contact.save(destination)


def save_normalized_frames(frames, destination: Path, size=96):
    spritesheet = Image.new("RGBA", (size * len(frames), size), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        scale = min(1, (size - 4) / frame.width, (size - 4) / frame.height)
        shown = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
        spritesheet.alpha_composite(shown, (index * size + (size - shown.width) // 2, (size - shown.height) // 2))
    spritesheet.save(destination)
    return {"frames": len(frames), "frameWidth": size, "frameHeight": size}


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    PUBLIC_OUTPUT.mkdir(parents=True, exist_ok=True)
    PUBLIC_CONTACTS.mkdir(parents=True, exist_ok=True)
    PUBLIC_EFFECTS.mkdir(parents=True, exist_ok=True)
    PUBLIC_UNITS.mkdir(parents=True, exist_ok=True)
    PUBLIC_PROPS.mkdir(parents=True, exist_ok=True)
    frames, sheet = load_atlas("gameObject")
    for source_name, output_name in {
        "soldier/farmer.png": "farmer.png",
        "soldier/hoe.png": "hoe.png",
        "soldier/goldMine.png": "gold-mine.png",
        "soldier/crops0.png": "crops-0.png",
        "soldier/crops1.png": "crops-1.png",
        "soldier/crops2.png": "crops-2.png",
        "soldier/crops3.png": "crops-3.png",
    }.items():
        if source_name in frames:
            restore_frame(sheet, frames[source_name]).save(PUBLIC_UNITS / output_name)

    props_frames, props_sheet = load_atlas("props")
    for source_name, item in props_frames.items():
        restore_frame(props_sheet, item).save(PUBLIC_PROPS / source_name)
    for soldier in range(4):
        base_name = f"soldier/soldier_{soldier}.png"
        if base_name in frames:
            base_frame = restore_frame(sheet, frames[base_name])
            base_frame.save(OUTPUT / f"soldier-{soldier}-base.png")
            preview = Image.new("RGBA", base_frame.size, (236, 232, 215, 255))
            preview.alpha_composite(base_frame)
            preview.resize((320, 320), Image.Resampling.NEAREST).save(OUTPUT / f"soldier-{soldier}-base-preview.png")
    manifest = {}
    names = {0: "dao", 1: "gong", 2: "qiang", 3: "qi"}
    for soldier in range(4):
        base = f"soldier/anim/soldier_{soldier}/skeleton-"
        for action in ("attack", "zhan"):
            entries = numbered_entries(frames, base + action + "_")
            make_contact(sheet, entries, OUTPUT / f"soldier-{soldier}-{action}-contact.png")
            if action == "attack":
                name = names[soldier]
                if soldier == 2:
                    full_frames = make_qiang_frames(sheet, frames, entries)
                    save_contact_frames(full_frames, PUBLIC_CONTACTS / f"{name}-attack-contact.png")
                    manifest[name] = save_frames(full_frames, PUBLIC_OUTPUT / f"{name}-attack-sheet.png")
                else:
                    make_contact(sheet, entries, PUBLIC_CONTACTS / f"{name}-attack-contact.png")
                    manifest[name] = make_sheet(sheet, entries, PUBLIC_OUTPUT / f"{name}-attack-sheet.png")

    effect_frames, effect_sheet = load_atlas("effect")
    effect_manifest = {}
    for effect in ("knife", "pike", "bow", "cavalry"):
        entries = numbered_entries(effect_frames, f"hitEffect/{effect}")
        make_contact(effect_sheet, entries, OUTPUT / f"hit-{effect}-contact.png", cell=140, columns=4)
        restored = [restore_frame(effect_sheet, item) for _, _, item in entries]
        effect_manifest[effect] = save_normalized_frames(restored, PUBLIC_EFFECTS / f"{effect}-hit-sheet.png")
    (PUBLIC_EFFECTS / "manifest.json").write_text(json.dumps(effect_manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (PUBLIC_OUTPUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
