# 森林展开版

分支：immersive-town。入口：magic-stickers/immersive.html。

卡面作为小镇地面，森林、溪流、木桥、花丛和小路延伸到卡面之外。树木逐渐长出、建筑展开，云层、飞鸟和蝴蝶持续循环。相机使用已验证的 camera2 0 优先选择及视频流直连，保留手动镜头切换。

界面只保留品牌、菜单、简短提示与拍摄控制。声音、预览、打印、重新识别与镜头设置放入菜单。首次点击启动相机后启用音效，可在菜单关闭。音效由 Web Audio 合成，无第三方音频素材和外部请求。

短按拍照，长按录视频，最长10秒。声音开启时视频包含场景音效，不采集麦克风。

生成单 HTML：node scripts/build-single.cjs --immersive
输出：../output/魔法集市-森林展开版/index.html。

原来的 portal.html 和 portal.js 保留，默认构建不带 --immersive 时仍生成原版。
打印卡和二维码不变。不要把此分支直接接到旧版生产部署，先用新 HTML 实机验收。
