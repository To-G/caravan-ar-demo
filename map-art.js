const originalTiles = [
  [1, 4], [0, 0], [5, 5], [1, 1], [5, 3],
  [3, 5], [5, 0], [0, 2], [2, 5],
  [2, 0], [4, 2], [1, 2],
];
const ink = '#253064';
const shops = ['#f2685a', '#269c9a', '#9262c4', '#e49a32'];

function circle(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function icon(ctx, id, label) {
  if (id.startsWith('tree-')) {
    ctx.fillStyle = '#9b6b3d';
    ctx.fillRect(-3, 4, 6, 20);
    circle(ctx, -9, 1, 13, '#53a96e');
    circle(ctx, 6, -8, 15, '#44935a');
    circle(ctx, 11, 10, 9, '#76bd78');
  } else if (id.startsWith('block-')) {
    circle(ctx, 0, 0, 18, ink);
    circle(ctx, 0, 0, 15, '#5c8bf2');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 25px sans-serif';
    ctx.fillText('?', 0, 1);
  } else if (id === 'fountain') {
    circle(ctx, 0, 0, 38, ink);
    circle(ctx, 0, 0, 35, '#93cde9');
    circle(ctx, 0, 0, 22, '#53a9d6');
    circle(ctx, 0, 0, 8, '#fff');
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      circle(ctx, Math.cos(a) * 28, Math.sin(a) * 28, 2.5, '#fff');
    }
  } else if (id.startsWith('stall-')) {
    ctx.fillStyle = '#fffdf4';
    ctx.fillRect(-20, -1, 40, 23);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(-20, -1, 40, 23);
    ctx.beginPath();
    ctx.moveTo(-25, -1);
    ctx.lineTo(0, -19);
    ctx.lineTo(25, -1);
    ctx.closePath();
    ctx.fillStyle = shops[Number(id.slice(-1)) - 1];
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(label, 0, 11);
  }
}

export function drawMap(ctx, image, items, layout) {
  const { width, height } = ctx.canvas;
  const tile = image.width / 6;
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.scale(width / image.width, height / image.height);
  ctx.drawImage(image, 0, 0);
  for (const [col, row] of [[3, 3], [4, 3], [3, 4], [4, 4]]) {
    const sourceCol = (col + row) % 2 === 0 ? 2 : 3;
    ctx.drawImage(image, sourceCol * tile, tile * 2, tile, tile,
      col * tile, row * tile, tile, tile);
  }
  for (const [col, row] of originalTiles) {
    const sourceCol = (col + row) % 2 === 0 ? 2 : 3;
    const inset = 6;
    const size = tile - inset * 2;
    ctx.drawImage(image, sourceCol * tile + inset, tile * 2 + inset, size, size,
      col * tile + inset, row * tile + inset, size, size);
  }
  for (const { id, label } of items) {
    const { col, row, scale, rotation } = layout[id];
    ctx.save();
    ctx.translate((col + 0.5) * tile, (row + 0.5) * tile);
    ctx.rotate(-rotation * Math.PI / 180);
    ctx.scale(scale * tile / 76, scale * tile / 76);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    icon(ctx, id, label);
    ctx.restore();
  }
  ctx.restore();
}
