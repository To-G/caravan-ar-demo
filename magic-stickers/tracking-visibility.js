// Visibility only: never invent, smooth or extrapolate an SDK pose.
export function createTrackingVisibility({graceMs=150,staleMs=250}={}){
  let seen=false,lastPose=-Infinity,lostAt=null,enabled=true;
  return {
    found(now){seen=true;lastPose=now;lostAt=null;},
    lost(now){if(seen&&lostAt===null)lostAt=now;},
    reset(){seen=false;lastPose=-Infinity;lostAt=null;},
    setEnabled(value){enabled=!!value;},
    tracked(now){return seen&&lostAt===null&&now-lastPose<staleMs;},
    visible(now){return seen&&now-lastPose<staleMs&&(lostAt===null||(enabled&&now-lostAt<graceMs));},
  };
}
