const fs=require('fs'),http=require('http');
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const html=fs.readFileSync('output/魔法集市-绘本精致版/index.html');
 const server=http.createServer((q,r)=>{r.setHeader('Content-Type','text/html');r.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/?preview`);
  const result=await page.evaluate(async()=>{
   const T=await import('three'),{createTrackingStabilizer}=await import('ar/magic-stickers/tracking-stabilizer.js');
   const output=new T.Group(),input=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),s=new T.Vector3(1,1,1),axis=new T.Vector3(0,0,1);
   const filter=createTrackingStabilizer(output),raw=[],positions=[],angles=[];
   const sample=(id,time,x,a)=>{p.set(x,0,-2);q.setFromAxisAngle(axis,a);input.compose(p,q,s);filter({visible:true,matrix:input,sampleId:id,measuredAt:time},time)};
   for(let i=0;i<120;i++){
    const n=i%2?1:-1;sample(i,i*33,n*.01,n*.08);if(i>40){raw.push(n*.01);positions.push(output.matrix.elements[12]);const r=new T.Quaternion();output.matrix.decompose(p,r,s);angles.push(2*Math.atan2(r.z,r.w));}
   }
   const sd=a=>{const mean=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-mean)**2,0)/a.length)};
   const jitterRatio=sd(positions)/sd(raw),rotationRatio=sd(angles)/.08;
   for(let i=120;i<127;i++)sample(i,i*33,.2,.25);
   const stepPosition=output.matrix.elements[12];
   sample(127,4191,1.2,1.2);
   const before=output.matrix.clone();
   for(let i=0;i<8;i++)filter({visible:true,matrix:input,sampleId:127,measuredAt:4191},4191+i*16);
   const duplicateDrift=before.elements.reduce((m,x,i)=>Math.max(m,Math.abs(x-output.matrix.elements[i])),0);
   filter({visible:false,matrix:input,sampleId:128},4500);const hidesWhenLost=!output.visible;
   sample(129,4700,.3,.2);const reacquired=output.visible;
   return {jitterRatio,rotationRatio,stepPosition,duplicateDrift,hidesWhenLost,reacquired};
  });
  console.log(JSON.stringify(result));
  if(result.jitterRatio>.3||result.rotationRatio>.3||result.stepPosition<.17||result.duplicateDrift!==0||!result.hidesWhenLost||!result.reacquired)throw Error('Tracking regression');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
