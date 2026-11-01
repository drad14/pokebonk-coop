// Monotonic cumulative contributions: retries and out-of-order requests are safe.
export function teamXp(party,id,body){
 if(!party?.members.includes(id))throw Object.assign(Error('You are not part of this run'),{status:403});
 const number=(v,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
 if(!number(body.earned,1e12)||!number(body.startLevel,10000)||body.startLevel<1)throw Object.assign(Error('Invalid team XP contribution'),{status:400});
 const state=party.teamXp??={members:{}};const old=state.members[id]??={earned:0,startLevel:1};
 state.members[id]={earned:Math.max(old.earned,body.earned),startLevel:Math.max(old.startLevel,Math.trunc(body.startLevel))};
 const values=Object.values(state.members);
 return {total:values.reduce((n,x)=>n+x.earned,0)+(party.xpOffset??0),baseLevel:Math.max(1,...values.map(x=>x.startLevel)),scale:1+.7*((party.xpSize??party.members.length)-1),size:party.xpSize??party.members.length};
}
