import * as THREE from 'three';

// Confirm poses on tracker samples, never on display refreshes.
export function createTrackingStabilizer(output){
  const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  const rawP=new THREE.Vector3(),rawQ=new THREE.Quaternion(),rawS=new THREE.Vector3();
  const previousP=new THREE.Vector3(),previousQ=new THREE.Quaternion(),step=new THREE.Vector3(),lastStep=new THREE.Vector3();
  const angularStep=new THREE.Vector3(),lastAngularStep=new THREE.Vector3(),deltaQ=new THREE.Quaternion();
  const candidateP=new THREE.Vector3(),candidateQ=new THREE.Quaternion();
  let initialized=false,lastId=-1,lastSeen=-Infinity,lastSample=0,pending=false,pendingId=-1;
  output.matrixAutoUpdate=false;
  const aligned=(a,b)=>a.lengthSq()>1e-9&&b.lengthSq()>1e-9&&a.dot(b)>.65*Math.sqrt(a.lengthSq()*b.lengthSq());
  return (input,now)=>{
    if(!input.visible||now-(input.measuredAt??now)>180){output.visible=initialized&&now-lastSeen<95;return;}
    if(input.sampleId===lastId){output.visible=initialized&&now-lastSeen<180;return;}
    lastId=input.sampleId;
    input.matrix.decompose(rawP,rawQ,rawS);
    if(![...rawP,...rawQ,...rawS].every(Number.isFinite)||Math.min(rawS.x,rawS.y,rawS.z)<=0){output.visible=false;return;}
    const unit=Math.max(Math.abs(rawS.x),.001),distance=position.distanceTo(rawP)/unit,angle=rotation.angleTo(rawQ);
    if(initialized&&now-lastSeen<350&&(distance>.24||angle>.42)){
      const agrees=pending&&pendingId!==input.sampleId&&candidateP.distanceTo(rawP)/unit<.045&&candidateQ.angleTo(rawQ)<.075;
      if(!agrees){candidateP.copy(rawP);candidateQ.copy(rawQ);pending=true;pendingId=input.sampleId;output.visible=now-lastSeen<95;return;}
    }
    pending=false;
    if(!initialized||now-lastSeen>350){
      position.copy(rawP);rotation.copy(rawQ);scale.copy(rawS);lastStep.set(0,0,0);lastAngularStep.set(0,0,0);initialized=true;
    }else{
      const dt=THREE.MathUtils.clamp(now-lastSample,8,160);
      step.copy(rawP).sub(previousP).divideScalar(unit);
      deltaQ.copy(previousQ).invert().multiply(rawQ);if(deltaQ.w<0)deltaQ.set(-deltaQ.x,-deltaQ.y,-deltaQ.z,-deltaQ.w);
      angularStep.set(deltaQ.x,deltaQ.y,deltaQ.z).multiplyScalar(2);
      const movingPosition=distance>.012&&(aligned(step,lastStep)||(step.length()<.004&&distance>.035));
      const movingRotation=angle>.018&&(aligned(angularStep,lastAngularStep)||(angularStep.length()<.008&&angle>.06));
      if(distance>.0012)position.lerp(rawP,1-Math.exp(-dt/(movingPosition?32:155)));
      if(angle>.0025)rotation.slerp(rawQ,1-Math.exp(-dt/(movingRotation?38:190)));
      if(scale.distanceTo(rawS)/unit>.002)scale.lerp(rawS,1-Math.exp(-dt/160));
      lastStep.copy(step);lastAngularStep.copy(angularStep);
    }
    previousP.copy(rawP);previousQ.copy(rawQ);lastSample=now;lastSeen=now;
    output.matrix.compose(position,rotation,scale);output.visible=true;
  };
}
