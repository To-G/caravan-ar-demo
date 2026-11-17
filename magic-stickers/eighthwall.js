import * as THREE from 'three';
import {createComparisonWorld} from './comparison-world.js';
import {createSoundscape} from './soundscape.js';
import {openPreferredRear,openCameraDevice,rememberRearCamera} from './camera-adapter.js';
import {createStickerReader} from './read-stickers.js';
import {setupPhoto} from './photo.js';

const target=__TARGET_DATA__,preview=new URLSearchParams(location.search).has('preview');
const stage=document.getElementById('stage'),status=document.getElementById('status'),welcome=document.getElementById('welcome');
const sound=createSoundscape(),layout=[null,null,null],samples=layout.map(()=>({type:null,count:0}));
let renderer,scene,camera,anchor,content,update,reader,video,raw,readResolved=false,readSince=0,firstSeen=null,lastSeen=0,frames=0,poses=0,switching=false,front=false,choice=null,initialStream=null;
let generation=0,resolveStarted,rejectStarted,photoReady=false,originalGetUserMedia,brokerInstalled=false;
const journal={engine:'@8thwall/engine 0.1.0 MIT',build:'20261117',nativeTracking:true,events:[]};
window.__AR_COMPARISON__=journal;
const log=(event,detail={})=>{journal.events.push({ms:Math.round(performance.now()),event,...detail});if(journal.events.length>600)journal.events.shift();};
const media=navigator.mediaDevices,originalMedia=media?{getUserMedia:media.getUserMedia.bind(media),enumerateDevices:media.enumerateDevices.bind(media)}:null;
const simple=document.getElementById('simple-mode');
const menu=document.getElementById('settings'),menuButton=document.getElementById('menu-toggle');
menuButton.onclick=()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));};
document.getElementById('sound-toggle').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{if(!sound.unlocked){await sound.unlock();b.textContent='声音：开';}else b.textContent=(await sound.toggle())?'声音：开':'声音：关';}finally{b.disabled=false;}};
function makeWorld(){
  if(content){anchor.remove(content);content.traverse(o=>{o.geometry?.dispose();for(const m of(Array.isArray(o.material)?o.material:[o.material])){m?.map?.dispose();m?.dispose();}});}
  content=new THREE.Group();anchor.add(content);update=createComparisonWorld(content,layout,sound);
}
document.getElementById('replay').onclick=()=>{layout.fill(null);readResolved=false;readSince=0;samples.forEach(s=>s.count=0);makeWorld();log('reset-stickers');};
document.getElementById('export-log').onclick=()=>{const a=document.createElement('a');a.download='AR-8thWall-test.json';a.href=URL.createObjectURL(new Blob([JSON.stringify({...journal,userAgent:navigator.userAgent},null,2)],{type:'application/json'}));a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
const outlineMaterial=new THREE.LineBasicMaterial({color:0xffdf80});
let outline;
function addOutline(){outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.5,-.75,.002),new THREE.Vector3(.5,-.75,.002),new THREE.Vector3(.5,.75,.002),new THREE.Vector3(-.5,.75,.002)]),outlineMaterial);anchor.add(outline);}
function updateDisplay(now){content.visible=!simple.checked;outline.visible=simple.checked;if(!simple.checked)update(now);else sound.update(0,false,false);}
simple.onchange=()=>log('display-mode',{simple:simple.checked});

// Only camera acquisition is adapted. Pose estimation, projection and SDK filtering stay native.
function installCameraBroker(){
 if(brokerInstalled)return;originalGetUserMedia=media.getUserMedia;
 media.getUserMedia=async constraints=>{
  if(!constraints.video)return originalMedia.getUserMedia(constraints);
  let stream=initialStream;initialStream=null;
  if(!stream?.active){
    if(choice)stream=await openCameraDevice(originalMedia,choice);
    else stream=await originalMedia.getUserMedia({audio:false,video:{facingMode:{ideal:front?'user':'environment'}}});
  }
  const track=stream.getVideoTracks()[0];log('camera-open',{label:track.label,settings:track.getSettings()});return stream;
 };
 brokerInstalled=true;
}
addEventListener('pagehide',()=>{window.XR8?.stop();initialStream?.getTracks().forEach(t=>t.stop());if(brokerInstalled)media.getUserMedia=originalGetUserMedia;});
function updateLens(){
 const track=video?.srcObject?.getVideoTracks()[0],s=track?.getSettings()||{};document.getElementById('lens').value=s.deviceId||'';
 journal.camera={label:track?.label,...s};
}
async function fillLenses(){
 const select=document.getElementById('lens');select.replaceChildren();
 for(const d of(await originalMedia.enumerateDevices()).filter(d=>d.kind==='videoinput')){const o=document.createElement('option');o.value=d.deviceId;o.textContent=d.label||'未命名镜头';select.append(o);}
 updateLens();
 select.onchange=async()=>{select.disabled=true;try{const label=select.selectedOptions[0].textContent;choice={deviceId:select.value,label};front=/front|selfie|前置|自拍/i.test(label);await restart();if(!front)rememberRearCamera(video.srcObject.getVideoTracks()[0]);}catch(e){status.textContent=e.message;}finally{select.disabled=false;}};
}
function projectToVideo(x,y,z){
 const p=camera.projectionMatrix.elements,cw=renderer.domElement.clientWidth,ch=renderer.domElement.clientHeight;
 const nx=(p[0]*x+p[4]*y+p[8]*z+p[12])/(-z),ny=(p[1]*x+p[5]*y+p[9]*z+p[13])/(-z);
 const factor=Math.max(cw/video.videoWidth,ch/video.videoHeight);
 return [((nx+1)*cw/2-(cw-video.videoWidth*factor)/2)/factor,((1-ny)*ch/2-(ch-video.videoHeight*factor)/2)/factor];
}
const cameraSpace=new THREE.Group(),worldPosition=new THREE.Vector3(),worldRotation=new THREE.Quaternion(),worldScale=new THREE.Vector3();
cameraSpace.matrixAutoUpdate=false;
const targetMatrix=new THREE.Matrix4();
function imagePose({detail}){
 if(switching||detail.name!==target.name||!anchor)return;
 const now=performance.now();poses++;lastSeen=now;
 if(firstSeen===null){firstSeen=now;log('first-detection',{afterStartMs:Math.round(now-(journal.cameraStarted||now))});}
 // The trained target has white side padding: 600px card inside 675px target.
 worldPosition.set(detail.position.x,detail.position.y,detail.position.z);worldRotation.set(detail.rotation.x,detail.rotation.y,detail.rotation.z,detail.rotation.w);
 worldScale.setScalar(detail.scale*detail.scaledWidth*600/675);targetMatrix.compose(worldPosition,worldRotation,worldScale);
 anchor.matrix.copy(targetMatrix);anchor.visible=true;
 if(!readResolved)status.textContent='已找到卡片，正在辨认建筑…';
}
function imageLost({detail}){if(detail.name===target.name&&anchor){anchor.visible=false;log('target-lost');}}
async function restart({calibrateRear=false}={}){
 switching=true;generation++;if(anchor)anchor.visible=false;lastSeen=0;reader=null;
 window.XR8.stop();await new Promise(r=>setTimeout(r,250));
 if(calibrateRear){const capture=await openPreferredRear(originalMedia);initialStream=capture.stream;choice=(await originalMedia.enumerateDevices()).find(d=>d.deviceId===capture.current)||{deviceId:capture.current,label:capture.stream.getVideoTracks()[0].label};}
 switching=false;await runEngine();await fillLenses();
}
function pipeline(){return {
 name:'magic-market-comparison',
 listeners:[{event:'reality.imagefound',process:imagePose},{event:'reality.imageupdated',process:imagePose},{event:'reality.imagelost',process:imageLost},{event:'reality.imagescanning',process:e=>log('targets-ready',{targets:e.detail.imageTargets.map(t=>t.name)})}],
 onCameraStatusChange:args=>{if(args.status==='hasVideo'){video=args.video;updateLens();}if(args.status==='failed')rejectStarted?.(new Error('相机启动失败，请检查相机权限与镜头选择'));},
 onStart:()=>{
  ({renderer,scene,camera}=window.XR8.Threejs.xrScene());renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
  camera.position.set(0,2,0);window.XR8.XrController.updateCameraProjectionMatrix({origin:camera.position,facing:camera.quaternion});
  anchor=new THREE.Group();anchor.matrixAutoUpdate=false;anchor.visible=false;scene.add(anchor);makeWorld();addOutline();
  raw={visible:false,group:cameraSpace};
  const current=generation;
  createStickerReader(video,raw,projectToVideo).then(r=>{if(current===generation)reader=r;}).catch(e=>status.textContent=e.message);
  journal.cameraStarted=performance.now();resolveStarted?.();log('engine-started');
 },
 onUpdate:args=>{
  if(!anchor||switching)return;
  const now=performance.now();frames++;
  if(!journal.pipelineKeys)journal.pipelineKeys=Object.keys(args.processCpuResult||{});
  journal.frameTiming={repeat:args.frameStartResult?.repeatFrame,videoTime:args.frameStartResult?.videoTime};
  const reality=args.processCpuResult?.reality;if(reality)journal.trackingState={status:reality.trackingStatus,reason:reality.trackingReason,detected:reality.detectedImages?.length,intrinsics:reality.intrinsics};
  if(now-lastSeen>250)anchor.visible=false;
  if(anchor.visible&&!readResolved&&reader){
   camera.updateMatrixWorld(true);cameraSpace.matrix.multiplyMatrices(camera.matrixWorldInverse,targetMatrix);raw.visible=true;
   const values=reader(now);
   if(values){if(!readSince)readSince=now;values.forEach((type,i)=>{const s=samples[i];if(type===undefined){s.count=0;return;}s.count=s.type===type?s.count+1:1;s.type=type;s.required=values.confidence?.[i]==='high'?2:3;if(s.count>=s.required)layout[i]=type;});
    if(now-readSince>=110&&samples.every(s=>s.count>=(s.required||3))){readResolved=true;status.textContent='集市已展开 · 短按拍照，长按录像';log('stickers-confirmed',{layout:[...layout]});}
   }
  }else if(!anchor.visible&&!readResolved){readSince=0;samples.forEach(s=>s.count=0);}
  updateDisplay(now);
 },
 onException:(e)=>{log('engine-error',{message:String(e)});rejectStarted?.(new Error(String(e)));status.textContent='引擎运行异常，请重新打开页面';},
};}
async function runEngine(){
 const xr=window.XR8;
 xr.XrController.configure({disableWorldTracking:true,imageTargetData:[target]});
 let canvas=stage.querySelector('canvas');if(!canvas){canvas=document.createElement('canvas');stage.append(canvas);}canvas.width=Math.round(innerWidth*Math.min(devicePixelRatio,1.25));canvas.height=Math.round(innerHeight*Math.min(devicePixelRatio,1.25));
 if(!journal.modulesAdded){xr.addCameraPipelineModules([xr.GlTextureRenderer.pipelineModule(),xr.Threejs.pipelineModule(),xr.XrController.pipelineModule(),pipeline()]);journal.modulesAdded=true;}
 const started=new Promise((resolve,reject)=>{resolveStarted=resolve;rejectStarted=reject;});
 xr.run({canvas,allowedDevices:xr.XrConfig.device().ANY,cameraConfig:{direction:front?xr.XrConfig.camera().FRONT:xr.XrConfig.camera().BACK},sessionConfiguration:{disableXrTablet:true,disableDesktopCameraControls:true},glContextConfig:{preserveDrawingBuffer:true,alpha:false}});
 let timer;try{await Promise.race([started,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('引擎启动超时，请重试并查看菜单中的镜头信息')),30000);})]);}finally{clearTimeout(timer);resolveStarted=null;rejectStarted=null;}
}
async function begin(){
 await sound.unlock();window.THREE=THREE;await window.__loadEight();
 const capture=await openPreferredRear(originalMedia);initialStream=capture.stream;const devices=await originalMedia.enumerateDevices();choice=devices.find(d=>d.deviceId===capture.current)||{deviceId:capture.current,label:capture.stream.getVideoTracks()[0].label};
 installCameraBroker();await runEngine();await fillLenses();
 welcome.hidden=true;document.getElementById('controls').hidden=false;
 if(!photoReady){photoReady=true;setupPhoto({renderer:{get domElement(){return renderer.domElement;}},render:()=>{},video:()=>video,canvasIncludesCamera:true,audioStream:()=>sound.stream,ready:()=>!switching&&!!video,switchCamera:async()=>{
   front=!front;choice=null;
   await restart({calibrateRear:!front});document.getElementById('switch-camera').setAttribute('aria-label',front?'切换到后置摄像头':'切换到前置摄像头');return front;
 }});}
}
document.getElementById('start').onclick=async e=>{const b=e.currentTarget;b.disabled=true;document.getElementById('start-message').textContent='正在准备开源引擎并打开主摄…';try{await begin();}catch(error){window.XR8?.stop();initialStream?.getTracks().forEach(t=>t.stop());initialStream=null;log('start-error',{message:error.message});document.getElementById('start-message').textContent=error.message;b.disabled=false;b.textContent='重试';}};
let lastMetrics=performance.now(),lastFrames=0,lastPoses=0;
setInterval(()=>{const now=performance.now(),seconds=(now-lastMetrics)/1000;const fps=Math.round((frames-lastFrames)/seconds),hz=Math.round((poses-lastPoses)/seconds);journal.latest={fps,trackingHz:hz,drawCalls:renderer?.info.render.calls};document.getElementById('diagnostics').textContent=`实际镜头：${journal.camera?.label||'未启动'}\n视频：${video?.videoWidth||0}×${video?.videoHeight||0}\n画面 ${fps} 帧/秒 · 跟踪 ${hz} 次/秒\n${simple.checked?'定位框模式':'完整小镇模式'} · 8th Wall原生姿态`;lastMetrics=now;lastFrames=frames;lastPoses=poses;},1000);
if(preview){layout.splice(0,3,0,1,2);renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));stage.append(renderer.domElement);scene=new THREE.Scene();scene.background=new THREE.Color(0x142b2a);camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.01,20);camera.position.set(0,-2.4,Math.max(2.7,1.9/camera.aspect));camera.lookAt(0,.25,.06);anchor=new THREE.Group();scene.add(anchor);makeWorld();addOutline();welcome.hidden=true;document.getElementById('controls').hidden=false;status.textContent='8th Wall对照版 · 场景预览（非识别测试）';renderer.setAnimationLoop(()=>{frames++;updateDisplay(performance.now());renderer.render(scene,camera);});}
