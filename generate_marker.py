#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VR酔い研究オーキャン用 AR.js カスタムパターンマーカー生成
- 高コントラスト・回転非対称なインナー画像を作成
- AR.js(ARToolKit)公式generatorと同一アルゴリズムで .patt を生成
- 印刷用マーカーPNG（黒枠25% + 中央50%にパターン）を合成
"""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.dirname(os.path.abspath(__file__))
MARK = os.path.join(OUT, "markers")
os.makedirs(MARK, exist_ok=True)

# ---- フォント ----
def load_font(size, bold=True):
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for c in cands:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

def load_cjk(size):
    cands = [
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    ]
    for c in cands:
        if os.path.exists(c):
            return ImageFont.truetype(c, size, index=0)
    return load_font(size)

# ---- 1) インナーパターン画像（白地に黒の高コントラスト・非対称デザイン）----
S = 512
inner = Image.new("RGB", (S, S), "white")
d = ImageDraw.Draw(inner)

# 回転非対称を保証する左上のソリッドブロック
d.rectangle([28, 28, 190, 150], fill="black")
# 右下の三角形（さらに非対称性を強調）
d.polygon([(S-28, S-28), (S-200, S-28), (S-28, S-200)], fill="black")

# 中央に太字 "VR"
f = load_font(300)
txt = "VR"
bb = d.textbbox((0, 0), txt, font=f)
tw, th = bb[2]-bb[0], bb[3]-bb[1]
d.text(((S-tw)/2 - bb[0], (S-th)/2 - bb[1] + 10), txt, fill="black", font=f)

inner.save(os.path.join(MARK, "vr-inner.png"))

# ---- 2) .patt 生成（AR.js encodeImage と同一仕様）----
# 仕様: 4方位, BGRチャンネル順, 各値を3桁右詰め(スペース埋め),
#       列はスペース区切り, 各行末に改行, ブロック間に空行1つ。
def encode_patt(img):
    base = img.convert("RGB")
    blocks = []
    for k in range(4):  # 4方位（90°ごと。回転方向は集合として同一なので不問）
        rot = base.rotate(-90 * k, expand=True)
        small = rot.resize((16, 16), Image.LANCZOS)
        px = small.load()
        rows = []
        for ch in (2, 1, 0):  # BGR順
            for y in range(16):
                rows.append(" ".join(str(px[x, y][ch]).rjust(3) for x in range(16)))
        blocks.append("\n".join(rows))
    return "\n\n".join(blocks) + "\n"

patt = encode_patt(inner)
with open(os.path.join(MARK, "vr-marker.patt"), "w") as fp:
    fp.write(patt)

# 妥当性チェック：4ブロック×48行=192行 + 空行3
lines = patt.split("\n")
non_empty = [l for l in lines if l.strip() != ""]
assert len(non_empty) == 192, f"patt行数異常: {len(non_empty)}"
# 各行16値
for l in non_empty:
    assert len(l.split()) == 16, "列数異常"
print("patt OK: 192 data lines, 16 cols each")

# ---- 3) 印刷用マーカーPNG（黒枠25%×各辺 + 中央50%にパターン）----
FULL = 1200
border = int(FULL * 0.25)   # patternRatio=0.5 -> 各辺25%
inner_px = FULL - 2 * border  # = 600
marker = Image.new("RGB", (FULL, FULL), "black")
marker.paste(inner.resize((inner_px, inner_px), Image.LANCZOS), (border, border))
# 周囲に白のクワイエットゾーン（検出安定用）
QZ = 140
canvas = Image.new("RGB", (FULL + 2*QZ, FULL + 2*QZ), "white")
canvas.paste(marker, (QZ, QZ))
canvas.save(os.path.join(MARK, "vr-marker.png"))
print("marker.png:", canvas.size)

print("done")
