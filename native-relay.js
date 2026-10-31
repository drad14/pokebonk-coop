// Room-authenticated fallback for the unmodified native control/snapshot protocols.
export function attachNativeRelay(wss,member){
 const groups=new Map();const send=(ws,msg)=>{if(ws.readyState===1)ws.send(JSON.stringify(msg))};
 function roster(code){const group=groups.get(code);if(!group)return;const ids=[...group.keys()];for(const p of group.values())send(p.ws,{t:'peers',ids})}
 wss.on('connection',ws=>{
  let peer=null;const deadline=setTimeout(()=>{if(!peer)ws.close(4003,'Authentication required')},6000);
  ws.on('error',()=>{});ws.on('message',(data,binary)=>{
   if(!peer){if(binary)return ws.close(4003,'Authentication required');let msg;try{msg=JSON.parse(data)}catch{return ws.close(4003,'Invalid authentication')}if(msg.t!=='auth'||typeof msg.token!=='string'||typeof msg.code!=='string')return ws.close(4003,'Invalid authentication');const who=member(msg.token,msg.code);if(!who)return ws.close(4003,'Lobby membership required');clearTimeout(deadline);peer={ws,code:msg.code,id:who.id,slot:who.slot,token:msg.token};let group=groups.get(peer.code);if(!group)groups.set(peer.code,group=new Map);group.get(peer.id)?.ws.close(4001,'Replaced by refreshed connection');group.set(peer.id,peer);roster(peer.code);return}
   const who=member(peer.token,peer.code);if(!who)return ws.close(4003,'Lobby membership expired');const group=groups.get(peer.code);if(group?.get(peer.id)!==peer)return;
   if(binary){if(data.length<3||data[0]!==1)return;const target=[...group.values()].find(p=>p.slot===data[1]);if(!target||!member(target.token,target.code)||target.ws.readyState!==1||target.ws.bufferedAmount>262144)return;target.ws.send(Buffer.concat([Buffer.from([1,peer.slot]),data.subarray(2)]),{binary:true});return}
   let msg;try{msg=JSON.parse(data)}catch{return}if(msg.t!=='ctl'||typeof msg.to!=='string'||!msg.payload||typeof msg.payload!=='object'||Array.isArray(msg.payload))return;const target=group.get(msg.to);if(target&&member(target.token,target.code))send(target.ws,{t:'ctl',from:peer.id,payload:msg.payload});
  });
  ws.on('close',()=>{clearTimeout(deadline);if(!peer)return;const group=groups.get(peer.code);if(group?.get(peer.id)===peer){group.delete(peer.id);if(!group.size)groups.delete(peer.code);else roster(peer.code)}});
 });
 const beat=setInterval(()=>{for(const group of groups.values())for(const p of group.values()){if(!member(p.token,p.code)){p.ws.close(4003,'Lobby membership expired');continue}try{p.ws.ping()}catch{}}},15000);beat.unref();wss.on('close',()=>clearInterval(beat));
}
