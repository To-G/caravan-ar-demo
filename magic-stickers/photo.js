export function setupPhoto({ renderer, render, video, ready, switchCamera, audioStream=()=>null, canvasIncludesCamera=false, onPreviewChange=()=>{}, onRecordingChange=()=>{}, onCaptureMetrics=()=>{} }) {
  const tools = document.createElement('div');
  tools.className = 'photo-tools';
  tools.innerHTML = '<button id="take-photo" type="button" aria-label="拍照"><span></span></button><button id="switch-camera" type="button" aria-label="切换到前置摄像头"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M26 12A11 11 0 0 0 6 8L3 12m0-7v7h7M6 20a11 11 0 0 0 20 4l3-4m0 7v-7h-7"/></svg></button>';
  document.body.append(tools);
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-dialog';
  dialog.innerHTML = '<h2>我的魔法集市合照</h2><img alt="相机画面与 AR 合照"><p>可长按图片保存，也可以点击下方按钮。</p><div><button id="save-photo">保存 / 分享</button><button id="close-photo">返回拍摄</button></div>';
  document.body.append(dialog);
  let file, url;
  const pending=document.createElement('canvas');pending.hidden=true;pending.setAttribute('aria-label','拍摄的照片');pending.style.cssText='display:block;max-width:100%;max-height:65dvh;margin:12px auto;object-fit:contain';dialog.querySelector('img').after(pending);
  const showPreview=()=>{if(!dialog.open)dialog.showModal();onPreviewChange(true);};
  document.getElementById('close-photo').onclick = () => dialog.close();
  document.getElementById('switch-camera').onclick = async event => {
    const button = event.currentTarget;
    button.disabled = true;
    const shot=document.getElementById('take-photo');shot.disabled=true;
    try { button.setAttribute('aria-label',await switchCamera() ? '切换到后置摄像头' : '切换到前置摄像头'); }
    catch (error) { alert(error.message || '切换失败，请检查相机权限后重试。'); }
    finally { button.disabled = false;shot.disabled=false; }
  };
  function compose(canvas,recording){
      const source = video();
      if (!source || source.readyState < 2) throw new Error('相机还未准备好，请稍后再试。');
      const nativeScale=canvasIncludesCamera?Math.min(renderer.domElement.width/innerWidth,renderer.domElement.height/innerHeight):2;
      const scale = recording ? Math.min(1,720/innerWidth,1280/innerHeight) : Math.min(devicePixelRatio || 1,nativeScale,1.5,1600/innerHeight,1200/innerWidth);
      const w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      const ctx = canvas.getContext('2d');
      ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);
      if(canvasIncludesCamera){render();const rect=renderer.domElement.getBoundingClientRect();ctx.drawImage(renderer.domElement,rect.left,rect.top,rect.width,rect.height);return;}
      const rect = source.getBoundingClientRect();
      if (source.dataset.mirrored === 'true') { ctx.save(); ctx.translate(innerWidth, 0); ctx.scale(-1, 1); }
      if (getComputedStyle(source).objectFit === 'cover') {
        const factor=Math.max(rect.width/source.videoWidth,rect.height/source.videoHeight);
        const sw=rect.width/factor,sh=rect.height/factor;
        ctx.drawImage(source,(source.videoWidth-sw)/2,(source.videoHeight-sh)/2,sw,sh,rect.left,rect.top,rect.width,rect.height);
      } else ctx.drawImage(source, rect.left, rect.top, rect.width, rect.height);
      if (source.dataset.mirrored === 'true') ctx.restore();
      render();
      const ar = renderer.domElement.getBoundingClientRect();
      if(renderer.domElement.dataset.mirrored==='true'){ctx.save();ctx.translate(innerWidth,0);ctx.scale(-1,1);}
      ctx.drawImage(renderer.domElement, ar.left, ar.top, ar.width, ar.height);
      if(renderer.domElement.dataset.mirrored==='true')ctx.restore();
  }
  let recorder=null,holdTimer=null,stopTimer=null,animation=0,started=0,suppressClickUntil=0,recordingStream=null;
  const shot=document.getElementById('take-photo'),flip=document.getElementById('switch-camera');
  const clock=document.createElement('div');clock.className='record-clock';clock.hidden=true;tools.append(clock);
  const preview=document.createElement('video');preview.controls=true;preview.playsInline=true;preview.hidden=true;dialog.querySelector('img').after(preview);
  const stopRecording=()=>{if(recorder?.state==='recording')recorder.stop();};
  function cleanRecording(){
    clearTimeout(stopTimer);cancelAnimationFrame(animation);recordingStream?.getTracks().forEach(t=>t.stop());
    flip.disabled=false;shot.disabled=false;shot.classList.remove('recording');clock.hidden=true;recorder=null;
    onRecordingChange(false);
  }
  function startRecording(){
    if(!ready())return;
    suppressClickUntil=Infinity;
    if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){suppressClickUntil=Date.now()+700;alert('当前浏览器不支持录制，请使用支持视频录制的浏览器。拍照仍可使用。');return;}
    try{
      const direct=canvasIncludesCamera&&typeof renderer.domElement.captureStream==='function';
      const canvas=direct?renderer.domElement:document.createElement('canvas');if(!direct)compose(canvas,true);
      recordingStream=canvas.captureStream(direct?30:24);
      onRecordingChange(true,{path:direct?'direct-canvas':'composited-canvas',requestedFrameRate:direct?30:24,width:canvas.width,height:canvas.height});
      audioStream()?.getAudioTracks().forEach(track=>recordingStream.addTrack(track.clone()));
      const mime=['video/mp4;codecs=avc1.42E01E','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
      recorder=new MediaRecorder(recordingStream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:3500000});
      const chunks=[];
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      recorder.onerror=()=>{cleanRecording();suppressClickUntil=Date.now()+700;alert('录制失败，请重新尝试。');};
      recorder.onstop=()=>{
        const type=recorder?.mimeType||mime||'video/webm';cleanRecording();suppressClickUntil=Date.now()+700;
        const blob=new Blob(chunks,{type});if(!blob.size){alert('没有录到视频，请重试。');return;}
        file=new File([blob],'魔法集市视频-'+Date.now()+(type.includes('mp4')?'.mp4':'.webm'),{type});
        if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);
        pending.hidden=true;dialog.querySelector('img').hidden=true;preview.hidden=false;preview.src=url;document.getElementById('save-photo').disabled=false;
        dialog.querySelector('h2').textContent='我的魔法集市视频';dialog.querySelector('p').textContent='视频已生成，可预览后保存或分享。';showPreview();
      };
      started=performance.now();flip.disabled=true;shot.classList.add('recording');clock.hidden=false;
      let lastCopy=-Infinity,lastClock=-Infinity;
      function frame(){
        try{const now=performance.now();if(!direct&&now-lastCopy>=1000/24){compose(canvas,true);lastCopy=now;}if(now-lastClock>200){clock.textContent='● '+Math.min(10,(now-started)/1000).toFixed(1)+' / 10 秒';lastClock=now;}}
        catch{stopRecording();return;}
        animation=requestAnimationFrame(frame);
      }
      recorder.start(250);frame();stopTimer=setTimeout(stopRecording,10000);
    }catch(error){cleanRecording();suppressClickUntil=Date.now()+700;alert('无法开始录制：'+error.message);}
  }
  shot.style.touchAction='none';shot.setAttribute('aria-label','短按拍照，长按录视频');
  const blockNativeGesture=e=>{if(e.cancelable)e.preventDefault();e.stopPropagation();};
  // Some Android browsers start their own long-press gesture unless touchstart
  // is canceled too; contextmenu and CSS alone are insufficient.
  for(const type of ['touchstart','touchmove'])shot.addEventListener(type,blockNativeGesture,{passive:false});
  for(const type of ['contextmenu','selectstart','dragstart'])shot.addEventListener(type,blockNativeGesture);
  let activePointer=null,holdFired=false;
  shot.onpointerdown=e=>{
    blockNativeGesture(e);
    if(e.button!==0||e.isPrimary===false||shot.disabled||activePointer!==null)return;
    activePointer=e.pointerId;holdFired=false;
    try{shot.setPointerCapture(e.pointerId);}catch{}
    holdTimer=setTimeout(()=>{holdFired=true;startRecording();},400);
  };
  function finishPress(e,canceled=false){
    if(activePointer===null||(e.pointerId!==undefined&&e.pointerId!==activePointer))return;
    blockNativeGesture(e);activePointer=null;clearTimeout(holdTimer);
    const wasRecording=!!recorder;
    stopRecording();
    // Dispatch short taps ourselves, since canceling native touch gestures also
    // suppresses click on several mobile browsers. Ignore compatibility clicks.
    if(!wasRecording&&!holdFired&&!canceled){suppressClickUntil=Date.now()+700;takePhoto();}
  }
  shot.onpointerup=e=>finishPress(e);
  shot.onpointercancel=e=>finishPress(e,true);
  shot.onlostpointercapture=e=>finishPress(e,true);
  window.addEventListener('pointerup',e=>finishPress(e));
  window.addEventListener('pointercancel',e=>finishPress(e,true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){activePointer=null;clearTimeout(holdTimer);stopRecording();}});
  dialog.addEventListener('close',()=>{preview.pause();onPreviewChange(false);});
  async function takePhoto(){
    if (!ready()) return;
    const button = shot;
    button.disabled = true;
    const captureStarted=performance.now();
    try {
      compose(pending,false);preview.hidden=true;preview.removeAttribute('src');dialog.querySelector('img').hidden=true;pending.hidden=false;
      const save=document.getElementById('save-photo');save.disabled=true;dialog.querySelector('h2').textContent='我的魔法集市合照';dialog.querySelector('p').textContent='照片已拍下，正在准备保存…';showPreview();
      onCaptureMetrics({phase:'photo-preview',ms:performance.now()-captureStarted,width:pending.width,height:pending.height});
      // Allow the snapshot preview to paint before encoding the downloadable file.
      await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
      const blob = await new Promise(resolve => pending.toBlob(resolve, 'image/jpeg', .88));
      if (!blob) throw new Error('照片生成失败，请重试。');
      file = new File([blob], '魔法集市合照-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);const image=dialog.querySelector('img');image.src=url;await image.decode();pending.hidden=true;image.hidden=false;save.disabled=false;dialog.querySelector('p').textContent='可长按图片保存，也可以点击下方按钮。';
      onCaptureMetrics({phase:'photo-ready',ms:performance.now()-captureStarted,bytes:blob.size});
    } catch (error) { dialog.querySelector('p').textContent='照片生成失败，请返回后重试。';alert(error.message); }
    finally { button.disabled = false; }
  }
  shot.onclick=event=>{blockNativeGesture(event);if(Date.now()>=suppressClickUntil)takePhoto();};
  document.getElementById('save-photo').onclick = async () => {
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: file.type.startsWith('video/')?'我的魔法集市视频':'我的魔法集市合照' }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    const link = document.createElement('a'); link.href = url; link.download = file.name; link.click();
  };
}
