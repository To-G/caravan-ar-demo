const cameraPreferenceKey='magic-market-rear-camera-v2';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const rearLabel=label=>!/front|facetime|selfie|前置|前摄|自拍/i.test(label||'');
const cameraNumber=label=>/camera2\s+(\d+)(?:\s*,|\s*$)/i.exec(label||'')?.[1];
export function rememberRearCamera(track){
  if(!track||!rearLabel(track.label))return;
  try{localStorage.setItem(cameraPreferenceKey,JSON.stringify({id:track.getSettings().deviceId,label:track.label}));}catch{}
}
export async function openCameraDevice(media,device,{wait=pause}={}){
  let failure;
  for(let attempt=0;attempt<3;attempt++){
    if(attempt)await wait(attempt===1?250:600);
    let stream;
    try{
      stream=await media.getUserMedia({audio:false,video:{deviceId:{exact:device.deviceId},resizeMode:{ideal:'none'}}});
      const track=stream.getVideoTracks()[0],actual=track.getSettings().deviceId;
      const wantedNumber=cameraNumber(device.label),actualNumber=cameraNumber(track.label);
      if((actual&&actual!==device.deviceId)||(wantedNumber!==undefined&&actualNumber!==undefined&&wantedNumber!==actualNumber))throw new Error('浏览器返回了其他镜头');
      if(!actual&&!track.label)throw new Error('浏览器未提供实际镜头信息');
      return stream;
    }catch(error){stream?.getTracks().forEach(t=>t.stop());failure=error;if(error.name==='NotAllowedError'||error.name==='SecurityError')break;}
  }
  throw new Error(`未能打开所选镜头${device.label?'（'+device.label+'）':''}，请重试。${failure?.message||''}`);
}
export async function openPreferredRear(media,{wait=pause}={}) {
  let stream=await media.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},resizeMode:{ideal:'none'}}});
  const active=()=>stream.getVideoTracks()[0].getSettings().deviceId||'';
  let devices;
  try{devices=(await media.enumerateDevices()).filter(d=>d.kind==='videoinput');
    if(devices.length&&!devices.some(d=>d.label)){await wait(250);devices=(await media.enumerateDevices()).filter(d=>d.kind==='videoinput');}
  }
  catch(error){stream.getTracks().forEach(t=>t.stop());throw error;}
  // Camera 0 was calibrated as the main camera on Find X9 and Xiaomi 15 Pro.
  // Other devices keep the browser default unless an explicit main lens exists.
  const rear=devices.filter(d=>rearLabel(d.label));
  let saved;try{saved=JSON.parse(localStorage.getItem(cameraPreferenceKey));}catch{}
  const remembered=saved&&(rear.find(d=>d.deviceId===saved.id&&(!saved.label||d.label===saved.label))||rear.find(d=>saved.label&&d.label===saved.label));
  // A hosted origin may retain an old telephoto choice even when a local file
  // opens the main camera correctly. A known main lens takes startup priority.
  const calibrated=rear.find(d=>/^camera2\s+0(?:\s*,|\s*$)/i.test(d.label));
  const namedMain=rear.find(d=>/main|primary|主摄/i.test(d.label)&&!/tele|ultra|macro|长焦|超广角|微距/i.test(d.label));
  const main=calibrated||namedMain||remembered;
  if(main&&main.deviceId!==active()){
    stream.getTracks().forEach(t=>t.stop());
    stream=await openCameraDevice(media,main,{wait});
  }
  if(main)rememberRearCamera(stream.getVideoTracks()[0]);
  return {stream,current:active(),selection:{reason:calibrated?'calibrated-main':namedMain?'named-main':remembered?'remembered':'browser-default',preferredLabel:main?.label||null,previousLabel:saved?.label||null,availableLabels:devices.map(d=>d.label)}};
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
      if(id){
        const devices=await navigator.mediaDevices.enumerateDevices();
        const device=devices.find(d=>d.kind==='videoinput'&&d.deviceId===id)||{deviceId:id,label:''};
        stream=await openCameraDevice(navigator.mediaDevices,device);
      }else stream=await navigator.mediaDevices.getUserMedia({audio:false,video:videoConstraints});
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
