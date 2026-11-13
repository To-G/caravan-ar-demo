const preferenceKey = 'caravan-ar-camera';
const front = /front|facetime|selfie|前置|前摄|自拍/i;
const specialty = /telephoto|tele\b|ultra[\s-]*wide|super[\s-]*wide|macro|triple|dual|fusion|virtual|长焦|超广角|微距|融合|虚拟|双摄|三摄/i;
const main = /main|primary|\bwide\b|后置主|主摄|广角|\b1(?:\.0)?\s*[x×]/i;
const rear = /back|rear|environment|后置|后摄/i;

function score(label) {
  if (front.test(label) || specialty.test(label)) return 0;
  if (main.test(label)) return 3;
  if (rear.test(label) && !/\d/.test(label)) return 2;
  return 1;
}

function chooseCamera(devices, preferred, active) {
  if (preferred && devices.some(device => device.deviceId === preferred)) return preferred;
  const candidates = devices.filter(device => score(device.label) > 1)
    .sort((a, b) => score(b.label) - score(a.label));
  const best = candidates[0];
  if (!best || (active && score(best.label) <= score(active.label))) return '';
  return best.deviceId;
}

export function stopStream(stream) {
  stream?.getTracks().forEach(track => track.stop());
}

export function savedCamera() {
  for (const name of ['sessionStorage', 'localStorage']) {
    try {
      const value = window[name].getItem(preferenceKey);
      if (value !== null) return value;
    } catch {}
  }
  return '';
}

export function saveCamera(value) {
  let saved = false;
  for (const name of ['sessionStorage', 'localStorage']) {
    try {
      window[name].setItem(preferenceKey, value);
      saved = true;
    } catch {}
  }
  return saved;
}

export async function openCardCamera(media, preferred, signal) {
  if (!media?.getUserMedia) throw new Error('Camera access is unavailable');
  async function devices() {
    try {
      const list = await media.enumerateDevices();
      return list.filter(device => device.kind === 'videoinput' && device.deviceId);
    } catch { return []; }
  }
  async function request(id) {
    if (signal.aborted) throw new Error('Camera start cancelled');
    const video = id ? { deviceId: { exact: id } } : { facingMode: { ideal: 'environment' } };
    const stream = await media.getUserMedia({ audio: false, video });
    if (!signal.aborted) return stream;
    stopStream(stream);
    throw new Error('Camera start cancelled');
  }

  let available = await devices();
  const initial = chooseCamera(available, preferred);
  let stream = initial ? await request(initial).catch(() => request('')) : await request('');
  let track = stream.getVideoTracks()[0];
  available = await devices();
  const activeId = track.getSettings?.().deviceId || '';
  const active = available.find(device => device.deviceId === activeId) || track;
  const next = chooseCamera(available, preferred, active);
  if (next && next !== activeId && next !== initial) {
    stopStream(stream);
    stream = await request(next).catch(() => request(''));
    track = stream.getVideoTracks()[0];
    available = await devices();
  }
  if (signal.aborted) {
    stopStream(stream);
    throw new Error('Camera start cancelled');
  }
  return { stream, devices: available, current: track.getSettings?.().deviceId || '', label: track.label };
}
