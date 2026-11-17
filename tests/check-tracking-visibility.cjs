const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const {createTrackingVisibility}=await import('data:text/javascript;base64,'+fs.readFileSync('AR贺卡demo/magic-stickers/tracking-visibility.js').toString('base64'));
 const v=createTrackingVisibility();assert.equal(v.visible(0),false);
 v.found(1000);assert.equal(v.tracked(1000),true);v.lost(1030);
 assert.equal(v.tracked(1031),false);assert.equal(v.visible(1179),true);assert.equal(v.visible(1180),false);
 v.found(1200);v.lost(1220);v.lost(1320);assert.equal(v.visible(1370),false,'Repeated loss must not extend hold');
 v.found(1400);v.lost(1420);v.found(1500);assert.equal(v.visible(1510),true);assert.equal(v.tracked(1510),true);
 v.lost(1520);v.setEnabled(false);assert.equal(v.visible(1521),false);v.setEnabled(true);assert.equal(v.visible(1521),true);
 v.reset();assert.equal(v.visible(1522),false,'Camera restart clears last pose immediately');
 v.found(2000);assert.equal(v.visible(2249),true);assert.equal(v.visible(2250),false,'Silent SDK must not leave stale scene');
 console.log('Passed: bounded brief-loss hold, no repeated-loss extension, immediate reacquisition, toggle, restart clear, silent-frame expiry');
})().catch(e=>{console.error(e);process.exitCode=1});
