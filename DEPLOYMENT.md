# 窗口版自动发布

线上地址：https://magic-market-window.dlttog.workers.dev/magic-stickers/portal.html

Cloudflare 关联仓库 To-G/caravan-ar-demo，生产分支 window，根目录保持仓库根目录。

- 构建命令：`npm run build`
- 部署命令：`npx wrangler@4.159.0 deploy`
- Worker 名称：`magic-market-window`

修改 `magic-stickers/` 中的场景文件并提交 window 后，Cloudflare 构建并发布。`lib/` 和 `camera.js` 为共享运行文件。原版场景源文件仍保留。

`dist/` 由构建生成，不需要提交。不要将 Cloudflare 登录信息、令牌或 `.wrangler/` 上传到 GitHub。

卡面、贴纸或识别图变化需要同时更新打印稿及识别文件，普通场景代码修改无需更换二维码。

