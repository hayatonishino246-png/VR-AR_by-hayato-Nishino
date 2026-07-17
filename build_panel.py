#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ポスター貼り込み用「AR案内パネル」と QRコードを生成する。
使い方:  python3 build_panel.py "https://ユーザー名.github.io/リポジトリ名/ar.html"
URL省略時はプレースホルダで生成（公開URL確定後に再実行して差し替え）。
"""
import sys, os
import qrcode
from qrcode.constants import ERROR_CORRECT_M
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.dirname(os.path.abspath(__file__))
MARK = os.path.join(OUT, "markers")

URL = sys.argv[1] if len(sys.argv) > 1 else "https://example.github.io/vr-ar/ar.html"
IS_PLACEHOLDER = (len(sys.argv) <= 1)

NAVY = (31, 58, 95)
NAVY2 = (43, 108, 255)
CYAN = (25, 150, 200)
INK = (25, 32, 42)
GREY = (110, 120, 132)

def cjk(size):
    for p in ["/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size, index=0)
    return ImageFont.load_default()

def cjk_med(size):
    p = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
    if os.path.exists(p):
        return ImageFont.truetype(p, size, index=0)
    return cjk(size)

# ---- QR 生成 ----
qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_M, box_size=14, border=2)
qr.add_data(URL); qr.make(fit=True)
qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
qr_img.save(os.path.join(OUT, "qr.png"))
print("qr.png:", qr_img.size, "->", URL)

# ---- パネル合成 ----
W, H = 1240, 1860
img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)

def center_text(draw, cx, y, text, font, fill):
    bb = draw.textbbox((0, 0), text, font=font)
    draw.text((cx - (bb[2]-bb[0])/2, y), text, font=font, fill=fill)

def rounded(draw, box, r, outline=None, width=3, fill=None):
    draw.rounded_rectangle(box, radius=r, outline=outline, width=width, fill=fill)

# 外枠
rounded(d, (14, 14, W-14, H-14), 30, outline=NAVY, width=6)

# ヘッダー帯
d.rounded_rectangle((44, 46, W-44, 210), radius=22, fill=NAVY)
center_text(d, W//2, 70, "スマホをかざして", cjk(46), (150, 210, 255))
center_text(d, W//2, 122, "VR環境をARで見よう！", cjk(62), "white")

# リード文
center_text(d, W//2, 236, "ポスターからVR環境が飛び出し、", cjk_med(34), INK)
center_text(d, W//2, 282, "移動法（テレポート/スムーズ移動）を体験できます", cjk_med(34), INK)

# ── STEP 1 QR ──
y1 = 360
d.ellipse((70, y1, 138, y1+68), fill=NAVY2)
center_text(d, 104, y1+8, "1", cjk(46), "white")
d.text((160, y1+8), "QRコードを読み取る", font=cjk(44), fill=INK)
qr_disp = qr_img.resize((430, 430), Image.NEAREST)
qx = (W - 430)//2
img.paste(qr_disp, (qx, y1+90))
d.rectangle((qx-6, y1+84, qx+436, y1+526), outline=NAVY, width=4)
center_text(d, W//2, y1+540, "スマホのカメラ／QRリーダーで読み取り「カメラを許可」", cjk_med(28), GREY)

# ── STEP 2 マーカー ──
y2 = y1 + 620
d.ellipse((70, y2, 138, y2+68), fill=NAVY2)
center_text(d, 104, y2+8, "2", cjk(46), "white")
d.text((160, y2+8), "このマーカーにかざす", font=cjk(44), fill=INK)
mk = Image.open(os.path.join(MARK, "vr-marker.png")).resize((430, 430), Image.LANCZOS)
mx = (W - 430)//2
img.paste(mk, (mx, y2+90))
center_text(d, W//2, y2+540, "枠全体が画面に映るようにゆっくり近づけてください", cjk_med(28), GREY)

# フッター
fy = H - 150
d.line((60, fy, W-60, fy), fill=(220, 225, 232), width=3)
center_text(d, W//2, fy+18, "産業能率大学 情報マネジメント学部　川野邊研究室　西野 颯人", cjk_med(30), NAVY)
center_text(d, W//2, fy+62, "アプリ不要／iPhone・Android対応（Webブラウザで動作）", cjk_med(26), GREY)

if IS_PLACEHOLDER:
    # 目立つ注意帯（公開URL未設定）
    d.rounded_rectangle((qx-6, y1+84, qx+436, y1+526), radius=10, outline=(220, 60, 60), width=8)
    warn = "⚠ 仮URLです：公開後に差し替え"
    bb = d.textbbox((0,0), warn, font=cjk(30))
    d.rectangle((W//2-(bb[2]-bb[0])//2-14, y1+250, W//2+(bb[2]-bb[0])//2+14, y1+300), fill=(220,60,60))
    center_text(d, W//2, y1+256, warn, cjk(30), "white")

img.save(os.path.join(OUT, "ar-panel.png"))
print("ar-panel.png:", img.size, "placeholder=" + str(IS_PLACEHOLDER))
