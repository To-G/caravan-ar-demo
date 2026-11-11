import * as THREE from 'three';
import { createMarket, lightMarket, stickers } from './market.js';
import { buildTown } from './town.js';
import { openCardCamera, savedCamera, saveCamera, stopStream } from '../camera.js';

const $ = id => document.getElementById(id);
const stage = $('stage');
const params = new URLSearchParams(location.search);
const worldPoint = new THREE.Vector3();
const targetPoint = new THREE.Vector3();

function drawActors(actors, now) {
  const book = actors[2], water = actors[1];
  if (book.group.visible && water.group.visible) {
    water.group.getWorldPosition(worldPoint);
    book.group.worldToLocal(targetPoint.copy(worldPoint));
    if (book.destination) book.destination.lerp(targetPoint, 0.18);
    else book.destination = targetPoint.clone();
  }
  for (const actor of actors) {
    if (actor.group.visible) actor.market.update((now - actor.started) / 1000, book.destination);
  }
}

function createActors(scene) {
  return stickers.map(definition => {
    const market = createMarket(definition);
    const group = new THREE.Group();
    group.add(market.group);
    scene.add(group);
    return { definition, market, group, started: null };
  });
}

async function showPreview() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.classList.add('orbit');
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '拖动或用方向键绕看集市');
  stage.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x24232a);
  lightMarket(scene, true);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 25);
  camera.up.set(0, 0, 1);
  buildTown(scene);
  const actors = createActors(scene);
  [[-1.17, -0.29, 0.15], [0.04, -0.32, 0], [0.99, 0.45, -0.15]].forEach(([x, y, turn], i) => {
    const actor = actors[i];
    actor.group.position.set(x, y, 0);
    actor.group.rotation.z = turn;
  });
  scene.traverse(object => {
    if (object.isMesh && !object.material.transparent) {
      object.castShadow = !object.userData.floor && object.material.isMeshStandardMaterial;
      object.receiveShadow = object.material.isMeshStandardMaterial;
    }
  });
  $('controls').hidden = false;
  $('status').textContent = '拖动画面，从盒沿看进微缩小镇';
  const replay = () => {
    const now = performance.now();
    actors.forEach(actor => { actor.started = now; });
  };
  $('replay').onclick = replay;
  replay();

  let yaw = -1.84, elevation = 0.60, pointer = null;
  const turn = (x, y) => {
    yaw -= x * 0.008;
    elevation = Math.max(0.18, Math.min(1.43, elevation + y * 0.008));
  };
  canvas.onpointerdown = e => {
    if (pointer !== null || e.button !== 0) return;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove = e => {
    if (e.pointerId !== pointer?.id) return;
    turn(e.clientX - pointer.x, e.clientY - pointer.y);
    pointer.x = e.clientX; pointer.y = e.clientY;
  };
  canvas.onlostpointercapture = () => { pointer = null; };
  canvas.onkeydown = event => {
    const move = { ArrowLeft: [-25, 0], ArrowRight: [25, 0], ArrowUp: [0, 25], ArrowDown: [0, -25] }[event.key];
    if (move) { event.preventDefault(); turn(...move); }
  };
  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  renderer.setAnimationLoop(() => {
    const distance = Math.max(7.05, 7.8 / camera.aspect);
    const radius = distance * Math.cos(elevation);
    camera.position.set(Math.cos(yaw) * radius, Math.sin(yaw) * radius, distance * Math.sin(elevation));
    camera.lookAt(0, 0, 0.21);
    drawActors(actors, performance.now());
    renderer.render(scene, camera);
  });
}

async function startScan() {
  const start = $('start'), status = $('status');
  start.disabled = true;
  start.textContent = '正在打开相机…';
  let cameraInfo, mindar, timeout;
  const abort = new AbortController();
  try {
    const { MindARThree } = await import('../lib/mindar-image-three.prod.js');
    class StickerMindAR extends MindARThree {
      async _startVideo() {
        cameraInfo = await openCardCamera(navigator.mediaDevices, savedCamera(), abort.signal);
        const video = this.video = document.createElement('video');
        video.autoplay = video.muted = video.playsInline = true;
        Object.assign(video.style, { position: 'absolute', top: '0', left: '0', zIndex: '-2' });
        stage.appendChild(video);
        await new Promise((resolve, reject) => {
          video.addEventListener('loadedmetadata', () => {
            if (abort.signal.aborted) return reject(new Error('Camera start cancelled'));
            video.width = video.videoWidth; video.height = video.videoHeight;
            resolve();
          }, { once: true });
          video.addEventListener('error', reject, { once: true });
          video.srcObject = cameraInfo.stream;
        });
      }
    }
    mindar = new StickerMindAR({
      container: stage, imageTargetSrc: './assets/stickers.mind', maxTrack: stickers.length,
      uiLoading: 'no', uiScanning: 'no', uiError: 'no', warmupTolerance: 4, missTolerance: 9,
      filterMinCF: 0.0025, filterBeta: 0.25,
    });
    const { scene, renderer, camera } = mindar;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
    lightMarket(scene);
    const actors = createActors(scene);
    function syncStatus() {
      const found = actors.filter(actor => actor.group.visible).map(actor => actor.definition.label);
      status.textContent = found.length ? '已召唤 · ' + found.join('、') : '把一张或多张贴纸放进镜头';
      $('replay').disabled = !found.length;
    }
    actors.forEach((actor, index) => {
      const anchor = mindar.addAnchor(index);
      anchor.group.add(actor.market.group);
      scene.remove(actor.group);
      actor.group = anchor.group;
      let paused = null;
      anchor.onTargetFound = () => {
        const now = performance.now();
        if (actor.started === null) actor.started = now;
        else if (paused !== null) actor.started += now - paused;
        paused = null;
        syncStatus();
      };
      anchor.onTargetLost = () => { paused = performance.now(); syncStatus(); };
    });
    await Promise.race([mindar.start(), new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Camera start timeout')), 16000);
    })]);
    document.body.classList.add('ar');
    $('welcome').hidden = true;
    $('controls').hidden = false;
    syncStatus();
    $('replay').onclick = () => {
      const now = performance.now();
      for (const actor of actors) if (actor.group.visible) actor.started = now;
    };
    if (cameraInfo.devices.length > 1) {
      const select = $('camera-choice');
      select.add(new Option('自动', ''));
      cameraInfo.devices.forEach(({ label, deviceId }, index) => select.add(new Option(label || '摄像头 ' + (index + 1), deviceId)));
      select.value = cameraInfo.current;
      select.onchange = () => {
        if (saveCamera(select.value)) {
          stopStream(cameraInfo.stream);
          location.reload();
        }
      };
      $('camera-picker').hidden = false;
    }
    renderer.setAnimationLoop(() => {
      drawActors(actors, performance.now());
      renderer.render(scene, camera);
    });
  } catch (error) {
    abort.abort();
    stopStream(cameraInfo?.stream);
    try { mindar?.stop(); } catch {}
    stage.replaceChildren();
    start.textContent = '再试一次';
    start.disabled = false;
    $('welcome').querySelector('p').textContent = '相机暂时打不开。请允许相机权限，或用手机浏览器打开；也可以先看 3D 预览。';
    console.error(error);
  } finally {
    clearTimeout(timeout);
  }
}

if (params.has('preview')) {
  showPreview();
} else {
  $('welcome').hidden = false;
  $('start').onclick = startScan;
}

