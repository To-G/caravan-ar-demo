const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const {openPreferredRear,openCameraDevice,rememberRearCamera}=await import('data:text/javascript;base64,'+fs.readFileSync('AR贺卡demo/magic-stickers/camera-adapter.js').toString('base64'));
 const labels=['camera2 4, facing back','camera2 0, facing back'];
 const device=i=>({deviceId:'d'+i,label:labels[i],kind:'videoinput'});
 function fake(mode){let count=0,stops=0;const requested=[];return {
  requested,get stops(){return stops},enumerateDevices:async()=>[device(0),device(1)],
  getUserMedia:async c=>{const id=c.video.deviceId?.exact;requested.push(id||'default');if(id){count++;if(mode==='busy'&&count===1)throw Object.assign(Error('busy'),{name:'NotReadableError'});if(mode==='fail')throw Error('busy');}
   const actual=mode==='ignored'?'d0':id||'d0';const track={label:labels[Number(actual.slice(1))],getSettings:()=>({deviceId:actual}),stop(){stops++}};return {getVideoTracks:()=>[track],getTracks:()=>[track]};}
 };}
 global.localStorage={getItem:()=>null,setItem(){}};
 const busy=fake('busy');assert.equal((await openPreferredRear(busy,{wait:async()=>{}})).current,'d1');assert.deepEqual(busy.requested,['default','d1','d1']);assert.equal(busy.stops,1);
 const ignored=fake('ignored');await assert.rejects(()=>openPreferredRear(ignored,{wait:async()=>{}}),/浏览器返回了其他镜头/);assert.equal(ignored.stops,4);assert.deepEqual(ignored.requested,['default','d1','d1','d1']);
 const failed=fake('fail');await assert.rejects(()=>openPreferredRear(failed,{wait:async()=>{}}),/未能打开所选镜头/);assert.deepEqual(failed.requested,['default','d1','d1','d1']);
 let value;global.localStorage={setItem:(k,v)=>value=v,getItem:()=>value};rememberRearCamera({label:labels[1],getSettings:()=>({deviceId:'old-id'})});const remembered=fake('ok');assert.equal((await openPreferredRear(remembered,{wait:async()=>{}})).current,'d1');
 // The online origin can hold an old telephoto choice; local-file preferences
 // and origin-scoped device IDs differ. Neither stale nor current IDs may win.
 for(const storedId of ['d0','old-online-id']){
  rememberRearCamera({label:labels[0],getSettings:()=>({deviceId:storedId})});
  const hosted=fake('ok'),capture=await openPreferredRear(hosted,{wait:async()=>{}});
  assert.equal(capture.current,'d1');assert.equal(capture.selection.reason,'calibrated-main');assert.equal(capture.selection.previousLabel,labels[0]);
  assert.equal(JSON.parse(value).label,labels[1]);assert.deepEqual(hosted.requested,['default','d1']);
 }
 // Keep manual calibration available when the browser exposes no known main.
 value=JSON.stringify({id:'old-custom-id',label:'Back lens B'});
 const customDevices=[{kind:'videoinput',deviceId:'a',label:'Back lens A'},{kind:'videoinput',deviceId:'b',label:'Back lens B'}];
 const custom={enumerateDevices:async()=>customDevices,getUserMedia:async c=>{const id=c.video.deviceId?.exact||'a';const track={label:customDevices.find(d=>d.deviceId===id).label,getSettings:()=>({deviceId:id}),stop(){}};return {getVideoTracks:()=>[track],getTracks:()=>[track]};}};
 const customCapture=await openPreferredRear(custom,{wait:async()=>{}});assert.equal(customCapture.current,'b');assert.equal(customCapture.selection.reason,'remembered');
 console.log('Passed: delayed main-camera release, ignored exact ID, no silent telephoto fallback, origin ID changes, stale online telephoto preference overridden, unknown-camera calibration preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
