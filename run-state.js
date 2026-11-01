export function resizeTeamXp(party,size){
 size=Math.max(1,Math.min(8,size));const old=party.xpSize??party.members.length;if(old===size){party.xpSize=size;return}
 const rows=Object.values(party.teamXp?.members??{}),base=Math.max(1,...rows.map(x=>x.startLevel)),raw=rows.reduce((n,x)=>n+x.earned,0),total=raw+(party.xpOffset??0),curves=party.world?.curves;
 if(total>0&&!curves?.[base])return;
 const before=1+.7*(old-1),after=1+.7*(size-1);let level=base,xp=total,newTotal=0;
 if(total>0){for(let guard=0;guard<10000;guard++){const cost=curves[level];if(!(cost>0))return;const a=Math.max(1,Math.round(cost*before)),b=Math.max(1,Math.round(cost*after));if(xp<a){newTotal+=xp/a*b;break}xp-=a;newTotal+=b;level++}}
 party.xpOffset=newTotal-raw;party.xpSize=size;
}
export function publishRun(party,id,world,room){
 if(!party?.members.includes(id)||!room.members.some(x=>x.id===id&&x.inRun))throw Object.assign(Error('Not in this run'),{status:403});
 if(!world||![world.time,world.realTime,world.stageTime,world.stage,world.level].every(Number.isFinite)||world.stage<1||world.stage>100||world.level<1||world.time<0||JSON.stringify(world).length>250000)throw Object.assign(Error('Invalid run state'),{status:400});
 const live=room.members.filter(x=>x.inRun).sort((a,b)=>a.slot-b.slot),leader=live[0]?.id;
 if(id!==leader&&party.worldBy===leader&&Date.now()-(party.worldAt??0)<4000)return {accepted:false};
 party.world=JSON.parse(JSON.stringify(world));party.worldAt=Date.now();party.worldBy=id;resizeTeamXp(party,live.length);return {accepted:true};
}
export function availableRuns(rooms,parties){return [...rooms.values()].filter(r=>r.joinable!==false&&(r.state==='lobby'||Date.now()-(parties.get(r.party)?.worldAt??0)<10000)).map(r=>{const p=parties.get(r.party);return {code:r.code,host:r.members.find(x=>x.id===r.host)?.name??'Trainer',state:r.state,players:r.members.length,max:r.want??8,biome:r.biome,mode:r.tier===3?'endless':'standard',time:p?.world?.time??0,level:p?.world?.level??1}})}
