import { batchStatic } from './storybook.js';
import * as THREE from 'three';

export function createForest(parent) {
  const environment=new THREE.Group();environment.name='forest-environment';environment.scale.setScalar(.66);environment.position.y=.085;parent.add(environment);
  const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.95});
  const grass=mat(0x62b75d),moss=mat(0xc3e77b),dark=mat(0x167d61),leaf=mat(0x3fa45f),bark=mat(0x946348),cream=mat(0xffdf69);
  const actors=[],birds=[],clouds=[],butterflies=[];
  const sphere=new THREE.SphereGeometry(1,12,8),trunk=new THREE.CylinderGeometry(.012,.021,.17,5),cone=new THREE.ConeGeometry(1,1,12);
  function mesh(parent,geometry,material,x,y,z,sx=1,sy=sx,sz=sx){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
  const meadow=new THREE.Group();environment.add(meadow);meadow.position.y=.25;
  meadow.name='square-garden';meadow.userData.animated=true;
  // A square layered garden follows the printed map; keep the front open.
  const edge=mat(0xb98753),trim=mat(0xf3d79b),earth=mat(0x80654b);
  mesh(meadow,new THREE.BoxGeometry(2.06,2.06,.035),earth,0,0,-.064);
  mesh(meadow,new THREE.BoxGeometry(2.08,2.08,.012),trim,0,0,-.043);
  const base=mesh(meadow,new THREE.BoxGeometry(2.04,2.04,.035),grass,0,0,-.022);
  base.name='square-ground';
  for(const side of [-1,1]){
    mesh(meadow,new THREE.BoxGeometry(.022,2.06,.024),edge,side*1.025,0,-.016);
    mesh(meadow,new THREE.BoxGeometry(2.06,.022,.024),edge,0,side*1.025,-.016);
  }
  for(let side=0;side<4;side++)for(let i=0;i<17;i++){
    const a=-.96+i*.12,x=side<2?a:(side===2?-.985:.985),y=side<2?(side===0?-.985:.985):a;
    mesh(meadow,new THREE.BoxGeometry(side<2?.103:.028,side<2?.028:.103,.012),trim,x,y,.002);
  }
  batchStatic(meadow);
  const water=mat(0x3fcad5),sand=mat(0xffd797),stone=mat(0x9eaa96);
  const creek=new THREE.CatmullRomCurve3([new THREE.Vector3(-.92,.85,.015),new THREE.Vector3(-.67,.55,.015),new THREE.Vector3(-.69,.12,.015),new THREE.Vector3(-.85,-.3,.015),new THREE.Vector3(-.65,-.63,.015)]);
  mesh(environment,new THREE.TubeGeometry(creek,36,.053,6,false),water,0,0,0,1,1,.22);
  const path=new THREE.CatmullRomCurve3([new THREE.Vector3(.4,.28,.006),new THREE.Vector3(.67,.35,.006),new THREE.Vector3(.87,.6,.006),new THREE.Vector3(.93,.95,.006)]);
  mesh(environment,new THREE.TubeGeometry(path,30,.048,5,false),sand,0,0,0,1,1,.12);
  mesh(environment,sphere,water,-.76,-.16,.012,.18,.12,.015);
  for(let i=0;i<7;i++){
    const plank=mesh(environment,new THREE.BoxGeometry(.23,.029,.025),bark,-.69,.04+i*.032,.035);plank.rotation.z=-.12;
  }
  for(const x of [-.80,-.58]){
    for(const y of [.045,.14,.235])mesh(environment,new THREE.BoxGeometry(.015,.015,.10),bark,x,y,.08);
    mesh(environment,new THREE.BoxGeometry(.015,.24,.014),trim,x,.14,.13);
  }
  // Square corner lanterns and a front path give the miniature a clear entrance.
  const glow=mat(0xffdb82);glow.emissive.setHex(0xffbd55);glow.emissiveIntensity=.35;
  for(const x of [-.90,.90])for(const y of [-.64,1.14]){
    mesh(environment,new THREE.CylinderGeometry(.012,.02,.18,6),edge,x,y,.10).rotation.x=Math.PI/2;
    mesh(environment,new THREE.BoxGeometry(.052,.052,.065),glow,x,y,.205);
    mesh(environment,new THREE.BoxGeometry(.065,.065,.012),edge,x,y,.244);
  }
  for(let i=0;i<5;i++)mesh(environment,new THREE.BoxGeometry(.10,.042,.012),sand,.07+Math.sin(i*.8)*.014,-.70+i*.06,.008);
  const ripples=Array.from({length:3},(_,i)=>{
    const ring=mesh(environment,new THREE.RingGeometry(.08,.084,32),new THREE.MeshBasicMaterial({color:0xc8f9df,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide}),-.76,-.16,.030+i*.0002);return ring;
  });
  for(let i=0;i<18;i++){
    const side=i%4,a=-.87+Math.floor(i/4)*.40;
    const x=side<2?a:(side===2?-.88:.88),y=.25+(side<2?(side===0?-.88:.88):a);
    mesh(environment,sphere,stone,x,y,.017,.025+(i%3)*.007,.022,.022);
  }
  const flowerColors=[mat(0xff70ac),mat(0xffdf47),mat(0x9f8bf3)];
  for(let i=0;i<14;i++){
    const side=i%4,a=-.82+Math.floor(i/4)*.52;
    const x=side<2?a:(side===2?-.82:.82),y=.25+(side<2?(side===0?-.82:.82):a);
    for(let j=0;j<5;j++){
      const xx=x+Math.cos(j*2.4)*.035,yy=y+Math.sin(j*2.4)*.035;
      mesh(environment,trunk,leaf,xx,yy,.019,.16,.28,.16).rotation.x=Math.PI/2;
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5;mesh(environment,sphere,flowerColors[i%3],xx+Math.cos(a)*.009,yy+Math.sin(a)*.009,.047,.010,.010,.005);}
      mesh(environment,sphere,cream,xx,yy,.05,.006,.006,.004);
    }
  }
  const treePositions=[...Array.from({length:7},(_,i)=>[-.86+i*.286,1.14]),...Array.from({length:5},(_,i)=>[-.91,-.45+i*.31]),...Array.from({length:5},(_,i)=>[.91,-.45+i*.31]),[-.8,-.64],[.8,-.64]];
  for(let i=0;i<treePositions.length;i++){
    const group=new THREE.Group();group.position.set(...treePositions[i],.015);environment.add(group);
    const h=.24+(i%5)*.045;const stem=mesh(group,trunk,bark,0,0,.075);stem.rotation.x=Math.PI/2;
    if(i%3){for(let j=0;j<3;j++){const crown=mesh(group,cone,i%2?leaf:dark,0,0,.14+j*.075,.13-j*.022,.16-j*.012,.13-j*.022);crown.rotation.x=Math.PI/2;}}
    else {mesh(group,sphere,leaf,0,0,h,.14,.115,.16);mesh(group,sphere,moss,.065,-.02,h+.035,.08,.08,.10);}
    actors.push({group,start:.4+i*.045});
    if(i%4===0){for(let j=0;j<3;j++){
      const flower=new THREE.Group();flower.position.set(group.position.x+.1+j*.028,group.position.y-.1,.025);environment.add(flower);
      mesh(flower,sphere,cream,0,0,.03,.02,.02,.012);actors.push({group:flower,start:1+i*.04});
    }}
  }
  for(let i=0;i<7;i++){
    const group=new THREE.Group();group.name='sky-cloud';group.position.set(-1.1+i*.34,.9+Math.sin(i)*.19,.48+(i%3)*.12);environment.add(group);
    for(let j=0;j<4;j++)mesh(group,sphere,new THREE.MeshStandardMaterial({color:0xfff7e4,roughness:1}),j*.06,0,Math.sin(j)*.022,.075,.035,.045);
    clouds.push({group,x:group.position.x});
  }
  const birdMat=new THREE.MeshBasicMaterial({color:0x486c64,side:THREE.DoubleSide});
  for(let i=0;i<6;i++){
    const group=new THREE.Group();environment.add(group);mesh(group,sphere,new THREE.MeshStandardMaterial({color:0xfff1d8}),0,0,0,.035,.013,.016);mesh(group,sphere,new THREE.MeshStandardMaterial({color:0xffd27c}),.035,0,.005,.012,.009,.009);
    const wings=[-1,1].map(side=>{const pivot=new THREE.Group();group.add(pivot);const wing=mesh(pivot,new THREE.SphereGeometry(1,8,5),birdMat,side*.036,0,0);wing.scale.set(.066,.024,.007);wing.rotation.z=side*.25;return {pivot,side};});
    birds.push({group,wings,i});
  }
  const wingMats=[mat(0xff9c43),mat(0xff72be),mat(0xffe95c)];
  for(let i=0;i<7;i++){
    const group=new THREE.Group();environment.add(group);
    const wings=[-1,1].map(side=>{const pivot=new THREE.Group();group.add(pivot);mesh(pivot,sphere,wingMats[i%3],side*.018,0,0,.022,.014,.003);return {pivot,side};});
    butterflies.push({group,wings,i});
  }
  // Flowering branches frame the town without covering the real background.
  for(const side of [-1,1]){
    const branch=new THREE.Group();branch.position.set(side*.7,.85,.02);environment.add(branch);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(side*.10,0,.3),new THREE.Vector3(side*.02,0,.65),new THREE.Vector3(-side*.15,0,.9)]);
    mesh(branch,new THREE.TubeGeometry(curve,18,.012,5,false),bark,0,0,0);
    for(let i=0;i<19;i++){
      const p=curve.getPoint(.14+i*.044),dx=Math.sin(i*2.4)*.09;
      mesh(branch,sphere,cream,p.x+dx,p.y,p.z,.012,.012,.012);
      for(let j=0;j<5;j++){const a=j*Math.PI*2/5;mesh(branch,sphere,flowerColors[i%3],p.x+dx+Math.cos(a)*.026,p.y-.006,p.z+Math.sin(a)*.026,.025,.012,.021);}
    }
    batchStatic(branch);actors.push({group:branch,start:1.1});
  }
  actors.forEach(({group})=>batchStatic(group));clouds.forEach(({group})=>batchStatic(group));
  [...actors,...clouds,...birds,...butterflies].forEach(({group})=>group.userData.animated=true);
  batchStatic(environment);
  return t=>{
    meadow.scale.setScalar(Math.max(.001,1-Math.pow(1-Math.min(1,t/1.3),3)));
    ripples.forEach((ring,i)=>{const p=(t*.35+i/3)%1;ring.scale.set(.4+p, .65*(.4+p),1);ring.material.opacity=(1-p)*.42;});
    actors.forEach(({group,start})=>{const p=Math.max(0,Math.min(1,(t-start)/.75));group.scale.setScalar(Math.max(.001,1-Math.pow(1-p,3)));});
    clouds.forEach(({group,x},i)=>{group.visible=t>1;group.position.x=x+Math.sin(t*.10+i)*.12;group.scale.setScalar(Math.min(1,Math.max(.001,(t-1)/1.2)));});
    birds.forEach(({group,wings,i})=>{const age=(t-2-i*.17)%13;group.visible=age>=0&&age<7;if(!group.visible)return;group.position.set(-1.5+age*.43,.65+Math.sin(age*.55+i)*.3,.5+Math.sin(age*.8+i)*.12);group.rotation.z=-.1;wings.forEach(({pivot,side})=>pivot.rotation.y=side*Math.sin(age*12)*.65);});
    butterflies.forEach(({group,wings,i})=>{group.visible=t>2;group.position.set(Math.sin(t*.4+i*2)*.83,.25+Math.cos(t*.3+i)*.68,.15+Math.sin(t*.9+i)*.06);wings.forEach(({pivot,side})=>pivot.rotation.y=side*Math.sin(t*19+i)*.8);});
  };
}
