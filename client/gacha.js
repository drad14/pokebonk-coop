// Private collection pulls. The server owns ticket spending and the RNG.
(()=>{
  const LAN=window.LAN;
  const rawPads=(LAN.rawGamepads??=navigator.getGamepads?.bind(navigator));
  let suppressPad=false;
  if(rawPads)navigator.getGamepads=()=>{
    const pads=rawPads();
    if(dialog?.open){suppressPad=true;return []}
    if(suppressPad){
      if(Array.from(pads).some(p=>p?.buttons.some(b=>b.pressed)))return [];
      suppressPad=false;
    }
    return pads;
  };
  let currency='purple';
  let dialog,state,busy=false,changed=false,pending=null,previousFocus=null,finishReveal=null,visibleResults=[];
  const app=()=>window.__pbApp;
  const key=()=>`pbgacha.pending.${app().meta.account.id}`;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const get=id=>dialog.querySelector(id);
  async function api(path,method='GET',body){
    const response=await fetch('/api'+path,{method,headers:{Authorization:'Bearer '+app().meta.account.token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    const result=await response.json();
    if(!response.ok)throw Object.assign(new Error(result.error||'Request failed'),{status:response.status});
    return result;
  }
  function message(text,error=false){get('#pb-gacha-message').textContent=text;get('#pb-gacha-message').classList.toggle('error',error)}
  function controls(){
    dialog.setAttribute('aria-busy',String(busy));
    for(const b of dialog.querySelectorAll('[data-pulls]'))b.disabled=busy||!!pending||!state||(currency==='gold'?state.goldTickets:state.purpleTickets??state.tickets)<Number(b.dataset.pulls)*(currency==='gold'?10:1);
    for(const b of dialog.querySelectorAll('[data-currency]')){b.disabled=busy||!!pending;b.setAttribute('aria-pressed',String(b.dataset.currency===currency))}
    get('#pb-gacha-retry').hidden=!pending;get('#pb-gacha-retry').disabled=busy;
    get('#pb-gacha-close').disabled=busy&&!finishReveal;
  }
  function rewardArt(result,size=72){
    const art=result.kind==='dust'?LAN.game.symbol('stardust',size):LAN.game.portrait(result.id,result.shiny?'shiny':null);
    art.alt=result.name+(result.shiny?' (shiny)':'');return art;
  }
  function reveal(results){
    const region=get('#pb-gacha-reveal'),cards=get('#pb-gacha-results');
    if(!results.length||matchMedia('(prefers-reduced-motion: reduce)').matches||app().meta.profile.settings?.reduceFlashes)return Promise.resolve();
    return new Promise(resolve=>{
      let timer,animation,done=false,index=0;
      const finish=()=>{if(done)return;done=true;clearTimeout(timer);animation?.cancel();region.hidden=true;cards.classList.remove('pb-concealed');cards.removeAttribute('aria-hidden');finishReveal=null;controls();resolve()};
      finishReveal=finish;region.hidden=false;cards.classList.add('pb-concealed');cards.setAttribute('aria-hidden','true');get('#pb-gacha-skip').focus();controls();
      const step=()=>{
        if(done)return;
        const result=results[index],tier=result.shiny?'shiny':result.rank;
        region.dataset.tier='common';region.classList.remove('pb-landed');
        get('#pb-gacha-progress').textContent='REVEAL '+(index+1)+' / '+results.length;
        get('#pb-gacha-reveal-label').textContent='Rolling…';
        get('#pb-gacha-reveal-rank').textContent='';
        const viewport=get('#pb-gacha-reel'),track=document.createElement('div');track.className='pb-reel-track';
        for(let i=0;i<9;i++){const slot=document.createElement('div');slot.className='pb-reel-slot';const sample=i===4?result:results[(index+i+1)%results.length];slot.append(i===4||results.length>1?rewardArt(sample,80):LAN.game.icon('poke-ball'));track.append(slot)}
        viewport.replaceChildren(track);
        const unit=112,duration=results.length>=100?210:results.length>1?650:1100;
        animation=track.animate([{transform:'translateX(0px)'},{transform:'translateX('+(-4*unit)+'px)'}],{duration,easing:'cubic-bezier(.12,.75,.18,1)',fill:'forwards'});
        timer=setTimeout(()=>{
          if(done)return;region.dataset.tier=tier;region.classList.add('pb-landed');
          get('#pb-gacha-reveal-label').textContent=result.name;
          get('#pb-gacha-reveal-rank').textContent=(result.shiny?'SHINY · ':'')+result.rank.toUpperCase()+(result.newPokemon||result.newShiny?' · NEW!':result.duplicate?' · OWNED':'');
          timer=setTimeout(()=>{animation?.cancel();if(++index<results.length)step();else finish()},results.length>=100?160:results.length>1?600:1100);
        },duration);
      };step();
    });
  }
  function paint(results=visibleResults){
    visibleResults=results;
    get('#pb-gacha-tickets').textContent=state?`${state.goldTickets} gold · ${state.purpleTickets??state.tickets} purple`:'Loading tickets…';
    get('#pb-gacha-count').textContent=state?`${state.pulls} total pulls · ${state.poolSize} playable Pokémon`:'';
    const container=get('#pb-gacha-results');container.replaceChildren();
    get('#pb-gacha-empty').hidden=results.length>0;
    for(const result of results){
      const card=document.createElement('article');card.className='pb-result'+(result.shiny?' shiny':'');card.dataset.rank=result.rank;
      const label=result.kind==='dust'?'STARDUST':result.newShiny?'NEW SHINY':result.newPokemon?'NEW':result.shiny?'SHINY':'OWNED';
      card.innerHTML=`<span class="pb-badge">${label}</span><strong>${esc(result.name)}</strong><small>${esc(result.rank)}${result.duplicate||result.kind==='dust'?` · +${result.dust} dust`:''}</small>`;
      const portrait=rewardArt(result);card.insertBefore(portrait,card.querySelector('strong'));container.append(card);
    }
    if(state){
      get('#pb-gacha-odds').innerHTML='<span>Pokémon <b>'+state.odds.pokemon+'%</b></span>'+Object.entries(state.odds.dust).map(([amount,chance])=>'<span>'+amount+' dust <b>'+chance+'%</b></span>').join('')+Object.entries(state.odds.rarities).map(([rank,n])=>`<span>${esc(rank[0].toUpperCase()+rank.slice(1))} <b>${n}%</b></span>`).join('');
      get('#pb-gacha-shiny').textContent=`Pokémon: 25% per roll. Rarity percentages apply within Pokémon results. Shiny: 1/${state.odds.shinyDenominator} per Pokémon result (1/512 overall). Owning a Pokémon does not lower the odds.`;
      get('#pb-gacha-earning').textContent=state.earning;
    }
    for(const b of dialog.querySelectorAll('[data-pulls] small')){const count=Number(b.parentElement.dataset.pulls);b.textContent=count*(currency==='gold'?10:1)+' '+currency+' tickets'}
    if(state)LAN.tickets?.adopt(state);controls();
  }
  function ensure(){
    if(dialog)return;
    const start=app().startRun.bind(app());
    app().startRun=(...args)=>dialog?.open?Promise.resolve(false):start(...args);
    const css=document.createElement('link');css.rel='stylesheet';css.href='/lan/gacha.css';document.head.append(css);
    dialog=document.createElement('dialog');dialog.id='pb-gacha';dialog.setAttribute('aria-labelledby','pb-gacha-title');
    dialog.innerHTML=`<header><div><h2 id="pb-gacha-title"><span>Gacha</span></h2><p class="pb-subtitle">A new teammate. Or another Magikarp.</p></div><button id="pb-gacha-close" aria-label="Close gacha">Close</button></header>
      <div class="pb-body"><div class="pb-wallet"><strong id="pb-gacha-tickets">Loading tickets…</strong><span class="pb-count" id="pb-gacha-count"></span></div>
      <div class="pb-currencies"><button data-currency="gold">Gold tickets · 10 per roll</button><button data-currency="purple">Purple tickets · 1 per roll</button></div><div class="pb-pulls"><button data-pulls="1">Pull ×1<small>1 ticket</small></button><button data-pulls="10">Pull ×10<small>10 tickets</small></button><button data-pulls="100">Pull ×100<small>100 tickets</small></button></div>
      <p id="pb-gacha-message" role="status" aria-live="polite"></p><button id="pb-gacha-retry" hidden>Retry last pull</button>
      <section id="pb-gacha-reveal" aria-label="Individual reward reveals" hidden><small id="pb-gacha-progress"></small><div class="pb-reel-window"><div id="pb-gacha-reel"></div><i class="pb-reel-marker"></i></div><strong id="pb-gacha-reveal-label"></strong><span id="pb-gacha-reveal-rank"></span><button id="pb-gacha-skip">Reveal all</button></section>
      <div class="pb-empty" id="pb-gacha-empty">Your next teammate is in here.<br>Pulls unlock Pokémon in your League.</div><div id="pb-gacha-results" class="pb-results" aria-label="Pull results"></div>
      <details><summary>Odds, tickets & duplicates</summary><div class="pb-odds" id="pb-gacha-odds"></div><p id="pb-gacha-shiny"></p><p id="pb-gacha-earning"></p><p>Every Pokémon within a rarity has an equal chance. Duplicates give 15 stardust, or 50 for a duplicate shiny. New shinies stay unlocked.</p></details>
      <footer>Private collection only. Controller: D-pad to move · Cross / A to choose · Circle / B to close.</footer></div>`;
    document.body.append(dialog);
    dialog.addEventListener('focusin',()=>{for(const target of dialog.querySelectorAll('.pb-pad-focus'))target.classList.remove('pb-pad-focus')});
    get('#pb-gacha-close').onclick=()=>{if(finishReveal)finishReveal();dialog.close()};
    get('#pb-gacha-skip').onclick=()=>finishReveal?.();
    dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});
    dialog.addEventListener('close',()=>{finishReveal?.();visibleResults=[];get('#pb-gacha-results').replaceChildren();get('#pb-gacha-reveal').hidden=true;get('details').open=false;if(changed&&(!app().run||app().run.state==='over')){changed=false;app().toMenu()}previousFocus?.focus?.();LAN.ui.refresh()});
    for(const b of dialog.querySelectorAll('[data-pulls]'))b.onclick=()=>doPull(Number(b.dataset.pulls));
    for(const b of dialog.querySelectorAll('[data-currency]'))b.onclick=()=>{currency=b.dataset.currency;paint()};
    get('#pb-gacha-retry').onclick=()=>doPull(pending.count,true);
  }
  async function open(){
    if(!app()?.meta?.account||app().starting||(app().run&&app().run.state!=='over'))return;
    ensure();if(dialog.open)return;previousFocus=document.activeElement;dialog.showModal();state=null;pending=null;visibleResults=[];currency='purple';dialog.scrollTop=0;
    try{pending=JSON.parse(sessionStorage.getItem(key())||'null')}catch{}
    paint([]);message('Loading your collection…');
    try{state=await api('/gacha');paint([]);message(pending?'A previous pull needs confirmation. Retry it without spending twice.':'Choose a pull. Rewards save automatically.');}
    catch(e){message(e.message,true)}
  }
  async function doPull(count,retry=false){
    if(busy)return;busy=true;controls();message('Opening your pulls…');
    try{
      if(!retry){
        await api('/profile/full','PUT',{profile:app().meta.profile});
        pending={count,currency,requestId:crypto.randomUUID()};
        sessionStorage.setItem(key(),JSON.stringify(pending));
      }
      const result=await api('/gacha/pull','POST',pending);
      app().meta.adopt(LAN.game.normalize(result.profile));
      pending=null;sessionStorage.removeItem(key());state=result;changed=true;paint(result.results);
      message('Rewards saved. Revealing each reward…');
      await reveal(result.results);
      const fresh=result.results.filter(r=>r.newPokemon||r.newShiny).length;
      message(`${result.count} ${result.count===1?'pull':'pulls'} saved · ${fresh} new ${fresh===1?'unlock':'unlocks'}.`);
    }catch(e){
      if(e.status&&e.status<500){pending=null;sessionStorage.removeItem(key())}
      message(e.message+(pending?' Use “Retry last pull” to confirm the same request.':''),true);
    }finally{busy=false;controls();if(dialog.open)get(pending?'#pb-gacha-retry':'#pb-gacha-close').focus()}
  }
  LAN.gacha={open,get isOpen(){return !!dialog?.open}};
  for(const type of ['keydown','keyup'])window.addEventListener(type,event=>{
    if(!dialog?.open)return;
    event.stopImmediatePropagation();
    if(event.key==='Escape'){event.preventDefault();if(type==='keydown'){if(finishReveal)finishReveal();else if(!busy)dialog.close()}}
  },true);
  // Gamepad buttons use the standard layout: Cross / Xbox A = button 0.
  let lastPad=[],lastDirection=0;
  function pad(){
    if(dialog?.open){
      const gamepad=Array.from(rawPads?.()??[]).find(Boolean);
      if(gamepad){
        const buttons=gamepad.buttons.map(b=>b.pressed),axis=gamepad.axes;
        const direction=buttons[13]||buttons[15]||axis[0]>.6||axis[1]>.6?1:buttons[12]||buttons[14]||axis[0]<-.6||axis[1]<-.6?-1:0;
        const targets=finishReveal?[get('#pb-gacha-skip')]:Array.from(dialog.querySelectorAll('button:not(:disabled),summary')).filter(e=>e.getClientRects().length>0);
        let index=targets.indexOf(document.activeElement);
        if(direction&&!lastDirection){index=(index+direction+targets.length)%targets.length;targets[index]?.focus();targets[index]?.classList.add('pb-pad-focus')}
        if(buttons[0]&&!lastPad[0]&&index>=0)targets[index]?.click();
        if(buttons[1]&&!lastPad[1]){if(finishReveal)finishReveal();else if(!busy)dialog.close()}
        lastPad=buttons;lastDirection=direction;
      }
    }else{lastPad=[];lastDirection=0}
    requestAnimationFrame(pad);
  }
  requestAnimationFrame(pad);
})();
