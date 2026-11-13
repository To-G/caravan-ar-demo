export async function openPreferredRear(media) {
  let stream=await media.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},resizeMode:{ideal:'none'}}});
  const active=()=>stream.getVideoTracks()[0].getSettings().deviceId||'';
  const devices=(await media.enumerateDevices()).filter(d=>d.kind==='videoinput');
  // Camera 0 was calibrated as the main camera on Find X9 and Xiaomi 15 Pro.
  // Other devices keep the browser default unless an explicit main lens exists.
  const rear=devices.filter(d=>!/front|facetime|selfie|前置|前摄|自拍/i.test(d.label));
  const main=rear.find(d=>/^camera2\s+0(?:\s*,|\s*$)/i.test(d.label))||rear.find(d=>/main|primary|主摄/i.test(d.label)&&!/tele|ultra|macro|长焦|超广角|微距/i.test(d.label));
  if(main&&main.deviceId!==active()){
    const original=active();stream.getTracks().forEach(t=>t.stop());
    try{stream=await media.getUserMedia({audio:false,video:{deviceId:{exact:main.deviceId},resizeMode:{ideal:'none'}}});}
    catch{stream=await media.getUserMedia({audio:false,video:original?{deviceId:{exact:original}}:{facingMode:{ideal:'environment'}}});}
  }
  return {stream,current:active()};
}

export function installCameraAdapter(mindar, initialStream) {
  let first=initialStream;
  const panel=document.createElement('div');
  panel.style.cssText='position:fixed;left:10px;right:10px;top:110px;z-index:4;background:#211a30dd;padding:9px;border-radius:10px;font-size:12px';
  const text=document.createElement('span'),focus=document.createElement('button');
  focus.textContent='重新对焦';focus.style.marginLeft='10px';panel.append(text,focus);document.body.append(panel);
  const info=()=>{
    const t=mindar.video?.srcObject?.getVideoTracks()[0],s=t?.getSettings()||{};
    text.textContent=`${t?.label||''} · ${s.width}×${s.height}`;
  };
  focus.onclick=async()=>{
    const t=mindar.video?.srcObject?.getVideoTracks()[0],modes=t?.getCapabilities?.().focusMode||[];
    focus.disabled=true;
    try{
      if(modes.includes('single-shot'))await t.applyConstraints({advanced:[{focusMode:'single-shot'}]});
      else if(modes.includes('continuous'))await t.applyConstraints({advanced:[{focusMode:'continuous'}]});
      else throw new Error('此浏览器未开放对焦控制');
      info();
    }catch(e){alert(e.message);}finally{focus.disabled=false;}
  };
  mindar._startVideo=async()=>{
    const video=document.createElement('video');video.autoplay=true;video.muted=true;video.playsInline=true;
    Object.assign(video.style,{position:'absolute',top:'0px',left:'0px',zIndex:'-2'});
    mindar.video=video;mindar.container.append(video);
    let stream=first;first=null;
    if(!stream){
      const id=mindar.shouldFaceUser?mindar.userDeviceId:mindar.environmentDeviceId;
      const videoConstraints=id?{deviceId:{exact:id}}:{facingMode:{ideal:mindar.shouldFaceUser?'user':'environment'}};
      stream=await navigator.mediaDevices.getUserMedia({audio:false,video:videoConstraints});
    }
    try{
      const loaded=new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=reject;});
      video.srcObject=stream;await loaded;await video.play();
      video.width=video.videoWidth;video.height=video.videoHeight;info();
    }catch(e){stream.getTracks().forEach(t=>t.stop());video.remove();throw e;}
  };
  const original=mindar.resize.bind(mindar);
  mindar.resize=()=>{
    original();const v=mindar.video,w=mindar.container.clientWidth,h=mindar.container.clientHeight;
    if(!v?.videoWidth||!h)return;
    const cover=Math.max(w/v.videoWidth,h/v.videoHeight),fit=Math.min(w/v.videoWidth,h/v.videoHeight);
    mindar.camera.fov=2*Math.atan(Math.tan(mindar.camera.fov*Math.PI/360)*cover/fit)*180/Math.PI;
    mindar.camera.updateProjectionMatrix();
    Object.assign(v.style,{width:v.videoWidth*fit+'px',height:v.videoHeight*fit+'px',left:(w-v.videoWidth*fit)/2+'px',top:(h-v.videoHeight*fit)/2+'px'});
  };
  addEventListener('resize',()=>mindar.resize());
}
