/* 共有UIロジック ― モード切替・説明文・HUD・ローディング */
(function () {
  const INFO = {
    room: {
      t: 'VR環境（実験フィールド）',
      d: 'Unreal Engine 5 で開発した実験用VR環境のミニチュアです。グレーボックスの部屋を再現しています。<b>下のボタン</b>で移動法を切り替えて比較できます。'
    },
    teleport: {
      t: 'テレポート移動法',
      d: 'コントローラーから伸びる<b>放物線</b>で着地点を指定し、<b>瞬間移動</b>します。視界が連続して流れない（オプティカルフローを伴わない）ため、<b>VR酔いを起こしにくい</b>手法です。'
    },
    smooth: {
      t: 'スムーズ移動',
      d: 'スティック入力で<b>連続的に前進</b>します。移動中つねに視界が流れ<b>オプティカルフローが大きい</b>ため、酔いやすい手法です。右下「ユーザーの視界」の流れに注目。'
    },
    visual: {
      t: '視覚情報の最適化',
      d: 'スムーズ移動に<b>トンネル効果（周辺視野を暗く）</b>と<b>暗闇シーンの挿入</b>を適用。視界の流れを抑え、<b>VR酔いを軽減</b>します。右下の視界のビネットと暗転に注目。'
    }
  };
  const ORDER = ['room', 'teleport', 'smooth', 'visual'];

  function setMode(m) {
    if (window.__vrworld) window.__vrworld.setMode(m);
    document.querySelectorAll('.mbtn').forEach(b =>
      b.classList.toggle('on', b.dataset.mode === m));
    const box = document.getElementById('info');
    if (box && INFO[m]) {
      box.querySelector('.t').innerHTML = INFO[m].t;
      box.querySelector('.d').innerHTML = INFO[m].d;
    }
  }
  window.VRUI = { setMode };

  document.addEventListener('DOMContentLoaded', function () {
    // HUD 接続
    const hud = document.getElementById('hud');
    if (hud && window.VRHUD) window.VRHUD.attach(hud);

    // ボタン生成
    const wrap = document.getElementById('modes');
    if (wrap) {
      const LABEL = {
        room: ['VR環境', 'ROOM'],
        teleport: ['テレポート', 'TELEPORT'],
        smooth: ['スムーズ移動', 'SMOOTH'],
        visual: ['視覚最適化', 'COMFORT']
      };
      ORDER.forEach(m => {
        const b = document.createElement('button');
        b.className = 'mbtn'; b.dataset.mode = m;
        b.innerHTML = LABEL[m][0] + '<span class="k">' + LABEL[m][1] + '</span>';
        b.addEventListener('click', () => setMode(m));
        wrap.appendChild(b);
      });
    }

    // 初期モード
    const applyInitial = () => setMode('room');
    if (window.__vrworld) applyInitial();
    else {
      // vrworld の init を待つ
      let tries = 0;
      const iv = setInterval(() => {
        if (window.__vrworld || tries++ > 200) { clearInterval(iv); applyInitial(); }
      }, 50);
    }
  });

  // ローディング解除
  window.hideLoader = function () {
    const l = document.getElementById('load');
    if (l) { l.classList.add('hide'); setTimeout(() => l.remove(), 500); }
  };
})();
