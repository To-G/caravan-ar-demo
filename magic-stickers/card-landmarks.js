import * as THREE from 'three';
import {box,material,mesh,oval} from './market.js';
import {batchStatic} from './storybook.js';

// Use the same card coordinate system as the town: XY is the print, +Z is up.
const at=(px,py)=>[(px-300)/600,(450-py)/600];
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>1-(1-clamp(n))**3;
export function createCardLandmarks(parent){
  const root=new THREE.Group();root.name='card-landmarks';parent.add(root);
  const gold=material(0xd8ad59),wood=material(0x38685c),cream=material(0xf8e7be);

  // The QR image is copied from the printed card, including its quiet border.
  const qrBase=new THREE.Group();qrBase.name='qr-pedestal';qrBase.position.set(...at(477,840),.004);root.add(qrBase);
  box(qrBase,wood,.37,.075,.018,0,0,.009);
  box(qrBase,gold,.38,.08,.006,0,0,.003);
  batchStatic(qrBase);
  const hinge=new THREE.Group();hinge.name='qr-fold-up';hinge.position.copy(qrBase.position);root.add(hinge);
  const panel=new THREE.Group();panel.name='qr-sign';hinge.add(panel);
  box(panel,wood,.338,.338,.014,0,.15,-.005);
  box(panel,cream,.318,.318,.004,0,.15,.004);
  for(const x of [-.164,.164])box(panel,gold,.009,.338,.009,x,.15,.005);
  for(const y of [-.014,.314])box(panel,gold,.338,.009,.009,0,y,.005);
  const qrTexture=new THREE.TextureLoader().load('./assets/card-qr.png');
  qrTexture.colorSpace=THREE.SRGBColorSpace;qrTexture.magFilter=THREE.NearestFilter;
  qrTexture.minFilter=THREE.LinearFilter;qrTexture.generateMipmaps=false;
  const qr=mesh(panel,new THREE.PlaneGeometry(.30,.30),new THREE.MeshBasicMaterial({map:qrTexture}),0,.15,.008);
  qr.name='printed-qr-face';
  const axle=mesh(panel,new THREE.CylinderGeometry(.009,.009,.35,8),gold,0,0,0);axle.rotation.z=Math.PI/2;
  batchStatic(panel);

  const stone=new THREE.Group();stone.name='market-name-stone';stone.position.set(...at(192,680),.005);root.add(stone);
  box(stone,wood,.55,.13,.016,0,0,.008);
  box(stone,gold,.53,.115,.007,0,0,.019);
  const shape=new THREE.Shape();shape.moveTo(-.245,.024);shape.lineTo(-.257,.094);shape.lineTo(-.219,.137);shape.lineTo(-.074,.149);shape.lineTo(.123,.139);shape.lineTo(.238,.11);shape.lineTo(.252,.024);shape.closePath();
  const rockGeometry=new THREE.ExtrudeGeometry(shape,{depth:.077,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.008,bevelThickness:.006,curveSegments:2});
  rockGeometry.rotateX(Math.PI/2);rockGeometry.translate(0,.0385,0);
  mesh(stone,rockGeometry,material(0xe9d5ac));
  const label=document.createElement('canvas');label.width=1024;label.height=256;const c=label.getContext('2d');
  c.clearRect(0,0,1024,256);c.textAlign='center';c.textBaseline='middle';
  c.font='bold 152px "Microsoft YaHei","PingFang SC",sans-serif';
  c.fillStyle='#c0a376';c.fillText('魔法市集',515,119);c.fillStyle='#315d51';c.fillText('魔法市集',512,114);
  c.fillStyle='#9c7a45';c.font='24px Georgia,serif';c.fillText('M A G I C   M A R K E T',512,224);
  const textTexture=new THREE.CanvasTexture(label);textTexture.colorSpace=THREE.SRGBColorSpace;
  const plaque=mesh(stone,new THREE.PlaneGeometry(.432,.108),new THREE.MeshBasicMaterial({map:textTexture,transparent:true,depthWrite:false}),0,-.046,.086);
  plaque.rotation.x=Math.PI/2;
  for(const side of [-1,1])for(let i=0;i<3;i++)oval(stone,material(i%2?0x77a960:0x3d8058),side*(.233+i*.016),-.006+i*.021,.029,.027,.023,.023);
  batchStatic(stone);
  return t=>{
    const flip=ease((t-.65)/1.1);
    hinge.visible=qrBase.visible=t>.65;hinge.rotation.x=flip*Math.PI/2;
    const grow=ease((t-.45)/.95);stone.visible=t>.45;
    stone.scale.set(1,1,Math.max(.001,grow));
  };
}
