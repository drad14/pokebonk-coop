import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../client/xp.js',import.meta.url),'utf8');
function party(){
  const peers=[],messages=[],sent=[];
  function peer(host,gain=1,key){
    const id=peers.length+1,handlers={},LAN={key:key??(host?'host':'guest'+id),myId:id,hostId:1,isHost:host,
      on:(type,fn)=>(handlers[type]??=[]).push(fn),visiblePuppets:()=>peers.filter(p=>p.id!==id).map(p=>({target:{xpg:p.run.player.stats.xpGain}})),
      send:m=>{const message=structuredClone({...m,from:id,actor:LAN.key});messages.push(message);sent.push(message)}};
    const run={seed:123,stage:1,state:'play',__lan:{sync:true},diff:{xpMult:1},pendingLevels:0,choicesQueued:0,
      queueLevel(){this.pendingLevels++;this.choicesQueued++}};
    const player=run.player={level:1,xp:0,xpNext:10,stats:{xpGain:gain},xpForLevel:()=>10,afterLevel(){},
      addXp(n){this.xp+=n*this.stats.xpGain;while(this.xp>=this.xpNext){this.xp-=this.xpNext;this.level++;run.queueLevel()}},
      grantLevel(){this.level++;this.xpNext=10;this.xp=Math.min(this.xp,9.9);run.queueLevel()}};
    const q=run.pickups={n:0,count:0,free:[],alive:[],kind:[],value:[],x:[],y:[],z:[],attract:[],consume:[],
      spawn(kind,x,y,z,value){const i=this.free.length?this.free.pop():this.n++;this.alive[i]=1;this.kind[i]=kind==='xp'?0:1;this.value[i]=value;this.x[i]=x;this.y[i]=y+.6;this.z[i]=z;this.count++},
      dropXp(x,y,z,value){this.spawn('xp',x,y,z,value)},
      mergePickups(){for(let i=1;i<this.n;i++)if(this.alive[i]&&!this.attract[i]&&this.kind[i]===0){this.value[0]+=this.value[i];this.alive[i]=0;this.free.push(i);this.count--}},
      update(){for(const i of this.consume.splice(0)){if(!this.alive[i])continue;this.alive[i]=0;this.count--;this.free.push(i);if(this.kind[i]===0)player.addXp(this.value[i])}}};
    LAN.run=run;vm.runInNewContext(source,{window:{LAN},console});
    const result={id,run,LAN,handlers};peers.push(result);LAN.xp.install(run);return result;
  }
  function pump(){let limit=1000;while(messages.length){assert.ok(--limit>0,'Network should settle');const m=messages.shift();for(const p of peers)if(p.id!==m.from)for(const fn of p.handlers[m.t]??[])fn(m)}}
  const host=peer(true),guest=peer(false);pump();
  return {host,guest,peer,pump,sent,messages};
}
test('any player collecting one mirrored gem grants XP once and queues the same level-up',()=>{
  const p=party(),h=p.host,g=p.guest;
  h.run.pickups.dropXp(0,0,0,10);g.run.pickups.dropXp(0,0,0,10);
  assert.equal(g.run.pickups.count,0,'Remote kill credit does not duplicate XP gems');
  h.LAN.xp.post(h.run,2);p.pump();assert.equal(g.run.pickups.count,1);
  g.run.pickups.consume.push(0);g.run.pickups.update(.1);p.pump();
  for(const peer of [h,g]){assert.equal(peer.run.player.level,2);assert.equal(peer.run.player.xp,0);assert.equal(peer.run.pendingLevels,1);assert.equal(peer.LAN.xp.info.orbs,0)}
  const claim=p.sent.find(m=>m.t==='xpclaim');p.messages.push(claim);p.pump();
  assert.equal(h.run.player.level,2,'Repeated collection cannot grant XP twice');
});
test('simultaneous pickup, party XP bonuses, direct XP rewards and candy levels stay shared',()=>{
  const p=party(),h=p.host,g=p.guest;g.run.player.stats.xpGain=3;
  h.run.pickups.dropXp(0,0,0,5);h.LAN.xp.post(h.run,2);p.pump();
  h.run.pickups.consume.push(0);g.run.pickups.consume.push(0);h.run.pickups.update(.1);g.run.pickups.update(.1);p.pump();
  assert.equal(h.run.player.level,2);assert.equal(g.run.player.level,2);
  g.run.player.addXp(5);p.pump();assert.equal(h.run.player.level,3);assert.equal(g.run.player.level,3);
  g.run.player.grantLevel();p.pump();assert.equal(h.run.player.level,4);assert.equal(g.run.player.level,4);
  const gains=p.sent.filter(m=>m.t==='xpgain');p.messages.push(...gains);p.pump();
  assert.equal(h.run.player.level,4);assert.equal(g.run.pendingLevels,3);
});
test('late join catches up to the shared bar and stage cleanup does not award uncollected gems',()=>{
  const p=party(),h=p.host;
  h.run.player.addXp(27);p.pump();const late=p.peer(false);p.pump();
  assert.equal(late.run.player.level,3);assert.equal(late.run.player.xp,7);assert.equal(late.run.pendingLevels,2);
  h.run.pickups.dropXp(0,0,0,50);h.LAN.xp.post(h.run,2);p.pump();
  const before=h.run.player.xp;
  for(const peer of [h,p.guest,late]){peer.run.stage=2;peer.LAN.xp.pre(peer.run)}
  p.pump();assert.equal(h.run.player.xp,before);assert.equal(h.LAN.xp.info.orbs,0);
});
test('all eight players share one bar and one pickup, including XP bonuses',()=>{
  const p=party(),all=[p.host,p.guest];
  for(let i=0;i<6;i++)all.push(p.peer(false));p.pump();
  p.host.run.pickups.dropXp(0,0,0,24);p.host.LAN.xp.post(p.host.run,2);p.pump();
  all[7].run.pickups.consume.push(0);all[7].run.pickups.update(.1);p.pump();
  for(const peer of all){assert.equal(peer.run.player.level,3);assert.equal(peer.run.player.xp,4);assert.equal(peer.run.pendingLevels,2)}
});
test('out-of-order XP rewards and rejoining with the same tab key do not lose or duplicate progress',()=>{
  const p=party(),g=p.guest;
  g.run.player.addXp(3);g.run.player.addXp(4);p.messages.reverse();p.pump();
  assert.equal(p.host.run.player.xp,7);
  const rejoined=p.peer(false,1,g.LAN.key);p.pump();
  rejoined.run.player.addXp(2);p.pump();
  assert.equal(p.host.run.player.xp,9);assert.equal(rejoined.run.player.xp,9);
});
test('gem consolidation preserves XP and native merging cannot award it before collection',()=>{
  const p=party(),h=p.host,q=h.run.pickups;
  for(let i=0;i<501;i++)q.dropXp(i,0,0,1);
  assert.equal(h.LAN.xp.info.orbs,500);q.mergePickups();q.update(.1);
  assert.equal(h.run.player.xp,0);assert.equal(q.count,500);
  for(let i=0;i<q.n;i++)if(q.alive[i])q.consume.push(i);q.update(.1);h.LAN.xp.post(h.run,2);p.pump();
  assert.equal(h.run.player.level,51);assert.equal(h.run.player.xp,1);assert.equal(p.guest.run.player.xp,1);
});
