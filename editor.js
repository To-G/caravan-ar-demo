const draftKey = 'caravan-ar-layout-draft-v1';

export function mountEditor(items, published, applyLayout) {
  document.body.classList.add('editing');

  const panel = document.createElement('aside');
  panel.id = 'scene-editor';
  panel.innerHTML = `
    <h1>AR 场景编辑器</h1>
    <p>拖动地图上的道具，实时查看 3D 效果。</p>
    <div id="layout-map" aria-label="道具摆放地图"></div>
    <label>道具 <select id="layout-item"></select></label>
    <div class="layout-fields">
      <label>横向位置 <input id="layout-col" type="number" min="1" max="6" step="0.5"></label>
      <label>纵向位置 <input id="layout-row" type="number" min="1" max="6" step="0.5"></label>
      <label>大小（倍） <input id="layout-scale" type="number" min="0.4" max="2" step="0.05"></label>
      <label>朝向（度） <input id="layout-rotation" type="number" min="-180" max="180" step="5"></label>
    </div>
    <p id="layout-note"></p>
    <div class="layout-actions">
      <button type="button" id="layout-save">保存草稿</button>
      <button type="button" id="layout-export">下载布局</button>
      <button type="button" id="layout-import">导入布局</button>
      <button type="button" id="layout-reset">恢复已发布布局</button>
      <input type="file" id="layout-file" accept=".json,application/json" hidden>
    </div>
    <p id="layout-status" role="status">草稿仅在本浏览器使用。下载布局后可交给项目维护人发布。</p>`;
  document.body.appendChild(panel);

  const element = id => panel.querySelector('#layout-' + id);
  const map = element('map'), select = element('item'), status = element('status');
  const pins = new Map();
  let layout = published;
  let selected = items[0];
  let drag = null;
  try {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      layout = applyLayout(JSON.parse(saved));
      status.textContent = '已加载此浏览器的草稿。';
    }
  } catch {}

  for (const item of items) {
    select.add(new Option(item.label, item.id));
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.dataset.id = item.id;
    pin.textContent = item.label;
    pin.addEventListener('click', () => choose(item.id));
    map.appendChild(pin);
    pins.set(item.id, pin);
  }

  function render() {
    const value = layout[selected.id];
    select.value = selected.id;
    for (const key of ['col', 'row', 'scale', 'rotation']) {
      const isPosition = key === 'col' || key === 'row';
      element(key).value = value[key] + (isPosition ? 1 : 0);
      element(key).disabled = isPosition && selected.fixed;
    }
    element('note').textContent = selected.fixed ? '终点位置跟随程序路线，可调整大小和朝向。' : '';
    for (const [id, pin] of pins) {
      pin.style.left = ((layout[id].col + 0.5) / 6 * 100) + '%';
      pin.style.top = ((layout[id].row + 0.5) / 6 * 100) + '%';
      pin.setAttribute('aria-pressed', String(id === selected.id));
    }
  }

  function choose(id) {
    selected = items.find(item => item.id === id);
    render();
  }

  function update(patch) {
    layout = applyLayout({ ...layout, [selected.id]: { ...layout[selected.id], ...patch } });
    render();
    status.textContent = '布局已修改，可保存草稿或下载。';
  }

  select.addEventListener('change', () => choose(select.value));
  for (const key of ['col', 'row', 'scale', 'rotation']) {
    element(key).addEventListener('change', event => {
      const value = event.target.valueAsNumber;
      if (Number.isFinite(value)) update({ [key]: value - (key === 'col' || key === 'row' ? 1 : 0) });
      else render();
    });
  }

  map.addEventListener('pointerdown', event => {
    const pin = event.target.closest('[data-id]');
    if (!pin || event.button !== 0 || drag !== null) return;
    choose(pin.dataset.id);
    if (selected.fixed) return;
    const { col, row } = layout[selected.id];
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, col, row };
    map.setPointerCapture(event.pointerId);
  });
  map.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;
    const bounds = map.getBoundingClientRect();
    const snap = value => Math.round(value * 2) / 2;
    const col = snap(drag.col + (event.clientX - drag.x) * 6 / bounds.width);
    const row = snap(drag.row + (event.clientY - drag.y) * 6 / bounds.height);
    if (col !== layout[selected.id].col || row !== layout[selected.id].row) update({ col, row });
  });
  map.addEventListener('lostpointercapture', () => { drag = null; });

  element('save').onclick = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(layout));
      status.textContent = '草稿已保存。家长打开的页面仍使用已发布布局。';
    } catch {
      status.textContent = '浏览器无法保存草稿，请下载布局。';
    }
  };
  element('export').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(layout, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'scene-layout.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const file = element('file');
  element('import').onclick = () => file.click();
  file.onchange = async () => {
    if (!file.files[0]) return;
    try {
      const data = JSON.parse(await file.files[0].text());
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid layout');
      layout = applyLayout(data);
      render();
      status.textContent = '布局已导入，可继续编辑。';
    } catch {
      status.textContent = '无法读取布局，请选择下载的 scene-layout.json。';
    } finally {
      file.value = '';
    }
  };
  element('reset').onclick = () => {
    layout = applyLayout(published);
    render();
    status.textContent = '已恢复发布布局。点击保存草稿可替换之前保存的版本。';
  };
  render();
}
