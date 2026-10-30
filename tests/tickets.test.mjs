import test from 'node:test';import assert from 'node:assert/strict';import {wallet,pull,gachaView} from '../gacha.js';import {rollDrops,collectDrops} from '../loot.js';
test('legacy tickets migrate to purple; both currencies buy 1/10/100 without double spending',()=>{
 const acc={profile:{},gacha:{tickets:100,pulls:0,recent:[],requests:[]}};assert.equal(wallet(acc).goldTickets,0);wallet(acc).goldTickets=1000;
 const gold=pull(acc,100,'hundred-gold-pull',()=>.1,'gold');assert.equal(gold.results.length,100);assert.equal(wallet(acc).goldTickets,0);assert.equal(wallet(acc).tickets,100);
 assert.equal(acc.profile.stardust,10000);assert.equal(acc.profile.league.length,0);
 assert.deepEqual(pull(acc,100,'hundred-gold-pull',()=>{throw Error('reroll')},'gold'),gold);
 assert.throws(()=>pull(acc,100,'hundred-gold-pull',()=>0,'purple'),/different/);
 pull(acc,100,'hundred-purple-pull',()=>.6,'purple');assert.equal(wallet(acc).tickets,0);assert.equal(acc.profile.stardust,110000);
 assert.throws(()=>pull(acc,1,'cannot-afford-pull',()=>0,'purple'),/Not enough/);
 assert.equal(gachaView(acc).purpleTickets,0);
});
test('dust boundaries and Pokemon outcomes do not accidentally unlock Pokemon',()=>{
 for(const [roll,dust]of [[0,100],[.4999,100],[.5,1000],[.6999,1000],[.7,2000],[.7499,2000]]){const acc={profile:{}};const r=pull(acc,1,'dust-boundary-test',()=>roll);assert.equal(r.results[0].dust,dust);assert.deepEqual(acc.profile.league,[])}
 const acc={profile:{}};let seq=[.75,.999,.5,0];const r=pull(acc,1,'pokemon-boundary-test',()=>seq.shift());assert.equal(r.results[0].kind,'pokemon');assert.equal(r.results[0].rank,'legendary');assert.equal(r.results[0].shiny,true);
});
test('server rolls each KO once and credits only collected drops once',()=>{
 const acc={profile:{},activeRuns:{run1:{}}};let seq=[.0005,.001,.0109,.011];const events=seq.map((_,i)=>({key:'1:'+i+':9',x:i,y:0,z:2}));
 const drops=rollDrops(acc,'run1',events,()=>seq.shift());assert.equal(drops.length,3);assert.deepEqual(drops.map(d=>d.type),['purple','gold','gold']);assert.equal(wallet(acc).tickets,10);
 assert.deepEqual(rollDrops(acc,'run1',events,()=>{throw Error('Must not reroll')}),drops);
 assert.throws(()=>collectDrops(acc,'run1',[drops[0].id,'missing']),/not found/);assert.equal(wallet(acc).tickets,10);
 assert.deepEqual(collectDrops(acc,'run1',drops.map(d=>d.id)),{gold:2,purple:1});assert.equal(wallet(acc).goldTickets,2);assert.equal(wallet(acc).tickets,11);
 assert.deepEqual(collectDrops(acc,'run1',drops.map(d=>d.id)),{gold:0,purple:0});assert.ok(rollDrops(acc,'run1',events).every(d=>d.collected));
 assert.throws(()=>rollDrops(acc,'unknown',events),/Run not found/);assert.throws(()=>collectDrops(acc,'run1',['__proto__']),/not found/);
});
