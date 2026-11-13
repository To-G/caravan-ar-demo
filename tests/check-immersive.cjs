const fs=require('fs'),http=require('http');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const html=fs.readFileSync('output/魔法集市-森林展开版/index.html','utf8').replace('anchor.updateWorldMatrix(true,false);if(content)update(now);','window.__arVisible=anchor.visible;anchor.updateWorldMatrix(true,false);if(content)update(now);').replace('natureUpdate(t);','natureUpdate(t);window.__animation={time:t,scale:parent.scale.x,cloud:parent.getObjectByName(\'sky-cloud\')?.position.x};').replace('const next=!selfie;switching=true;','base.visible=true;base.group.visible=true;const next=!selfie;switching=true;');let simulate=false;
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(simulate?html.replace('if(!base.visible){readSince=0;','if(false){readSince=0;').replace('base.visible?reader(now):null','[0,1,2]'):html)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 try{
  const page=await browser.newPage({viewport:{width:430,height:900}});const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{errors.push(d.message());await d.dismiss()});page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().includes('127.0.0.1'))external.push(r.url())});
  const url=`http://127.0.0.1:${server.address().port}/`;
  await page.goto(url+'?preview');await page.waitForFunction(()=>window.__animation?.time>.02);const entrance=await page.evaluate(()=>window.__animation);await page.waitForTimeout(1700);const settled=await page.evaluate(()=>window.__animation);await page.waitForTimeout(400);const moved=await page.evaluate(()=>window.__animation);console.log(JSON.stringify({entrance,settled,moved}));if(entrance.scale>=.99||settled.scale<.99||moved.cloud===settled.cloud)throw Error('Entrance or scenery animation not running');await page.screenshot({path:'output/魔法集市-森林展开版/预览核对.png'});
  await page.locator('#menu-toggle').click();await page.locator('#sound-toggle').click();await page.waitForFunction(()=>document.querySelector('#sound-toggle').textContent==='声音：开');await page.locator('#sound-toggle').click();await page.waitForFunction(()=>document.querySelector('#sound-toggle').textContent==='声音：关');await page.locator('#menu-toggle').click();const smoothing=await page.evaluate(async()=>{const THREE=await import('three');const {createPoseFilter}=await import('ar/magic-stickers/pose-filter.js');const input=new THREE.Group(),out=new THREE.Group();const filter=createPoseFilter(out);const raw=[],smooth=[];for(let i=0;i<80;i++){const x=i%2?.01:-.01;input.matrix.makeTranslation(x,0,0);filter(input,i*33);if(i>20){raw.push(x);smooth.push(out.matrix.elements[12])}}const sd=a=>{const mean=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-mean)**2,0)/a.length)};for(let i=80;i<87;i++){input.matrix.makeTranslation(.2,0,0);filter(input,i*33)}return {jitterRatio:sd(smooth)/sd(raw),moveAfter200ms:out.matrix.elements[12]}});
  await page.goto(url);await page.locator('#start').click();await page.locator('#take-photo').waitFor({state:'visible'});
  await page.locator('#take-photo').click();await page.waitForFunction(()=>document.querySelector('dialog')?.open&&document.querySelector('dialog img').naturalWidth>0);await page.locator('#close-photo').click();
  await page.locator('#switch-camera').click();await page.waitForFunction(()=>document.querySelector('#switch-camera')?.getAttribute('aria-label')==='切换到后置摄像头');
  await page.locator('#take-photo').click();await page.waitForFunction(()=>document.querySelector('dialog')?.open&&document.querySelector('dialog img').naturalWidth>0);await page.locator('#close-photo').click();
  await page.screenshot({path:'output/魔法集市-森林展开版/相机界面核对.png'});
  await page.locator('#switch-camera').click();await page.waitForFunction(()=>document.querySelector('#switch-camera')?.getAttribute('aria-label')==='切换到前置摄像头');
  const shotRect=await page.locator('#take-photo').boundingBox();await page.mouse.move(shotRect.x+shotRect.width/2,shotRect.y+shotRect.height/2);await page.mouse.down();await page.waitForTimeout(10900);await page.mouse.up();await page.waitForFunction(()=>document.querySelector('dialog').open&&!document.querySelector('dialog video').hidden);await page.waitForFunction(()=>document.querySelector('dialog video').readyState>=1);const audio=await page.locator('dialog video').evaluate(async v=>{const c=new AudioContext();try{const b=await c.decodeAudioData(await (await fetch(v.src)).arrayBuffer());return {channels:b.numberOfChannels,duration:b.duration};}finally{await c.close()}});console.log(JSON.stringify({audio}));console.log(JSON.stringify({recorded:await page.locator('dialog video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,src:v.currentSrc.startsWith('blob:')}))}));await page.locator('#close-photo').click();console.log(JSON.stringify({withoutCard:'rear photo, front switch/photo, rear switch passed',smoothing,errors,external}));
  simulate=true;await page.goto(url);await page.locator('#start').click();await page.waitForFunction(()=>!document.querySelector('#replay').hidden);
  console.log(JSON.stringify({autoOpen:await page.locator('#replay').textContent(),status:await page.locator('#status').textContent(),errors}));
  await page.locator('#switch-camera').click();await page.waitForFunction(()=>document.querySelector('#switch-camera').getAttribute('aria-label')==='切换到后置摄像头');await page.waitForTimeout(400);if(await page.evaluate(()=>window.__arVisible))throw Error('Old camera pose remained visible');console.log('Camera switch clears stale pose: passed');await page.locator('#menu-toggle').click();await page.locator('#replay').click();await page.waitForFunction(()=>!document.querySelector('#replay').hidden);console.log(JSON.stringify({frontAutoOpen:await page.locator('#status').textContent(),mirrored:await page.locator('#stage canvas').evaluate(c=>c.dataset.mirrored),errors}));if(errors.length||external.length||smoothing.jitterRatio>.6||smoothing.moveAfter200ms<.16)throw Error('Validation failed');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});









