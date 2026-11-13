import { createForest } from './forest.js';
import { createSoundscape } from './soundscape.js';
import { installCameraAdapter, openPreferredRear } from './camera-adapter.js';
import * as THREE from 'three';
import { buildTown } from './town.js';
import { createMarket, lightMarket, stickers } from './market.js';
import { openCardCamera } from '../camera.js';
import { card, slots } from './card-layout.js';
import { createStickerReader } from './read-stickers.js';
import { setupPhoto } from './photo.js';
import { createPoseFilter } from './pose-filter.js';

const sound=createSoundscape();
const stage = document.getElementById('stage');
const preview = new URLSearchParams(location.search).has('preview');
const layout = preview ? [0, 1, 2] : [null, null, null];
function universe(parent) {
  const village=new THREE.Group();
  // Card coordinates are XY; buildings rise along +Z, away from the paper.
  village.position.set(0,.25,.008);
  village.scale.setScalar(.21);
  parent.add(village);
  buildTown(village,{layoutMap:true});
  const colored=new Map();const vivid=original=>{if(!original?.color)return original;if(!colored.has(original)){const m=original.clone(),hsl={};m.color.getHSL(hsl);m.color.setHSL(hsl.h,Math.min(1,hsl.s*1.35+.06),Math.min(.78,hsl.l*1.07));colored.set(original,m);}return colored.get(original);};village.traverse(object=>{if(object.material)object.material=Array.isArray(object.material)?object.material.map(vivid):vivid(object.material);});
  const natureUpdate=createForest(parent);
  const actors=slots.flatMap((slot,i)=>{
    if(layout[i]===null)return [];
    const actor=createMarket(stickers[layout[i]]);
    actor.group.position.set((slot.x-card.width/2)/card.width,(card.height/2-slot.y)/card.width,.016);
    actor.group.scale.setScalar(.21);
    parent.add(actor.group);
    return [actor];
  });
  lightMarket(parent);
  let elapsed=0,lastTick=null;
  sound.begin();
  const fades=new Map();
  parent.traverse(object=>{
    for(const material of (Array.isArray(object.material)?object.material:[object.material])){
      if(!material||fades.has(material))continue;
      fades.set(material,{opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});
      material.transparent=true;material.opacity=0;material.depthWrite=false;
    }
  });
  parent.scale.setScalar(.001);
  let revealed=false;
  return now=>{
    if(lastTick!==null)elapsed+=Math.min(66,Math.max(0,now-lastTick));lastTick=now;
    const t=elapsed/1000,p=Math.min(1,t/1.1),ease=1-Math.pow(1-p,3);
    parent.scale.setScalar(Math.max(.001,ease));
    if(!revealed){
      fades.forEach((original,material)=>{material.opacity=original.opacity*ease;if(p===1){material.transparent=original.transparent;material.depthWrite=original.depthWrite;material.needsUpdate=true;}});
      revealed=p===1;
    }
    const villageProgress=Math.max(0,Math.min(1,(t-.15)/1.25)),v=1-Math.pow(1-villageProgress,3);
    village.scale.setScalar(Math.max(.001,.21*v));village.rotation.x=-(1-v)*.65;village.position.z=.008-(1-v)*.06;
    actors.forEach(actor=>actor.update(Math.max(0,t-.35)));
    natureUpdate(t);
    sound.update(t,parent.parent.visible,layout.includes(1));
  };
}
async function run() {
  let renderer,scene,camera,anchor,mindar,base,reader,filter;
  let selfie=false,switching=false,content=null,readSince=0,update=()=>{},currentCamera=()=>camera;
  const samples=slots.map(()=>({type:null,count:0}));
  const status=document.getElementById('status');
  const replay=document.getElementById('replay');
  function showWorld(){
    if(content)return;
    content=new THREE.Group();anchor.add(content);update=universe(content);
    replay.hidden=false;replay.textContent='重新识别';
    replay.onclick=()=>{
      anchor.remove(content);content.traverse(o=>{o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material])){m?.map?.dispose();m?.dispose();}});
      content=null;readSince=0;samples.forEach(s=>s.count=0);layout.fill(null);replay.hidden=true;
      status.textContent='对准卡片，正在读取贴纸';
    };
  }
  if(preview){
    renderer=new THREE.WebGLRenderer({antialias:true,stencil:true});
    scene=new THREE.Scene();scene.background=new THREE.Color(0x142b2a);
    camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.01,20);camera.position.set(0,-2.1,3.1);camera.lookAt(0,.3,0);
    anchor=new THREE.Group();scene.add(anchor);stage.append(renderer.domElement);showWorld();let drag=null;renderer.domElement.style.touchAction='none';renderer.domElement.onpointerdown=e=>{drag=[e.clientX,e.clientY];renderer.domElement.setPointerCapture(e.pointerId);};renderer.domElement.onpointermove=e=>{if(!drag)return;camera.position.x=THREE.MathUtils.clamp(camera.position.x-(e.clientX-drag[0])*.008,-3,3);camera.position.y=THREE.MathUtils.clamp(camera.position.y+(e.clientY-drag[1])*.008,-4,1);camera.lookAt(0,.3,0);drag=[e.clientX,e.clientY];};renderer.domElement.onlostpointercapture=()=>drag=null;
    replay.textContent='重演开场';replay.onclick=()=>{anchor.remove(content);content=null;showWorld();};
    replay.hidden=true;
  }else{
    const {MindARThree}=await import('../lib/mindar-image-three.prod.js');
    const capture=await openPreferredRear(navigator.mediaDevices);

    mindar=new MindARThree({container:stage,imageTargetSrc:'./assets/card-stickers.mind',maxTrack:1,uiLoading:'no',uiScanning:'no',uiError:'no',filterMinCF:.0025,filterBeta:.25,warmupTolerance:1,missTolerance:4,environmentDeviceId:capture.current||null});
    installCameraAdapter(mindar,capture.stream);
    const cameraPanel=document.body.lastElementChild;cameraPanel.classList.add('camera-settings');cameraPanel.removeAttribute('style');document.getElementById('settings').append(cameraPanel);
    const old=mindar.renderer;
    mindar.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,stencil:true});
    old.domElement.replaceWith(mindar.renderer.domElement);old.dispose();
    ({renderer,scene,camera}=mindar);base=mindar.addAnchor(0);
    anchor=new THREE.Group();scene.add(anchor);anchor.visible=false;filter=createPoseFilter(anchor,{positionRestMs:135,rotationRestMs:165,movingMs:32});
    await mindar.start();reader=await createStickerReader(mindar.video,base,mindar.controller.projectionTransform);

    const lensPanel=document.createElement('details');const lensSummary=document.createElement('summary');lensSummary.textContent='镜头设置';lensPanel.append(lensSummary);
    lensPanel.style.cssText='position:fixed;left:10px;right:10px;top:155px;z-index:6;background:#211a30ed;padding:10px;border-radius:10px;font-size:13px';
    const select=document.createElement('select');select.style.cssText='max-width:100%;padding:8px';
    const lensInfo=document.createElement('p');lensPanel.append(select,lensInfo);document.getElementById('settings').append(lensPanel);lensPanel.classList.add('camera-settings');lensPanel.removeAttribute('style');
    for(const d of (await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput')){
      const option=document.createElement('option');option.value=d.deviceId;option.textContent=d.label||'未命名镜头';select.append(option);
    }
    const describeLens=()=>{const track=mindar.video.srcObject.getVideoTracks()[0],s=track.getSettings();select.value=s.deviceId;lensInfo.textContent='实际镜头：'+track.label+' · '+s.width+'×'+s.height;};describeLens();
    select.onchange=async()=>{
      const selected=select.value,previous=mindar.environmentDeviceId;select.disabled=true;switching=true;
      mindar.controller.onUpdate=()=>{};mindar.stop();base.visible=false;base.group.visible=false;anchor.visible=false;renderer.clear();
      try{
        
        const device=select.selectedOptions[0].textContent;selfie=/front|前置|自拍/i.test(device);if(selfie)mindar.userDeviceId=selected;else mindar.environmentDeviceId=selected;mindar.shouldFaceUser=selfie;
        await mindar.start();reader=await createStickerReader(mindar.video,base,mindar.controller.projectionTransform);
        mindar.video.dataset.mirrored=String(selfie);mindar.video.style.transform=selfie?'scaleX(-1)':'';
        renderer.domElement.dataset.mirrored=String(selfie);renderer.domElement.style.transform=selfie?'scaleX(-1)':'';
        document.getElementById('switch-camera').setAttribute('aria-label',selfie?'切换到后置摄像头':'切换到前置摄像头');describeLens();if(mindar.video.srcObject.getVideoTracks()[0].getSettings().deviceId!==selected)alert('浏览器没有打开所选镜头，请查看实际镜头信息');
      }catch(error){
        lensInfo.textContent='所选镜头启动失败：'+error.message;
        mindar.video?.srcObject?.getTracks().forEach(t=>t.stop());mindar.video?.remove();
        try{mindar.environmentDeviceId=previous;mindar.shouldFaceUser=false;selfie=false;await mindar.start();reader=await createStickerReader(mindar.video,base,mindar.controller.projectionTransform);describeLens();}catch{lensInfo.textContent='相机恢复失败，请重新打开页面';}
      }finally{filter=createPoseFilter(anchor,{positionRestMs:135,rotationRestMs:165,movingMs:32});readSince=0;samples.forEach(s=>s.count=0);switching=false;select.disabled=false;}
    };

    setupPhoto({renderer,audioStream:()=>sound.stream,render:()=>renderer.render(scene,camera),video:()=>mindar.video,ready:()=>!switching,switchCamera:async()=>{
      const next=!selfie;switching=true;
      // A stopped controller may finish an in-flight detection. Do not let it
      // restore the previous camera's pose while the new camera is starting.
      mindar.controller.onUpdate=()=>{};
      mindar.stop();
      base.visible=false;base.group.visible=false;
      anchor.visible=false;filter=createPoseFilter(anchor,{positionRestMs:135,rotationRestMs:165,movingMs:32});
      renderer.clear();
      async function startFacing(front){
        mindar.shouldFaceUser=front;await mindar.start();
        mindar.video.dataset.mirrored=String(front);mindar.video.style.transform=front?'scaleX(-1)':'';
        renderer.domElement.style.transform=front?'scaleX(-1)':'';
        renderer.domElement.dataset.mirrored=String(front);
        describeLens();
        reader=await createStickerReader(mindar.video,base,mindar.controller.projectionTransform);
      }
      try{await startFacing(next);selfie=next;}
      catch(error){
        mindar.video?.srcObject?.getTracks().forEach(t=>t.stop());mindar.video?.remove();
        try{await startFacing(selfie);}catch{status.textContent='相机暂不可用，请重新打开页面并允许相机权限';}
        throw new Error('无法切换镜头，请检查设备和相机权限。');
      }finally{anchor.visible=false;filter=createPoseFilter(anchor,{positionRestMs:135,rotationRestMs:165,movingMs:32});switching=false;readSince=0;samples.forEach(s=>s.count=0);}
      anchor.matrixAutoUpdate=false;anchor.visible=false;filter=createPoseFilter(anchor,{positionRestMs:135,rotationRestMs:165,movingMs:32});
      status.textContent=(selfie?'前置':'后置')+'相机 · 对准卡片，识别后自动显示';
      return selfie;
    }});
    currentCamera=()=>camera;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
  function resize(){if(preview){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.position.z=Math.max(3.1,4.0/camera.aspect);camera.lookAt(0,.2,0);camera.updateProjectionMatrix();}}
  addEventListener('resize',resize);resize();
  document.getElementById('welcome').hidden=true;document.getElementById('controls').hidden=false;
  replay.hidden=true;status.textContent=preview?'拖动画面，环顾小镇':'对准整张卡片，识别后自动打开';
  let lastRender=-Infinity;
  renderer.setAnimationLoop(()=>{
    const now=performance.now();if(now-lastRender<1000/30)return;lastRender=now;
    if(!preview&&!switching){
      filter(base.group,now);
      if(!content){
        if(!base.visible){readSince=0;samples.forEach(s=>s.count=0);}
        const values=base.visible?reader(now):null;
        if(values){
          if(!readSince)readSince=now;
          values.forEach((type,i)=>{const s=samples[i];if(type===undefined){s.count=0;return;}s.count=s.type===type?s.count+1:1;s.type=type;s.required=values.confidence?.[i]==='high'?2:3;if(s.count>=s.required)layout[i]=type;});
          status.textContent='已找到卡片，正在辨认建筑…';
          if(now-readSince>=110&&samples.every(s=>s.count>=(s.required||3))){
            showWorld();status.textContent=layout.map((t,i)=>`${i+1}号 ${t===null?'空':stickers[t].label}`).join(' · ');
          }
        }
      }
    }
    anchor.updateWorldMatrix(true,false);if(content)update(now);else sound.update(0,false,false);renderer.render(scene,currentCamera());
  });
}


if(preview)run();
else{
  document.getElementById('welcome').hidden=false;
  
  document.getElementById('start').onclick=async e=>{
    e.currentTarget.disabled=true;
    try{await sound.unlock();document.getElementById('sound-toggle').textContent='声音：开';await run();}catch{document.querySelector('#welcome p').textContent='相机启动失败，请检查相机权限后重新打开页面。';}
  };
}









const menu=document.getElementById('settings'),menuButton=document.getElementById('menu-toggle');
menuButton.onclick=()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));};
document.getElementById('sound-toggle').onclick=async e=>{const button=e.currentTarget;button.disabled=true;try{if(!sound.unlocked){await sound.unlock();button.textContent='声音：开';}else button.textContent=(await sound.toggle())?'声音：开':'声音：关';}catch{button.textContent='声音暂不可用';}finally{button.disabled=false;}};
if(preview)document.getElementById('sound-toggle').textContent='开启声音';




