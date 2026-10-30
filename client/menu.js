// Co-op controls live in the game's home tiles and native pause menu.
(()=>{
  const LAN=window.LAN;
  const app=()=>window.__pbApp;
  let el=null,back=null,homeControls=null,rosterKey='',subtitle=null;
  const inheritedPads=navigator.getGamepads?.bind(navigator);
  const rawPads=LAN.rawGamepads??inheritedPads;
  let suppressPad=false,lastButtons=[],lastDirection=0;
  const open=()=>!!el?.isConnected;
  if(rawPads)navigator.getGamepads=()=>{
    const pads=rawPads();
    if(open()){suppressPad=true;return []}
    if(suppressPad){if(Array.from(pads).some(p=>p?.buttons.some(b=>b.pressed)))return [];suppressPad=false}
    return inheritedPads();
  };
  const node=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e};
  const button=(text,action,className='btn ghost')=>{const e=node('button',className,text);e.type='button';e.onclick=()=>{LAN.game?.click?.();action()};return e};
  const get=selector=>el?.querySelector(selector);
  function style(){
    if(document.querySelector('link[data-pb-menu]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='/lan/menu.css';link.dataset.pbMenu='';document.head.append(link);
  }
  function convert(target,label,icon,action,color){
    target.classList.remove('clan');target.dataset.pbMenu=label.toLowerCase();target.style.setProperty('--c',color);
    target.querySelector('.mm-tx b').textContent=label;
    target.querySelector('.mm-ic').replaceChildren(icon);
    target.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();LAN.game?.click?.();action()},true);
  }
  function home(app,controls){
    style();homeControls=controls;
    convert(controls.party,'Party',controls.partyIcon,show,'#1fa86a');
    convert(controls.gacha,'Gacha',controls.gachaIcon,()=>LAN.gacha?.open(),'var(--purple)');
    controls.gacha.querySelector('.mm-tx small').textContent='Pokémon pulls';
    controls.gacha.title='Pull Pokémon and unlock them in your League';
    // Native factories register the official co-op button even when it is
    // hidden. Keep keyboard/controller navigation on the displayed game tiles.
    if(controls.navigation)controls.navigation.splice(0,controls.navigation.length,...controls.navigation.filter(button=>controls.screen.contains(button)));
    refreshTickets();LAN.tickets?.load();refresh();
  }
  function refreshTickets(){
    const trainer=homeControls?.screen?.querySelector('.trainer');if(!trainer)return;
    let holder=trainer.querySelector('.pb-ticket-wallet');if(!holder){holder=node('span','pb-ticket-wallet');(trainer.querySelector('.tr-cur')??trainer).append(holder)}
    const wallet=LAN.tickets?.wallet;holder.replaceChildren();
    for(const [type,count]of [['gold',wallet?.goldTickets],['purple',wallet?.purpleTickets??wallet?.tickets]]){const pill=node('span','pb-ticket-balance');pill.title=type==='gold'?'Gold tickets · 10 per roll':'Purple tickets · 1 per roll';pill.setAttribute('aria-label',type+' tickets: '+(count??'loading'));pill.innerHTML=LAN.tickets?.icon(type)??'';pill.append(document.createTextNode(count===undefined?'…':String(count)));holder.append(pill)}
  }
  function close(){const action=back;el=null;back=null;subtitle=null;action?.()}
  function content(){
    const layout=node('div','pb-party-layout scroll');
    const players=node('section','panel pb-party-card');players.append(node('h2','','Your party'),node('p','muted','Up to 8 players. One shared XP bar.'));
    const list=node('div','pb-party-roster');list.setAttribute('aria-label','Party members');players.append(list);
    const lobby=node('div','pb-party-lobby');
    const create=button('Create lobby',()=>LAN.createRoom(),'btn green');create.dataset.action='create';
    const joinForm=node('form','pb-party-name-form'),code=node('input','pb-party-code');code.type='text';code.inputMode='numeric';code.maxLength=4;code.pattern='[0-9]{4}';code.placeholder='4-digit code';code.required=true;code.autocomplete='off';code.setAttribute('aria-label','Four-digit lobby code');
    const join=node('button','btn blue','Join lobby');join.type='submit';join.dataset.action='join';joinForm.append(code,join);joinForm.onsubmit=event=>{event.preventDefault();LAN.joinRoom(code.value.trim())};
    const leave=button('Leave lobby',()=>LAN.leaveRoom());leave.dataset.action='leave';lobby.append(create,joinForm,leave);players.prepend(lobby);
    const status=node('p','pb-party-status');status.setAttribute('role','status');players.append(status);
    const hint=node('p','muted pb-party-hint');players.append(hint);
    const retry=button('Try joining again',()=>LAN.retry?.());retry.dataset.action='retry';players.append(retry);
    const side=node('div','pb-party-side');
    const invite=node('section','panel pb-party-card');invite.append(node('h2','','Invite friends'),node('p','muted','Share your four-digit lobby code with friends.'));
    const link=node('input','pb-party-link');link.readOnly=true;link.setAttribute('aria-label','Lobby code');link.addEventListener('focus',()=>link.select());
    const copied=node('p','muted pb-party-copy-status');copied.setAttribute('role','status');
    const copy=button('Copy lobby code',async()=>{
      try{await navigator.clipboard.writeText(link.value);copied.textContent='Lobby code copied. Friends enter it in Party → Join lobby.'}
      catch{link.focus();link.select();copied.textContent='Code selected. Press Ctrl+C to copy it.'}
    },'btn green');copy.dataset.action='copy';invite.append(link,copy,copied);
    const identity=node('section','panel pb-party-card');identity.append(node('h2','','Your trainer name'));
    const form=node('form','pb-party-name-form'),name=node('input','pb-party-name');name.maxLength=24;name.autocomplete='nickname';name.setAttribute('aria-label','Trainer name');
    const saved=node('p','muted pb-party-name-status');saved.setAttribute('role','status');
    const save=node('button','btn blue','Save name');save.type='submit';form.append(name,save);
    form.onsubmit=event=>{event.preventDefault();saved.textContent=LAN.setName?.(name.value)?'Name saved.':'Enter a trainer name.'};identity.append(form,saved);
    const graphics=node('details','pb-party-graphics'),summary=node('summary','','Graphics');graphics.append(summary,node('p','muted','These settings only change how your browser draws the game.'));
    const modes=node('div','seg');
    for(const [mode,label]of Object.entries(LAN.perf?.labels??{})){const b=button(label,()=>LAN.perf.set(mode),'pill');b.dataset.graphics=mode;modes.append(b)}
    graphics.append(modes);identity.append(graphics);
    side.append(invite,identity);layout.append(players,side);return layout;
  }
  function show(){
    if(!app()?.meta?.account||open())return;
    style();rosterKey='';
    const run=app().run,body=content();
    if(run&&run.state!=='over'){
      if(run.state!=='paused')return;
      back=()=>{if(app().run===run&&run.state==='paused')run.ui.showPause(run)};
      const panel=node('section','panel pb-party-pause'),head=node('header','pb-party-pause-head');
      const backButton=button('Back',close,'back-btn');head.append(backButton,node('h1','','Party'));subtitle=node('span','muted');head.append(subtitle);panel.append(head,body);
      el=run.ui.modal(panel);el.classList.add('pb-party-modal');run.ui.pauseBack=close;
    }else{
      back=()=>app().toMenu();
      const section=LAN.game.section(app(),'pb-party-screen','Party','',close,[],body);
      el=section.el;subtitle=section.subEl;
    }
    app().input?.releaseAll?.(false);refresh();get('button')?.focus();
  }
  function refresh(){
    const connected=LAN.connected&&LAN.myId!=null;
    const count=`${LAN.roster.length}/${LAN.maxPlayers} players`;
    if(homeControls?.screen?.isConnected){
      const target=homeControls.party;
      target.querySelector('.mm-tx small').textContent=connected?`Lobby ${LAN.roomCode} · ${count}`:'Create or join a lobby';
      target.title='View your party, invite friends and choose your trainer name';
    }
    if(!open())return;
    if(subtitle)subtitle.textContent=connected?`Lobby ${LAN.roomCode} · ${count}`:'Create or join a lobby';
    const key=JSON.stringify([LAN.roster,LAN.myId,LAN.hostId]);
    if(key!==rosterKey){
      rosterKey=key;const list=get('.pb-party-roster');list.replaceChildren();
      for(let slot=0;slot<LAN.maxPlayers;slot++){
        const player=LAN.roster[slot],card=node('div','pb-party-member'+(player?'':' empty'));
        if(player){
          const image=player.species?LAN.game.portrait(player.species,null):LAN.game.icon('poke-ball');image.alt='';card.append(image);
          const text=node('div','pb-party-member-name');text.append(node('b','',player.name),node('small','muted',player.id===LAN.hostId?(player.id===LAN.myId?'Host · you':'Host'):(player.id===LAN.myId?'You':'Trainer')));card.append(text);
        }else{const image=LAN.game.icon('poke-ball');image.alt='';card.append(image,node('span','muted','Open slot'))}
        list.append(card);
      }
    }
    const status=get('.pb-party-status'),run=app().run;
    status.textContent=LAN.connectionError??(LAN.info?.patchFailures?.length?'Game compatibility update required.':connected?(run?.__lan?.sync?`Shared XP · level ${run.player.level}`:`Lobby ${LAN.roomCode} · shared XP enabled`):LAN.connecting?'Connecting to the lobby…':'Create a lobby or enter a friend’s four-digit code.');
    status.classList.toggle('error',!!LAN.connectionError||!!LAN.info?.patchFailures?.length);
    get('[data-action=retry]').hidden=!LAN.connectionError;
    get('.pb-party-hint').textContent=!connected?'Opening the website does not join a party. Solo play stays separate.':LAN.isHost?'Choose a Pokémon and start Play or Survival from the main menu. Connected friends follow your run.':LAN.hostRun?'The host is playing. Return to the game to join the run.':'Choose your Pokémon, then wait for the host to start.';
    get('.pb-party-link').value=connected?LAN.roomCode:'';
    get('[data-action=copy]').disabled=!connected;
    const playing=!!run&&run.state!=='over';
    get('[data-action=create]').disabled=connected||LAN.connecting||playing;
    get('[data-action=join]').disabled=connected||LAN.connecting||playing;
    get('.pb-party-code').disabled=connected||LAN.connecting||playing;
    get('[data-action=leave]').hidden=!connected;
    const name=get('.pb-party-name');if(document.activeElement!==name)name.value=LAN.playerName?.()??'';
    for(const b of el.querySelectorAll('[data-graphics]')){const selected=b.dataset.graphics===LAN.perf?.mode;b.classList.toggle('on',selected);b.setAttribute('aria-pressed',String(selected))}
  }
  function installRun(run){
    const showPause=run.ui.showPause.bind(run.ui);
    run.ui.showPause=(...args)=>{
      const result=showPause(...args),actions=run.ui.modalEl?.querySelector('.sm-foot .actions');
      if(actions&&!actions.querySelector('[data-pb-pause-party]')){
        const party=button('Party',show,'btn ghost');party.dataset.pbPauseParty='';party.prepend(LAN.game.symbol('friends',20));
        actions.insertBefore(party,actions.querySelector('.green')??null);
      }
      return result;
    };
  }
  const targets=()=>Array.from(el.querySelectorAll('button:not(:disabled),input:not([readonly]),summary')).filter(e=>e.getClientRects().length>0&&!e.hidden);
  function move(direction){const all=targets();let index=all.indexOf(document.activeElement);index=(index+direction+all.length)%all.length;all[index]?.focus();all[index]?.classList.add('pb-pad-focus')}
  for(const type of ['keydown','keyup'])window.addEventListener(type,event=>{
    if(!open())return;
    const editing=/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName??'');
    if(editing&&event.key!=='Escape'){event.stopImmediatePropagation();return}
    event.stopImmediatePropagation();
    if(type!=='keydown')return;
    if(event.key==='Escape'){event.preventDefault();close()}
    else if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)){event.preventDefault();move(['ArrowDown','ArrowRight'].includes(event.key)?1:-1)}
    else if(event.key==='Enter'||event.key===' '){event.preventDefault();document.activeElement?.click()}
  },true);
  document.addEventListener('focusin',()=>{for(const e of el?.querySelectorAll('.pb-pad-focus')??[])e.classList.remove('pb-pad-focus')});
  function pad(){
    if(open()){
      const gamepad=Array.from(rawPads?.()??[]).find(Boolean);
      if(gamepad){
        const pressed=gamepad.buttons.map(b=>b.pressed),axes=gamepad.axes;
        const direction=pressed[13]||pressed[15]||axes[0]>.6||axes[1]>.6?1:pressed[12]||pressed[14]||axes[0]<-.6||axes[1]<-.6?-1:0;
        if(direction&&!lastDirection)move(direction);
        if(pressed[0]&&!lastButtons[0]&&el.contains(document.activeElement))document.activeElement.click();
        if(pressed[1]&&!lastButtons[1])close();
        lastButtons=pressed;lastDirection=direction;
      }
    }else{lastButtons=[];lastDirection=0}
    requestAnimationFrame(pad);
  }
  LAN.menu={home,show,refresh,refreshTickets,installRun,get el(){return open()?el:null}};
  setInterval(()=>{if(open())refresh()},1000);
  style();requestAnimationFrame(pad);
})();
