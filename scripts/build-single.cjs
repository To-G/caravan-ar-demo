const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(__dirname, '..');
const immersive=process.argv.includes('--immersive');
const entry=immersive?'immersive':'portal';
const target = path.resolve(root, immersive?'../output/魔法集市-森林展开版':'../output/窗口贴纸版-单HTML');
fs.mkdirSync(target, { recursive: true });
const files = ['lib/three.module.js','lib/addons/renderers/CSS3DRenderer.js','lib/ui-fBadYuor.js','lib/controller-mGt1s8dJ.js','lib/mindar-image-three.prod.js','camera.js', ...['portal','town','market','window-frame','card-layout','read-stickers','photo','pose-filter','camera-adapter'].map(n => `magic-stickers/${n}.js`)];
if(immersive){files.splice(files.indexOf('magic-stickers/portal.js'),1);files.push(...['immersive','forest','soundscape'].map(n=>`magic-stickers/${n}.js`));}
const key = f => 'ar/' + f;
const asset = (name, mime) => `data:${mime};base64,` + fs.readFileSync(path.join(root,'magic-stickers/assets',name)).toString('base64');
const modules = {};
for (const file of files) {
  let source = fs.readFileSync(path.join(root,file),'utf8');
  source = source.replace(/(\bfrom\s*|\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g, (_,prefix,q,spec) => prefix + q + key(path.posix.normalize(path.posix.join(path.posix.dirname(file),spec))) + q);
  if(file.endsWith('/portal.js')||file.endsWith('/immersive.js')) {
    source = source.replace("'./assets/card-stickers.mind'", JSON.stringify(asset('card-stickers.mind','application/octet-stream')));
    source = source.replace(/^document\.querySelector\('nav'\)\.innerHTML=.*;\r?$/m, '');
  }
  if(file.endsWith('/read-stickers.js')) source = source.replace("'./assets/' + id + '.svg'", '('+JSON.stringify(Object.fromEntries(['flower','fountain','book'].map(id => [id,asset(id+'.svg','image/svg+xml') ])))+')[id]');
  if(file.endsWith('/read-stickers.js')) source = source.replace("'./assets/student-card.svg'", JSON.stringify(asset('student-card.svg','image/svg+xml')));
  modules[key(file)] = source;
}
let html = fs.readFileSync(path.join(root,'magic-stickers/'+entry+'.html'),'utf8');
const css=fs.readFileSync(path.join(root,'magic-stickers/market.css'),'utf8')+(immersive?fs.readFileSync(path.join(root,'magic-stickers/immersive.css'),'utf8').replace(/@import[^;]+;/,''):'');
html = html.replace(/<link rel="stylesheet"[^>]+>/, ()=>'<style>'+css+'</style>');
html = html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/,'');
html = html.replaceAll('href="./?preview"','href="?preview"');
html = html.replace('href="./print.html"','download="魔法集市-A4.pdf" href="data:application/pdf;base64,'+fs.readFileSync(path.join(root,'magic-stickers/print-a4.pdf')).toString('base64')+'"');
const payload = JSON.stringify(modules).replace(/</g,'\\u003c');
html = html.replace('<script type="module" src="./'+entry+'.js"></script>', () => `<script>
const sources=${payload};
const imports={};
for(const [name,source] of Object.entries(sources)) imports[name]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
imports.three=imports['ar/lib/three.module.js'];
imports['three/addons/renderers/CSS3DRenderer.js']=imports['ar/lib/addons/renderers/CSS3DRenderer.js'];
const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.appendChild(map);
const start=document.createElement('script');start.type='module';start.textContent="import 'ar/magic-stickers/${entry}.js';";document.body.appendChild(start);
</script>`);
fs.writeFileSync(path.join(target,'index.html'),html);
console.log(JSON.stringify({file:path.join(target,'index.html'),bytes:Buffer.byteLength(html),gzipBytes:zlib.gzipSync(html).length,modules:files.length}));


