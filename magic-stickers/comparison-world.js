import * as THREE from 'three';
import { createStorybook, dressMarket } from './storybook.js';
import { createForest } from './forest.js';
import { createMarket, lightMarket, stickers } from './market.js';
import { card, slots } from './card-layout.js';
import {createCardLandmarks} from './card-landmarks.js';
export function createComparisonWorld(parent,layout,sound) {
  const villageUpdate=createStorybook(parent);
  const natureUpdate=createForest(parent);
  const landmarkUpdate=createCardLandmarks(parent);
  const actors=slots.map((slot,i)=>stickers.map((definition,type)=>{
    const actor=createMarket(definition);
    dressMarket(actor,definition.id);
    actor.group.position.set((slot.x-card.width/2)/card.width,(card.height/2-slot.y)/card.width,.012);
    actor.group.scale.setScalar(.265);
    actor.group.visible=false;parent.add(actor.group);
    return {...actor,type,started:null};
  }));
  lightMarket(parent);
  let elapsed=0,lastTick=null;
  sound.begin();
  const fades=new Map();
  parent.traverse(object=>{
    for(const material of (Array.isArray(object.material)?object.material:[object.material])){
      if(!material||fades.has(material))continue;
      fades.set(material,{opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});
      material.transparent=true;material.opacity=0;material.depthWrite=false;
    }
  });
  parent.scale.setScalar(1);
  let revealed=false;
  return now=>{
    if(!parent.parent.visible){lastTick=null;sound.update(0,false,false);return;}
    if(lastTick!==null)elapsed+=Math.min(66,Math.max(0,now-lastTick));lastTick=now;
    const t=elapsed/1000,p=Math.min(1,t/1.1),ease=1-Math.pow(1-p,3);
    parent.scale.setScalar(1);
    if(!revealed){
      fades.forEach((original,material)=>{material.opacity=original.opacity*ease;if(p===1){material.transparent=original.transparent;material.depthWrite=original.depthWrite;material.needsUpdate=true;}});
      revealed=p===1;
    }
    villageUpdate(t);
    actors.forEach((choices,i)=>choices.forEach(actor=>{
      actor.group.visible=layout[i]===actor.type;
      if(!actor.group.visible)return;
      actor.started??=t;
      const age=Math.max(0,t-actor.started),p=Math.min(1,age/1.3);
      actor.group.scale.setScalar(.265*(.82+.18*(1-(1-p)**3)));
      actor.update(age);
    }));
    natureUpdate(t);
    landmarkUpdate(t);
    sound.update(t,parent.parent.visible,layout.includes(1));
  };
}
