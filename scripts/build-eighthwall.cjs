const fs=require('fs'),path=require('path'),zlib=require('zlib');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../output/魔法集市-8thWall对照版');
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const assets=path.join(root,'magic-stickers/assets');
 const asset=(n,m)=>`data:${m};base64,`+fs.readFileSync(path.join(assets,n)).toString('base64');
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 let imagePath;
 try{
  const p=await browser.newPage();await p.goto('about:blank');
  imagePath=await p.evaluate(async src=>{
   const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=480;c.height=640;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,480,640);x.drawImage(im,37.5/675*480,0,600/675*480,640);
   const pixels=x.getImageData(0,0,480,640);for(let i=0;i<pixels.data.length;i+=4){const y=Math.round(.299*pixels.data[i]+.587*pixels.data[i+1]+.114*pixels.data[i+2]);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=y;}x.putImageData(pixels,0,0);return c.toDataURL('image/png');
  },asset('student-card.svg','image/svg+xml'));
 }finally{await browser.close();}
 const target={name:'magic-market-card',type:'PLANAR',imagePath,metadata:null,properties:{left:0,top:0,width:480,height:640,originalWidth:480,originalHeight:640,isRotated:false}};
 const vendor=path.join(root,'experiments/eighthwall/vendor/engine');
 let engine=fs.readFileSync(path.join(vendor,'dist/xr.js'),'utf8');
 const from='const A=t||`${i}xr-tracking.js`';if(!engine.includes(from))throw Error('Unrecognized engine chunk loader');
 engine=engine.replace(from,'const A=t||window.__eightTrackingUrl');
 const base='new URL("./",wB.src).toString()';if(!engine.includes(base))throw Error('Unrecognized engine base URL');
 engine=engine.replace(base,'new URL("./",location.href).toString()');
 const tracking=fs.readFileSync(path.join(vendor,'dist/xr-tracking.js'),'utf8');
 const names=['comparison-world','storybook','forest','market','card-layout','card-landmarks','camera-adapter','read-stickers','photo','soundscape','tracking-visibility','eighthwall'];
 const modules={'ar/lib/three.module.js':fs.readFileSync(path.join(root,'lib/three.module.js'),'utf8')};
 for(const n of names){let s=fs.readFileSync(path.join(root,'magic-stickers',n+'.js'),'utf8');
  s=s.replace(/(\bfrom\s*|\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,(_,prefix,q,spec)=>prefix+q+'ar/'+path.posix.normalize(path.posix.join('magic-stickers',spec))+q);
  if(n==='eighthwall')s=s.replace('__TARGET_DATA__',JSON.stringify(target));
  if(n==='card-landmarks')s=s.replace("'./assets/card-qr.png'",JSON.stringify(asset('card-qr.png','image/png')));
  if(n==='read-stickers'){
   s=s.replace("'./assets/' + id + '.svg'",'('+JSON.stringify(Object.fromEntries(['flower','fountain','book'].map(id=>[id,asset(id+'.svg','image/svg+xml')])) )+')[id]');
   s=s.replace("'./assets/student-card.svg'",JSON.stringify(asset('student-card.svg','image/svg+xml')));
  }
  modules['ar/magic-stickers/'+n+'.js']=s;
 }
 const json=x=>JSON.stringify(x).replace(/</g,'\\u003c');
 const css=fs.readFileSync(path.join(root,'magic-stickers/market.css'),'utf8')+fs.readFileSync(path.join(root,'magic-stickers/immersive.css'),'utf8').replace(/@import[^;]+;/,'');
 let html=fs.readFileSync(path.join(root,'magic-stickers/eighthwall.html'),'utf8').replace('<!--CSS-->',()=>'<style>'+css+'</style>');
 html=html.replace('<!--BOOT-->',()=>`<script>
window.__eightTrackingUrl=URL.createObjectURL(new Blob([${json(tracking)}],{type:'text/javascript'}));
window.__loadEight=()=>new Promise((resolve,reject)=>{if(window.XR8?.XrController)return resolve();const s=document.createElement('script');s.src=URL.createObjectURL(new Blob([${json(engine)}],{type:'text/javascript'}));s.dataset.preloadChunks='slam';s.onerror=()=>reject(new Error('8th Wall引擎加载失败'));addEventListener('xrloaded',()=>resolve(),{once:true});document.head.append(s);});
const sources=${json(modules)},imports={};for(const [name,source]of Object.entries(sources))imports[name]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));imports.three=imports['ar/lib/three.module.js'];const m=document.createElement('script');m.type='importmap';m.textContent=JSON.stringify({imports});document.head.append(m);const s=document.createElement('script');s.type='module';s.textContent="import 'ar/magic-stickers/eighthwall.js';";document.body.append(s);
</script>`);
 const license=fs.readFileSync(path.join(vendor,'LICENSE'),'utf8');html=html.replace('<!--LICENSE-->',()=>license.replaceAll('&','&amp;').replaceAll('<','&lt;'));
 fs.writeFileSync(path.join(out,'index.html'),html);fs.writeFileSync(path.join(out,'8th-Wall-LICENSE.txt'),license);
 console.log(JSON.stringify({file:path.join(out,'index.html'),bytes:Buffer.byteLength(html),gzip:zlib.gzipSync(html).length,engine:'@8thwall/engine 0.1.0 MIT',modules:Object.keys(modules).length}));
})().catch(e=>{console.error(e);process.exitCode=1});
