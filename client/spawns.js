// Rotate spawn origins across native eligible players without increasing the budget.
(()=>{
 const LAN=window.LAN,runs=new WeakMap();
 function center(run,channel='regular'){
  const c=run.coop,slots=c?.targetSlots,points=c?.targets;if(!slots?.length)return run.player.pos;
  const signature=slots.join(',');let state=runs.get(run);
  if(!state||state.signature!==signature){state={signature,order:slots.map((slot,index)=>({slot,index})).sort((a,b)=>a.slot-b.slot),channels:new Map()};runs.set(run,state)}
  let next=state.channels.get(channel)??((c.mySlot??0)%state.order.length);
  for(let i=0;i<state.order.length;i++){const {slot,index}=state.order[next];next=(next+1)%state.order.length;const x=points[index*2],z=points[index*2+1];if(Number.isFinite(x)&&Number.isFinite(z)){state.channels.set(channel,next);return {slot,x,z}}}
  return run.player.pos;
 }
 function safe(run,x,z,radius=14){
  if(!run.coop)return true;if(!Number.isFinite(x)||!Number.isFinite(z))return false;const squared=radius*radius,near=p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&(p.x-x)**2+(p.z-z)**2<squared;
  if(!run.player.dead&&near(run.player.pos))return false;for(const p of run.coop.active())if(near(p))return false;return true;
 }
 LAN.spawns={center,safe};
})();
