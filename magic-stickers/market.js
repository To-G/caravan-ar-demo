import * as THREE from 'three';

const colors = { gold: 0xffcf83, stone: 0x78617e, pink: 0xe76e9d, mint: 0x71efd3, blue: 0x4c80ae, cream: 0xfff3d1 };
const material = (color, glow = 0) => new THREE.MeshStandardMaterial({ color, roughness: 0.68, emissive: color, emissiveIntensity: glow });
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => 1 - (1 - clamp(n)) ** 3;
const tau = Math.PI * 2;
const random = seed => {
  const value = Math.sin(seed * 127.1 + 4.3) * 43758.5453;
  return value - Math.floor(value);
};

function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
  const part = new THREE.Mesh(geometry, mat);
  part.position.set(x, y, z);
  parent.add(part);
  return part;
}
function box(parent, mat, w, d, h, x, y, z) {
  return mesh(parent, new THREE.BoxGeometry(w, d, h), mat, x, y, z);
}
function tube(parent, mat, upper, lower, height, x, y, z, sides = 32) {
  const part = mesh(parent, new THREE.CylinderGeometry(upper, lower, height, sides), mat, x, y, z);
  part.rotation.x = Math.PI / 2;
  return part;
}
function oval(parent, mat, x, y, z, sx, sy, sz) {
  const part = mesh(parent, new THREE.SphereGeometry(1, 12, 8), mat, x, y, z);
  part.scale.set(sx, sy, sz);
  return part;
}

const glowCanvas = document.createElement('canvas');
glowCanvas.width = glowCanvas.height = 64;
const ctx = glowCanvas.getContext('2d');
const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
glow.addColorStop(0, '#fff');
glow.addColorStop(0.2, 'rgba(255,255,255,.82)');
glow.addColorStop(1, 'rgba(255,255,255,0)');
ctx.fillStyle = glow;
ctx.fillRect(0, 0, 64, 64);
const glowTexture = new THREE.CanvasTexture(glowCanvas);

function sparkles(parent, color, count, size, draw) {
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color, size, map: glowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;
  parent.add(points);
  const update = (time, worldScale) => {
    points.material.size = size * worldScale;
    for (let i = 0; i < count; i++) draw(positions, i * 3, i, time);
    geometry.attributes.position.needsUpdate = true;
  };
  return { points, update };
}

function sign(parent, title, subtitle, color, x, y, z, width = 0.38) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 168;
  const context = canvas.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, 512, 168);
  context.strokeStyle = '#f4ce91';
  context.lineWidth = 5;
  context.strokeRect(9, 9, 494, 150);
  context.textAlign = 'center';
  context.fillStyle = '#fff4d5';
  context.font = 'bold 68px "Microsoft YaHei", sans-serif';
  context.fillText(title, 256, 89);
  context.font = 'bold 20px Georgia, serif';
  context.fillText(subtitle, 256, 127);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plaque = mesh(parent, new THREE.PlaneGeometry(width, width * 0.328),
    new THREE.MeshBasicMaterial({ map: texture }), x, y, z);
  plaque.rotation.x = Math.PI / 2;
}

function storefront(parent, palette, style) {
  const walls = material(palette.wall);
  const frame = material(palette.trim);
  const linen = material(0xffe8bc);
  const lit = material(0xf9bc62, 0.46);
  const base = material(palette.base);
  box(parent, base, 0.76, 0.63, 0.048, 0, 0.025, 0.024);
  box(parent, walls, 0.64, 0.47, 0.40, 0, 0.065, 0.245);
  box(parent, frame, 0.686, 0.512, 0.025, 0, 0.062, 0.43);
  box(parent, linen, 0.698, 0.525, 0.018, 0, 0.062, 0.453);
  box(parent, frame, 0.17, 0.024, 0.27, 0, -0.179, 0.184);
  box(parent, lit, 0.103, 0.01, 0.13, 0, -0.195, 0.233);
  oval(parent, material(colors.gold, 0.3), 0.06, -0.206, 0.135, 0.011, 0.010, 0.012);
  for (const x of [-0.22, 0.22]) {
    const center = 0.233;
    box(parent, frame, 0.154, 0.043, 0.163, x, -0.189, center);
    box(parent, lit, 0.117, 0.01, 0.123, x, -0.215, center);
    box(parent, frame, 0.012, 0.014, 0.128, x, -0.222, center);
    box(parent, frame, 0.120, 0.014, 0.012, x, -0.222, center);
    box(parent, linen, 0.176, 0.062, 0.019, x, -0.195, center - 0.087);
    if (style === 'flower') {
      box(parent, base, 0.143, 0.054, 0.036, x, -0.235, center - 0.084);
      for (let i = 0; i < 5; i++) oval(parent, material(i % 2 ? 0xff9dac : 0xffd48a, 0.08),
        x + (i - 2) * 0.024, -0.241, center - 0.052, 0.017, 0.015, 0.019);
    } else {
      for (let i = 0; i < 4; i++) box(parent, material([0xb36b67, 0x538d8c, 0x5b5c83, 0x998055][i]),
        0.016, 0.009, 0.031 + i % 2 * 0.017, x - 0.043 + i * 0.023, -0.224, center - 0.043);
    }
  }
  for (const x of [-0.29, 0.29]) {
    box(parent, linen, 0.039, 0.046, 0.285, x, -0.187, 0.220);
    box(parent, frame, 0.059, 0.058, 0.030, x, -0.187, 0.084);
    oval(parent, lit, x, -0.231, 0.337, 0.018, 0.017, 0.028);
  }
  for (const side of [-1, 1]) {
    box(parent, frame, 0.012, 0.18, 0.165, side * 0.325, 0.085, 0.257);
    box(parent, lit, 0.008, 0.143, 0.123, side * 0.334, 0.085, 0.257);
    for (const y of [0.04, 0.129]) box(parent, frame, 0.013, 0.012, 0.13, side * 0.34, y, 0.257);
  }
  box(parent, base, 0.28, 0.14, 0.026, 0, -0.273, 0.015);
  box(parent, linen, 0.244, 0.105, 0.024, 0, -0.243, 0.039);
  return lit;
}

function flowerShop(group) {
  const hinge = new THREE.Group();
  const house = new THREE.Group();
  hinge.position.y = -0.28; house.position.y = 0.28; hinge.add(house); group.add(hinge);
  const windows = storefront(house, { wall: 0xe9b7ac, trim: 0x873f59, base: 0xad7b73 }, 'flower');
  const stripe = material(0xa54c67), linen = material(colors.cream);
  const roof = tube(house, material(0x794359), 0.39, 0.50, 0.115, 0, 0.055, 0.51, 4);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.75;
  box(house, material(0xc88085), 0.54, 0.401, 0.017, 0, 0.055, 0.57);
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.095;
    const awning = box(house, i % 2 ? linen : stripe, 0.095, 0.2, 0.018, x, -0.222, 0.403);
    awning.rotation.x = 0.24;
    oval(house, i % 2 ? linen : stripe, x, -0.322, 0.375, 0.048, 0.01, 0.023);
  }
  sign(house, '花间铺', 'PETAL & BLOOM', '#873f59', 0, -0.245, 0.487, 0.32);
  const blooms = [];
  for (const [x, y, height, color] of [[-0.21, 0.04, 0.20, 0xe76798], [0.04, 0.09, 0.30, 0xffb964], [0.21, 0.03, 0.19, 0xb188ed]]) {
    tube(house, material(0x5ba87d), 0.014, 0.02, height, x, y, 0.56 + height / 2, 8);
    const bloom = new THREE.Group();
    bloom.position.set(x, y, 0.56 + height); house.add(bloom); blooms.push(bloom);
    const petals = material(color, 0.13);
    for (let i = 0; i < 6; i++) {
      const a = i * tau / 6;
      oval(bloom, petals, Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0, 0.052, 0.046, 0.037);
    }
    oval(bloom, material(colors.gold, 0.25), 0, 0, 0.026, 0.043, 0.043, 0.04);
  }
  const drifting = Array.from({ length: 16 }, (_, i) => oval(group, i % 2 ? stripe : linen, 0, 0, 0, 0.017, 0.008, 0.003));
  return t => {
    windows.emissiveIntensity = 0.10 + ease((t - 4.8) / 0.62) * 0.8;
    hinge.rotation.x = -(1 - ease(t / 1.35)) * Math.PI * 0.51;
    blooms.forEach((bloom, i) => bloom.scale.setScalar(Math.max(0.001, ease((t - 0.85 - i * 0.17) / 0.64))));
    drifting.forEach((petal, i) => {
      const age = t - 1.15 - i * 0.22;
      petal.visible = age >= 0 && age < 3.8;
      if (!petal.visible) return;
      const a = i * 2.4 + age * 1.7;
      petal.position.set(Math.cos(a) * (0.24 + age * 0.1), Math.sin(a) * (0.2 + age * 0.09) - age * 0.04, 0.7 + Math.sin(age * 1.25) * 0.15 - age * 0.085);
      petal.rotation.set(a, age * 2, i);
    });
  };
}

function fountain(group) {
  const base = new THREE.Group();
  group.add(base);
  const stone = material(0x6383a1), porcelain = material(0xc9f1df), water = material(0x52c4c4, 0.25);
  tube(base, stone, 0.44, 0.47, 0.07, 0, 0, 0.035, 12);
  tube(base, porcelain, 0.36, 0.41, 0.11, 0, 0, 0.111, 20);
  tube(base, water, 0.328, 0.328, 0.012, 0, 0, 0.17, 24);
  const rim = mesh(base, new THREE.TorusGeometry(0.35, 0.026, 8, 36), porcelain, 0, 0, 0.168);
  rim.rotation.z = 0.16;
  tube(base, stone, 0.052, 0.091, 0.23, 0, 0, 0.285, 12);
  tube(base, porcelain, 0.116, 0.056, 0.055, 0, 0, 0.412, 18);
  oval(base, material(colors.mint, 0.62), 0, 0, 0.447, 0.06, 0.06, 0.058);
  const spray = sparkles(group, colors.mint, 75, 0.061, (pos, j, i, time) => {
    const age = (time * 0.95 + i / 75) % 1;
    const a = i * 2.39996 + time * 0.45;
    const radius = age * (0.24 + random(i) * 0.09);
    pos[j] = Math.cos(a) * radius; pos[j + 1] = Math.sin(a) * radius;
    pos[j + 2] = 0.43 + (0.55 + random(i + 13) * 0.21) * age - age ** 2 * 0.94;
  });
  const ripple = mesh(group, new THREE.RingGeometry(0.27, 0.282, 44), new THREE.MeshBasicMaterial({
    color: colors.mint, transparent: true, depthWrite: false, side: THREE.DoubleSide,
  }), 0, 0, 0.179);
  return (t, worldScale) => {
    const rise = ease(t / 1.32);
    base.scale.set(0.78 + rise * 0.22, 0.78 + rise * 0.22, Math.max(0.001, rise));
    spray.points.visible = ripple.visible = t > 1.33;
    if (spray.points.visible) {
      spray.update(t, worldScale);
      const phase = (t * 0.55) % 1;
      ripple.scale.setScalar(0.32 + phase * 0.82);
      ripple.material.opacity = (1 - phase) * 0.75;
    }
  };
}

function paperWing(parent, side) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0.062, 0, side * 0.14, -0.05, 0, side * 0.032, -0.018, 0.018,
  ], 3));
  geometry.computeVertexNormals();
  const mat = material(side < 0 ? colors.cream : 0xffdfac, 0.24);
  mat.side = THREE.DoubleSide;
  return mesh(parent, geometry, mat);
}

function bookshop(group) {
  const lift = new THREE.Group();
  group.add(lift);
  box(lift, material(0x495f57), 0.82, 0.74, 0.16, 0, 0.03, 0.08);
  const house = new THREE.Group();
  house.position.z = 0.16; lift.add(house);
  const windows = storefront(house, { wall: 0x8bb1a2, trim: 0x325856, base: 0x577c72 }, 'book');
  const step = material(0xd2c6a6);
  for (let i = 0; i < 3; i++) box(lift, step, 0.36 - i * 0.025, 0.15, (i + 1) * 0.05, 0, -0.41 + i * 0.047, (i + 1) * 0.025);
  sign(house, '纸间书店', 'THE PAPER HOUSE', '#325856', 0, -0.211, 0.389, 0.36);
  const cover = material(0x37695e), pages = material(colors.cream), print = material(0xb0836b);
  const book = new THREE.Group();
  book.position.set(0, 0.04, 0.625); lift.add(book);
  const covers = [];
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    box(leaf, cover, 0.35, 0.51, 0.035, side * 0.169, 0, 0);
    box(leaf, pages, 0.322, 0.469, 0.031, side * 0.16, 0, 0.027);
    for (let i = 0; i < 5; i++) box(leaf, print, 0.23 - i % 2 * 0.035, 0.008, 0.003, side * 0.154, -0.153 + i * 0.066, 0.045);
    book.add(leaf); covers.push(leaf);
  }
  const page = new THREE.Group();
  box(page, pages, 0.307, 0.435, 0.004, 0.156, 0, 0.006);
  book.add(page);
  const birds = Array.from({ length: 5 }, () => {
    const bird = new THREE.Group();
    const wings = [-1, 1].map(side => paperWing(bird, side));
    group.add(bird);
    return { bird, wings };
  });
  return (t, _, fountainPosition) => {
    windows.emissiveIntensity = 0.10 + ease((t - 5.3) / 0.62) * 0.8;
    lift.scale.z = Math.max(0.001, ease(t / 1.12));
    const opening = ease((t - 0.6) / 0.98);
    covers[0].rotation.y = -(1 - opening) * 1.31 + opening * 0.42;
    covers[1].rotation.y = (1 - opening) * 1.31 - opening * 0.42;
    const flip = (Math.max(0, t - 1.38) * 0.73) % 1;
    page.visible = t > 1.4;
    page.rotation.y = -flip * Math.PI;
    birds.forEach(({ bird, wings }, i) => {
      const age = t - 1.95 - i * 0.29;
      bird.visible = age > 0 && age < 5.8;
      if (!bird.visible) return;
      const blend = ease(age / 1.62);
      const a = age * 1.9 + i * 0.66;
      const centerX = fountainPosition?.x ?? 0.48, centerY = fountainPosition?.y ?? 0.07;
      bird.position.set((centerX + Math.cos(a) * 0.38) * blend, (centerY + Math.sin(a) * 0.38) * blend, 0.71 + Math.sin(age * 1.9 + i * 0.4) * 0.13 + blend * 0.16);
      bird.rotation.z = a + Math.PI;
      const flap = Math.sin(age * 14 + i) * 0.51;
      wings[0].rotation.y = flap;
      wings[1].rotation.y = -flap;
      bird.scale.setScalar(Math.max(0.001, Math.min(1, age * 4, (5.8 - age) * 4)));
    });
  };
}

export const stickers = [
  { id: 'flower', label: '花店', color: colors.pink, build: flowerShop },
  { id: 'fountain', label: '喷泉', color: colors.mint, build: fountain },
  { id: 'book', label: '书店', color: 0xcc9efa, build: bookshop },
];

export function createMarket(definition) {
  const group = new THREE.Group();
  const props = new THREE.Group();
  group.add(props);
  const updateProps = definition.build(props);
  const ring = mesh(group, new THREE.RingGeometry(0.38, 0.405, 44), new THREE.MeshBasicMaterial({
    color: definition.color, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide,
  }), 0, 0, 0.015);
  const particles = sparkles(group, definition.color, 22, 0.065, (pos, j, i, t) => {
    const a = random(i) * tau + t * 1.6;
    const rise = (t * 0.8 + random(i + 77)) % 1;
    const radius = 0.35 + rise * 0.22;
    pos[j] = Math.cos(a) * radius; pos[j + 1] = Math.sin(a) * radius; pos[j + 2] = rise * 0.58;
  });
  const scale = new THREE.Vector3();
  return {
    group,
    update(t, fountainPosition) {
      const worldScale = group.getWorldScale(scale).x;
      updateProps(t, worldScale, fountainPosition);
      const finale = t >= 5.25;
      const sweep = finale ? clamp((t - 5.25) / 1.4) : clamp(t / 2.1);
      ring.visible = sweep < 1;
      ring.material.color.setHex(finale ? colors.gold : definition.color);
      ring.scale.setScalar(0.48 + sweep * 0.86);
      ring.material.opacity = (1 - sweep) * 0.9;
      particles.points.visible = t < 3.3;
      if (particles.points.visible) {
        particles.points.material.opacity = Math.min(1, (3.3 - t) * 1.1);
        particles.update(t, worldScale);
      }
    },
  };
}

export function lightMarket(scene, shadows = false) {
  scene.add(new THREE.HemisphereLight(0xfff2e0, 0x7d709e, 1.65));
  const key = new THREE.DirectionalLight(0xffead0, 2.15);
  key.position.set(-2, -2, 4);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3.6, right: 3.6, top: 3.6, bottom: -3.6, near: 0.1, far: 11 });
    key.shadow.normalBias = 0.018;
  }
  scene.add(key);
}

export { box, material, mesh, oval, sign, tube };
