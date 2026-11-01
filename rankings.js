// Best single completed run per private player; never posts to official ladders.
export const RANK_TITLE='The Gay Boys Rank';
const safe=n=>Number.isFinite(Number(n))?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Number(n))):0;
function clean(record){return {id:String(record.id??''),time:safe(record.time),damage:Math.round(safe(record.damage)),species:Math.trunc(safe(record.finalSpecies??record.species)),date:safe(record.date),biome:String(record.biome??'')}}
function better(a,b,key){return !b||a[key]>b[key]||a[key]===b[key]&&a[key==='time'?'damage':'time']>b[key==='time'?'damage':'time']}
export function bestRuns(account){
 const best={...(account.privateRecords??{})};
 for(const record of Object.values(account.runReceipts??{}).map(x=>x.record).filter(Boolean)){
  const row=clean(record);if(row.time<=0)continue;
  if(better(row,best.survival,'time'))best.survival=row;if(better(row,best.damage,'damage'))best.damage=row;
 }
 return best;
}
export function recordPrivateRun(account,record){const row=clean(record),best=bestRuns(account);if(row.time>0){if(better(row,best.survival,'time'))best.survival=row;if(better(row,best.damage,'damage'))best.damage=row}account.privateRecords=best;return row.time>0}
export function privateRankings(accounts){
 const rows=accounts.map(account=>({id:account.id,name:account.name||'Trainer',best:bestRuns(account)}));
 const board=(field,key)=>rows.filter(x=>x.best[field]?.time>0).map(x=>({id:x.id,name:x.name,...x.best[field],playerId:x.id})).sort((a,b)=>b[key]-a[key]||b[key==='time'?'damage':'time']-a[key==='time'?'damage':'time']||a.name.localeCompare(b.name)||a.playerId.localeCompare(b.playerId)).map((r,i)=>({...r,rank:i+1}));
 return {title:RANK_TITLE,survival:board('survival','time'),damage:board('damage','damage')};
}
