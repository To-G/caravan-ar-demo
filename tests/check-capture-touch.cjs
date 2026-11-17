const fs=require('fs'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const photo=fs.readFileSync('AR贺卡demo/magic-stickers/photo.js'),css=fs.readFileSync('AR贺卡demo/magic-stickers/market.css');
 const html=`<meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><canvas id="scene" width="430" height="900" style="position:fixed;inset:0;width:100%;height:100%"></canvas><script type="module">import {setupPhoto}from '/photo.js';const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');function paint(){ctx.fillStyle='#267b72';ctx.fillRect(0,0,430,900);ctx.fillStyle='#ffe5b7';ctx.fillRect(100,100,200,200);ctx.fillStyle='white';ctx.fillText(performance.now().toFixed(0),50,50);requestAnimationFrame(paint);}paint();window.metrics=[];window.helperRenderCalls=0;setupPhoto({renderer:{domElement:canvas},render:()=>window.helperRenderCalls++,video:()=>({readyState:2}),canvasIncludesCamera:true,ready:()=>true,switchCamera:async()=>false,onCaptureMetrics:m=>window.metrics.push(m),onRecordingChange:(active,info)=>window.metrics.push({active,...info})});window.photos=0;const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(...args){window.photos++;return original.apply(this,args)};</script>`;
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type',q.url==='/photo.js'?'application/javascript':'text/html');r.end(q.url==='/photo.js'?photo:html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const p=await b.newPage({viewport:{width:430,height:900},deviceScaleFactor:2,hasTouch:true,isMobile:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',async d=>{errors.push(d.message());await d.dismiss()});await p.goto(`http://127.0.0.1:${server.address().port}`);await p.locator('#take-photo').waitFor();
  await p.locator('#take-photo').tap();await p.waitForFunction(()=>document.querySelector('dialog').open&&document.querySelector('dialog img').naturalWidth>0);assert.equal(await p.evaluate(()=>window.photos),1);await p.locator('#close-photo').tap();
  const photoMetrics=await p.evaluate(()=>window.metrics.filter(m=>m.phase));assert.equal(photoMetrics[0].phase,'photo-preview');assert.equal(photoMetrics[1].phase,'photo-ready');assert.equal(photoMetrics[0].width,430,'Do not upscale the native canvas on a high-DPI phone');assert.equal(photoMetrics[0].height,900);
  const guards=await p.locator('#take-photo').evaluate(button=>{
   const touch=new Event('touchstart',{bubbles:true,cancelable:true});button.firstElementChild.dispatchEvent(touch);
   const menu=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});button.firstElementChild.dispatchEvent(menu);
   return {touchCanceled:touch.defaultPrevented,menuCanceled:menu.defaultPrevented,childPointerEvents:getComputedStyle(button.firstElementChild).pointerEvents};
  });assert.equal(guards.touchCanceled,true);assert.equal(guards.menuCanceled,true);assert.equal(guards.childPointerEvents,'none');
  const cdp=await p.context().newCDPSession(p),rect=await p.locator('#take-photo').boundingBox();const point={x:rect.x+rect.width/2,y:rect.y+rect.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await p.waitForFunction(()=>document.querySelector('#take-photo').classList.contains('recording'));await p.waitForTimeout(900);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await p.waitForFunction(()=>document.querySelector('dialog').open&&!document.querySelector('dialog video').hidden&&document.querySelector('dialog video').readyState>=1);assert.equal(await p.evaluate(()=>window.photos),1,'Long press must not take an extra photo');await p.locator('#close-photo').tap();
  const recordingMetrics=await p.evaluate(()=>window.metrics.find(m=>m.active));assert.equal(recordingMetrics.path,'direct-canvas');assert.equal(recordingMetrics.requestedFrameRate,30);assert.equal(await p.evaluate(()=>window.helperRenderCalls),1,'Direct recording must not copy or render a second canvas every frame');
  // A canceled touch must not become a photo or leave the recorder running.
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await p.waitForTimeout(600);assert.equal(await p.locator('#take-photo').evaluate(e=>e.classList.contains('recording')),false);assert.equal(await p.evaluate(()=>window.photos),1);
  await p.waitForTimeout(700);await p.locator('#take-photo').tap();await p.waitForFunction(()=>document.querySelector('dialog').open&&!document.querySelector('dialog img').hidden);assert.equal(await p.evaluate(()=>window.photos),2);
  if(process.env.AR_TEST_MAX_RECORDING){
   await p.locator('#close-photo').tap();
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
   await p.waitForFunction(()=>document.querySelector('#take-photo').classList.contains('recording'));
   await p.waitForFunction(()=>document.querySelector('dialog').open&&!document.querySelector('dialog video').hidden&&document.querySelector('dialog video').readyState>=1,undefined,{timeout:17000});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal(await p.locator('#take-photo').evaluate(e=>e.classList.contains('recording')),false);
   assert.equal(await p.locator('#switch-camera').isDisabled(),false);
   const media=await p.locator('dialog video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight}));
   assert.equal(media.width,430);assert.equal(media.height,900);
   const download=p.waitForEvent('download');await p.locator('#save-photo').tap();const saved=await download;assert.match(saved.suggestedFilename(),/魔法集市视频.*\.(mp4|webm)$/);assert.equal(await saved.failure(),null);
   console.log(JSON.stringify({autoStop:'10 second maximum, release does not take a photo',playableVideo:media,download:saved.suggestedFilename()}));
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({guards,photoMetrics,recordingMetrics,shortTap:'one photo',touchHold:'recording starts and ends on release',cancel:'no recording or extra photo',afterRecording:'short tap still works',errors}));
 }finally{await b.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
