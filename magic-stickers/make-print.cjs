const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const base = __dirname;
const embed = file => 'data:image/' + (file.endsWith('.svg') ? 'svg+xml' : 'png') + ';base64,' +
  fs.readFileSync(path.join(base, file)).toString('base64');

const qr = embed('assets/card-qr.png');
const { drawMap } = require('./card-map.cjs');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
<rect x="2" y="2" width="596" height="896" rx="24" fill="#fff5df" stroke="#355c53" stroke-width="4"/>
<rect x="13" y="13" width="574" height="874" rx="17" fill="none" stroke="#d5aa66" stroke-width="4"/>
${drawMap()}
<text x="42" y="657" font-family="Microsoft YaHei" font-weight="bold" font-size="52" fill="#355c53">魔法市集</text>
<text x="44" y="697" font-family="Microsoft YaHei" font-size="20" fill="#8f765a">我的微缩小镇窗口</text>
<path d="M44 722h302" stroke="#d5aa66" stroke-width="3"/>
<text x="44" y="758" font-family="Microsoft YaHei" font-size="19" fill="#6a775e">把建筑贴进小镇</text>
<text x="44" y="790" font-family="Microsoft YaHei" font-size="19" fill="#6a775e">扫码 · 读图 · 打开集市</text>
<image href="${qr}" x="387" y="660" width="180" height="180"/>
<text x="477" y="866" text-anchor="middle" font-family="Microsoft YaHei" font-size="18" fill="#6a775e">扫码看 AR</text>
<path d="M47 847l18-20 16 17 17-11 17 22m19-4 18-28 22 28m29-4 15-15 17 15" fill="none" stroke="#b9b68d" stroke-width="4"/>
</svg>`;
fs.writeFileSync(path.join(base, 'assets/student-card.svg'), svg);
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>魔法集市 A4 打印稿</title><style>
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:"Microsoft YaHei",sans-serif;color:#355c53;background:#fff}
main{width:210mm;height:297mm;padding:16mm 18mm}h1{font-size:22px;margin:0 0 3mm}p{font-size:11px;line-height:1.7;margin:2mm 0}
h2{font-size:14px;margin:8mm 0 3mm}.card{width:60mm;height:90mm;display:block;border:0}
.row{display:flex;gap:10mm;align-items:flex-start}.note{width:55mm;padding-top:4mm}.note strong{font-size:13px}
.cut{outline:0.2mm dashed #9b9a90;width:60mm;height:90mm}
.stickers{display:flex;gap:8mm;margin-top:6mm}.sticker{width:17mm;text-align:center}.sticker img{box-sizing:content-box;display:block;width:16mm;height:16mm;padding:0.25mm;border:0.2mm dashed #9b9a90}.sticker p{font-size:10px}
.rule{width:50mm;height:3mm;border-left:0.3mm solid;border-right:0.3mm solid;border-bottom:0.3mm solid;margin-top:6mm}
.footer{margin-top:12mm;padding:4mm 0;border-top:0.3mm solid #d2ba94}
@media print{button{display:none}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
@media screen{body{background:#eee}main{margin:0 auto;background:white;box-shadow:0 4px 30px #ccc}}
</style></head><body><main><h1>魔法集市 · 我的窗口卡</h1><p>一张 A4，卡面与贴纸按实际尺寸排版。打印选择「实际大小 / 100%」，关闭「适合页面」。</p>
<h2>① 剪下卡片　60 × 90 毫米</h2><div class="row"><div class="cut"><img class="card" src="${embed('assets/student-card.svg')}"></div><div class="note"><strong>原有景物保留，只贴建筑</strong><p>沿外侧虚线剪下卡片。<br>将花店、喷泉、书店贴在三个留白位置。<br>植物、后巷小屋和街道已印好。<br>地图边框和下方二维码保持可见。</p></div></div>
<h2>② 剪下三张贴纸　图案 16 × 16 毫米</h2><p>沿虚线剪下，完整保留彩色图案和周围白边，居中贴进卡片的方框内。</p>
<div class="stickers">${['flower','fountain','book'].map((id,i)=>`<div class="sticker"><img src="${embed('assets/'+id+'.svg')}"><p>${['花店','喷泉','书店'][i]}</p></div>`).join('')}</div>
<h2>③ 扫码，确认，再打开集市</h2><p>相机对准整张卡，核对屏幕上三个位置的内容。点「打开集市」看贴出的场景。<br>换贴纸位置后，点「重新读取贴纸」。</p>
<div class="footer"><strong>尺寸检查</strong><div class="rule"></div><p>这条线应为 50 毫米。无需修改图案大小，卡面与贴纸已配套。</p></div>
</main></body></html>`;
fs.writeFileSync(path.join(base, 'print-a4.html'), html);
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const page = await browser.newPage({viewport:{width:794,height:1123}});
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const output = path.resolve(base, '../../output/pdf');
    fs.mkdirSync(output, { recursive: true });
    await page.pdf({ path: path.join(output, '魔法集市-卡片与贴纸-A4.pdf'), preferCSSPageSize: true, printBackground: true });
    fs.copyFileSync(path.join(output, '魔法集市-卡片与贴纸-A4.pdf'), path.join(base, 'print-a4.pdf'));
    await page.screenshot({path:path.join(output,'打印稿预览.png'),fullPage:true});
    console.log(output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });



