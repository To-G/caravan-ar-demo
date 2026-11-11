import * as THREE from 'three';
import { box, material, mesh, oval, tube } from './market.js';

const width = 4.15, depth = 2.92;
const cream = material(0xdbc5a3);
const clay = material(0xb66f59);
const soil = material(0x705349);
const foliage = [material(0x537964), material(0x729279), material(0x8ba480)];

function groundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 720;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#a2ac84';
  ctx.fillRect(0, 0, w, h);
  const path = new Path2D();
  path.moveTo(w * 0.08, h * 0.77);
  path.bezierCurveTo(w * 0.24, h * 0.92, w * 0.42, h * 0.76, w * 0.49, h * 0.60);
  path.bezierCurveTo(w * 0.59, h * 0.35, w * 0.69, h * 0.39, w * 0.92, h * 0.36);
  const backLane = new Path2D();
  backLane.moveTo(w * 0.16, h * 0.47);
  backLane.bezierCurveTo(w * 0.39, h * 0.24, w * 0.57, h * 0.37, w * 0.78, h * 0.39);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#99836d';
  ctx.lineWidth = 95;
  ctx.stroke(backLane);
  ctx.lineWidth = 182;
  ctx.stroke(path);
  ctx.fillStyle = '#ac957b';
  ctx.beginPath();ctx.ellipse(w * 0.51, h * 0.62, 206, 157, 0, 0, Math.PI * 2);ctx.fill();

  ctx.strokeStyle = '#dfc7a1';
  ctx.lineWidth = 84;ctx.stroke(backLane);
  ctx.lineWidth = 165;ctx.stroke(path);
  ctx.fillStyle = '#ddc39d';
  ctx.beginPath();ctx.ellipse(w * 0.51, h * 0.62, 195, 146, 0, 0, Math.PI * 2);ctx.fill();
  const surface = ctx.getImageData(0, 0, w, h).data;
  const colors = ['#ceb48f', '#ead2ac', '#d9bc94', '#e3c69e', '#f1d8b2', '#c5a987'];
  for (let y = 15; y < h - 10; y += 25) {
    for (let x = 12 + (Math.floor(y / 25) % 2) * 19; x < w - 18; x += 37) {
      const pixel = (y * w + x) * 4;
      const seed = (x * 3 + y * 7) % 23;
      if (surface[pixel] < 188) {
        if (seed % 4 === 0) {
          ctx.fillStyle = seed % 3 ? '#aebb92' : '#8c9b77';
          ctx.fillRect(x, y, 4, 2);
        }
        continue;
      }
      ctx.fillStyle = colors[seed % colors.length];
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x - 14, y - 9, 27 + seed % 5, 16 + seed % 3, 4);
        ctx.fill();
      } else {
        ctx.fillRect(x - 14, y - 9, 27 + seed % 5, 16 + seed % 3);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function tree(group, x, y, s, variant) {
  const stem = material(0x755749);
  tube(group, stem, 0.025 * s, 0.041 * s, 0.47 * s, x, y, 0.235 * s, 8);
  for (const [i, offset] of [[0, -0.10], [1, 0.10], [2, 0]]) {
    oval(group, foliage[(i + variant) % 3], x + offset * s, y + (i % 2 ? 0.033 : -0.022) * s,
      (i === 2 ? 0.64 : 0.49) * s, 0.17 * s, 0.146 * s, 0.19 * s);
  }
}

function garden(group, x, y, s) {
  box(group, cream, 0.49 * s, 0.21 * s, 0.055, x, y, 0.028);
  box(group, soil, 0.43 * s, 0.158 * s, 0.013, x, y, 0.061);
  const bloom = [material(0xe9aa80), material(0xe8a5b5), material(0xe5cd92)];
  for (let i = 0; i < 8; i++) {
    const dx = (i % 4 - 1.5) * 0.103 * s, dy = (i < 4 ? -0.04 : 0.04) * s;
    const h = (0.045 + (i * 7 % 5) * 0.012) * s;
    tube(group, foliage[i % 3], 0.008, 0.011, h, x + dx, y + dy, 0.065 + h / 2, 7);
    oval(group, bloom[i % 3], x + dx, y + dy, 0.065 + h, 0.023 * s, 0.021 * s, 0.018 * s);
  }
}

function lamp(group, x, y) {
  const metal = material(0x525950);
  tube(group, metal, 0.017, 0.037, 0.08, x, y, 0.04, 8);
  tube(group, metal, 0.012, 0.018, 0.27, x, y, 0.21, 8);
  box(group, metal, 0.077, 0.075, 0.023, x, y, 0.34);
  box(group, material(0xffdb93, 0.55), 0.056, 0.055, 0.062, x, y, 0.379);
  tube(group, metal, 0.009, 0.054, 0.048, x, y, 0.428, 4);
}

function house(group, x, y, w, h, wallColor, roofColor) {
  const wall = material(wallColor);
  const roof = material(roofColor);
  const frame = material(0x654f47);
  const glass = material(0xf5cb7d, 0.27);
  box(group, wall, w, 0.41, h, x, y, h / 2);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.04, 0);
  shape.lineTo(w / 2 + 0.04, 0);
  shape.lineTo(0.026, 0.23);
  shape.closePath();
  const gable = mesh(group, new THREE.ExtrudeGeometry(shape, { depth: 0.45, bevelEnabled: false }), roof,
    x, y + 0.225, h);
  gable.rotation.x = Math.PI / 2;
  for (const dx of [-w * 0.25, w * 0.25]) {
    box(group, cream, 0.109, 0.024, 0.118, x + dx, y - 0.215, h * 0.69);
    box(group, glass, 0.082, 0.013, 0.084, x + dx, y - 0.232, h * 0.69);
    box(group, frame, 0.012, 0.012, 0.087, x + dx, y - 0.243, h * 0.69);
  }
  box(group, frame, 0.104, 0.024, 0.15, x, y - 0.217, 0.079);
  box(group, roof, 0.075, 0.08, 0.19, x - w * 0.24, y + 0.092, h + 0.148);
  box(group, cream, w + 0.035, 0.04, 0.023, x, y - 0.221, 0.032);
  box(group, cream, w + 0.028, 0.035, 0.025, x, y - 0.222, h - 0.025);
  for (const dx of [-w * 0.25, w * 0.25]) {
    for (const side of [-1, 1]) box(group, roof, 0.026, 0.014, 0.125,
      x + dx + side * 0.068, y - 0.237, h * 0.69);
    box(group, cream, 0.145, 0.058, 0.022, x + dx, y - 0.231, h * 0.69 - 0.07);
  }
  const ridge = material(0xb69679);
  for (const side of [-1, 1]) {
    for (let row = 1; row < 5; row++) {
      const dx = side * (w / 2 + 0.02) * row / 5;
      const slat = box(group, ridge, 0.008, 0.456, 0.006, x + dx, y, h + 0.23 * (1 - row / 5) + 0.008);
      slat.rotation.y = side * 0.62;
    }
  }
}

function marketDetails(town) {
  const string = material(0x796957);
  const cloth = [material(0xc87c71), material(0xe9cc8e), material(0x7eada4)];
  const posts = material(0x725e4d);
  for (const x of [-0.64, 0.68]) tube(town, posts, 0.014, 0.019, 0.78, x, 0.25, 0.39, 8);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.64,0.25,0.78),new THREE.Vector3(0.02,0.25,0.65),new THREE.Vector3(0.68,0.25,0.78),
  ]);
  mesh(town, new THREE.TubeGeometry(curve, 24, 0.005, 5, false), string);
  for (let i=0;i<9;i++) {
    const point=curve.getPoint((i+0.5)/9);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([-0.046,0,0,0.046,0,0,0,0,-0.102],3));
    geometry.computeVertexNormals();
    const flag=mesh(town,geometry,cloth[i%3],point.x,point.y,point.z);
    flag.material.side=THREE.DoubleSide;
  }
  const cart=new THREE.Group();cart.position.set(1.55,-0.38,0);cart.rotation.z=-0.25;town.add(cart);
  const wood=material(0xa47e59),linen=material(0xefddb4);
  box(cart,wood,0.34,0.20,0.12,0,0,0.13);
  for(const x of [-0.15,0.15]) {
    const wheel=mesh(cart,new THREE.TorusGeometry(0.065,0.012,6,14),posts,x,0,0.065);
    wheel.rotation.y=Math.PI/2;
    tube(cart,posts,0.009,0.011,0.30,x,0.065,0.32,6);
  }
  for(let i=0;i<5;i++)box(cart,i%2?cloth[0]:linen,0.075,0.28,0.015,(i-2)*0.075,0,0.48);
  const produce=[material(0xd79659),material(0xb35952),material(0x88a064)];
  for(let i=0;i<12;i++)oval(cart,produce[i%3],(i%4-1.5)*0.067,(Math.floor(i/4)-1)*0.055,0.22,0.029,0.025,0.026);
}

export function buildTown(scene) {
  const town = new THREE.Group();
  scene.add(town);
  const outer = material(0x715a49);
  const paper = material(0xd9bd94);
  box(town, outer, width + 0.24, depth + 0.24, 0.21, 0, 0, -0.13);
  box(town, paper, width + 0.26, depth + 0.26, 0.028, 0, 0, -0.239);
  const floor = mesh(town, new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.94 }), 0, 0, -0.004);
  floor.userData.floor = true;
  for (const x of [-width / 2 - 0.035, width / 2 + 0.035]) {
    box(town, paper, 0.09, depth + 0.15, 0.18, x, 0, 0.055);
    box(town, cream, 0.109, depth + 0.17, 0.022, x, 0, 0.151);
  }
  box(town, paper, width + 0.16, 0.09, 0.147, 0, -depth / 2 - 0.037, 0.038);
  box(town, cream, width + 0.16, 0.108, 0.021, 0, -depth / 2 - 0.037, 0.12);
  box(town, paper, width + 0.16, 0.095, 0.32, 0, depth / 2 + 0.022, 0.12);
  box(town, cream, width + 0.16, 0.113, 0.026, 0, depth / 2 + 0.022, 0.29);
  house(town, -1.48, 1.03, 0.52, 0.52, 0xd8ad8d, 0x915e53);
  house(town, -0.84, 1.12, 0.51, 0.69, 0xb6b793, 0x5c766a);
  house(town, -0.20, 1.11, 0.54, 0.51, 0xe2c5a0, 0x9a665b);
  tree(town, -1.87, 0.60, 1.09, 1);
  tree(town, 1.79, 1.03, 1.25, 2);
  tree(town, 1.86, -0.72, 0.89, 0);
  tree(town, -1.84, -0.90, 0.78, 0);
  garden(town, -1.21, -1.20, 1.03);
  garden(town, 1.01, -1.23, 1.0);
  garden(town, 1.58, 0.06, 0.78);
  for (const [x, y] of [[-0.64, -0.98], [0.72, -0.94], [0.59, 0.80], [-1.62, 0.28]]) lamp(town, x, y);
  const bench = material(0x966550);
  for (const x of [-0.88, 0.99]) {
    box(town, bench, 0.25, 0.064, 0.022, x, 0.08, 0.077);
    box(town, bench, 0.25, 0.021, 0.056, x, 0.115, 0.113);
    for (const dx of [-0.087, 0.087]) box(town, clay, 0.021, 0.05, 0.065, x + dx, 0.08, 0.034);
  }
  marketDetails(town);
  return town;
}
