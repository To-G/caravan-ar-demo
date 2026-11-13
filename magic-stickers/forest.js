import * as THREE from 'three';

export function createForest(parent) {
  const environment=new THREE.Group();environment.name='forest-environment';parent.add(environment);
  const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.95});
  const grass=mat(0x62b75d),moss=mat(0xc3e77b),dark=mat(0x167d61),leaf=mat(0x3fa45f),bark=mat(0x946348),cream=mat(0xffdf69);
  const actors=[],birds=[],clouds=[],butterflies=[];
  const sphere=new THREE.IcosahedronGeometry(1,1),trunk=new THREE.CylinderGeometry(.012,.021,.17,5),cone=new THREE.ConeGeometry(1,1,7);
  function mesh(parent,geometry,material,x,y,z,sx=1,sy=sx,sz=sx){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
  const meadow=new THREE.Group();environment.add(meadow);meadow.position.y=.25;
  const base=mesh(meadow,new THREE.CylinderGeometry(1.05,1.09,.055,48),grass,0,0,-.055,1.25,1,1);base.rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){const a=i*Math.PI/6;mesh(meadow,sphere,i%2?grass:moss,Math.cos(a)*1.03,Math.sin(a)*.83,-.025,.23,.17,.075);}
  const water=mat(0x3fcad5),sand=mat(0xffd797),stone=mat(0x9eaa96);
  const creek=new THREE.CatmullRomCurve3([new THREE.Vector3(-.92,.85,.015),new THREE.Vector3(-.67,.55,.015),new THREE.Vector3(-.69,.12,.015),new THREE.Vector3(-.85,-.3,.015),new THREE.Vector3(-.65,-.63,.015)]);
  mesh(environment,new THREE.TubeGeometry(creek,36,.053,6,false),water,0,0,0,1,1,.22);
  const path=new THREE.CatmullRomCurve3([new THREE.Vector3(.4,.28,.006),new THREE.Vector3(.67,.35,.006),new THREE.Vector3(.87,.6,.006),new THREE.Vector3(.93,.95,.006)]);
  mesh(environment,new THREE.TubeGeometry(path,30,.048,5,false),sand,0,0,0,1,1,.12);
  mesh(environment,sphere,water,-.76,-.16,.012,.18,.12,.015);
  for(let i=0;i<7;i++){
    const plank=mesh(environment,new THREE.BoxGeometry(.23,.029,.025),bark,-.69,.04+i*.032,.035);plank.rotation.z=-.12;
  }
  for(let i=0;i<18;i++){
    const a=i*2.4,r=.65+(i%3)*.12;
    mesh(environment,sphere,stone,Math.cos(a)*r,.25+Math.sin(a)*r,.017,.035+(i%3)*.01,.027,.032);
  }
  const flowerColors=[mat(0xff70ac),mat(0xffdf47),mat(0x9f8bf3)];
  for(let i=0;i<14;i++){
    const a=i*2.4,r=.6+(i%3)*.12;
    for(let j=0;j<5;j++)mesh(environment,sphere,flowerColors[i%3],Math.cos(a)*r+Math.cos(j*2.4)*.035,.25+Math.sin(a)*r+Math.sin(j*2.4)*.035,.028,.013,.013,.018);
  }
  for(let i=0;i<25;i++){
    const a=i*2.39996,r=.86+(i%4)*.085;
    const group=new THREE.Group();group.position.set(Math.cos(a)*r*1.12,.25+Math.sin(a)*r,.015);environment.add(group);
    const h=.24+(i%5)*.045;const stem=mesh(group,trunk,bark,0,0,.075);stem.rotation.x=Math.PI/2;
    if(i%3){for(let j=0;j<3;j++){const crown=mesh(group,cone,i%2?leaf:dark,0,0,.14+j*.075,.13-j*.022,.16-j*.012,.13-j*.022);crown.rotation.x=Math.PI/2;}}
    else {mesh(group,sphere,leaf,0,0,h,.14,.115,.16);mesh(group,sphere,moss,.065,-.02,h+.035,.08,.08,.10);}
    actors.push({group,start:.4+i*.045});
    if(i%4===0){for(let j=0;j<3;j++){
      const flower=new THREE.Group();flower.position.set(group.position.x+.1+j*.028,group.position.y-.1,.025);environment.add(flower);
      mesh(flower,sphere,cream,0,0,.03,.02,.02,.012);actors.push({group:flower,start:1+i*.04});
    }}
  }
  // A curved skyline at the far edge keeps the real world visible around it.
  const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=256;
  const ctx=skyCanvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,256);
  gradient.addColorStop(0,'rgba(137,201,211,0)');gradient.addColorStop(.35,'rgba(106,204,240,.55)');gradient.addColorStop(1,'rgba(204,239,217,.78)');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);
  const skyMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(skyCanvas),transparent:true,depthWrite:false,side:THREE.DoubleSide});
  const sky=mesh(environment,new THREE.PlaneGeometry(2.65,.85),skyMat,0,1.28,.42);sky.rotation.x=Math.PI/2;
  for(let i=0;i<7;i++){
    const group=new THREE.Group();group.name='sky-cloud';group.position.set(-1.1+i*.34,.9+Math.sin(i)*.19,.48+(i%3)*.12);environment.add(group);
    for(let j=0;j<4;j++)mesh(group,sphere,new THREE.MeshStandardMaterial({color:0xfff7e4,roughness:1}),j*.06,0,Math.sin(j)*.022,.075,.035,.045);
    clouds.push({group,x:group.position.x});
  }
  const birdMat=new THREE.MeshBasicMaterial({color:0x486c64,side:THREE.DoubleSide});
  for(let i=0;i<6;i++){
    const group=new THREE.Group();environment.add(group);
    const wings=[-1,1].map(side=>{const pivot=new THREE.Group();group.add(pivot);const wing=mesh(pivot,new THREE.PlaneGeometry(.075,.024),birdMat,side*.036,0,0);wing.rotation.z=side*.25;return {pivot,side};});
    birds.push({group,wings,i});
  }
  const wingMats=[mat(0xff9c43),mat(0xff72be),mat(0xffe95c)];
  for(let i=0;i<7;i++){
    const group=new THREE.Group();environment.add(group);
    const wings=[-1,1].map(side=>{const pivot=new THREE.Group();group.add(pivot);mesh(pivot,sphere,wingMats[i%3],side*.018,0,0,.022,.014,.003);return {pivot,side};});
    butterflies.push({group,wings,i});
  }
  return t=>{
    meadow.scale.setScalar(Math.max(.001,1-Math.pow(1-Math.min(1,t/1.3),3)));
    sky.scale.y=Math.max(.001,Math.min(1,t/2));
    actors.forEach(({group,start})=>{const p=Math.max(0,Math.min(1,(t-start)/.75));group.scale.setScalar(Math.max(.001,1-Math.pow(1-p,3)));});
    clouds.forEach(({group,x},i)=>{group.visible=t>1;group.position.x=x+Math.sin(t*.10+i)*.12;group.scale.setScalar(Math.min(1,Math.max(.001,(t-1)/1.2)));});
    birds.forEach(({group,wings,i})=>{const age=(t-2-i*.17)%13;group.visible=age>=0&&age<7;if(!group.visible)return;group.position.set(-1.5+age*.43,.65+Math.sin(age*.55+i)*.3,.5+Math.sin(age*.8+i)*.12);group.rotation.z=-.1;wings.forEach(({pivot,side})=>pivot.rotation.y=side*Math.sin(age*12)*.65);});
    butterflies.forEach(({group,wings,i})=>{group.visible=t>2;group.position.set(Math.sin(t*.4+i*2)*.83,.25+Math.cos(t*.3+i)*.68,.15+Math.sin(t*.9+i)*.06);wings.forEach(({pivot,side})=>pivot.rotation.y=side*Math.sin(t*19+i)*.8);});
  };
}
