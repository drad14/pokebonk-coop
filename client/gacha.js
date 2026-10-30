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
  let dialog,state,busy=false,changed=false,pending=null,previousFocus=null,finishReveal=null;
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
    for(const b of dialog.querySelectorAll('[data-pulls]'))b.disabled=busy||!!pending||!state||state.tickets<Number(b.dataset.pulls);
    get('#pb-gacha-retry').hidden=!pending;get('#pb-gacha-retry').disabled=busy;
    get('#pb-gacha-close').disabled=busy;
  }
  function reveal(results){
    const region=get('#pb-gacha-reveal'),cards=get('#pb-gacha-results');
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||app().meta.profile.settings?.reduceFlashes)return Promise.resolve();
    return new Promise(resolve=>{
      let timer,animations=[],done=false;
      const finish=()=>{
        if(done)return;done=true;clearTimeout(timer);
        for(const animation of animations)animation.cancel();
        region.hidden=true;region.classList.remove('pb-opening');cards.classList.remove('pb-concealed');cards.removeAttribute('aria-hidden');
        finishReveal=null;get('#pb-gacha-close').focus();resolve();
      };
      finishReveal=finish;
      const shiny=results.some(r=>r.shiny),legendary=results.some(r=>r.rank==='legendary'),rare=results.some(r=>r.rank==='rare');
      region.dataset.tier=shiny?'shiny':legendary?'legendary':rare?'rare':'common';
      get('#pb-gacha-reveal-label').textContent=results.length===1?'One new possibility.':'Ten chances. One very busy Poké Ball.';
      region.hidden=false;region.classList.remove('pb-opening');cards.classList.add('pb-concealed');cards.setAttribute('aria-hidden','true');
      get('#pb-gacha-skip').focus();region.scrollIntoView({block:'nearest',behavior:'instant'});
      timer=setTimeout(()=>{
        region.classList.add('pb-opening');
        timer=setTimeout(()=>{
          region.hidden=true;cards.classList.remove('pb-concealed');cards.removeAttribute('aria-hidden');
          animations=Array.from(cards.children,(card,i)=>card.animate([
            {opacity:0,transform:'perspective(500px) rotateY(-75deg) translateY(15px) scale(.92)'},
            {opacity:1,transform:'perspective(500px) rotateY(0) translateY(0) scale(1)'},
          ],{duration:380,delay:i*65,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'}));
          timer=setTimeout(finish,400+results.length*65);
        },320);
      },1150);
    });
  }
  function paint(results=state?.recent??[]){
    get('#pb-gacha-tickets').textContent=state?`${state.tickets} tickets`:'Loading tickets…';
    get('#pb-gacha-count').textContent=state?`${state.pulls} total pulls · ${state.poolSize} playable Pokémon`:'';
    const container=get('#pb-gacha-results');container.replaceChildren();
    get('#pb-gacha-empty').hidden=results.length>0;
    for(const result of results){
      const card=document.createElement('article');card.className='pb-result'+(result.shiny?' shiny':'');card.dataset.rank=result.rank;
      const label=result.newShiny?'NEW SHINY':result.newPokemon?'NEW':result.shiny?'SHINY':'OWNED';
      card.innerHTML=`<span class="pb-badge">${label}</span><strong>${esc(result.name)}</strong><small>${esc(result.rank)}${result.duplicate?` · +${result.dust} dust`:''}</small>`;
      const portrait=LAN.game.portrait(result.id,result.shiny?'shiny':null);
      portrait.alt=result.name+(result.shiny?' (shiny)':'');card.insertBefore(portrait,card.querySelector('strong'));container.append(card);
    }
    if(state){
      get('#pb-gacha-odds').innerHTML=Object.entries(state.odds.rarities).map(([rank,n])=>`<span>${esc(rank[0].toUpperCase()+rank.slice(1))} <b>${n}%</b></span>`).join('');
      get('#pb-gacha-shiny').textContent=`Shiny: 1/${state.odds.shinyDenominator} per pull (${(100/state.odds.shinyDenominator).toFixed(2)}%), rolled independently. Owning a Pokémon does not lower its shiny chance.`;
      get('#pb-gacha-earning').textContent=state.earning;
    }
    controls();
  }
  function ensure(){
    if(dialog)return;
    const start=app().startRun.bind(app());
    app().startRun=(...args)=>dialog?.open?Promise.resolve(false):start(...args);
    const css=document.createElement('link');css.rel='stylesheet';css.href='/lan/gacha.css';document.head.append(css);
    dialog=document.createElement('dialog');dialog.id='pb-gacha';dialog.setAttribute('aria-labelledby','pb-gacha-title');
    dialog.innerHTML=`<header><div><h2 id="pb-gacha-title"><span>Gacha</span></h2><p class="pb-subtitle">A new teammate. Or another Magikarp.</p></div><button id="pb-gacha-close" aria-label="Close gacha">Close</button></header>
      <div class="pb-body"><div class="pb-wallet"><strong id="pb-gacha-tickets">Loading tickets…</strong><span class="pb-count" id="pb-gacha-count"></span></div>
      <div class="pb-pulls"><button data-pulls="1">Pull ×1<small>1 ticket</small></button><button data-pulls="10">Pull ×10<small>10 tickets</small></button></div>
      <p id="pb-gacha-message" role="status" aria-live="polite"></p><button id="pb-gacha-retry" hidden>Retry last pull</button>
      <section id="pb-gacha-reveal" aria-label="Opening Poké Ball" hidden><div class="pb-ball-scene" aria-hidden="true"><div class="pb-ball-rays"></div><div class="pb-ball-orbit"></div><div class="pb-ball"><div class="pb-ball-top"></div><div class="pb-ball-bottom"></div><div class="pb-ball-seam"></div><div class="pb-ball-button"></div></div><div class="pb-ball-shadow"></div><div class="pb-ball-sparkles">${Array.from({length:12},(_,i)=>`<i style="--spark:${i}"></i>`).join('')}</div></div><strong id="pb-gacha-reveal-label"></strong><button id="pb-gacha-skip">Skip animation</button></section>
      <div class="pb-empty" id="pb-gacha-empty">Your next teammate is in here.<br>Pulls unlock Pokémon in your League.</div><div id="pb-gacha-results" class="pb-results" aria-label="Pull results"></div>
      <details><summary>Odds, tickets & duplicates</summary><div class="pb-odds" id="pb-gacha-odds"></div><p id="pb-gacha-shiny"></p><p id="pb-gacha-earning"></p><p>Every Pokémon within a rarity has an equal chance. Duplicates give 15 stardust, or 50 for a duplicate shiny. New shinies stay unlocked.</p></details>
      <footer>Private collection only. Controller: D-pad to move · Cross / A to choose · Circle / B to close.</footer></div>`;
    document.body.append(dialog);
    dialog.addEventListener('focusin',()=>{for(const target of dialog.querySelectorAll('.pb-pad-focus'))target.classList.remove('pb-pad-focus')});
    get('#pb-gacha-close').onclick=()=>dialog.close();
    get('#pb-gacha-skip').onclick=()=>finishReveal?.();
    dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault()});
    dialog.addEventListener('close',()=>{if(changed&&(!app().run||app().run.state==='over')){changed=false;app().toMenu()}previousFocus?.focus?.();LAN.ui.refresh()});
    for(const b of dialog.querySelectorAll('[data-pulls]'))b.onclick=()=>doPull(Number(b.dataset.pulls));
    get('#pb-gacha-retry').onclick=()=>doPull(pending.count,true);
  }
  async function open(){
    if(!app()?.meta?.account||app().starting||(app().run&&app().run.state!=='over'))return;
    ensure();if(dialog.open)return;previousFocus=document.activeElement;dialog.showModal();state=null;pending=null;
    try{pending=JSON.parse(sessionStorage.getItem(key())||'null')}catch{}
    paint([]);message('Loading your collection…');
    try{state=await api('/gacha');paint();message(pending?'A previous pull needs confirmation. Retry it without spending twice.':'Choose a pull. Rewards save automatically.');}
    catch(e){message(e.message,true)}
  }
  async function doPull(count,retry=false){
    if(busy)return;busy=true;controls();message('Opening your pulls…');
    try{
      if(!retry){
        await api('/profile/full','PUT',{profile:app().meta.profile});
        pending={count,requestId:crypto.randomUUID()};
        sessionStorage.setItem(key(),JSON.stringify(pending));
      }
      const result=await api('/gacha/pull','POST',pending);
      app().meta.adopt(LAN.game.normalize(result.profile));
      pending=null;sessionStorage.removeItem(key());state=result;changed=true;paint(result.results);
      message('Rewards saved. Opening your Poké Ball…');
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
