export function createSoundscape(){
  let context,master,recordingOutput,enabled=true,started=false,lastBird=-1,lastBell=-1;
  function tone(frequency,delay=0,duration=.22,type='sine',volume=.06){
    if(!context||!enabled||context.state!=='running')return;
    const start=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
    o.type=type;o.frequency.setValueAtTime(frequency,start);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(volume,start+.015);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g).connect(master);o.start(start);o.stop(start+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};return o;
  }
  async function unlock(){
    if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context=new Audio();master=context.createGain();master.gain.value=0;master.connect(context.destination);recordingOutput=context.createMediaStreamDestination();master.connect(recordingOutput);
      const buffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=450;gain.gain.value=.018;source.connect(filter).connect(gain).connect(master);source.start();
    }
    await context.resume();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&master)master.gain.setTargetAtTime(0,context.currentTime,.08);});
  return {
    get unlocked(){return !!context;},
    get stream(){return recordingOutput?.stream;},
    begin(){started=false;lastBird=-1;lastBell=-1;},
    unlock,
    async toggle(){enabled=!enabled;if(enabled)await unlock();if(master&&!enabled)master.gain.setTargetAtTime(0,context.currentTime,.05);return enabled;},
    update(t,visible,fountain){
      if(!context)return;
      const audible=visible&&enabled&&!document.hidden;master.gain.setTargetAtTime(audible?.5:0,context.currentTime,.12);
      if(!audible)return;
      if(!started){started=true;[392,523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,i*.14,.65,'sine',.1));}
      const bird=Math.floor(t/7);if(bird!==lastBird){lastBird=bird;const o=tone(1900,0,.14,'sine',.04);o?.frequency.exponentialRampToValueAtTime(3100,context.currentTime+.1);tone(2500,.19,.13,'sine',.025);}
      const bell=Math.floor(t/4);if(bell!==lastBell){lastBell=bell;tone(fountain?1174:880,0,.7,'sine',.018);if(fountain)tone(1568,.3,.3,'sine',.012);}
    }
  };
}
