// Recover native co-op links using measured traffic rather than socket labels.
(()=>{
 const LAN=window.LAN;let current=null;
 function install(room){
  if(room.__nativeRelay)return room.__nativeRelay;
  const mesh=room.mesh,created=performance.now(),methods={};for(const key of ['state','sendCtl','sendSnap','broadcast','backlog','relayed','close'])methods[key]=mesh[key].bind(mesh);
  const clock=()=>performance.now();let ws,closed=false,replaced=false,retry=0,retryTimer=0,connected=new Set(),last=new Map(),lastBeat=-1e9,lastServerPing=-1e9,lastPong=clock(),opened=clock(),sequence=0,generation=0;
  const directAck=new Map(),relayAck=new Map(),forced=new Map(),nativeRetry=new Map(),pending=new Map(),session=Math.random().toString(36).slice(2);
  const direct=id=>!closed&&methods.state(id)==='open'&&(clock()-(directAck.get(id)??-1e9)<7000||clock()-created<8000)&&!(clock()<(forced.get(id)??0)&&relay(id));
  const relay=id=>!closed&&ws?.readyState===1&&connected.has(id)&&clock()-(relayAck.get(id)??-1e9)<7000;
  const linked=id=>relay(id)&&(!direct(id)||clock()<(forced.get(id)??0))&&(clock()-created>=8000||clock()<(forced.get(id)??0));
  const sendRelay=(id,payload)=>{if(ws?.readyState!==1||!connected.has(id))return false;try{ws.send(JSON.stringify({t:'ctl',to:id,payload}));return true}catch{return false}};
  function revive(id){const c=window.__pbApp?.run?.coop,p=c?.peers.get(id),member=room.room.members.find(p=>p.id===id);if(c?.room!==room||c.party!==room.room.party||!member||member.inRun===false||!p||p.left)return;if(p.gone||p.lostAt>=0){c.recovered(p);p.buf=[];p.offN=0;p.lastAt=-99}c.known.get(id)?.clear();c.hbDirty=true;c.hbT=0;}
  function healthy(id){return direct(id)||linked(id)}
  mesh.state=id=>healthy(id)?'open':'connecting';mesh.relayed=id=>linked(id)||methods.relayed(id);
  Object.defineProperty(mesh,'open',{configurable:true,get:()=>room.others.filter(p=>healthy(p.id)).map(p=>p.id)});
  mesh.sendCtl=(id,payload)=>linked(id)?sendRelay(id,payload):direct(id)?methods.sendCtl(id,payload):false;
  mesh.broadcast=msg=>{for(const peer of room.others)mesh.sendCtl(peer.id,msg)};
  mesh.backlog=id=>linked(id)?ws.bufferedAmount:methods.backlog(id);
  mesh.sendSnap=(id,buffer)=>{if(!linked(id))return direct(id)?methods.sendSnap(id,buffer):false;if(ws.bufferedAmount>131072)return false;const peer=room.others.find(p=>p.id===id);if(!peer)return false;const data=new Uint8Array(buffer.byteLength+2);data[0]=1;data[1]=peer.slot;data.set(new Uint8Array(buffer.buffer??buffer,buffer.byteOffset??0,buffer.byteLength),2);try{ws.send(data);return true}catch{return false}};
  function heartbeatMessage(id,msg,path){if(!msg||!['__pb_ping','__pb_pong'].includes(msg.t))return false;if(!room.others.some(p=>p.id===id))return true;
   if(msg.t==='__pb_ping'){const response={t:'__pb_pong',n:msg.n,party:window.__pbApp?.run?.coop?.party??null};if(path==='relay')sendRelay(id,response);else methods.sendCtl(id,response);return true}
   const request=pending.get(msg.n);if(!request||request.id!==id||request.path!==path||clock()-request.at>10000)return true;pending.delete(msg.n);const map=path==='relay'?relayAck:directAck,was=clock()-(map.get(id)??-1e9)<7000;map.set(id,clock());const c=window.__pbApp?.run?.coop;if((!was||c?.peers.get(id)?.gone||c?.peers.get(id)?.lostAt>=0)&&(!c||msg.party===c.party))revive(id);return true;
  }
  const rawCtl=mesh.ev.ctl,rawSnap=mesh.ev.snap;mesh.ev.ctl=(id,msg)=>{if(!heartbeatMessage(id,msg,'direct'))rawCtl?.(id,msg)};mesh.ev.snap=(id,data)=>rawSnap?.(id,data);
  function heartbeat(){const now=clock();for(const [key,value]of pending)if(now-value.at>10000)pending.delete(key);for(const peer of room.others)for(const path of ['direct','relay']){const n=session+':'+(++sequence),payload={t:'__pb_ping',n};pending.set(n,{id:peer.id,path,at:now});const sent=path==='relay'?sendRelay(peer.id,payload):methods.sendCtl(peer.id,payload);if(!sent)pending.delete(n)}}
  function schedule(){clearTimeout(retryTimer);if(!closed&&room.open)retryTimer=setTimeout(connect,Math.min(8000,1000*2**Math.min(retry++,3)))}
  function restart(){if(closed||!room.open)return;generation++;const old=ws;ws=null;connected.clear();relayAck.clear();try{old?.close()}catch{}clearTimeout(retryTimer);connect()}
  function connect(){if(closed||!room.open)return;const gen=++generation,socket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/native/ws');ws=socket;opened=clock();lastPong=opened;socket.binaryType='arraybuffer';socket.onopen=()=>{if(gen!==generation)return;socket.send(JSON.stringify({t:'auth',code:room.code,token:room.acc.token}))};socket.onmessage=event=>{
   if(gen!==generation)return;if(event.data instanceof ArrayBuffer){const data=new Uint8Array(event.data);if(data[0]!==1||data.length<3)return;const peer=room.others.find(p=>p.slot===data[1]);if(peer&&connected.has(peer.id))rawSnap?.(peer.id,event.data.slice(2));return}
   let msg;try{msg=JSON.parse(event.data)}catch{return}if(msg.t==='pong'){lastPong=clock();retry=0;return}if(msg.t==='peers'){connected=new Set((Array.isArray(msg.ids)?msg.ids:[]).filter(id=>typeof id==='string'));heartbeat();return}if(msg.t==='ctl'&&connected.has(msg.from)&&!heartbeatMessage(msg.from,msg.payload,'relay'))rawCtl?.(msg.from,msg.payload);
  };socket.onerror=()=>{};socket.onclose=event=>{if(gen!==generation)return;connected.clear();relayAck.clear();if(event.code===4001){closed=true;replaced=true}if(!closed&&room.open){if(event.code===4003)room.poll().catch(()=>{});schedule()}};
  }
  function tick(){if(!room.open){dispose();return}const now=clock();if(now-lastBeat>=2000){lastBeat=now;heartbeat()}if(ws?.readyState===1&&now-lastServerPing>=3000){lastServerPing=now;try{ws.send(JSON.stringify({t:'ping',n:++sequence}))}catch{}}if(!closed&&((ws?.readyState===1&&now-lastPong>10000)||(ws?.readyState===0&&now-opened>10000)))restart();let change=false;for(const peer of room.others){const state=mesh.state(peer.id);if(state!=='open'&&now-created>=8000&&now-(nativeRetry.get(peer.id)??-1e9)>10000+(room.mine?.slot??0)*200){nativeRetry.set(peer.id,now);mesh.tries?.delete(peer.id);mesh.retry(peer.id,room.room.members,true)}if(last.get(peer.id)!==state){last.set(peer.id,state);if(state==='open')revive(peer.id);room.ev.link?.(peer.id,state);change=true}}if(change){room.ev.change?.();room.sendLinks()}}
  async function reconnect(){if(replaced)throw Error('This account is connected in another tab. Use one game tab per account.');if(!room.open)throw Error('The room is no longer available. Join an available game again.');for(const peer of room.others){forced.set(peer.id,clock()+15000);directAck.delete(peer.id);mesh.tries?.delete(peer.id);mesh.retry(peer.id,room.room.members,true)}restart();room.schedule(0);heartbeat();}
  const online=()=>{if(!closed&&room.open)reconnect().catch(()=>{})},visible=()=>{if(!document.hidden&&!closed){heartbeat();tick()}};addEventListener('online',online);document.addEventListener('visibilitychange',visible);
  const timer=setInterval(tick,500);function dispose(){closed=true;generation++;clearInterval(timer);clearTimeout(retryTimer);removeEventListener('online',online);document.removeEventListener('visibilitychange',visible);try{ws?.close()}catch{}}
  mesh.close=()=>{dispose();methods.close()};const api=room.__nativeRelay={reconnect,status:()=>({replaced,server:ws?.readyState===1&&clock()-lastPong<10000,peers:room.others.map(p=>({id:p.id,direct:direct(p.id),relay:linked(p.id),healthy:healthy(p.id)}))})};connect();return api;
 }
 setInterval(()=>{const room=window.__pbApp?.coopRoom;if(room?.open&&room!==current){current=room;install(room)}},250);
 LAN.nativeRelay={install,reconnect:room=>install(room).reconnect()};
})();
