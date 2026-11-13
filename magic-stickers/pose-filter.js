import * as THREE from 'three';

// Read stickers from the original pose; smooth only the displayed scene.
export function createPoseFilter(output) {
  const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  const nextPosition=new THREE.Vector3(),nextRotation=new THREE.Quaternion(),nextScale=new THREE.Vector3();
  let initialized=false,last=0,lastSeen=0,rejected=0;
  output.matrixAutoUpdate=false;
  return (input,now) => {
    if(!input.visible){output.visible=initialized&&now-lastSeen<140;return;}
    input.matrix.decompose(nextPosition,nextRotation,nextScale);
    if(![...nextPosition,...nextRotation,...nextScale].every(Number.isFinite)){output.visible=false;return;}
    const unit=Math.max(Math.abs(nextScale.x),.001);
    const distance=position.distanceTo(nextPosition)/unit;
    const angle=rotation.angleTo(nextRotation);
    if(initialized&&now-lastSeen<250&&(distance>.35||angle>.65)&&rejected++<2)return;
    rejected=0;
    if(!initialized||now-lastSeen>350){position.copy(nextPosition);rotation.copy(nextRotation);scale.copy(nextScale);initialized=true;}
    else {
      const dt=Math.min(Math.max(now-last,1),100);
      const moving=distance>.025||angle>.035;
      const alpha=1-Math.exp(-dt/(moving?38:110));
      if(distance>.0007)position.lerp(nextPosition,alpha);
      if(angle>.0015)rotation.slerp(nextRotation,alpha);
      scale.lerp(nextScale,alpha);
    }
    output.matrix.compose(position,rotation,scale);output.visible=true;last=now;lastSeen=now;
  };
}
