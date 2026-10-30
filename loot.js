// Server-issued personal ground loot. Both roll and collection retries are idempotent.
import crypto from 'node:crypto';
import {wallet} from './gacha.js';
const rng=()=>crypto.randomInt(0,1000000)/1000000;
const fail=(message,status=400)=>Object.assign(Error(message),{status});
export function lootRun(acc,id){
  if(typeof id!=='string'||(!acc.activeRuns?.[id]&&!acc.runReceipts?.[id]))throw fail('Run not found',404);
  acc.lootRuns??={};
  if(!acc.lootRuns[id]){acc.lootRuns[id]={events:{},drops:{}};const keys=Object.keys(acc.lootRuns);if(keys.length>12)delete acc.lootRuns[keys[0]]}
  return acc.lootRuns[id];
}
export function rollDrops(acc,id,events,random=rng){
  if(!Array.isArray(events)||events.length>100)throw fail('Send at most 100 KO events');
  const run=lootRun(acc,id),drops=[];run.count??=Object.keys(run.events).length;
  for(const event of events){
    if(!event||typeof event.key!=='string'||!/^\d+:\d+:\d+$/.test(event.key)||event.key.length>60||![event.x,event.y,event.z].every(n=>Number.isFinite(n)&&Math.abs(n)<1e6))throw fail('Invalid KO event');
    if(!Object.hasOwn(run.events,event.key)){
      if(run.count>=50000)throw fail('Run KO limit reached',409);
      run.count++;const n=random(),type=n<.001?'purple':n<.011?'gold':null;
      run.events[event.key]=type?{id:event.key,type,x:event.x,y:event.y,z:event.z}:null;
      if(type)run.drops[event.key]={type,collected:false};
    }
    if(run.events[event.key])drops.push({...run.events[event.key],collected:run.drops[event.key].collected});
  }
  return drops;
}
export function collectDrops(acc,id,ids){
  if(!Array.isArray(ids)||ids.length>100)throw fail('Send at most 100 pickups');
  const run=lootRun(acc,id),state=wallet(acc);let gold=0,purple=0;
  for(const key of ids)if(typeof key!=='string'||!Object.hasOwn(run.drops,key))throw fail('Ticket pickup not found',404);
  for(const key of new Set(ids)){const drop=run.drops[key];if(drop.collected)continue;drop.collected=true;if(drop.type==='gold')gold++;else purple++}
  state.goldTickets+=gold;state.tickets+=purple;return {gold,purple};
}
