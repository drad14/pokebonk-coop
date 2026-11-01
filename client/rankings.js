(()=>{
 const LAN=window.LAN;let watching=false;
 function watchSummary(){if(watching)return;watching=true;new MutationObserver(()=>{if(window.__pbApp?.run?.state!=='over')return;for(const note of document.querySelectorAll('.sm-note.warn'))if(note.textContent.includes('Saved to The Gay Boys Rank.')){note.classList.remove('warn');note.classList.add('pb-ranked');const title=note.querySelector('b');if(title)title.textContent='Private record saved';const icon=note.querySelector('img');if(icon)icon.replaceWith(LAN.game.symbol('gold',22))}}).observe(document.body,{childList:true,subtree:true})}
 const duration=n=>{const s=Math.floor(n),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return(h?h+':':'')+String(m).padStart(h?2:1,'0')+':'+String(s%60).padStart(2,'0')};
 const damage=n=>new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:1}).format(n);
 function home(app,c){
  watchSummary();
  const old=c.screen.querySelector('.mm-season');if(!old)return;
  const panel=document.createElement('aside');panel.className='mm-season pb-private-ranks';panel.setAttribute('aria-label','The Gay Boys Rank');
  panel.innerHTML='<div class="mm-sp-head"><div><b>The Gay Boys Rank</b><small>Best completed run per trainer</small></div></div><div class="seg mm-sp-tabs" role="group" aria-label="Ranking type"><button class="pill on" data-rank="survival">Longest run</button><button class="pill" data-rank="damage">Most damage</button></div><div class="pb-rank-body" aria-live="polite"></div><div class="pb-rank-footer"><button class="btn small ghost pb-rank-all" hidden>Show all</button><button class="btn small blue pb-rank-refresh">Refresh</button></div>';
  panel.querySelector('.mm-sp-head').prepend(LAN.game.symbol('gold',28));old.replaceWith(panel);
  let data,metric='survival',all=false,busy=false;
  function render(){
   const body=panel.querySelector('.pb-rank-body');body.replaceChildren();
   const rows=data?.[metric]??[];
   for(const button of panel.querySelectorAll('[data-rank]')){button.classList.toggle('on',button.dataset.rank===metric);button.setAttribute('aria-pressed',String(button.dataset.rank===metric))}
   const more=panel.querySelector('.pb-rank-all');more.hidden=rows.length<=5;more.textContent=all?'Show top 5':'Show all';
   if(!rows.length){const text=document.createElement('p');text.className='pb-rank-empty';text.textContent=data?'No finished runs yet. Finish a run to set your first record.':'Loading records…';body.append(text);return}
   const list=document.createElement('ol');list.className='pb-rank-list';
   for(const row of rows.slice(0,all?undefined:5)){
    const item=document.createElement('li');item.className='pb-rank-row'+(row.playerId===data.me?' me':'');item.dataset.playerId=row.playerId;
    const rank=document.createElement('b');rank.className='pb-rank-place';rank.textContent=row.rank;
    const portrait=row.species?LAN.game.portrait(row.species):LAN.game.icon('poke-ball');portrait.classList.add('pb-rank-portrait');
    const details=document.createElement('span'),name=document.createElement('strong'),sub=document.createElement('small');name.textContent=row.name+(row.playerId===data.me?' · you':'');sub.textContent=metric==='survival'?damage(row.damage)+' damage':duration(row.time)+' survived';details.append(name,sub);
    const value=document.createElement('b');value.className='pb-rank-value';value.textContent=metric==='survival'?duration(row.time):damage(row.damage);value.title=metric==='survival'?row.time+' seconds':new Intl.NumberFormat().format(row.damage)+' damage';item.append(rank,portrait,details,value);list.append(item);
   }body.append(list);
  }
  async function load(){if(busy||!panel.isConnected)return;busy=true;const button=panel.querySelector('.pb-rank-refresh');button.disabled=true;
   try{const response=await fetch('/api/private/rankings',{headers:{Authorization:'Bearer '+app.meta.account.token},cache:'no-store'});if(!response.ok)throw Error('Rankings unavailable');data=await response.json();render()}
   catch{const body=panel.querySelector('.pb-rank-body');body.replaceChildren();const p=document.createElement('p');p.className='pb-rank-empty';p.textContent='Could not load records. Press Refresh to retry.';body.append(p)}finally{busy=false;button.disabled=false}
  }
  for(const button of panel.querySelectorAll('[data-rank]'))button.onclick=()=>{metric=button.dataset.rank;render()};
  panel.querySelector('.pb-rank-all').onclick=()=>{all=!all;render()};panel.querySelector('.pb-rank-refresh').onclick=load;
  render();load();const timer=setInterval(()=>{if(!panel.isConnected){clearInterval(timer);return}load()},30000);
 }
 const css=document.createElement('style');css.textContent='.pb-private-ranks .mm-sp-head b{display:block;font:900 20px var(--font-title);color:#fff}.pb-private-ranks .mm-sp-head small{display:block;font-size:11px;opacity:.9}.pb-private-ranks .mm-sp-tabs{display:flex;margin:12px 14px 10px;gap:5px}.pb-private-ranks .mm-sp-tabs button{flex:1;font-size:12px;padding:7px 8px;white-space:nowrap}.pb-private-ranks .mm-sp-tabs button.on{background:var(--blue);color:#fff;box-shadow:0 2px 0 var(--blue-d)}.pb-rank-body{padding:0 14px;min-height:180px}.pb-rank-empty{color:var(--ink-2);font-size:13px;text-align:center;padding:38px 18px}.pb-rank-list{list-style:none;margin:0;padding:0;max-height:310px;overflow:auto}.pb-rank-row{display:grid;grid-template-columns:20px 34px minmax(0,1fr) auto;align-items:center;gap:7px;padding:10px 7px;border-bottom:1px solid var(--line);font-size:12px}.pb-rank-row.me{background:color-mix(in srgb,var(--blue) 13%,var(--paper));border-radius:12px}.pb-rank-place{color:var(--ink-2);text-align:center}.pb-rank-row:first-child .pb-rank-place{color:var(--gold-t,var(--yellow))}.pb-rank-portrait{width:34px!important;height:34px!important;object-fit:contain;image-rendering:pixelated;border-radius:9px;background:var(--paper-3)}.pb-rank-row strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pb-rank-row small{display:block;color:var(--ink-2);font-size:10px}.pb-rank-value{font:900 15px var(--font-title);color:var(--ink)}.pb-rank-footer{display:flex;justify-content:flex-end;gap:8px;margin:12px 14px 16px}.pb-private-ranks button:focus-visible{outline:3px solid var(--yellow);outline-offset:3px}.pb-private-ranks [hidden]{display:none!important}.sm-note.pb-ranked{border:1px solid var(--green);background:color-mix(in srgb,var(--green) 12%,var(--paper))}';document.head.append(css);
 LAN.rankings={home};
})();
