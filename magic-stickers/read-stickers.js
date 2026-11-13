import { card, sticker, slots } from './card-layout.js';

const size=32;
function signature(data){
  const values=new Float32Array(size*size*3);let sum=0,k=0;
  for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++){values[k++]=data[i+c];sum+=data[i+c];}
  const mean=sum/values.length;let norm=0;
  for(let i=0;i<values.length;i++){values[i]-=mean;norm+=values[i]*values[i];}
  norm=Math.sqrt(norm);if(norm<1)return null;
  for(let i=0;i<values.length;i++)values[i]/=norm;
  return values;
}
let templatePromise;
function loadTemplates(){
  return templatePromise??=(async()=>{
    const tile=document.createElement('canvas');tile.width=tile.height=size;
    const ctx=tile.getContext('2d',{willReadFrequently:true});
    const buildings=await Promise.all(['flower','fountain','book'].map(async id=>{
      const image=new Image();image.src = './assets/' + id + '.svg';await image.decode();
      ctx.clearRect(0,0,size,size);ctx.drawImage(image,0,0,size,size);
      return signature(ctx.getImageData(0,0,size,size).data);
    }));
    const image=new Image();image.src = './assets/student-card.svg';await image.decode();
    const empty=slots.map(slot=>{
      ctx.clearRect(0,0,size,size);
      ctx.drawImage(image,(slot.x-sticker.width/2)/card.width*image.naturalWidth,(slot.y-sticker.width/2)/card.height*image.naturalHeight,sticker.width/card.width*image.naturalWidth,sticker.width/card.height*image.naturalHeight,0,0,size,size);
      return signature(ctx.getImageData(0,0,size,size).data);
    });return {buildings,empty};
  })().catch(e=>{templatePromise=null;throw e;});
}
export async function createStickerReader(video,base,projection){
  const {buildings,empty}=await loadTemplates();
  const frame=document.createElement('canvas'),ctx=frame.getContext('2d',{willReadFrequently:true});
  const patch=new Uint8ClampedArray(size*size*4);
  const coordinates=slots.map(slot=>{
    const xy=new Float32Array(size*size*2);let k=0;
    for(let row=0;row<size;row++)for(let col=0;col<size;col++){
      xy[k++]=(slot.x-card.width/2+((col+.5)/size-.5)*sticker.width)/card.width;
      xy[k++]=(card.height/2-slot.y-((row+.5)/size-.5)*sticker.width)/card.width;
    }return xy;
  });
  let last=-Infinity,lastFrame=-1;
  return now=>{
    if(now-last<85||!base.visible||!video.videoWidth||video.currentTime===lastFrame)return null;
    last=now;lastFrame=video.currentTime;
    const ratio=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));
    const width=Math.round(video.videoWidth*ratio),height=Math.round(video.videoHeight*ratio);
    if(frame.width!==width||frame.height!==height){frame.width=width;frame.height=height;}
    ctx.drawImage(video,0,0,width,height);
    const pixels=ctx.getImageData(0,0,width,height).data;
    base.group.updateWorldMatrix(true,false);const m=base.group.matrixWorld.elements;
    const confidence=[];
    const result=slots.map((slot,slotIndex)=>{
      const xy=coordinates[slotIndex];
      for(let k=0;k<xy.length;k+=2){
        const x=xy[k],y=xy[k+1],px=m[0]*x+m[4]*y+m[12],py=m[1]*x+m[5]*y+m[13],pz=m[2]*x+m[6]*y+m[14];
        if(pz>=-.001)return undefined;
        const u=(projection[0][0]*px/-pz+projection[0][2])*width/video.videoWidth;
        const v=(projection[1][1]*-py/-pz+projection[1][2])*height/video.videoHeight;
        const ux=Math.floor(u),vy=Math.floor(v);
        if(ux<0||vy<0||ux+1>=width||vy+1>=height)return undefined;
        const fx=u-ux,fy=v-vy,src=(vy*width+ux)*4,dest=k*2;
        for(let c=0;c<3;c++)patch[dest+c]=(pixels[src+c]*(1-fx)+pixels[src+4+c]*fx)*(1-fy)+(pixels[src+width*4+c]*(1-fx)+pixels[src+(width+1)*4+c]*fx)*fy;
        patch[dest+3]=255;
      }
      const input=signature(patch);if(!input)return undefined;
      const scores=[...buildings,empty[slotIndex]].map((template,type)=>{
        let score=0;if(template)for(let i=0;i<input.length;i++)score+=template[i]*input[i];
        return {type,score};
      }).sort((a,b)=>b.score-a.score);
      const best=scores[0],gap=best.score-scores[1].score;
      confidence[slotIndex]=best.score>.8&&gap>.16?'high':'normal';
      if(best.score<.64||gap<.10)return undefined;
      return best.type===3?null:best.type;
    });
    result.confidence=confidence;return result;
  };
}
