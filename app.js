import * as THREE from 'three';
import { drawMap } from './map-art.js';

/* ================= 配置：以后做「每个孩子专属」只改这里 ================= */
const CONFIG = {
  kidName: '小核桃',
  // 孩子的程序：F 往前走一格 / L 往左走一格 / R 往右走一格
  program: ['F', 'F', 'R', 'F', 'L', 'F', 'R', 'F'],
  start: { c: 0, r: 5, h: 0 },          // 起点格 + 朝向（0 = 朝地图上方）
  treasure: [4, 1],
  message: ['爸爸妈妈，', '这是我写的程序！'],
};
const LABEL = { F: '往前走一格', L: '往左走一格', R: '往右走一格' };

/* ================= 常量 ================= */
const COL = { ink: 0x253064, coral: 0xF2685A, teal: 0x21A39A, gold: 0xF6B53C, sky: 0x5C8BF2, cream: 0xFFF4E2, plum: 0x8F5BD0, leaf: 0x4FAE5E };
const CELL = 1 / 6;
const STEP = 0.85;                 // 每块积木执行秒数
const T_RUN = 3.0;                 // 开始执行时间
const READY_TIME = T_RUN - 1;
const T_END = T_RUN + CONFIG.program.length * STEP;
const COINS_PER_STEP = 6;
const FONT = '"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif';

const gx = c => -0.5 + (c + 0.5) * CELL;
const gy = r => 0.5 - (r + 0.5) * CELL;
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const backOut = x => { x = clamp01(x); const s = 2.2; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ================= 预计算小车路线 ================= */
const poses = [{ ...CONFIG.start }];
for (const cmd of CONFIG.program) {
  const p = poses[poses.length - 1];
  const h = p.h + (cmd === 'L' ? Math.PI / 2 : cmd === 'R' ? -Math.PI / 2 : 0);
  poses.push({ c: p.c + Math.round(-Math.sin(h)), r: p.r + Math.round(-Math.cos(h)), h });
}
function carPose(t) {
  if (t < T_RUN) { const p = poses[0]; return { x: gx(p.c), y: gy(p.r), h: p.h, k: -1, move: 0 }; }
  const k = Math.min(CONFIG.program.length - 1, Math.floor((t - T_RUN) / STEP));
  const f = t >= T_END ? 1 : ((t - T_RUN) - k * STEP) / STEP;
  const a = poses[k], b = poses[k + 1];
  const turn = easeOut(f / 0.22);
  const progress = clamp01((f - (a.h === b.h ? 0 : 0.22)) / (a.h === b.h ? 0.95 : 0.73));
  const move = progress * progress * (3 - 2 * progress);
  return { x: gx(a.c) + (gx(b.c) - gx(a.c)) * move, y: gy(a.r) + (gy(b.r) - gy(a.r)) * move,
    h: a.h + (b.h - a.h) * turn, k, move };
}

/* ================= 声音 ================= */
let actx = null;
function beep(freq, dur = 0.12, type = 'sine', vol = 0.15, delay = 0, slide = 0) {
  if (!actx) return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
}
function boom(delay = 0) {
  if (!actx) return;
  const t = actx.currentTime + delay, len = 0.6, buf = actx.createBuffer(1, actx.sampleRate * len, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const s = actx.createBufferSource(), g = actx.createGain(), f = actx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 900; s.buffer = buf; g.gain.value = 0.35;
  s.connect(f).connect(g).connect(actx.destination); s.start(t);
}
const sfx = {
  pop: i => beep(300 + i * 40, 0.1, 'triangle', 0.06, 0, 600 + i * 60),
  coins: () => { for (let i = 0; i < 4; i++) beep(1100 + i * 220, 0.08, 'square', 0.035, i * 0.05); },
  whistle: () => beep(500, 0.5, 'sine', 0.05, 0, 1400),
  boom: () => boom(),
  win: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.25, 'triangle', 0.1, i * 0.12)),
};

/* ================= 贴图工具 ================= */
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  tex.userData = { cv, ctx };
  return tex;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
const glowTex = canvasTex(64, 64, (ctx, w) => {
  const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
});
const shadowTex = canvasTex(64, 64, (ctx, w) => {
  const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(30,25,50,0.55)'); g.addColorStop(1, 'rgba(30,25,50,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, w);
});

/* ================= 搭建场景（AR 和预览共用） ================= */
function buildWorld(panelImage, cardTex) {
  // 地图与卡面共用同一个朝向，道具沿卡面法线长出来。
  const outer = new THREE.Group(), root = new THREE.Group();
  outer.add(root);
  // 立体地图底板（贴卡上同一张地图）
  const boardSide = new THREE.MeshStandardMaterial({ color: 0x253064, roughness: 0.6 });
  const panelTex = canvasTex(panelImage.width, panelImage.height, () => {});
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1000 / 900, 1400 / 900), new THREE.MeshBasicMaterial({ map: cardTex }));
  card.position.set(0, -200 / 900, -0.001);
  outer.add(card);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.03), [boardSide, boardSide, boardSide, boardSide, new THREE.MeshBasicMaterial({ map: panelTex }), boardSide]);
  board.position.z = -0.015; root.add(board);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...extra });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  const blob = (r) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), shadowMat); m.position.z = 0.002; return m; };

  /* ---------- 从卡上长出来的立体道具 ---------- */
  const props = [];
  const items = [];
  function register(id, label, obj, shadow, col, row, fixed = false) {
    const defaults = { col, row, scale: 1, rotation: 0 };
    const item = { id, label, defaults, fixed, obj, shadow, value: defaults };
    items.push(item);
    return item;
  }
  function addProp(id, label, obj, c, r, shadowR, extraDelay = 0, fixed = false) {
    const g = new THREE.Group(); g.position.set(gx(c), gy(r), 0); g.add(obj); root.add(g);
    const sh = blob(shadowR); sh.position.set(gx(c), gy(r), 0.002); root.add(sh);
    // 离起点越远越晚长出来，像波浪
    const d = Math.hypot(c - 0, r - 5) * 0.09 + 0.2 + extraDelay;
    props.push({ item: register(id, label, g, sh, c, r, fixed), obj: g, shadow: sh, delay: d });
    return g;
  }
  function tree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 8), mat(0x9B6B3D)); trunk.rotation.x = Math.PI / 2; trunk.position.z = 0.035; g.add(trunk);
    [[0.065, 0.11, 0.09], [0.05, 0.09, 0.16], [0.032, 0.07, 0.215]].forEach(([r, h, z], i) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), mat([0x4FAE5E, 0x5BBF6A, 0x6CCB78][i], { flatShading: true }));
      c.rotation.x = Math.PI / 2; c.position.z = z; g.add(c);
    });
    return g;
  }
  function shopDecoration(g, label) {
    function mesh(geometry, color, x, y, z) {
      const part = new THREE.Mesh(geometry, mat(color));
      part.position.set(x, y, z);
      g.add(part);
      return part;
    }
    function oval(color, x, y, z, sx, sy, sz) {
      const part = mesh(new THREE.SphereGeometry(1, 12, 8), color, x, y, z);
      part.scale.set(sx, sy, sz);
      return part;
    }

    if (label === '花店') {
      for (const [x, z, color] of [[-0.045, 0.203, 0xff83af], [0, 0.231, 0xffba4a], [0.045, 0.197, 0xb384ed]]) {
        const stem = mesh(new THREE.CylinderGeometry(0.005, 0.005, z - 0.12, 8), 0x4a9f62, x, 0, (z + 0.12) / 2);
        stem.rotation.x = Math.PI / 2;
        oval(0x69b96e, x + 0.012, 0, z - 0.03, 0.017, 0.006, 0.008).rotation.y = -0.5;
        for (let i = 0; i < 5; i++) {
          const angle = i * Math.PI * 2 / 5;
          oval(color, x + Math.cos(angle) * 0.015, -0.007, z + Math.sin(angle) * 0.015, 0.010, 0.007, 0.010);
        }
        oval(0xffefab, x, -0.015, z, 0.01, 0.008, 0.01);
      }
    } else if (label === '面包') {
      oval(0xa95728, 0, 0, 0.163, 0.080, 0.046, 0.027);
      oval(0xe6a052, 0, 0, 0.180, 0.079, 0.045, 0.033);
      for (const x of [-0.036, -0.002, 0.032]) {
        oval(0xffdb8b, x, 0, 0.207, 0.006, 0.027, 0.008).rotation.z = -0.40;
      }
    } else if (label === '糖果') {
      oval(0xf76a9a, 0, 0, 0.183, 0.043, 0.027, 0.035);
      for (const x of [-0.013, 0.013]) {
        const stripe = mesh(new THREE.TorusGeometry(0.026, 0.004, 8, 20), 0xffe0f0, x, 0, 0.183);
        stripe.rotation.y = Math.PI / 2;
        stripe.scale.y = 0.98;
        stripe.scale.x = 1.25;
      }
      for (const side of [-1, 1]) {
        const wrapper = mesh(new THREE.ConeGeometry(0.030, 0.049, 5), 0xf48ec1, side * 0.058, 0, 0.183);
        wrapper.rotation.z = side * Math.PI / 2;
      }
    } else {
      for (const side of [-1, 1]) {
        const page = new THREE.Group();
        page.position.set(side * 0.039, 0, 0.153);
        page.rotation.y = side * 0.50;
        const cover = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.123, 0.011), mat(0x287e87));
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.112, 0.012), mat(0xfff2ca));
        paper.position.z = 0.010;
        page.add(cover, paper);
        for (let i = 0; i < 5; i++) {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.052 - i % 2 * 0.011, 0.0025, 0.001), mat(0xbdab82));
          line.position.set(0, -0.037 + i * 0.016, 0.017);
          page.add(line);
        }
        g.add(page);
      }
      mesh(new THREE.BoxGeometry(0.012, 0.126, 0.008), 0xeeb65d, 0, 0, 0.174);
    }
  }
  function stall(color, label) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.08), mat(0xffffff)); body.position.z = 0.04; g.add(body);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.004, 0.05), mat(COL.ink)); door.position.set(0, -0.046, 0.025); g.add(door);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.143, 0.107, 0.014), mat(color));
    roof.position.z = 0.13; g.add(roof);
    // 条纹雨棚
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.05, 0.006), mat(i % 2 ? 0xffffff : color));
      s.position.set(-0.052 + i * 0.026, -0.065, 0.078); s.rotation.x = -0.6; g.add(s);
    }
    // 招牌（立在门头，朝向卡片下方）
    const tex = canvasTex(256, 110, (ctx, w, h) => {
      ctx.fillStyle = '#fff'; rr(ctx, 4, 4, w - 8, h - 8, 20); ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#253064'; ctx.stroke();
      ctx.fillStyle = '#253064'; ctx.font = `900 64px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, w / 2, h / 2 + 4);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.039), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    sign.rotation.x = Math.PI / 2; sign.position.set(0, -0.1, 0.13); g.add(sign);
    shopDecoration(g, label);
    return g;
  }
  function qblock() {
    const tex = canvasTex(128, 128, (ctx, w) => {
      ctx.fillStyle = '#5C8BF2'; ctx.fillRect(0, 0, w, w); ctx.strokeStyle = '#253064'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, w - 10);
      ctx.fillStyle = '#fff'; ctx.font = `900 92px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', w / 2, w / 2 + 6);
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.075), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, emissive: 0x223366, emissiveIntensity: 0.3 }));
    const g = new THREE.Group(); g.add(m); g.userData.cube = m; return g;
  }

  [[1, 4], [0, 0], [5, 5], [1, 1], [5, 3]].forEach(([c, r], i) =>
    addProp('tree-' + (i + 1), '树 ' + (i + 1), tree(), c, r, 0.07));
  [[3, 5, COL.coral, '糖果'], [5, 0, COL.teal, '书店'], [0, 2, COL.plum, '花店'], [2, 5, COL.gold, '面包']].forEach(([c, r, col, label], i) =>
    addProp('stall-' + (i + 1), label, stall(col, label), c, r, 0.09));
  const qblocks = [[2, 0], [4, 2], [1, 2]].map(([c, r], i) =>
    addProp('block-' + (i + 1), '问号方块 ' + (i + 1), qblock(), c, r, 0.05, 0.2));

  // 喷泉（2×2 格中心）
  const fountain = new THREE.Group(); fountain.position.set(gx(3.5), gy(3.5), 0); root.add(fountain);
  const fBase = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.035, 32), mat(0xffffff)); fBase.rotation.x = Math.PI / 2; fBase.position.z = 0.0175; fountain.add(fBase);
  const fWater = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.005, 32), mat(0x5AAEE8, { roughness: 0.15, emissive: 0x2266aa, emissiveIntensity: 0.3 })); fWater.rotation.x = Math.PI / 2; fWater.position.z = 0.036; fountain.add(fWater);
  const fCol = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.1, 16), mat(0xffffff)); fCol.rotation.x = Math.PI / 2; fCol.position.z = 0.08; fountain.add(fCol);
  const fBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.025, 24), mat(0xE8F4FB)); fBowl.rotation.x = Math.PI / 2; fBowl.position.z = 0.14; fountain.add(fBowl);
  const fountainItem = register('fountain', '喷泉', fountain, null, 3.5, 3.5);
  props.push({ item: fountainItem, obj: fountain, shadow: null, delay: 0.55 });
  // 喷泉水花（循环粒子）
  const WN = 70, wGeo = new THREE.BufferGeometry(), wPos = new Float32Array(WN * 3);
  wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  const water = new THREE.Points(wGeo, new THREE.PointsMaterial({ color: 0xBFE6FF, size: 0.022, map: glowTex, transparent: true, depthWrite: false }));
  fountain.add(water);

  // 终点拱门 + 宝箱
  const [tc, tr] = CONFIG.treasure;
  const gate = new THREE.Group();
  for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.26), mat(COL.coral)); p.position.set(sx * 0.075, 0, 0.13); gate.add(p);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), mat(COL.gold, { emissive: COL.gold, emissiveIntensity: 0.4 })); ball.position.set(sx * 0.075, 0, 0.275); gate.add(ball);
  }
  const gTex = canvasTex(256, 96, (ctx, w, h) => {
    for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { ctx.fillStyle = (i + j) % 2 ? '#253064' : '#fff'; ctx.fillRect(i * 16, j * 12, 16, 12); }
    ctx.fillStyle = '#F2685A'; ctx.fillRect(0, 24, w, h - 24);
    ctx.fillStyle = '#fff'; ctx.font = `900 52px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('终 点', w / 2, 62);
  });
  const gBanner = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.064), [mat(COL.coral), mat(COL.coral), new THREE.MeshBasicMaterial({ map: gTex }), new THREE.MeshBasicMaterial({ map: gTex }), mat(COL.coral), mat(COL.coral)]);
  gBanner.position.z = 0.235; gate.add(gBanner);
  const chest = new THREE.Group(); gate.add(chest);
  const cBase = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.065, 0.045), mat(0xD98B45, { emissive: 0x6a3510, emissiveIntensity: 0.25 })); cBase.position.z = 0.0225; chest.add(cBase);
  const cBand = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.069, 0.01), mat(COL.gold, { emissive: COL.gold, emissiveIntensity: 0.3 })); cBand.position.z = 0.04; chest.add(cBand);
  const hinge = new THREE.Group(); hinge.position.set(0, 0.0325, 0.045); chest.add(hinge);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.065, 0.02), mat(0xE89C55, { emissive: 0x6a3510, emissiveIntensity: 0.25 })); lid.position.set(0, -0.0325, 0.01); hinge.add(lid);
  const cGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xFFD966, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  cGlow.position.z = 0.07; chest.add(cGlow);
  addProp('finish', '终点拱门和宝箱', gate, tc, tr, 0.1, 0.1, true);

  /* ---------- 小车 ---------- */
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.12, 0.04), mat(COL.coral)); body.position.z = 0.035; car.add(body);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.025), mat(COL.coral)); nose.position.set(0, 0.065, 0.028); car.add(nose);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.035), mat(0xffffff)); cab.position.set(0, -0.012, 0.072); car.add(cab);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.004, 0.024), mat(COL.sky, { roughness: 0.2 })); win.position.set(0, 0.019, 0.075); car.add(win);
  const wheelG = new THREE.CylinderGeometry(0.02, 0.02, 0.016, 18); wheelG.rotateZ(Math.PI / 2);
  for (const [x, y] of [[-0.048, 0.035], [0.048, 0.035], [-0.048, -0.035], [0.048, -0.035]]) {
    const w = new THREE.Mesh(wheelG, mat(COL.ink)); w.position.set(x, y, 0.02); car.add(w);
  }
  for (const sx of [-1, 1]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.012), mat(COL.gold, { emissive: COL.gold, emissiveIntensity: 0.8 })); l.position.set(sx * 0.028, 0.076, 0.032); car.add(l);
  }
  const flagTex = canvasTex(256, 120, (ctx, w, h) => {
    ctx.fillStyle = '#F6B53C'; rr(ctx, 4, 4, w - 8, h - 8, 22); ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#253064'; ctx.stroke();
    ctx.fillStyle = '#253064'; ctx.font = `900 62px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(CONFIG.kidName, w / 2, h / 2 + 4);
  });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.047), new THREE.MeshBasicMaterial({ map: flagTex, transparent: true, side: THREE.DoubleSide }));
  const flagHolder = new THREE.Group(); flagHolder.add(flag); root.add(flagHolder);
  root.add(car);
  const carShadow = blob(0.09); root.add(carShadow);
  const trailMaterial = new THREE.MeshBasicMaterial({ color: 0x2186CE });
  const trailGeometry = new THREE.PlaneGeometry(1, 0.025);
  const trail = poses.slice(1).map((destination, index) => {
    const origin = poses[index];
    const x = gx(origin.c), y = gy(origin.r);
    const dx = gx(destination.c) - x, dy = gy(destination.r) - y;
    const segment = new THREE.Mesh(trailGeometry, trailMaterial);
    segment.rotation.z = Math.atan2(dy, dx);
    root.add(segment);
    return { segment, x, y, dx, dy };
  });

  /* ---------- 爆金币 ---------- */
  const coinG = new THREE.CylinderGeometry(0.03, 0.03, 0.008, 20);
  const coinM = mat(COL.gold, { metalness: 0.2, roughness: 0.3, emissive: 0xF6B53C, emissiveIntensity: 0.45 });
  const coins = [];
  for (let k = 0; k < CONFIG.program.length; k++) {
    const ts = T_RUN + k * STEP + 0.35;                   // 每走一步，在车顶喷一把金币
    const p = carPose(ts);
    for (let i = 0; i < COINS_PER_STEP; i++) {
      const n = k * 10 + i, a = hash(n) * Math.PI * 2, sp = 0.12 + hash(n + 0.5) * 0.18;
      const m = new THREE.Mesh(coinG, coinM); m.visible = false; root.add(m);
      const sh = blob(0.025); sh.visible = false; root.add(sh);
      coins.push({ m, sh, ts, x0: p.x, y0: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 0.95 + hash(n + 0.3) * 0.35, spin: 8 + hash(n + 0.7) * 10, k });
    }
  }
  const G = -2.6;

  /* ---------- 立体烟花 ---------- */
  const FW_PAL = [[0xF2685A, 0xFFD166], [0x5C8BF2, 0xBFE6FF], [0xF6B53C, 0xFFF4E2], [0x21A39A, 0xB8F2E6], [0x8F5BD0, 0xFF9AD5]];
  const FW_N = 220, FW_POOL = 6, FW_CYCLE = 4.2, FW_LIFE = 2.0, ROCKET = 0.6;
  const fireworks = [];
  for (let b = 0; b < FW_POOL; b++) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array((FW_N + 10) * 3), col = new Float32Array((FW_N + 10) * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.045, map: glowTex, vertexColors: true, transparent: true, depthWrite: false }));
    pts.frustumCulled = false; pts.visible = false; root.add(pts);
    const dirs = [];
    for (let i = 0; i < FW_N; i++) {   // 均匀球面方向
      const u = (i + 0.5) / FW_N, th = Math.acos(1 - 2 * u), ph = i * 2.39996;
      dirs.push([Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th), 0.85 + hash(i + b * 50) * 0.3]);
    }
    fireworks.push({ pts, pos, col, dirs, lastN: -1 });
  }
  const tmpC = new THREE.Color(), tmpC2 = new THREE.Color();

  /* ---------- 程序面板（贺卡下半部上方，正对手机） ---------- */
  const codeTex = canvasTex(1024, 460, () => {});
  const code = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.413), new THREE.MeshBasicMaterial({ map: codeTex, transparent: true, side: THREE.DoubleSide }));
  const codeHolder = new THREE.Group(); codeHolder.position.set(0, -0.76, 0.012); codeHolder.add(code); outer.add(codeHolder);
  let lastHi = -2;
  function drawCode(hi) {
    if (hi === lastHi) return; lastHi = hi;
    const { ctx } = codeTex.userData, W = 1024, H = 460;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,244,226,0.97)'; rr(ctx, 5, 5, W - 10, H - 10, 40); ctx.fill();
    ctx.lineWidth = 10; ctx.strokeStyle = '#253064'; ctx.stroke();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = '#253064'; ctx.font = `900 46px ${FONT}`; ctx.fillText(`${CONFIG.kidName}的程序`, 40, 62);
    ctx.fillStyle = '#F6B53C'; rr(ctx, 530, 30, 400, 64, [32, 32, 12, 12]); ctx.fill();
    ctx.fillStyle = '#5a3a00'; ctx.font = `800 34px ${FONT}`; ctx.fillText('当 ▶ 被点击', 556, 63);
    const n = CONFIG.program.length, rows = Math.ceil(n / 2), top = 120, bh = Math.min(66, (H - top - 24) / rows - 10);
    CONFIG.program.forEach((cmd, i) => {
      const on = i === hi, done = i < hi;
      const col = i < rows ? 0 : 1, row = i % rows;
      const x = 40 + col * 490 + (on ? 10 : 0), y = top + row * (bh + 10);
      ctx.fillStyle = on ? '#F2685A' : done ? '#8fb0f5' : '#5C8BF2';
      rr(ctx, x, y, 380, bh, 14); ctx.fill();
      if (on) { ctx.lineWidth = 7; ctx.strokeStyle = '#253064'; ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(bh * 0.5)}px ${FONT}`;
      ctx.fillText(`${i + 1}. ${LABEL[cmd]}`, x + 22, y + bh / 2 + 2);
      if (on) { ctx.fillStyle = '#F2685A'; ctx.font = `900 ${Math.round(bh * 0.7)}px ${FONT}`; ctx.fillText('◀', x + 390, y + bh / 2 + 2); }
      else if (done) { ctx.fillStyle = '#21A39A'; ctx.font = `900 ${Math.round(bh * 0.6)}px ${FONT}`; ctx.fillText('✓', x + 392, y + bh / 2 + 2); }
    });
    codeTex.needsUpdate = true;
  }
  drawCode(-1);

  /* ---------- 结尾横幅 ---------- */
  const bannerTex = canvasTex(1024, 360, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff'; rr(ctx, 8, 8, w - 16, h - 16, 60); ctx.fill();
    ctx.lineWidth = 14; ctx.strokeStyle = '#F2685A'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#253064'; ctx.font = `900 92px ${FONT}`; ctx.fillText(CONFIG.message[0], w / 2, 118);
    ctx.fillStyle = '#F2685A'; ctx.fillText(CONFIG.message[1], w / 2, 238);
  });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.246), new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true, side: THREE.DoubleSide }));
  const bannerHolder = new THREE.Group(); bannerHolder.position.set(0, -0.05, 0.5); bannerHolder.add(banner); bannerHolder.scale.setScalar(0); root.add(bannerHolder);

  // 灯光
  root.add(new THREE.HemisphereLight(0xffffff, 0x8899bb, 1.7));
  const dl = new THREE.DirectionalLight(0xffffff, 1.5); dl.position.set(-0.6, -1, 2); root.add(dl);

  /* ---------- 正对镜头 ---------- */
  const facing = [bannerHolder, flagHolder];
  let cam = null; const _q = new THREE.Quaternion(), _cq = new THREE.Quaternion();
  function faceCamera() {
    if (!cam) return;
    cam.getWorldQuaternion(_cq);
    for (const o of facing) { o.parent.getWorldQuaternion(_q); o.quaternion.copy(_q.invert().multiply(_cq)); }
  }

  /* ================= 时间轴 ================= */
  let fired = new Set();
  const once = (k, fn) => { if (!fired.has(k)) { fired.add(k); fn(); } };
  let coinCount = 0;
  const _ws = new THREE.Vector3(); let WS = 1;
  function update(t) {
    // 粒子大小不会随 AR 锚点缩放，这里手动乘上世界缩放
    outer.updateWorldMatrix(true, false); outer.getWorldScale(_ws); WS = _ws.x;
    water.material.size = 0.022 * WS * fountainItem.value.scale;
    // 1. 道具从卡里“长”出来：先竖着拉高，再弹一下
    props.forEach((p, i) => {
      const g = backOut((t - p.delay) / 0.55);
      const scale = p.item.value.scale;
      const width = Math.max(0.001, 0.6 + 0.4 * g) * scale;
      p.obj.scale.set(width, width, Math.max(0.001, g) * scale);
      p.obj.visible = t > p.delay;
      if (p.shadow) p.shadow.material.opacity = 1, p.shadow.scale.setScalar(Math.max(0.001, clamp01((t - p.delay) / 0.4)) * scale);
      if (t > p.delay) once('pop' + i, () => sfx.pop(i % 6));
    });
    qblocks.forEach((g, i) => { const c = g.children[0]; c.position.z = 0.12 + Math.sin(t * 2.4 + i) * 0.015; c.rotation.z = t * 0.8 + i; });
    // 喷泉水花
    for (let i = 0; i < WN; i++) {
      const life = 1.0, ph = ((t * 0.9 + i / WN) % 1) * life, a = i * 2.39996, sp = 0.08 + (i % 5) * 0.012;
      wPos[i * 3] = Math.cos(a) * sp * ph; wPos[i * 3 + 1] = Math.sin(a) * sp * ph;
      wPos[i * 3 + 2] = Math.max(0.04, 0.15 + 0.55 * ph - 0.6 * ph * ph);
    }
    wGeo.attributes.position.needsUpdate = true; water.visible = t > 0.8;

    // 2. 小车
    const p = carPose(t);
    car.position.set(p.x, p.y, 0); car.rotation.z = p.h;
    carShadow.position.set(p.x, p.y, 0.003);
    flagHolder.position.set(p.x, p.y, 0.15);
    trail.forEach(({ segment, x, y, dx, dy }, index) => {
      const progress = index < p.k ? 1 : index === p.k ? p.move : 0;
      segment.visible = progress > 0;
      segment.position.set(x + dx * progress / 2, y + dy * progress / 2, 0.004);
      segment.scale.x = Math.hypot(dx, dy) * progress;
    });
    drawCode(t < T_RUN ? -1 : t >= T_END ? CONFIG.program.length : p.k);

    // 3. 爆金币
    let n = 0;
    coins.forEach(c => {
      const dt = t - c.ts;
      if (dt < 0) { c.m.visible = c.sh.visible = false; return; }
      n++;
      const tLand = (c.vz + Math.sqrt(c.vz * c.vz + 2 * -G * 0.12)) / -G;   // 从 z=0.12 抛出到落地
      const tt = Math.min(dt, tLand);
      const x = c.x0 + c.vx * tt, y = c.y0 + c.vy * tt, z = Math.max(0.004, 0.12 + c.vz * tt + 0.5 * G * tt * tt);
      const fade = dt > tLand + 0.9 ? clamp01(1 - (dt - tLand - 0.9) / 0.4) : 1;
      c.m.visible = fade > 0; c.sh.visible = fade > 0 && dt < tLand + 1.3;
      c.m.position.set(x, y, z + (dt > tLand ? 0.003 : 0));
      c.m.rotation.set(dt < tLand ? dt * c.spin : Math.PI / 2, dt * 3, 0);
      c.m.scale.setScalar(Math.max(0.001, Math.min(1, dt / 0.08) * fade));
      c.sh.position.set(x, y, 0.002); c.sh.scale.setScalar(Math.max(0.3, 1 - z * 2) * fade);
    });
    for (let k = 0; k < CONFIG.program.length; k++) if (t >= T_RUN + k * STEP + 0.35) once('coin' + k, sfx.coins);
    if (n !== coinCount) { coinCount = n; hooks.onCoin(n); }

    // 4. 终点：宝箱打开 + 横幅
    const open = easeOut((t - T_END - 0.1) / 0.5);
    hinge.rotation.x = -open * 1.9;
    cGlow.material.opacity = open * (0.8 + 0.2 * Math.sin(t * 8)); cGlow.scale.setScalar(0.08 + open * 0.12);
    const bp = backOut((t - T_END - 2.4) / 0.6);
    bannerHolder.scale.setScalar(Math.max(0.001, bp)); bannerHolder.visible = bp > 0.01;
    bannerHolder.position.z = 0.5 + Math.sin(t * 1.8) * 0.012;
    if (t > T_END + 0.2) once('win', () => { sfx.win(); });
    if (t > T_END + 3.2) once('end', () => hooks.onEnd());

    // 5. 立体烟花：从宝箱发射，循环不停
    const chestX = gx(tc), chestY = gy(tr);
    fireworks.forEach((fw, b) => {
      const start = T_END + 0.3 + b * 0.7, local = t - start;
      if (local < 0) { fw.pts.visible = false; return; }
      const cyc = Math.floor(local / FW_CYCLE), lt = local - cyc * FW_CYCLE;
      if (lt > ROCKET + FW_LIFE) { fw.pts.visible = false; return; }
      fw.pts.visible = true;
      const seed = b * 13 + cyc * 7;
      const ox = (hash(seed) - 0.5) * 0.7, oy = (hash(seed + 1) - 0.3) * 0.6, oz = 0.4 + hash(seed + 2) * 0.25;
      const sx = chestX + (ox - chestX) * 0.3, sy = chestY + (oy - chestY) * 0.3;
      const [ca, cb] = FW_PAL[(b + cyc) % FW_PAL.length];
      const pos = fw.pos, col = fw.col;
      if (lt < ROCKET) {   // 上升的火箭 + 尾迹
        if (fw.lastN !== cyc * 10) { fw.lastN = cyc * 10; sfx.whistle(); }
        const f = easeOut(lt / ROCKET);
        for (let i = 0; i < FW_N + 10; i++) { pos[i * 3 + 2] = -10; }
        for (let j = 0; j < 10; j++) {
          const fj = Math.max(0, f - j * 0.04), i = FW_N + j;
          pos[i * 3] = sx + (ox - sx) * fj; pos[i * 3 + 1] = sy + (oy - sy) * fj; pos[i * 3 + 2] = 0.05 + (oz - 0.05) * fj;
          tmpC.set(j < 3 ? 0xFFFFFF : 0xFFC94D); col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
        }
        fw.pts.material.opacity = 1; fw.pts.material.size = 0.035 * WS;
      } else {             // 炸开
        if (fw.lastN !== cyc * 10 + 1) { fw.lastN = cyc * 10 + 1; sfx.boom(); }
        const d = lt - ROCKET, s = (1 - Math.exp(-2.6 * d)) / 2.6 * 0.6, fall = 0.09 * d * d;
        const fade = 1 - Math.pow(d / FW_LIFE, 2);
        for (let i = 0; i < FW_N; i++) {
          const [dx, dy, dz, k] = fw.dirs[i];
          pos[i * 3] = ox + dx * s * k; pos[i * 3 + 1] = oy + dy * s * k; pos[i * 3 + 2] = oz + dz * s * k - fall;
          tmpC.set(i % 3 ? ca : cb); const tw = 0.75 + 0.25 * Math.sin(t * 30 + i);
          tmpC.multiplyScalar(d > 1.1 ? tw : 1); col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
        }
        for (let j = 0; j < 10; j++) pos[(FW_N + j) * 3 + 2] = -10;
        // 刚炸开时一个闪光核
        const flash = clamp01(1 - d / 0.25); tmpC2.set(0xffffff).multiplyScalar(flash);
        pos[FW_N * 3] = ox; pos[FW_N * 3 + 1] = oy; pos[FW_N * 3 + 2] = flash > 0 ? oz : -10; tmpC2.set(0xFFFFFF); col[FW_N * 3] = tmpC2.r; col[FW_N * 3 + 1] = tmpC2.g; col[FW_N * 3 + 2] = tmpC2.b;
        fw.pts.material.size = 0.075 * (0.55 + 0.45 * fade) * WS; fw.pts.material.opacity = Math.min(1, fade * 1.5);
      }
      fw.pts.geometry.attributes.position.needsUpdate = true; fw.pts.geometry.attributes.color.needsUpdate = true;
    });
  }
  const hooks = { onCoin() {}, onEnd() {} };
  function reset() { fired = new Set(); lastHi = -2; coinCount = -1; fireworks.forEach(f => f.lastN = -1); }
  function applyLayout(layout) {
    const bounded = (value, min, max, fallback) => Number.isFinite(value) ? THREE.MathUtils.clamp(value, min, max) : fallback;
    const applied = {};
    for (const item of items) {
      const { id, defaults, fixed, obj, shadow } = item;
      const value = layout?.[id];
      const col = fixed ? defaults.col : bounded(value?.col, 0, 5, defaults.col);
      const row = fixed ? defaults.row : bounded(value?.row, 0, 5, defaults.row);
      const scale = bounded(value?.scale, 0.4, 2, 1);
      const rotation = bounded(value?.rotation, -180, 180, 0);
      item.value = applied[id] = { col, row, scale, rotation };
      obj.position.set(gx(col), gy(row), 0);
      obj.rotation.z = THREE.MathUtils.degToRad(rotation);
      if (shadow) shadow.position.set(obj.position.x, obj.position.y, 0.002);
    }
    drawMap(panelTex.userData.ctx, panelImage, items, applied);
    panelTex.needsUpdate = true;
    return applied;
  }
  return {
    root: outer, update: t => { update(t); faceCamera(); }, reset, hooks,
    setCamera: c => { cam = c; }, applyLayout,
    items: items.map(({ id, label, defaults, fixed }) => ({ id, label, defaults, fixed })),
  };
}

/* ================= 播放控制 ================= */
const $ = id => document.getElementById(id);
let world, t0 = null, playing = false;
function play(offset = 0) {
  world.reset(); t0 = performance.now() - offset * 1000; playing = true;
  $('depart').classList.add('hidden'); $('hud').classList.add('hidden');
  $('coins').textContent = '金币 0'; $('coins').classList.remove('hidden');
}
function tick() {
  if (!world) return;
  const t = playing ? (performance.now() - t0) / 1000 : READY_TIME;
  world.update(t);
}
function wireHooks(offset = 0) {
  world.hooks.onCoin = n => { $('coins').textContent = '金币 ' + n; };
  world.hooks.onEnd = () => { $('hud').classList.remove('hidden'); };
  $('replay').onclick = () => play(offset);
}
async function loadWorld() {
  const layoutRequest = fetch('./scene-layout.json')
    .then(response => response.ok ? response.json() : null)
    .catch(() => null);
  const loader = new THREE.TextureLoader();
  const [panel, card, layout] = await Promise.all([
    loader.loadAsync('./assets/panel.png'), loader.loadAsync('./assets/card.png'), layoutRequest,
  ]);
  card.colorSpace = THREE.SRGBColorSpace;
  const result = buildWorld(panel.image, card);
  return { world: result, layout: result.applyLayout(layout), panelImage: panel.image };
}
function initAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) {} }

/* ================= AR 模式 ================= */
let mindarInst = null;
async function startAR(fromTap = false) {
  ['start', 'err'].forEach(id => $(id).classList.add('hidden')); $('loading').classList.remove('hidden');
  try {
    const { MindARThree } = await import('./lib/mindar-image-three.prod.js');
    const mindar = mindarInst = new MindARThree({
      container: $('ar'), imageTargetSrc: './assets/targets.mind',
      uiLoading: 'no', uiScanning: '#scanning', uiError: 'no',
      warmupTolerance: 4, missTolerance: 10,
      // MindAR feeds this filter timestamps in milliseconds.
      filterMinCF: 0.00075, filterBeta: 0.015,
    });
    const { renderer, scene, camera } = mindar;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    ({ world } = await loadWorld()); wireHooks(READY_TIME); world.setCamera(camera);
    const anchor = mindar.addAnchor(0);
    anchor.group.add(world.root);
    let lostAt = null;
    $('depart').onclick = () => {
      if (!anchor.visible || playing) return;
      initAudio();
      play(READY_TIME);
    };
    anchor.onTargetFound = () => {
      if (!playing) $('depart').classList.remove('hidden');
      if (playing && lostAt !== null) t0 += performance.now() - lostAt;
      lostAt = null;
      $('replay').disabled = false;
      $('orbit').classList.remove('hidden');
    };
    anchor.onTargetLost = () => {
      lostAt = performance.now();
      $('replay').disabled = true;
      $('depart').classList.add('hidden');
      $('scan-tip').textContent = '把地图移回镜头，继续播放';
    };
    // 有些手机/微信不允许不点屏幕就开摄像头：15 秒没开起来就当失败
    const ok = await Promise.race([mindar.start().then(() => true), new Promise(r => setTimeout(() => r(false), 15000))]);
    if (!ok) throw new Error('camera start timeout');
    $('loading').classList.add('hidden');
    renderer.setAnimationLoop(() => {
      if (anchor.visible) tick();
      renderer.render(scene, camera);
    });
  } catch (e) {
    console.error(e);
    try { mindarInst && mindarInst.stop(); } catch (_) {}
    mindarInst = null; world = null; playing = false; $('ar').innerHTML = '';
    $('loading').classList.add('hidden'); $('scanning').classList.add('hidden'); $('depart').classList.add('hidden');
    // 自动打开失败 → 给一个大按钮让用户点一下再试；点了还失败才显示错误页
    $(fromTap ? 'err' : 'start').classList.remove('hidden');
  }
}

function previewOrbit(camera, canvas) {
  let azimuth = -Math.PI / 2, elevation = Math.PI / 4, pointer = null;
  const turn = (x, y) => {
    azimuth -= x * 0.009;
    elevation = Math.max(0.16, Math.min(1.48, elevation + y * 0.009));
  };
  canvas.classList.add('orbit-view');
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '360° 预览，用方向键旋转视角');
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointer !== null) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer?.id) return;
    turn(event.clientX - pointer.x, event.clientY - pointer.y);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });
  canvas.addEventListener('lostpointercapture', event => {
    if (event.pointerId === pointer?.id) pointer = null;
  });
  canvas.addEventListener('keydown', event => {
    const directions = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] };
    const direction = directions[event.key];
    if (direction) { event.preventDefault(); turn(...direction); }
  });
  return () => {
    const dist = Math.max(2, 2 * canvas.clientHeight / Math.max(1, canvas.clientWidth));
    const radius = Math.cos(elevation) * dist;
    camera.position.set(Math.cos(azimuth) * radius, -0.18 + Math.sin(azimuth) * radius, 0.15 + Math.sin(elevation) * dist);
    camera.lookAt(0, -0.18, 0.15);
  };
}

/* ================= 预览模式（无摄像头，桌面/汇报用） ================= */
async function startPreview() {
  const params = new URLSearchParams(location.search);
  const editing = params.has('edit');
  if (!editing) initAudio();
  ['start', 'err', 'loading', 'scanning'].forEach(id => $(id).classList.add('hidden'));
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  $('ar').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x2B2F45);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 20); camera.up.set(0, 0, 1);
  const updateView = previewOrbit(camera, renderer.domElement);
  $('orbit-tip').classList.remove('hidden');
  const loaded = await loadWorld();
  world = loaded.world; world.setCamera(camera); scene.add(world.root);
  if (editing) {
    const { mountEditor } = await import('./editor.js');
    mountEditor(world.items, loaded.layout, world.applyLayout, loaded.panelImage);
  } else {
    wireHooks();
    play();
  }
  const resize = () => {
    const { clientWidth, clientHeight } = $('ar');
    renderer.setSize(clientWidth, clientHeight);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();
  const fixedT = params.has('t') ? parseFloat(params.get('t')) : null;   // ?t=8 截图用
  renderer.setAnimationLoop(() => {
    updateView();
    if (fixedT !== null) { t0 = performance.now() - fixedT * 1000; }
    if (editing) world.update(2.5);
    else tick();
    renderer.render(scene, camera);
  });
}

$('go').onclick = () => startAR(true);
$('preview').onclick = startPreview;
$('err-preview').onclick = startPreview;
// 不要封面：打开就直接开摄像头；声音要等第一次点屏幕才能响（浏览器规定）
const qs = new URLSearchParams(location.search);
if (!qs.has('edit')) ['touchstart', 'pointerdown'].forEach(ev => addEventListener(ev, initAudio, { passive: true }));
// 电脑上打开：不开摄像头，直接显示带二维码的贺卡，让手机扫
const isDesktop = matchMedia('(pointer:fine)').matches && !('ontouchstart' in window) && navigator.maxTouchPoints === 0;
function showDesk() {
  $('desk-card').src = './assets/card.png';
  $('desk').classList.remove('hidden');
}
$('desk-preview').onclick = () => { $('desk').classList.add('hidden'); startPreview(); };
if (qs.has('preview') || qs.has('edit')) startPreview(); else if (isDesktop && !qs.has('ar')) showDesk(); else startAR();
