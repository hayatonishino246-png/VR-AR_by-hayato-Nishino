/* =====================================================================
 * VR酔い研究 オープンキャンパス AR デモ  ―  共有シーン定義
 * A-Frame コンポーネント "vrworld"
 *   - Unreal Engine で作った実験用 VR 環境(グレーボックス)のミニチュアを構築
 *   - 移動法(テレポート / スムーズ)と視覚情報の最適化(トンネル効果 / 暗闇シーン)を
 *     アニメーションで再現する
 *   - 画面下の HUD(ユーザーの視界)を毎フレーム描画して視覚効果を可視化する
 * このファイルは ar.html(マーカーAR) と viewer.html(カメラ無し3D) で共用する。
 * =================================================================== */
(function () {
  const THREE = AFRAME.THREE;

  /* ---------- テクスチャ生成(自己完結・外部画像不要) ---------- */
  function makeFloorTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#6b7079'; g.fillRect(0, 0, 256, 256);
    // 目地グリッド
    g.strokeStyle = '#565b63'; g.lineWidth = 4;
    for (let i = 0; i <= 256; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    g.strokeStyle = '#7b828c'; g.lineWidth = 1;
    for (let i = 32; i < 256; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function makeWallTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#8a9099'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#7d838c';
    for (let y = 0; y < 256; y += 64)
      for (let x = 0; x < 256; x += 64)
        if (((x / 64) + (y / 64)) % 2 === 0) g.fillRect(x, y, 64, 64);
    g.strokeStyle = '#5f656d'; g.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  /* =================================================================
   *  A-Frame コンポーネント: vrworld
   * ============================================================== */
  AFRAME.registerComponent('vrworld', {
    init: function () {
      const root = this.el.object3D;
      this.clock = 0;

      // ---- ライト ----
      const amb = new THREE.AmbientLight(0xffffff, 0.85);
      const dir = new THREE.DirectionalLight(0xffffff, 0.7);
      dir.position.set(1.5, 3, 1.2);
      root.add(amb, dir);
      this.ambient = amb;

      const HALF = 0.8;   // 床の半径(自然座標。#content 側で 0.5 に縮小)

      // ---- 床 ----
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(HALF * 2, HALF * 2),
        new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.95, metalness: 0.0 })
      );
      floor.rotation.x = -Math.PI / 2;
      root.add(floor);

      // ---- 壁(低め。中を見せるため高さ0.34) ----
      const wallTex = makeWallTexture();
      const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 });
      const WH = 0.34, TWK = 0.03;
      const mkWall = (w, h, d, x, y, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        m.position.set(x, y, z); root.add(m); return m;
      };
      mkWall(HALF * 2, WH, TWK, 0, WH / 2, -HALF);        // 奥
      mkWall(HALF * 2, WH, TWK, 0, WH / 2, HALF);         // 手前
      mkWall(TWK, WH, HALF * 2, -HALF, WH / 2, 0);        // 左
      mkWall(TWK, WH, HALF * 2, HALF, WH / 2, 0);         // 右

      // ---- 室内のブロック(UEテンプレの箱・机) ----
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.85 });
      const boxMat2 = new THREE.MeshStandardMaterial({ color: 0x7f858d, roughness: 0.85 });
      const mkBox = (w, h, d, x, z, mat) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || boxMat);
        m.position.set(x, h / 2, z); root.add(m); return m;
      };
      mkBox(0.16, 0.16, 0.16, 0.0, 0.0, boxMat);          // 中央キューブ
      mkBox(0.26, 0.1, 0.16, -0.05, -0.5, boxMat2);       // 机風
      mkBox(0.12, 0.22, 0.12, 0.55, 0.1, boxMat);         // 柱風

      // ---- プレイヤー(VRユーザー) ----
      const player = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2b6cff, roughness: 0.6 });
      const headMat = new THREE.MeshStandardMaterial({ color: 0xf1c9a5, roughness: 0.7 });
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x101318, roughness: 0.3, metalness: 0.4 });
      const ctrlMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.5 });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 16), bodyMat);
      body.position.y = 0.08;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 16), headMat);
      head.position.y = 0.2;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.05, 0.05), visorMat);
      visor.position.set(0, 0.205, 0.03);
      // コントローラー(両手)
      const cL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.06), ctrlMat);
      const cR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.06), ctrlMat);
      cL.position.set(-0.07, 0.12, 0.06); cR.position.set(0.07, 0.12, 0.06);
      player.add(body, head, visor, cL, cR);
      root.add(player);
      this.player = player; this.ctrlR = cR;

      // ---- テレポート放物線(アーク=太いチューブで視認性UP) ----
      this.ARCN = 24;
      this.arcMat = new THREE.MeshBasicMaterial({ color: 0x39d0ff, transparent: true, opacity: 0.95 });
      const arc = new THREE.Mesh(new THREE.BufferGeometry(), this.arcMat);
      arc.frustumCulled = false; arc.visible = false;
      root.add(arc); this.arc = arc;

      // ---- 着地点レティクル ----
      const reticle = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.008, 12, 40),
        new THREE.MeshBasicMaterial({ color: 0x39d0ff })
      );
      ring.rotation.x = -Math.PI / 2;
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.02, 24),
        new THREE.MeshBasicMaterial({ color: 0x39d0ff, transparent: true, opacity: 0.6 })
      );
      dot.rotation.x = -Math.PI / 2;
      reticle.add(ring, dot); reticle.position.y = 0.012;
      reticle.visible = false; root.add(reticle); this.reticle = reticle;

      // ---- ワールド内のトンネル(視野制限)リング ----
      const vig = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.03, 12, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.0, side: THREE.DoubleSide })
      );
      vig.rotation.x = -Math.PI / 2; vig.position.y = 0.2;
      root.add(vig); this.vig = vig;

      // ---- 移動経路(部屋の四隅ループ) ----
      const R = 0.5;
      this.path = [
        { x: -R, z: R }, { x: R, z: R }, { x: R, z: -0.42 }, { x: -R, z: -0.42 }
      ];
      this.idx = 0;
      this.pos = { x: this.path[0].x, z: this.path[0].z };
      this.heading = 0;
      this._placePlayer(this.pos.x, this.pos.z, 0);

      // 状態
      this.mode = 'room';
      this.phase = 'aim';
      this.phaseT = 0;
      this.darkT = 0;      // 暗闇シーン残り時間
      this.darkGap = 0;    // 次の暗闇までのカウンタ
      this.flash = 0;      // テレポート時のフラッシュ

      // HUD 状態(外部の描画関数へ渡す)
      this.hud = { mode: 'room', moving: false, flow: 0, fov: 1, dark: false };

      window.__vrworld = this;   // UI からの API
      this.setMode('room');
    },

    _placePlayer: function (x, z, heading) {
      this.player.position.set(x, 0, z);
      if (heading !== undefined) this.player.rotation.y = heading;
    },

    setMode: function (m) {
      this.mode = m;
      this.phase = 'aim'; this.phaseT = 0; this.darkT = 0; this.darkGap = 0; this.flash = 0;
      this.idx = (m === 'teleport') ? 1 : 0;   // テレポートは開始地点と着地点を必ず別にする
      this.pos = { x: this.path[0].x, z: this.path[0].z };
      this._placePlayer(this.pos.x, this.pos.z, this.heading);
      this.arc.visible = false;
      this.reticle.visible = false;
      this.vig.material.opacity = 0;
      this.hud.mode = m; this.hud.dark = false; this.hud.moving = false;
      this.hud.flow = 0; this.hud.fov = 1;
      if (this.ambient) this.ambient.intensity = 0.85;
    },

    _updateArc: function (from, to) {
      const h = 0.3 + 0.22 * from.distanceTo(to);
      const pts = [];
      for (let i = 0; i < this.ARCN; i++) {
        const t = i / (this.ARCN - 1);
        const x = from.x + (to.x - from.x) * t;
        const z = from.z + (to.z - from.z) * t;
        const y = from.y + (to.y - from.y) * t + 4 * h * t * (1 - t);
        pts.push(new THREE.Vector3(x, y, z));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(curve, this.ARCN, 0.008, 8, false);
      if (this.arc.geometry) this.arc.geometry.dispose();
      this.arc.geometry = geo;
    },

    tick: function (time, dt) {
      dt = Math.min(dt || 16, 60) / 1000;   // 秒(スパイク抑制)
      this.clock += dt;
      const H = this.hud;

      // プレイヤーの微小な上下動(生きている感じ)
      const bob = Math.sin(this.clock * 3) * 0.006;

      if (this.mode === 'room') {
        this.player.position.y = bob;
        H.moving = false; H.flow = 0; H.fov = 1; H.dark = false;

      } else if (this.mode === 'teleport') {
        this.phaseT += dt;
        const target = this.path[this.idx];
        const tv = new THREE.Vector3(target.x, 0, target.z);
        // コントローラー先端(ワールド座標)
        const from = new THREE.Vector3(this.pos.x, 0.16, this.pos.z);
        if (this.phase === 'aim') {
          // 着地点の方を向く
          const hd = Math.atan2(tv.x - this.pos.x, tv.z - this.pos.z);
          this.player.rotation.y = hd; this.heading = hd;
          this.arc.visible = true;
          this._updateArc(from, tv);
          this.reticle.visible = true;
          this.reticle.position.set(tv.x, 0.012, tv.z);
          const s = 1 + Math.sin(this.clock * 6) * 0.12;
          this.reticle.scale.set(s, s, s);
          this.player.position.y = bob;
          H.moving = false; H.flow = 0; H.fov = 1; H.dark = false;
          if (this.phaseT > 1.7) { this.phase = 'jump'; this.phaseT = 0; }
        } else { // jump = 瞬間移動
          this.pos.x = tv.x; this.pos.z = tv.z;
          this._placePlayer(this.pos.x, this.pos.z, this.heading);
          this.arc.visible = false; this.reticle.visible = false;
          this.flash = 1;
          this.idx = (this.idx + 1) % this.path.length;
          this.phase = 'wait'; this.phaseT = 0;
          H.flow = 0.6; // 瞬間の視点跳躍
        }
        if (this.phase === 'wait') {
          this.phaseT += 0; // already advanced
          H.flow *= 0.85;
          if (this.phaseT > 0.55) { this.phase = 'aim'; this.phaseT = 0; }
        }

      } else if (this.mode === 'smooth' || this.mode === 'visual') {
        // 連続移動(スティック前進)
        const target = this.path[this.idx];
        const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
        const dist = Math.hypot(dx, dz);
        const speed = 0.42;
        if (dist < 0.02) {
          this.idx = (this.idx + 1) % this.path.length;
        } else {
          const nx = dx / dist, nz = dz / dist;
          this.pos.x += nx * speed * dt;
          this.pos.z += nz * speed * dt;
          const hd = Math.atan2(nx, nz);
          // 進行方向へなめらかに旋回
          let d = hd - this.heading;
          while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          this.heading += d * Math.min(1, dt * 6);
        }
        this.player.position.set(this.pos.x, bob, this.pos.z);
        this.player.rotation.y = this.heading;
        H.moving = true; H.flow = 1.0;

        if (this.mode === 'smooth') {
          H.fov = 1; H.dark = false;               // 対策なし = 視界フル(酔いやすい)
          this.vig.material.opacity = 0;
          if (this.ambient) this.ambient.intensity = 0.85;
        } else {
          // 視覚情報の最適化: トンネル効果 + 暗闇シーン挿入
          H.fov = 0.45;                             // 周辺視野を絞る
          this.vig.material.opacity = 0.5;          // ワールド内リングを表示
          this.vig.position.set(this.pos.x, 0.2, this.pos.z);
          // 暗闇シーンの挿入(約6秒ごとに0.5秒)
          this.darkGap += dt;
          if (this.darkT > 0) {
            this.darkT -= dt;
            H.dark = true;
            if (this.ambient) this.ambient.intensity = 0.2;
          } else {
            H.dark = false;
            if (this.ambient) this.ambient.intensity = 0.85;
            if (this.darkGap > 6) { this.darkT = 0.5; this.darkGap = 0; }
          }
        }
      }

      // フラッシュ減衰
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);

      // HUD 描画
      if (window.VRHUD) window.VRHUD.render(H, this.clock);
    }
  });

  /* =================================================================
   *  HUD: ユーザーの一人称視界(2Dキャンバス)
   *   - 前進時に床グリッドを流す(オプティカルフロー)
   *   - visual モードでトンネル(ビネット)と暗闇を重ねる
   * ============================================================== */
  window.VRHUD = {
    canvas: null, ctx: null, scroll: 0,
    attach: function (canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d');
    },
    render: function (st, clock) {
      const cv = this.canvas; if (!cv) return;
      const g = this.ctx, W = cv.width, Hh = cv.height;

      // 前進でスクロール量を進める
      this.scroll += (st.flow || 0) * 0.045;
      const s = this.scroll;

      // 空
      const sky = g.createLinearGradient(0, 0, 0, Hh * 0.55);
      sky.addColorStop(0, '#8fc7ff'); sky.addColorStop(1, '#cfe6ff');
      g.fillStyle = sky; g.fillRect(0, 0, W, Hh * 0.55);
      // 床
      g.fillStyle = '#6b7079'; g.fillRect(0, Hh * 0.55, W, Hh * 0.45);

      const horizon = Hh * 0.55, cx = W / 2;
      // 床の奥行きグリッド(横線=手前に流れる)
      g.strokeStyle = 'rgba(60,64,70,0.9)'; g.lineWidth = 1.5;
      for (let i = 0; i < 10; i++) {
        let p = (i + (s % 1)) / 10;              // 0..1
        p = p * p;                                // 遠近感
        const y = horizon + p * (Hh - horizon);
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      }
      // 縦線(消失点へ)
      g.strokeStyle = 'rgba(60,64,70,0.55)';
      for (let k = -5; k <= 5; k++) {
        g.beginPath(); g.moveTo(cx + k * 10, horizon);
        g.lineTo(cx + k * (W / 2), Hh); g.stroke();
      }
      // 側壁のヒント
      g.fillStyle = 'rgba(138,144,153,0.55)';
      g.beginPath(); g.moveTo(0, horizon); g.lineTo(W * 0.16, horizon);
      g.lineTo(0, Hh); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(W, horizon); g.lineTo(W * 0.84, horizon);
      g.lineTo(W, Hh); g.closePath(); g.fill();

      // トンネル効果(ビネット): fov<1 で周辺を暗く
      const restrict = 1 - (st.fov ?? 1);          // 0=なし 〜 0.55=強
      if (restrict > 0.001) {
        const rOuter = Math.hypot(W, Hh) / 2;
        const rInner = rOuter * (0.62 - restrict * 0.55);
        const vg = g.createRadialGradient(cx, Hh / 2, Math.max(1, rInner), cx, Hh / 2, rOuter);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.92)');
        g.fillStyle = vg; g.fillRect(0, 0, W, Hh);
      }
      // 暗闇シーン
      if (st.dark) { g.fillStyle = 'rgba(2,3,5,0.96)'; g.fillRect(0, 0, W, Hh); }

      // ラベル
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, 22);
      g.fillStyle = '#fff';
      g.font = '13px "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif';
      g.textBaseline = 'middle';
      g.fillText('ユーザーの視界', 8, 12);
      // 効果タグ
      let tag = '', col = '#39d0ff';
      if (st.mode === 'smooth') { tag = 'オプティカルフロー 大'; col = '#ff6b6b'; }
      else if (st.mode === 'visual') { tag = st.dark ? '暗闇シーン挿入' : 'トンネル効果 ON'; col = '#4ade80'; }
      else if (st.mode === 'teleport') { tag = '視界が流れない'; col = '#4ade80'; }
      else { tag = '待機中'; col = '#cbd5e1'; }
      g.font = 'bold 12px "Noto Sans JP", sans-serif';
      const tw = g.measureText(tag).width;
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(W - tw - 16, Hh - 24, tw + 12, 18);
      g.fillStyle = col; g.fillText(tag, W - tw - 10, Hh - 15);
    }
  };
})();
