import * as THREE from 'three';
import { buildTown } from './town.js';
import { createMarket, lightMarket, stickers } from './market.js';
import { openCardCamera, savedCamera } from '../camera.js';
import { createWindowFrame } from './window-frame.js';
import { card, slots } from './card-layout.js';
import { createStickerReader } from './read-stickers.js';

const stage = document.getElementById('stage');
const preview = new URLSearchParams(location.search).has('preview');
const layout = preview ? [0, 1, 2] : [null, null, null];
function universe(parent) {
  const aperture = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5), new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc,
    stencilZPass: THREE.ReplaceStencilOp,
  }));
  aperture.renderOrder = -100;
  parent.add(aperture);
  const world = new THREE.Group();
  parent.add(world);
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = skyCanvas.height = 1024;
  const context = skyCanvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 1024);
  gradient.addColorStop(0, '#86bccc');
  gradient.addColorStop(0.56, '#d5e5df');
  gradient.addColorStop(1, '#f8dfb1');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 1024);
  const sunlight=context.createRadialGradient(773,286,0,773,286,163);
  sunlight.addColorStop(0,'rgba(255,247,211,.94)');
  sunlight.addColorStop(0.35,'rgba(255,242,205,.5)');
  sunlight.addColorStop(1,'rgba(255,242,205,0)');
  context.fillStyle=sunlight;context.fillRect(0,0,1024,1024);
  for (let i = 0; i < 14; i++) {
    const x = i * 86 - 30, height = 55 + i * 31 % 87;
    context.fillStyle = i % 2 ? '#b4c4bd' : '#adbfba';
    context.fillRect(x, 780 - height, 66, height + 244);
    context.beginPath();context.moveTo(x - 4,780-height);context.lineTo(x+33,750-height);context.lineTo(x+70,780-height);context.fill();
  }
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  skyTexture.repeat.set(3, 3);
  skyTexture.offset.set(-1, -1);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(5, 5),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.DoubleSide }));
  sky.position.z = -1.4;
  world.add(sky);
  const village = new THREE.Group();
  village.position.set(0, -0.74, -0.85);
  village.scale.setScalar(0.36);
  village.rotation.x = -Math.PI / 2;
  world.add(village);
  buildTown(village, { layoutMap: true });
  const actors = slots.flatMap((slot, i) => {
    if (layout[i] === null) return [];
    const definition = stickers[layout[i]];
    const market = createMarket(definition);
    market.group.position.set(slot.townX, slot.townY, 0);
    village.add(market.group);
    return [market];
  });
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 10), new THREE.MeshBasicMaterial({ color: j%2?0xfff8e6:0xf3efe0 }));
      puff.scale.set(1.2,0.5+(j%3)*0.2,0.6);
      puff.position.set(j*0.071, Math.sin(j*2+i)*0.02, Math.sin(j)*0.02);
      cloud.add(puff);
    }
    cloud.position.set(-0.63+i*0.25,0.29+i%3*0.16,-0.84-i%2*0.17);
    world.add(cloud);clouds.push(cloud);
  }
  lightMarket(world);
  createWindowFrame(parent).scale.y = 1.5;
  world.traverse(object => {
    if (!object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(material => {
      material.stencilWrite = true;
      material.stencilRef = 1;
      material.stencilFunc = THREE.EqualStencilFunc;
      material.stencilFail = material.stencilZFail = material.stencilZPass = THREE.KeepStencilOp;
    });
  });
  let start = performance.now();
  document.getElementById('replay').onclick = () => {start=performance.now();};
  return now => {
    const t=(now-start)/1000;
    actors.forEach(m=>m.update(t));
    clouds.forEach((c,i)=>{c.position.x=-0.63+i*0.25+Math.sin(t*0.08+i)*0.07;});
  };
}
async function run() {
  let renderer, scene, camera, anchor;
  let readLayout = null, reading = false, content = null;
  let update = () => {};
  function showWorld() {
    content = new THREE.Group();
    anchor.add(content);
    update = universe(content);
  }
  if (preview) {
    renderer=new THREE.WebGLRenderer({antialias:true,stencil:true});
    scene=new THREE.Scene();scene.background=new THREE.Color(0x292736);
    camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.01,20);
    camera.position.set(0,0,2.7);camera.lookAt(0,0,-0.3);
    anchor=new THREE.Group();scene.add(anchor);
    stage.appendChild(renderer.domElement);
    let drag=null;
    renderer.domElement.style.touchAction='none';
    renderer.domElement.onpointerdown=e=>{drag=[e.clientX,e.clientY];e.target.setPointerCapture(e.pointerId);};
    renderer.domElement.onpointermove=e=>{
      if(!drag)return;
      camera.position.x=THREE.MathUtils.clamp(camera.position.x+(e.clientX-drag[0])*0.003,-0.8,0.8);
      camera.position.y=THREE.MathUtils.clamp(camera.position.y-(e.clientY-drag[1])*0.003,-0.95,0.5);
      camera.lookAt(0,0,-0.3);drag=[e.clientX,e.clientY];
    };
    renderer.domElement.onlostpointercapture=()=>{drag=null;};
  } else {
    const {MindARThree}=await import('../lib/mindar-image-three.prod.js');
    const abort=new AbortController();
    const capture=await openCardCamera(navigator.mediaDevices,savedCamera(),abort.signal);
    const mindar=new MindARThree({container:stage,imageTargetSrc:'./assets/card-stickers.mind',maxTrack:1,uiLoading:'no',uiScanning:'no',uiError:'no',filterMinCF:0.0025,filterBeta:0.25,environmentDeviceId:capture.current||null});
    capture.stream.getTracks().forEach(t=>t.stop());
    const oldRenderer = mindar.renderer;
    mindar.renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,stencil:true});
    oldRenderer.domElement.replaceWith(mindar.renderer.domElement);
    oldRenderer.dispose();
    mindar.renderer.domElement.style.position = "absolute";
    ({renderer,scene,camera}=mindar);
    const base = mindar.addAnchor(0);
    const root = new THREE.Group();
    root.scale.setScalar(1);
    base.group.add(root);
    anchor=root;
    reading=true;
    let reader;
    const samples=slots.map(()=>({type:null,count:0}));
    readLayout=()=>{
      if(!reading || !reader)return;
      const values=reader(performance.now());
      if(values)values.forEach((type,slot)=>{
        const sample=samples[slot];
        sample.count=sample.type===type?sample.count+1:1;sample.type=type;
        if(sample.count>=3)layout[slot]=type;
      });
      const summary=layout.map((type,i)=>(i+1)+'号 '+(type===null?'空':stickers[type].label)).join(' · ');
      document.getElementById('status').textContent=summary;
      document.getElementById('replay').disabled=!layout.some(type=>type!==null);
    };
    await mindar.start();
    reader=await createStickerReader(mindar.video,base,mindar.controller.projectionTransform);
  }
  if(preview)showWorld();
  else {
    const button=document.getElementById('replay');
    button.textContent='打开集市';
    button.disabled=true;
    button.onclick=()=>{
      if(reading){
        reading=false;showWorld();
        button.textContent='重新读取贴纸';
        button.onclick=()=>location.reload();
      }
    };
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));

  function resize(){
    if(preview){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.position.z=Math.max(2.7,1.85/camera.aspect);camera.lookAt(0,0,-0.3);camera.updateProjectionMatrix();}
  }
  addEventListener('resize',resize);resize();
  document.getElementById('welcome').hidden=true;
  document.getElementById('controls').hidden=false;
  document.getElementById('status').textContent=preview?'纸卡上的固定景物与三个可贴建筑位':'对准整张卡，读取贴纸';
  renderer.setAnimationLoop(()=>{
    anchor.updateWorldMatrix(true,false);
    readLayout?.();
    update(performance.now());renderer.render(scene,camera);
  });
}
document.querySelector('h1').textContent='魔法集市 · 窗口';
document.querySelector('nav').innerHTML='<a href="./portal.html?preview">窗口预览</a><a href="./grid-card.html">打印方格地图</a>';
if(preview)run();
else{
  document.getElementById('welcome').hidden=false;
  document.querySelector('#welcome p').textContent='对准工卡大小的卡片和三个建筑贴纸位。核对读到的内容后，点「打开集市」。空位会保持为空。';
  document.getElementById('start').onclick=()=>run().catch(()=>{
    document.querySelector('#welcome p').textContent='请允许相机权限，再试一次。';
  });
}














