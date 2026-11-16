import * as THREE from 'three';
import { box, material, mesh, oval, tube, sign } from './market.js';

// Bake stationary parts into material batches. Animated groups remain separate.
export function batchStatic(root) {
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),batches=new Map(),remove=[];
  root.traverse(o=>{
    if(!o.isMesh||Array.isArray(o.material)||o.material.transparent)return;
    for(let p=o.parent;p&&p!==root;p=p.parent)if(p.userData.animated)return;
    const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
    if(!p||!n)return;
    const matrix=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),normal=new THREE.Matrix3().getNormalMatrix(matrix);
    let b=batches.get(o.material);if(!b){b={p:[],n:[],uv:[]};batches.set(o.material,b);}
    const v=new THREE.Vector3(),w=new THREE.Vector3();
    for(let j=0;j<(g.index?g.index.count:p.count);j++){
      const i=g.index?g.index.getX(j):j;
      v.fromBufferAttribute(p,i).applyMatrix4(matrix);w.fromBufferAttribute(n,i).applyNormalMatrix(normal);
      b.p.push(v.x,v.y,v.z);b.n.push(w.x,w.y,w.z);b.uv.push(uv?uv.getX(i):0,uv?uv.getY(i):0);
    }remove.push(o);
  });
  remove.forEach(o=>o.removeFromParent());
  batches.forEach((b,mat)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));g.computeBoundingSphere();root.add(new THREE.Mesh(g,mat));});
}

export function dressMarket(actor,id){
  const props=actor.group.children[0],moving=props.children[0];
  const parent=id==='flower'?moving.children[0]:moving;
  const details=new THREE.Group();parent.add(details);
  const brass=material(0xe9b455),cream=material(0xffe5b0),leaf=material(0x368a61);
  if(id==='flower'){
    const pink=material(0xf079ac),purple=material(0xb18bdf);
    for(const side of [-1,1]){
      const vine=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.33,-.25,.13),new THREE.Vector3(side*.35,-.24,.39),new THREE.Vector3(side*.26,-.12,.62),new THREE.Vector3(side*.15,.02,.72)]);
      mesh(details,new THREE.TubeGeometry(vine,18,.009,5,false),leaf);
      for(let i=0;i<8;i++){
        const p=vine.getPoint((i+.3)/8);oval(details,leaf,p.x+side*.02,p.y,p.z,.029,.013,.014);
        for(let j=0;j<5;j++){const a=j*Math.PI*2/5;oval(details,i%2?pink:purple,p.x+Math.cos(a)*.022,p.y-.012,p.z+Math.sin(a)*.022,.018,.010,.018);}
        oval(details,brass,p.x,p.y-.025,p.z,.010,.009,.01);
      }
    }
    for(const x of [-.40,.40]){tube(details,brass,.016,.02,.21,x,-.24,.16,8);oval(details,cream,x,-.24,.29,.034,.034,.046);}
  }else if(id==='book'){
    const covers=[material(0xcc6e68),material(0x5aa49e),material(0x9971b5)];
    for(const side of [-1,1])for(let i=0;i<4;i++){
      const g=new THREE.Group();g.position.set(side*.30,-.38,.20+i*.035);g.rotation.z=side*(i%2?.13:-.08);details.add(g);
      box(g,covers[i%3],.14,.10,.027,0,0,0);box(g,cream,.12,.097,.014,0,-.003,.002);
    }
    for(const side of [-1,1]){
      for(let i=0;i<4;i++)tube(details,brass,.006,.006,.15,side*.37,-.24+i*.14,.27,6);
      box(details,brass,.014,.46,.015,side*.37,-.03,.35);
    }
  }else{
    const turquoise=material(0x2b999d),navy=material(0x416a99);
    for(let i=0;i<28;i++){
      const a=i*Math.PI*2/28,p=box(details,i%2?turquoise:navy,.037,.018,.035,Math.cos(a)*.414,Math.sin(a)*.414,.112);p.rotation.z=a+Math.PI/2;
    }
    for(const [r,z]of [[.40,.15],[.10,.435]])mesh(details,new THREE.TorusGeometry(r,.009,6,48),brass,0,0,z);
  }
  batchStatic(details);
}

export function createStorybook(parent){
  const root=new THREE.Group();root.name='storybook-town';parent.add(root);
  const cream=material(0xffefc7),gold=material(0xdba34a),wood=material(0x704531),green=material(0x398565);
  const animated=[];
  const shadeCanvas=document.createElement('canvas');shadeCanvas.width=shadeCanvas.height=64;
  const sc=shadeCanvas.getContext('2d'),gradient=sc.createRadialGradient(32,32,2,32,32,31);
  gradient.addColorStop(0,'rgba(38,51,27,.38)');gradient.addColorStop(1,'rgba(38,51,27,0)');sc.fillStyle=gradient;sc.fillRect(0,0,64,64);
  const shade=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadeCanvas),transparent:true,depthWrite:false});
  function shadow(x,y,w,d){const m=mesh(root,new THREE.PlaneGeometry(w,d),shade,x,y,.003);m.renderOrder=1;}
  const ground=new THREE.Group();ground.position.y=.25;root.add(ground);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');
  c.fillStyle='#88b96b';c.fillRect(0,0,1024,1024);
  for(let i=0;i<1800;i++){const x=(i*619)%1024,y=(i*373)%1024;c.fillStyle=['#a3c97d','#73aa65','#bfda8c'][i%3];c.fillRect(x,y,3,2);}
  c.lineCap='round';c.strokeStyle='#f2dba5';c.lineWidth=136;c.beginPath();c.moveTo(95,530);c.bezierCurveTo(380,400,510,680,900,540);c.stroke();c.lineWidth=105;c.beginPath();c.moveTo(500,40);c.bezierCurveTo(660,310,390,740,515,990);c.stroke();
  const pixels=c.getImageData(0,0,1024,1024).data;
  for(let y=10;y<1024;y+=19)for(let x=10+(y%38?12:0);x<1024;x+=25){if(pixels[(y*1024+x)*4]<210)continue;c.fillStyle=['#e6c48f','#ffedc4','#edce9c'][(x+y)%3];c.beginPath();c.roundRect(x,y,21,14,4);c.fill();}
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
  box(ground,cream,.895,.895,.016,0,0,-.009);box(ground,gold,.906,.906,.009,0,0,-.019);
  mesh(ground,new THREE.PlaneGeometry(.88,.88),new THREE.MeshStandardMaterial({map:tex,roughness:1}),0,0,.001);
  batchStatic(ground);
  function locate(px,py){return [(px-300)/600,(450-py)/600];}
  function cottage(px,py,index){
    const g=new THREE.Group(),[x,y]=locate(px,py);g.position.set(x,y,.005);g.scale.setScalar(.15);root.add(g);
    shadow(x,y,.19,.14);
    const paint=material([0xffc988,0x72c6b0,0xf7b3be][index]),roof=material([0xd26b43,0x278b81,0x9c5c9a][index]),glass=material(0xffd77e,.32);
    box(g,cream,.79,.64,.055,0,0,.028);box(g,paint,.67,.51,.60,0,0,.35);
    for(const z of [.13,.63])box(g,cream,.73,.56,.035,0,0,z);
    const shape=new THREE.Shape();shape.moveTo(-.4,0);shape.lineTo(.4,0);shape.lineTo(0,.34);shape.closePath();
    const r=mesh(g,new THREE.ExtrudeGeometry(shape,{depth:.64,bevelEnabled:false}),roof,0,.32,.66);r.rotation.x=Math.PI/2;
    for(let side of [-1,1])for(let row=0;row<6;row++){
      const z=.99-row*.052,x=side*(row+.5)*.061;
      for(let col=0;col<8;col++){const tile=box(g,roof,.078,.075,.019,x,-.285+col*.081,z);tile.rotation.y=side*.73;}
    }
    for(const xx of [-.29,.29])box(g,wood,.035,.035,.54,xx,-.272,.38);
    box(g,wood,.15,.035,.29,0,-.275,.24);box(g,glass,.10,.012,.12,0,-.299,.30);
    for(let xx of [-.21,.21]){
      box(g,cream,.18,.028,.21,xx,-.277,.43);box(g,glass,.135,.012,.16,xx,-.299,.43);
      box(g,wood,.012,.015,.17,xx,-.31,.43);box(g,wood,.14,.015,.012,xx,-.31,.43);
      box(g,wood,.20,.10,.06,xx,-.30,.29);
      for(let k=0;k<4;k++)oval(g,material(k%2?0xffd875:0xf275a6),xx+(k-1.5)*.039,-.32,.34,.027,.025,.027);
    }
    box(g,roof,.095,.105,.23,-.21,.13,.92);box(g,cream,.13,.14,.035,-.21,.13,1.045);
    sign(g,['麦香面包','森林茶屋','糖果小铺'][index],'MAGIC MARKET',['#9b4b31','#28695e','#814b80'][index],0,-.315,.65,.43);
    if(index===0){const loaf=oval(g,material(0xe5a444),0,0,1.05,.22,.13,.10);for(let i=0;i<3;i++){const s=box(g,cream,.025,.13,.008,(i-1)*.09,0,1.14);s.rotation.z=.35;}}
    if(index===2){oval(g,material(0xf481b4),0,0,1.11,.14,.14,.14);for(let side of [-1,1]){const a=mesh(g,new THREE.ConeGeometry(.12,.18,4),material(0xffd16a),side*.21,0,1.11);a.rotation.z=Math.PI/2;}}
    batchStatic(g);animated.push({g,delay:.35+index*.16,scale:.15,z:.005,kind:'house'});
  }
  cottage(89,94,0);cottage(179,87,1);cottage(270,96,2);
  for(const [px,py]of [[80,249],[78,515],[519,505],[522,292]]){
    const g=new THREE.Group(),[x,y]=locate(px,py);g.position.set(x,y,.005);root.add(g);tube(g,wood,.006,.012,.09,0,0,.045,7);
    shadow(x,y,.10,.07);
    for(let i=0;i<6;i++)oval(g,i%2?green:material(0x85c85c),Math.cos(i*2.4)*.025,Math.sin(i*2.4)*.022,.09+(i%3)*.016,.035,.03,.045);
    batchStatic(g);animated.push({g,delay:.3+px/900,scale:1,z:.005,kind:'tree'});
  }
  for(const [px,py]of [[214,249],[341,249],[430,516]]){
    const [x,y]=locate(px,py);const g=new THREE.Group();g.position.set(x,y,.005);root.add(g);
    for(let j=0;j<3;j++)box(g,wood,.085,.008,.006,0,j*.009,.033);
    box(g,wood,.085,.007,.024,0,.022,.049);for(let xx of [-.03,.03])box(g,gold,.006,.025,.033,xx,0,.017);
    batchStatic(g);animated.push({g,delay:1,scale:1,z:.005,kind:'prop'});
  }
  return t=>{
    ground.scale.z=Math.max(.001,Math.min(1,t/.65));
    animated.forEach(({g,delay,scale,z,kind})=>{const p=THREE.MathUtils.clamp((t-delay)/1.25,0,1),e=1-(1-p)**3;g.visible=p>0;g.scale.set(scale,scale,Math.max(.001,scale*e));g.position.z=z-(kind==='prop'?(1-e)*-.12:0);if(kind==='house')g.rotation.x=-(1-e)*.28;});
  };
}
