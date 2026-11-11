import * as THREE from 'three';
import { buildTown } from './town.js';
import { createMarket, lightMarket, stickers } from './market.js';
import { openCardCamera, savedCamera } from '../camera.js';

const stage = document.getElementById('stage');
const preview = new URLSearchParams(location.search).has('preview');
const planes = [
  new THREE.Plane(new THREE.Vector3(1, 0, 0), 0.5),
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.5),
  new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5),
  new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.5),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
];
const localPlanes = planes.map(p => p.clone());
function universe(parent) {
  const aperture = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
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
  gradient.addColorStop(0, '#7cbce1');
  gradient.addColorStop(0.58, '#c5e5ed');
  gradient.addColorStop(1, '#f7e7ba');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 14; i++) {
    const x = i * 86 - 30, height = 55 + i * 31 % 87;
    context.fillStyle = i % 2 ? '#b4c4bd' : '#adbfba';
    context.fillRect(x, 780 - height, 66, height + 244);
    context.beginPath();context.moveTo(x - 4,780-height);context.lineTo(x+33,750-height);context.lineTo(x+70,780-height);context.fill();
  }
  const skyTexture = new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(5, 5),
    new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.DoubleSide }));
  sky.geometry = new THREE.PlaneGeometry(5, 5);
  sky.position.z = -1.4;
  world.add(sky);
  const village = new THREE.Group();
  village.position.set(0, -0.27, -0.78);
  village.scale.setScalar(0.36);
  village.rotation.x = -0.95;
  world.add(village);
  buildTown(village);
  const actors = stickers.map((definition, i) => {
    const market = createMarket(definition);
    market.group.position.set(...[[-1.17,-0.29,0],[0.04,-0.32,0],[0.99,0.45,0]][i]);
    village.add(market.group);
    return market;
  });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfaf7e9 }));
      puff.scale.set(1.2,0.5,0.6);
      puff.position.set(j*0.11, 0, Math.sin(j)*0.03);
      cloud.add(puff);
    }
    cloud.position.set(-1.0+i*0.29,0.52+i%3*0.23,-0.36-i%2*0.19);
    world.add(cloud);clouds.push(cloud);
  }
  lightMarket(world);
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
    clouds.forEach((c,i)=>{c.position.x=-1.0+i*0.29+Math.sin(t*0.08+i)*0.07;});
  };
}
async function run() {
  let renderer, scene, camera, anchor;
  if (preview) {
    renderer=new THREE.WebGLRenderer({antialias:true,stencil:true});
    scene=new THREE.Scene();scene.background=new THREE.Color(0x292736);
    camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,0.01,20);
    camera.position.set(0,-0.62,1.65);camera.lookAt(0,0,-0.3);
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
    const mindar=new MindARThree({container:stage,imageTargetSrc:'../assets/targets.mind',uiLoading:'no',uiScanning:'no',uiError:'no',filterMinCF:0.00075,filterBeta:0.015,environmentDeviceId:capture.current||null});
    capture.stream.getTracks().forEach(t=>t.stop());
    const oldRenderer = mindar.renderer;
    mindar.renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,stencil:true});
    oldRenderer.domElement.replaceWith(mindar.renderer.domElement);
    oldRenderer.dispose();
    mindar.renderer.domElement.style.position = "absolute";
    ({renderer,scene,camera}=mindar);
    anchor=mindar.addAnchor(0).group;
    await mindar.start();
  }
  const update=universe(anchor);
  renderer.localClippingEnabled=true;
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.clippingPlanes=[planes[4]];
  function resize(){
    if(preview){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  }
  addEventListener('resize',resize);resize();
  document.getElementById('welcome').hidden=true;
  document.getElementById('controls').hidden=false;
  document.getElementById('status').textContent=preview?'拖动视角，透过方形窗口看进集市':'对准方格地图，打开集市窗口';
  renderer.setAnimationLoop(()=>{
    anchor.updateWorldMatrix(true,false);
    planes.forEach((p,i)=>p.copy(localPlanes[i]).applyMatrix4(anchor.matrixWorld));
    update(performance.now());renderer.render(scene,camera);
  });
}
document.querySelector('h1').textContent='魔法集市 · 窗口';
document.querySelector('nav').innerHTML='<a href="./portal.html?preview">窗口预览</a><a href="./grid-card.html">打印方格地图</a>';
if(preview)run();
else{
  document.getElementById('welcome').hidden=false;
  document.querySelector('#welcome p').textContent='对准方格地图，透过卡片窗口看进集市。';
  document.getElementById('start').onclick=()=>run().catch(()=>{
    document.querySelector('#welcome p').textContent='请允许相机权限，再试一次。';
  });
}




