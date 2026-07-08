from pathlib import Path
from PIL import Image
from collections import deque


ROOT = Path("output/reference/glyph-crops")
OUT = Path("src/glyphMasks.js")
SIZE = 48


SOURCES = {
    "刀": ("26_dao_v1_board.png", None, False),
    "枪": ("24_qiang_v1_board1.png", None, False),
    "弓": ("27_gong_v1_board.png", None, False),
    "骑": ("29_qi_v1_board.png", None, False),
    "赵": ("08_zhao_board.png", None, True),
    "张": ("21_zhang_v1.png", None, True),
    "黄": ("25_huang_v1_board.png", None, True),
    "忠": ("10_huangzhong_pair.png", (78, 4, 146, 76), True),
    "兵": ("23_bing_v1_right.png", None, False),
    "贼": ("12_zei_right2.png", None, False),
    "斗": ("22_dou_v1_left.png", None, False),
}


def is_ink(pixel, include_gold):
    r, g, b = pixel[:3]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    dark = lum < 105 and max(r, g, b) - min(r, g, b) < 95
    warm_ink = include_gold and 55 < r < 210 and 35 < g < 170 and b < 130 and lum < 178 and r > b * 1.25
    return dark or warm_ink


def component_filter(mask):
    h = len(mask)
    w = len(mask[0])
    seen = [[False for _ in range(w)] for _ in range(h)]
    out = [[False for _ in range(w)] for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if seen[y][x] or not mask[y][x]:
                continue
            q = deque([(x, y)])
            seen[y][x] = True
            cells = []
            while q:
                cx, cy = q.popleft()
                cells.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h or seen[ny][nx] or not mask[ny][nx]:
                        continue
                    seen[ny][nx] = True
                    q.append((nx, ny))
            xs = [cx for cx, _ in cells]
            ys = [cy for _, cy in cells]
            minx, maxx = min(xs), max(xs)
            miny, maxy = min(ys), max(ys)
            box_w = maxx - minx + 1
            box_h = maxy - miny + 1
            touches_card_edge = minx <= 5 or miny <= 5 or maxx >= w - 6 or maxy >= h - 6
            looks_like_border = (box_w > w * 0.52 and box_h <= 5) or (box_h > h * 0.52 and box_w <= 5)
            if len(cells) >= 5 and not touches_card_edge and not looks_like_border:
                for cx, cy in cells:
                    out[cy][cx] = True
    return out


def build_mask(filename, crop, include_gold):
    im = Image.open(ROOT / filename).convert("RGB")
    if crop:
        im = im.crop(crop)
    im = im.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    pix = im.load()
    edge = 6
    mask = [[False for _ in range(SIZE)] for _ in range(SIZE)]
    for y in range(SIZE):
        for x in range(SIZE):
            if x < edge or y < edge or x >= SIZE - edge or y >= SIZE - edge:
                continue
            if x > SIZE * 0.69 and y < SIZE * 0.31:
                continue
            if is_ink(pix[x, y], include_gold):
                mask[y][x] = True
    return component_filter(mask)


def encode_rows(mask):
    rows = []
    for row in mask:
        bits = "".join("1" if value else "0" for value in row)
        rows.append(f"{int(bits, 2):012x}")
    return rows


def main():
    lines = [
        "export const GLYPH_MASKS = {",
    ]
    for glyph, (filename, crop, include_gold) in SOURCES.items():
        rows = encode_rows(build_mask(filename, crop, include_gold))
        lines.append(f'  "{glyph}": {{ size: {SIZE}, rows: [')
        for row in rows:
            lines.append(f'    "{row}",')
        lines.append("  ] },")
    lines.append("};")
    lines.append("")
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
