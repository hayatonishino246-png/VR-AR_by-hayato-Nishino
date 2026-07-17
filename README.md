# VR酔い研究｜移動法 AR デモ（オープンキャンパス用）

ポスターの「VR」マーカーにスマホをかざすと、実験用VR環境のミニチュアが立体的に浮かび上がり、
**移動法（テレポート／スムーズ移動）** と **視覚情報の最適化（トンネル効果／暗闇シーン）** を
体験・比較できる WebAR です。アプリ不要・iPhone / Android のブラウザで動きます。

- 技術：A-Frame 1.6.0 ＋ AR.js 3.4.8（マーカー型／パターンマーカー）
- ライブラリと校正ファイルはすべて同梱済み。**会場のWiFiが不安定でも動作**します。

---

## 1. ファイル構成

```
vr-ar/
├─ index.html          … 案内ページ（QR・使い方・体験ボタン）※最初に開くページ
├─ ar.html             … ARページ（カメラでマーカーを認識）
├─ viewer.html         … 3Dビュー（カメラ不要・指で回せる／予備）
├─ world.js            … VR環境ミニチュア＋移動法デモ本体
├─ ui.js / ui.css      … 画面UI（ボタン・説明・視界HUD）
├─ vendor/             … A-Frame / AR.js / QR ライブラリ（同梱）
├─ data/camera_para.dat … AR.js のカメラ校正ファイル（同梱）
├─ markers/
│   ├─ vr-marker.png    … 印刷用マーカー（ポスターに掲示）
│   └─ vr-marker.patt   … マーカー認識データ（触らない）
├─ ar-panel.png        … ポスター貼り込み用パネル（QR＋マーカー＋説明）
├─ qr.png              … QR単体
├─ generate_marker.py  … マーカー再生成スクリプト（通常は不要）
└─ build_panel.py      … QR／パネル再生成スクリプト（URL確定後に実行）
```

---

## 2. GitHub Pages で公開する（HTTPSが必須）

カメラを使うAR・QRには **常時HTTPSのURL** が必要です。GitHub Pages が無料で確実です。

1. GitHub にログイン → 右上「＋」→ **New repository**
   - Repository name 例：`vr-ar`
   - **Public** を選択 → **Create repository**
2. リポジトリ画面で **Add file → Upload files**
   - この `vr-ar` フォルダの **中身をすべて** ドラッグ＆ドロップ
     （`index.html` などが最上位に来るように。`vr-ar` フォルダごとではなく“中身”を入れる）
   - **Commit changes**
3. **Settings → Pages**
   - Source：**Deploy from a branch**
   - Branch：**main** / フォルダ：**/ (root)** → **Save**
4. 1〜2分待つと、上部に公開URLが表示されます
   例：`https://ユーザー名.github.io/vr-ar/`
   - 案内ページ：`https://ユーザー名.github.io/vr-ar/`
   - ARページ ：`https://ユーザー名.github.io/vr-ar/ar.html`

> スマホで公開URLを開き、案内ページ上のQRから ar.html に進めるか確認してください。

---

## 3. 公開URLで QR とポスターパネルを作り直す

`ar-panel.png` / `qr.png` は最初は「仮URL」で入っています。**公開URLが決まったら**作り直します。

```bash
python3 build_panel.py "https://ユーザー名.github.io/vr-ar/ar.html"
```

- 実行すると `qr.png` と `ar-panel.png`（仮URLの赤枠なし）が上書きされます。
- Python と Pillow・qrcode が必要：`pip install pillow qrcode`
- **作り直しが難しい場合**：公開URLを教えてもらえれば、こちらで差し替え版を作成します。

> 案内ページ（index.html）のQRは、開いたURLから**自動生成**されるので差し替え不要です。
> 印刷して貼るQRだけ、上記で確定URL版に作り直してください。

---

## 4. ポスターへの貼り込み

- `ar-panel.png`（QR＋マーカー＋手順が1枚になったパネル）を、ポスター右側の
  「UI/UXの導入 → 移動法の導入」付近の空きスペースに配置するのがおすすめです。
- マーカーだけを大きく載せたい場合は `markers/vr-marker.png` を使用。
  **マーカーの周囲には白い余白（余白＝クワイエットゾーン）を必ず残してください**（認識が安定します）。
- 印刷後、実機（スマホ）で必ず一度テストしてください。

---

## 5. 当日の流れ（来場者向け）

1. スマホのカメラ／QRリーダーでQRを読み取り、ARページを開く
2. 「カメラを許可」を選ぶ
3. ポスターの「VR」マーカーに、枠全体が映るようにかざす
4. 画面下のボタンで **VR環境／テレポート／スムーズ移動／視覚最適化** を切り替えて比較

うまく映らないときは、明るい場所でマーカーを画面いっぱいに。
カメラが使えない端末では「3Dで見る」（viewer.html）で中身を確認できます。

---

## 6. 対応ブラウザ・注意点

- iPhone：**Safari**、Android：**Chrome** が確実（アプリ内ブラウザは不可の場合あり）。
- 必ず **https://** で開くこと（http だとカメラが起動しません）。
- 初回はカメラ許可のダイアログで「許可」を選ぶ必要があります。

---

## 7. 中身をカスタマイズしたいとき

- 部屋の色・ブロック配置：`world.js` の「床／壁／ブロック」セクション
- 移動経路：`world.js` の `this.path`
- 説明文・ボタン名：`ui.js` の `INFO` / `LABEL`
- マーカーの絵柄を変える：`generate_marker.py` を編集して実行（`.patt` と `.png` が再生成されます）

作：産業能率大学 情報マネジメント学部 川野邊研究室　西野 颯人
