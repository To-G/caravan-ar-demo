export function setupPhoto({ renderer, render, video, ready, switchCamera, audioStream=()=>null }) {
  const tools = document.createElement('div');
  tools.className = 'photo-tools';
  tools.innerHTML = '<button id="take-photo" type="button" aria-label="拍照"><span></span></button><button id="switch-camera" type="button" aria-label="切换到前置摄像头"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M26 12A11 11 0 0 0 6 8L3 12m0-7v7h7M6 20a11 11 0 0 0 20 4l3-4m0 7v-7h-7"/></svg></button>';
  document.body.append(tools);
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-dialog';
  dialog.innerHTML = '<h2>我的魔法集市合照</h2><img alt="相机画面与 AR 合照"><p>可长按图片保存，也可以点击下方按钮。</p><div><button id="save-photo">保存 / 分享</button><button id="close-photo">返回拍摄</button></div>';
  document.body.append(dialog);
  let file, url;
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
      const scale = recording ? Math.min(1,720/innerWidth,1280/innerHeight) : Math.min(devicePixelRatio || 1, 2);
      const w=Math.round(innerWidth*scale),h=Math.round(innerHeight*scale);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      const ctx = canvas.getContext('2d');
      ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);
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
  }
  function startRecording(){
    if(!ready())return;
    suppressClickUntil=Infinity;
    if(!window.MediaRecorder||!HTMLCanvasElement.prototype.captureStream){suppressClickUntil=Date.now()+700;alert('当前浏览器不支持录制，请使用支持视频录制的浏览器。拍照仍可使用。');return;}
    try{
      const canvas=document.createElement('canvas');compose(canvas,true);
      recordingStream=canvas.captureStream(24);
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
        dialog.querySelector('img').hidden=true;preview.hidden=false;preview.src=url;
        dialog.querySelector('h2').textContent='我的魔法集市视频';dialog.querySelector('p').textContent='无声视频 · 可预览后保存或分享';dialog.showModal();
      };
      started=performance.now();flip.disabled=true;shot.classList.add('recording');clock.hidden=false;
      function frame(){
        try{compose(canvas,true);clock.textContent='● '+Math.min(10,(performance.now()-started)/1000).toFixed(1)+' / 10 秒';}
        catch{stopRecording();return;}
        animation=requestAnimationFrame(frame);
      }
      recorder.start(250);frame();stopTimer=setTimeout(stopRecording,10000);
    }catch(error){cleanRecording();suppressClickUntil=Date.now()+700;alert('无法开始录制：'+error.message);}
  }
  shot.style.touchAction='none';shot.setAttribute('aria-label','短按拍照，长按录视频');
  shot.oncontextmenu=e=>e.preventDefault();
  shot.onpointerdown=e=>{if(e.button!==0||shot.disabled)return;shot.setPointerCapture(e.pointerId);holdTimer=setTimeout(startRecording,400);};
  shot.onpointerup=()=>{clearTimeout(holdTimer);stopRecording();};
  shot.onpointercancel=()=>{clearTimeout(holdTimer);stopRecording();};
  shot.onlostpointercapture=()=>{clearTimeout(holdTimer);stopRecording();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(holdTimer);stopRecording();}});
  dialog.addEventListener('close',()=>preview.pause());
  document.getElementById('take-photo').onclick = async event => {
    if(Date.now()<suppressClickUntil)return;
    if (!ready()) return;
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const canvas=document.createElement('canvas');compose(canvas,false);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .94));
      if (!blob) throw new Error('照片生成失败，请重试。');
      file = new File([blob], '魔法集市合照-' + Date.now() + '.jpg', { type: 'image/jpeg' });
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(blob);preview.hidden=true;preview.removeAttribute('src');dialog.querySelector('img').hidden=false;dialog.querySelector('h2').textContent='我的魔法集市合照';dialog.querySelector('p').textContent='可长按图片保存，也可以点击下方按钮。';dialog.querySelector('img').src = url; dialog.showModal();
    } catch (error) { alert(error.message); }
    finally { button.disabled = false; }
  };
  document.getElementById('save-photo').onclick = async () => {
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '我的魔法集市合照' }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    const link = document.createElement('a'); link.href = url; link.download = file.name; link.click();
  };
}
