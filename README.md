# 魔法集市 AR 贺卡

## 打开和测试

- 在线扫码体验：https://legendary-fairy-f55911.netlify.app/?ar
- 在线 360° 预览：https://legendary-fairy-f55911.netlify.app/?preview
- 场景编辑：https://legendary-fairy-f55911.netlify.app/?edit
- `print-card.png`：1000 × 1400 印刷稿。二维码打开 Netlify 的 AR 页面，然后用相机对准地图。
- `offline-preview.html`：双击查看固定演示。它是独立的离线快照，使用内置布局。

## 调整场景

1. 在场景编辑页点选道具，或在地图上拖动。用右侧字段微调位置、大小和朝向。终点位置和程序路线绑定，可以改大小和朝向。
2. 在 3D 画面中拖动，从不同角度确认效果。
3. 点「保存草稿」保存在当前浏览器。用「下载布局」和「导入布局」在设备间传递。
4. 确认后，将下载的 `scene-layout.json` 替换到网站根目录并随网站发布。扫码版和 360° 预览会读取已发布布局。

## 文件

| 文件 | 用途 |
|---|---|
| `index.html`、`app.js` | 扫卡体验、3D 场景和动画 |
| `editor.js`、`editor.css` | 场景编辑页 |
| `scene-layout.json` | 已发布的道具布局。空对象表示使用默认布局 |
| `assets/card.png` | 网页显示的卡图，与印刷稿使用相同入口 |
| `assets/panel.png`、`assets/targets.mind` | 地图图案和识别数据。更换地图图案时需重新生成识别数据 |
| `lib/` | 随项目部署的 MindAR 和 Three.js |

本地开发时，在本目录运行 `python -m http.server 8000`，打开 `http://localhost:8000/?edit`。实物扫码测试使用 HTTPS 地址，桌面浏览器也可以在本地用 `?ar` 打开摄像头。
