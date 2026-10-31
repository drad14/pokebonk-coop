// Carry native mesh messages through the private server only when direct links fail.
(()=>{
 const LAN=window.LAN;let current=null;
 function install(room){
  if(room.__nativeRelay)return;room.__nativeRelay=true;
  const mesh=room.mesh,created=performance.now(),methods={};for(const key of ['state','sendCtl','sendSnap','broadcast','backlog','relayed','close'])methods[key]=mesh[key].bind(mesh);
  const nativeOpen=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(mesh),'open').get;
  let ws,closed=false,retry=0,connected=new Set(),last=new Map();
  const linked=id=>!closed&&ws?.readyState===1&&connected.has(id)&&methods.state(id)!=='open'&&performance.now()-created>=8000;
  mesh.state=id=>linked(id)?'open':methods.state(id);
  mesh.relayed=id=>linked(id)||methods.relayed(id);
  Object.defineProperty(mesh,'open',{configurable:true,get:()=>[...new Set([...nativeOpen.call(mesh),...room.others.filter(p=>linked(p.id)).map(p=>p.id)])]});
  const control=(id,payload)=>{if(!linked(id))return methods.sendCtl(id,payload);try{ws.send(JSON.stringify({t:'ctl',to:id,payload}));return true}catch{return false}};
  mesh.sendCtl=control;mesh.broadcast=msg=>{for(const peer of room.others)control(peer.id,msg)};
  mesh.backlog=id=>linked(id)?ws.bufferedAmount:methods.backlog(id);
  mesh.sendSnap=(id,buffer)=>{if(!linked(id))return methods.sendSnap(id,buffer);if(ws.bufferedAmount>131072)return false;const peer=room.others.find(p=>p.id===id);if(!peer)return false;const data=new Uint8Array(buffer.byteLength+2);data[0]=1;data[1]=peer.slot;data.set(new Uint8Array(buffer.buffer??buffer,buffer.byteOffset??0,buffer.byteLength),2);try{ws.send(data);return true}catch{return false}};
  const oldState=mesh.ev.state;mesh.ev.state=(id,state)=>oldState(id,linked(id)?'open':state);
  function connect(){if(closed||!room.open)return;ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/native/ws');ws.binaryType='arraybuffer';ws.onopen=()=>{retry=0;ws.send(JSON.stringify({t:'auth',code:room.code,token:room.acc.token}))};ws.onmessage=event=>{
   if(event.data instanceof ArrayBuffer){const data=new Uint8Array(event.data);if(data[0]!==1||data.length<3)return;const peer=room.others.find(p=>p.slot===data[1]);if(peer&&connected.has(peer.id)&&methods.state(peer.id)!=='open')mesh.ev.snap?.(peer.id,event.data.slice(2));return}
   let msg;try{msg=JSON.parse(event.data)}catch{return}if(msg.t==='peers'){connected=new Set(msg.ids);return}if(msg.t==='ctl'&&connected.has(msg.from)&&methods.state(msg.from)!=='open')mesh.ev.ctl?.(msg.from,msg.payload);
  };ws.onerror=()=>{};ws.onclose=event=>{connected.clear();if(event.code===4001)closed=true;if(!closed&&room.open&&event.code!==4003)setTimeout(connect,Math.min(8000,1000*2**retry++))}}
  const timer=setInterval(()=>{if(!room.open){clearInterval(timer);return}let change=false;for(const peer of room.others){const state=mesh.state(peer.id);if(last.get(peer.id)!==state){last.set(peer.id,state);room.ev.link?.(peer.id,state);change=true}}if(change){room.ev.change?.();room.sendLinks()}},300);
  mesh.close=()=>{closed=true;clearInterval(timer);ws?.close();methods.close()};connect();
 }
 setInterval(()=>{const room=window.__pbApp?.coopRoom;if(room?.open&&room!==current){current=room;install(room)}},250);
 LAN.nativeRelay={install};
})();
