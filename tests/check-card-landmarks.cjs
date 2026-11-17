const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const root=path.resolve('AR贺卡demo');
 const svg=fs.readFileSync(path.join(root,'magic-stickers/assets/student-card.svg'),'utf8');
 assert.ok(Buffer.from(svg.match(/image\/png;base64,([^"\s]+)/)[1],'base64').equals(fs.readFileSync(path.join(root,'magic-stickers/assets/card-qr.png'))),'The upright QR must be identical to the printed QR');
 const html=`<base href="/magic-stickers/"><body style="margin:0"><script type="importmap">{"imports":{"three":"/lib/three.module.js"}}</script><script type="module">
 import * as THREE from 'three';import {createCardLandmarks}from '/magic-stickers/card-landmarks.js';
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x18382e);const root=new THREE.Group();scene.add(root);const update=createCardLandmarks(root);
 scene.add(new THREE.HemisphereLight(0xfff4d8,0x425e55,3));const sun=new THREE.DirectionalLight(0xffffff,3);sun.position.set(-2,-3,5);scene.add(sun);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(600,900);document.body.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(33,600/900,.01,10);camera.position.set(0,-2.5,2.7);camera.lookAt(0,-.05,0);
 const card=new THREE.TextureLoader().load('/magic-stickers/assets/student-card.svg');card.colorSpace=THREE.SRGBColorSpace;
 const print=new THREE.Mesh(new THREE.PlaneGeometry(1,1.5),new THREE.MeshBasicMaterial({map:card}));print.position.z=-.002;scene.add(print);
 window.checkStage=t=>{update(t);root.updateMatrixWorld(true);renderer.render(scene,camera);const q=root.getObjectByName('qr-fold-up'),s=root.getObjectByName('market-name-stone'),top=q.localToWorld(new THREE.Vector3(0,.30,0));return {qrVisible:q.visible,angle:q.rotation.x,stoneVisible:s.visible,stoneScale:s.scale.z,qrPosition:q.position.toArray(),stonePosition:s.position.toArray(),top:top.toArray()}};
 THREE.DefaultLoadingManager.onLoad=()=>{window.ready=true;};window.checkStage(0);
 </script>`;
 const server=http.createServer((q,r)=>{const name=decodeURIComponent(new URL(q.url,'http://local').pathname);if(name==='/'){r.setHeader('Content-Type','text/html');r.end(html);return;}const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){r.writeHead(404);r.end();return;}r.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.svg')?'image/svg+xml':'image/png');r.end(fs.readFileSync(file));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{const p=await b.newPage({viewport:{width:600,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(r.status()+' '+r.url());});await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>window.ready);
 const before=await p.evaluate(()=>window.checkStage(0));assert.equal(before.qrVisible,false);assert.equal(before.stoneVisible,false);
 const during=await p.evaluate(()=>window.checkStage(.9));assert.ok(during.angle>0&&during.angle<Math.PI/2);assert.ok(during.stoneScale>0&&during.stoneScale<1);
 const after=await p.evaluate(()=>window.checkStage(2.5));assert.equal(after.angle,Math.PI/2);assert.equal(after.stoneScale,1);assert.ok(Math.abs(after.qrPosition[0]-.295)<1e-6);assert.ok(Math.abs(after.qrPosition[1]+.65)<1e-6);assert.ok(Math.abs(after.top[1]+.65)<1e-6);assert.ok(after.top[2]>.30);assert.ok(after.stonePosition[0]<0);
 assert.deepEqual(await p.evaluate(()=>window.checkStage(8)),after,'Signs stay unfolded after their entrance');assert.deepEqual(errors,[]);
 await p.screenshot({path:'output/魔法集市-8thWall对照版/卡面标识核对.png'});console.log(JSON.stringify({printedQr:'identical',animation:'flat QR to upright; low stone grows from print',after,errors}));
 }finally{await b.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
