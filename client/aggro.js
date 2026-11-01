// Divide each native-owned horde evenly; remote replicas retain their owner's AI.
(()=>{
 const LAN=window.LAN,states=new WeakMap();
 const eligible=(e,i)=>!!e.alive[i]&&e.dying[i]<=0&&!(e.flags[i]&LAN.game.aggroExclude);
 function prepare(e,coop){
  if(!coop)return;const slots=coop.targetSlots,points=coop.targets,now=e.run.realTime;
  let s=states.get(e);if(!s){s={slots:new Int8Array(e.alive.length).fill(-1),gen:new Uint32Array(e.alive.length),indices:new Map(),loads:new Map(),signature:null,next:-1,last:-1};states.set(e,s)}
  const signature=slots.join(',');s.indices=new Map(slots.map((slot,index)=>[slot,index*2]));
  if(signature===s.signature&&now<s.next&&now>=s.last)return;
  s.signature=signature;s.last=now;s.next=now+1;s.loads=new Map(slots.map(slot=>[slot,0]));if(!slots.length)return;
  const live=[];for(let i=0;i<e.n;i++)if(eligible(e,i))live.push(i);
  const ordered=[...slots].sort((a,b)=>a-b),quota=new Map(ordered.map(slot=>[slot,Math.floor(live.length/slots.length)]));
  for(let i=0;i<live.length%slots.length;i++){const slot=ordered[(i+(coop.mySlot??0))%ordered.length];quota.set(slot,quota.get(slot)+1)}
  const distance=(i,slot)=>{const k=s.indices.get(slot);return k===undefined?Infinity:(e.x[i]-points[k])**2+(e.z[i]-points[k+1])**2};
  // Keep the closest existing pursuers first; only redistribute excess/new enemies.
  live.sort((a,b)=>distance(a,s.gen[a]===e.gen[a]?s.slots[a]:-1)-distance(b,s.gen[b]===e.gen[b]?s.slots[b]:-1));
  const pending=[];for(const i of live){const slot=s.gen[i]===e.gen[i]?s.slots[i]:-1;if(s.indices.has(slot)&&s.loads.get(slot)<quota.get(slot))s.loads.set(slot,s.loads.get(slot)+1);else{s.slots[i]=-1;pending.push(i)}}
  for(const i of pending){let best=-1,near=Infinity;for(const slot of ordered)if(s.loads.get(slot)<quota.get(slot)){const d=distance(i,slot);if(best<0||d<near){best=slot;near=d}}if(best>=0){s.slots[i]=best;s.gen[i]=e.gen[i];s.loads.set(best,s.loads.get(best)+1)}}
 }
 function target(e,index,coop){if(!coop||!eligible(e,index))return -1;const s=states.get(e);if(!s||!s.indices.size)return -1;let slot=s.gen[index]===e.gen[index]?s.slots[index]:-1;
  if(!s.indices.has(slot)){let count=Infinity,near=Infinity;slot=-1;for(const [candidate,k]of s.indices){const load=s.loads.get(candidate)??0,d=(e.x[index]-coop.targets[k])**2+(e.z[index]-coop.targets[k+1])**2;if(load<count||load===count&&d<near){slot=candidate;count=load;near=d}}if(slot>=0){s.slots[index]=slot;s.gen[index]=e.gen[index];s.loads.set(slot,(s.loads.get(slot)??0)+1)}}
  return s.indices.get(slot)??-1;
 }
 LAN.aggro={prepare,target};
})();
