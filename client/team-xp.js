// Shared progression only. Native co-op still owns combat, revives and choices.
(()=>{
 const LAN=window.LAN;
 function install(run){
  if(!run?.coop||run.__teamXP)return;
  const app=window.__pbApp,coop=run.coop,player=run.player,party=coop.party;
  const methods=LAN.game.xpMethods,curve=player[methods.curve]?.bind(player),levelUp=player[methods.level]?.bind(player);
  if(!party||!curve||!levelUp)return;
  const state=run.__teamXP={earned:0,startLevel:player.level,scale:1+.7*(coop.size-1),lastLevel:player.level,total:0,acked:0,baseLevel:player.level,busy:false,stopped:false,lastKey:''};
  player[methods.curve]=level=>Math.max(1,Math.round(curve(level)*state.scale));player.xpNext=player[methods.curve](player.level);
  function project(total){let level=state.baseLevel,xp=total,next=player[methods.curve](level),steps=0;while(xp>=next&&steps++<10000){xp-=next;next=player[methods.curve](++level)}return {level,xp,next}}
  const predicted=()=>project(state.total+Math.max(0,state.earned-state.acked));
  function bonus(count=1){for(let i=0;i<count;i++){const p=predicted();state.earned+=p.next-p.xp}}
  function captureBonus(){if(player.level>state.lastLevel){bonus(player.level-state.lastLevel);state.lastLevel=player.level}}
  player.addXp=value=>{if(Number.isFinite(value)&&value>0)state.earned+=value*Math.max(0,player.stats.xpGain)*Math.max(0,run.diff.xpMult)};
  player[methods.level]=()=>bonus();
  // Nearby fractional sharing is replaced by this common pool.
  coop.shareXp=()=>{};coop.onShare=()=>{};coop.xpAcc=0;
  function apply(value,sent){
   if(state.stopped||run.state==='over')return;
   state.scale=value.scale;state.total=value.total;state.baseLevel=value.baseLevel;state.acked=Math.max(state.acked,sent);captureBonus();
   const key=[value.total,value.baseLevel,value.scale].join(':');if(key===state.lastKey)return;
   const p=project(value.total);if(p.level<player.level)return;
   while(player.level<p.level)levelUp();player.xp=p.xp;player.xpNext=p.next;state.lastLevel=player.level;state.lastKey=key;
   const ring=app.hud?.els?.xp;if(ring){ring.title='Shared team XP · '+state.scale.toFixed(1)+'× XP requirement';ring.setAttribute('aria-label',ring.title)}
  }
  async function flush(){
   if(state.busy)return;state.busy=true;captureBonus();const sent=state.earned;
   try{
    const response=await fetch('/api/coop/xp',{method:'POST',headers:{Authorization:'Bearer '+app.meta.account.token,'Content-Type':'application/json'},body:JSON.stringify({party,earned:sent,startLevel:state.startLevel}),signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('Team XP pending');apply(await response.json(),sent);
   }catch{if(!state.stopped&&Date.now()-(state.warned??0)>15000){state.warned=Date.now();run.ui?.toast('Team XP syncing — earned XP is kept and retried.',null)}}finally{state.busy=false}
  }
  state.flush=flush;
  const timer=setInterval(()=>{if(window.__pbApp?.run!==run||run.state==='over'){state.stopped=true;clearInterval(timer);flush();return}flush()},250);flush();
 }
 LAN.teamXp={install};
})();
