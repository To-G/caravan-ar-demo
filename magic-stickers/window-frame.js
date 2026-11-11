import * as THREE from 'three';

export function createWindowFrame(parent) {
  const frame = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xdba85c, metalness: 0.48, roughness: 0.34 });
  const cream = new THREE.MeshStandardMaterial({ color: 0xf7e5bd, roughness: 0.72 });
  const teal = new THREE.MeshStandardMaterial({ color: 0x426e64, roughness: 0.64 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xe5a1a2, roughness: 0.72 });
  function part(geometry, material, x, y, z = 0.009) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    frame.add(mesh);
    return mesh;
  }
  for (const side of [-1, 1]) {
    part(new THREE.BoxGeometry(0.065, 1.13, 0.028), teal, side * 0.531, 0);
    part(new THREE.BoxGeometry(1.13, 0.065, 0.028), teal, 0, side * 0.531);
    for (const offset of [0.507, 0.555]) {
      part(new THREE.BoxGeometry(0.009, 1.12, 0.012), gold, side * offset, 0, 0.028);
      part(new THREE.BoxGeometry(1.12, 0.009, 0.012), gold, 0, side * offset, 0.028);
    }
  }
  for (const x of [-0.53, 0.53]) {
    for (const y of [-0.53, 0.53]) {
      const ornament = part(new THREE.TorusGeometry(0.055, 0.009, 8, 32), gold, x, y, 0.034);
      ornament.scale.set(1, 0.83, 1);
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 2 / 5;
        const petal = part(new THREE.SphereGeometry(0.017, 12, 8), pink,
          x + Math.cos(angle) * 0.023, y + Math.sin(angle) * 0.023, 0.04);
        petal.scale.set(0.8, 1, 0.38);
      }
      part(new THREE.SphereGeometry(0.012, 12, 8), gold, x, y, 0.05);
    }
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const y = (i - 2.5) * 0.126;
      const leaf = part(new THREE.SphereGeometry(1, 10, 8), i % 2 ? gold : cream,
        side * (0.531 + (i % 2 ? 0.008 : -0.008)), y, 0.034);
      leaf.scale.set(0.012, 0.031, 0.006);
      leaf.rotation.z = side * (i % 2 ? -0.55 : 0.55);
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#365b53';
  ctx.beginPath();ctx.roundRect(6, 7, 1012, 242, 56);ctx.fill();
  ctx.strokeStyle = '#e6bc77';ctx.lineWidth = 9;ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff0ca';ctx.font = 'bold 126px "Microsoft YaHei",sans-serif';
  ctx.fillText('魔法集市', 512, 151);
  ctx.fillStyle = '#e7c58f';ctx.font = '25px Georgia,serif';
  ctx.fillText('THE MAGICAL MARKET', 512, 204);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const plaque = part(new THREE.PlaneGeometry(0.66, 0.165), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, side: THREE.DoubleSide,
  }), 0, 0.566, 0.049);
  plaque.renderOrder = 2;
  for (const side of [-1, 1]) {
    const star = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, radius = i % 2 ? 0.008 : 0.026;
      const x = Math.sin(a) * radius, y = Math.cos(a) * radius;
      if (i === 0) star.moveTo(x, y); else star.lineTo(x, y);
    }
    star.closePath();
    part(new THREE.ExtrudeGeometry(star, { depth: 0.005, bevelEnabled: false }), gold,
      side * 0.419, 0.531, 0.032);
  }
  parent.add(frame);
  return frame;
}
