import { card, sticker, slots } from './card-layout.js';

const size = 32;
function signature(data) {
  const values = [];
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) { values.push(data[i + c]); sum += data[i + c]; }
  }
  const mean = sum / values.length;
  let norm = 0;
  for (let i = 0; i < values.length; i++) { values[i] -= mean; norm += values[i] ** 2; }
  norm = Math.sqrt(norm);
  return norm > 1 ? values.map(value => value / norm) : null;
}

export async function createStickerReader(video, base, projection) {
  const tile = document.createElement('canvas');
  tile.width = tile.height = size;
  const tileContext = tile.getContext('2d', { willReadFrequently: true });
  const templates = await Promise.all(['flower','fountain','book'].map(async id => {
    const image = new Image();
    image.src = './assets/' + id + '.svg';
    await image.decode();
    tileContext.clearRect(0, 0, size, size);
    tileContext.drawImage(image, 0, 0, size, size);
    return signature(tileContext.getImageData(0, 0, size, size).data);
  }));
  const frame = document.createElement('canvas');
  const context = frame.getContext('2d', { willReadFrequently: true });
  let last = 0;
  return now => {
    if (now - last < 180 || !base.visible) return null;
    last = now;
    frame.width = video.videoWidth; frame.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    const pixels = context.getImageData(0, 0, frame.width, frame.height).data;
    base.group.updateWorldMatrix(true, false);
    const m = base.group.matrixWorld.elements;
    return slots.map(slot => {
      const patch = new Uint8ClampedArray(size * size * 4);
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const x = (slot.x - card.width/2 + ((col+0.5)/size-0.5)*sticker.width)/card.width;
          const y = (card.height/2-slot.y - ((row+0.5)/size-0.5)*sticker.width)/card.width;
          const px = m[0]*x + m[4]*y + m[12];
          const py = m[1]*x + m[5]*y + m[13];
          const pz = m[2]*x + m[6]*y + m[14];
          const u = Math.round(projection[0][0]*px/-pz+projection[0][2]);
          const v = Math.round(projection[1][1]*-py/-pz+projection[1][2]);
          if (u < 0 || v < 0 || u >= frame.width || v >= frame.height) return null;
          const source = (v*frame.width+u)*4, dest = (row*size+col)*4;
          patch[dest]=pixels[source];patch[dest+1]=pixels[source+1];patch[dest+2]=pixels[source+2];patch[dest+3]=255;
        }
      }
      const input = signature(patch);
      if (!input) return null;
      const scores = templates.map((template, type) => ({
        type, score: template.reduce((sum, value, i) => sum + value * input[i], 0),
      })).sort((a,b)=>b.score-a.score);
      return scores[0].score > 0.64 && scores[0].score-scores[1].score > 0.10 ? scores[0].type : null;
    });
  };
}
