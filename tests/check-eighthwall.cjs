const fs=require('fs'),http=require('http');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 let html=fs.readFileSync('output/魔法集市-8thWall对照版/index.html','utf8');if(process.env.AR_INJECT_POSE){const start=html.indexOf('const sources=')+'const sources='.length,end=html.indexOf(',imports={};',start),sources=JSON.parse(html.slice(start,end));sources['ar/magic-stickers/eighthwall.js']=sources['ar/magic-stickers/eighthwall.js'].replace('const now=performance.now();frames++;','const now=performance.now();frames++;window.__injectNextPose?.();');sources['ar/magic-stickers/eighthwall.js']+='\nwindow.__testEight={get camera(){return camera},get renderer(){return renderer},get video(){return video},imagePose};';html=html.slice(0,start)+JSON.stringify(sources).replace(/</g,'\\u003c')+html.slice(end);}
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
 if(process.env.AR_FAKE_VIDEO)args.push('--use-file-for-fake-video-capture='+process.env.AR_FAKE_VIDEO);
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args});
 try{
  const p=await browser.newPage({viewport:{width:430,height:900}});const errors=[],external=[];
  p.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.stack)});p.on('console',m=>{if(m.type()==='error'||m.text().includes('Version'))console.log('CONSOLE',m.text().slice(0,700));});p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().includes('127.0.0.1'))external.push(r.url())});
  await p.goto(`http://127.0.0.1:${server.address().port}/?preview`);await p.waitForTimeout(2500);await p.screenshot({path:'output/魔法集市-8thWall对照版/预览.png'});
  await p.goto(`http://127.0.0.1:${server.address().port}/`);await p.locator('#start').click();
  await p.waitForFunction(()=>document.querySelector('#welcome').hidden||!document.querySelector('#start').disabled,{timeout:45000});
  console.log(JSON.stringify({welcomeHidden:await p.locator('#welcome').evaluate(e=>e.hidden),message:await p.locator('#start-message').textContent(),diagnostics:await p.locator('#diagnostics').textContent(),errors,external}));
  await p.waitForTimeout(7000);await p.screenshot({path:'output/魔法集市-8thWall对照版/相机.png'});
  console.log(await p.locator('#diagnostics').textContent());
  if(!await p.locator('#welcome').evaluate(e=>e.hidden))throw Error('Engine did not start');
  if(process.env.AR_INJECT_POSE){await p.evaluate(()=>{window.__injectNextPose=()=>{const t=window.__testEight;if(!t.camera||!t.video)return;const fx=t.camera.projectionMatrix.elements[0]*t.renderer.domElement.clientWidth/2/Math.max(t.renderer.domElement.clientWidth/t.video.videoWidth,t.renderer.domElement.clientHeight/t.video.videoHeight);const p=t.camera.localToWorld(new window.THREE.Vector3(0,0,-fx/300));t.imagePose({detail:{name:'magic-market-card',position:p,rotation:t.camera.quaternion,scale:1.5,scaledWidth:.75,scaledHeight:1}})};});}
  if(process.env.AR_FAKE_VIDEO){try{await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('展开'),{timeout:30000});}catch(e){console.log(JSON.stringify(await p.evaluate(()=>window.__AR_COMPARISON__)));throw e;}console.log(process.env.AR_INJECT_POSE?'Injected pose and real video sticker classification passed':'Actual image recognition and sticker classification passed');await p.screenshot({path:process.env.AR_INJECT_POSE?'output/魔法集市-8thWall对照版/姿态回放核对.png':'output/魔法集市-8thWall对照版/实际识图核对.png'});}
  await p.locator('#take-photo').click();await p.waitForFunction(()=>document.querySelector('dialog')?.open&&document.querySelector('dialog img')?.naturalWidth>0);await p.locator('#close-photo').click();
  await p.locator('#switch-camera').click();await p.waitForFunction(()=>document.querySelector('#switch-camera').getAttribute('aria-label')==='切换到后置摄像头',{timeout:45000});
  await p.locator('#switch-camera').click();await p.waitForFunction(()=>document.querySelector('#switch-camera').getAttribute('aria-label')==='切换到前置摄像头',{timeout:45000});console.log('Photo, front switch and calibrated rear return passed');if(process.env.AR_TEST_RECORDING){const rect=await p.locator('#take-photo').boundingBox();await p.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await p.mouse.down();await p.waitForTimeout(1700);await p.mouse.up();await p.waitForFunction(()=>document.querySelector('dialog')?.open&&!document.querySelector('dialog video').hidden&&document.querySelector('dialog video').readyState>=1);console.log('Composited video recording passed');}
  if(errors.length||external.length)throw Error('Unexpected errors or external requests');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
