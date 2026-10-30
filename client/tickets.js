// Native pickup physics/render pools, with server-owned ticket rolls and credits.
(()=>{
 const LAN=window.LAN,app=()=>window.__pbApp;
 let wallet=null,accountId=null,loading=null,lastLoad=0;
 const states=new Set();
 const icon=type=>'<svg viewBox="0 0 28 20" width="24" height="18" aria-hidden="true"><path fill="'+(type==='gold'?'#ffc947':'#c183ff')+'" stroke="'+(type==='gold'?'#9e6600':'#7440b2')+'" stroke-width="2" d="M2 2h24v5a3 3 0 0 0 0 6v5H2v-5a3 3 0 0 0 0-6z"/><path stroke="#fff5" stroke-width="2" stroke-dasharray="2 2" d="M9 3v14"/></svg>';
 async function api(route,body){
  const account=app()?.meta?.account;if(!account)throw Error('Sign in first');
  const r=await fetch('/api'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+account.token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const result=await r.json();if(!r.ok)throw Error(result.error||'Ticket request failed');return result;
 }
 function adopt(value){wallet=value;LAN.menu?.refreshTickets?.();return value}
 async function load(force=false){
  const id=app()?.meta?.account?.id;if(!id)return;
  if(id!==accountId){wallet=null;accountId=id;lastLoad=0}
  if(loading)return loading;if(!force&&Date.now()-lastLoad<5000)return wallet;
  lastLoad=Date.now();loading=api('/gacha').then(adopt).catch(()=>wallet).finally(()=>loading=null);return loading;
 }
 function install(run){
  const runId=app()?.meta?.ticket?.id;if(!runId)return;
  const q=run.pickups,kinds=LAN.game.ticketKinds();
  const state={run,runId,q,kinds,seen:new Set(),events:[],claims:[],byIndex:new Map(),byId:new Set(),busy:false};states.add(state);q.__tickets=state;
  const credit=run.combat.credit.bind(run.combat);run.combat.credit=(i,source,drops)=>{
    const e=run.enemies,key=run.stage+':'+i+':'+e.gen[i];
    const event={key,x:e.x[i],y:e.y[i],z:e.z[i],stage:run.stage};
    const result=credit(i,source,drops);
    if(drops&&!state.seen.has(key)){state.seen.add(key);state.events.push(event)}return result;
  };
  const collect=q.collect.bind(q);q.collect=i=>{
    const ticket=state.byIndex.get(i);if(!ticket)return collect(i);
    state.byIndex.delete(i);if(!q.alive[i])return;
    q.alive[i]=0;q.count--;q.free.push(i);state.claims.push(ticket.id);
    run.audio.coin();run.ui.toast('+1 '+ticket.type+' ticket',null);
  };
  const clear=q.clear.bind(q);q.clear=(...args)=>{state.byIndex.clear();return clear(...args)};
 }
 function spawn(state,drop){
  if(drop.collected||state.byId.has(drop.id)||state.run!==LAN.run||state.run.state==='over')return;
  // A reply from an earlier floor must never place loot in a later floor.
  if(Number(drop.id.split(':')[0])!==state.run.stage)return;
  const q=state.q,index=q.free.length?q.free.at(-1):q.n,before=q.count;
  q.spawn('ticket-'+drop.type,drop.x,drop.y,drop.z,1);
  if(q.count===before)return;state.byIndex.set(index,drop);state.byId.add(drop.id);
 }
 async function flush(state){
  if(state.busy)return;state.busy=true;
  try{
    if(state.claims.length){const ids=state.claims.slice(0,100);const result=await api('/gacha/collect',{runId:state.runId,ids});state.claims.splice(0,ids.length);adopt(result)}
    if(state.events.length){const events=state.events.slice(0,100);const result=await api('/gacha/drops',{runId:state.runId,events:events.map(({stage,...e})=>e)});state.events.splice(0,events.length);for(const drop of result.drops)spawn(state,drop)}
  }catch(error){if(state.run===LAN.run&&Date.now()-(state.errorAt??0)>15000){state.errorAt=Date.now();LAN.toast?.('Ticket save pending — retrying automatically.')}}
  finally{state.busy=false;if(state.run!==LAN.run&&!state.events.length&&!state.claims.length)states.delete(state)}
 }
 function renderPickup(q,i,time){
   const state=q.__tickets,ticket=state?.byIndex.get(i);if(!ticket)return false;
   const color=ticket.type==='gold'?0xffca37:0xbb79ff,y=q.y[i]+.25+Math.sin(time*4+i)*.12;
   // A pixel ticket: two colored blocks, a central white stub and a soft glow.
   for(const offset of [-.22,0,.22])q.pool.push(q.x[i]+offset,y,q.z[i],.48,color,state.kinds.square,0,.4);
   q.pool.push(q.x[i]-.18,y,q.z[i]+.01,.15,0xffffff,state.kinds.square,0,.5);
   q.glow.push(q.x[i],y,q.z[i],1.8,color,state.kinds.soft,0,.3,.35);
   q.shadow(i,.6);return true;
 }
 LAN.tickets={install,renderPickup,load,adopt,icon,get wallet(){return wallet}};
 setInterval(()=>{for(const state of states)flush(state);if(!app()?.run||app().run.state==='over')load()},700);
})();
