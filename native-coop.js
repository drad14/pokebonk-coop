import crypto from 'node:crypto';
export const access={show:true,play:true,mode:'open',private:true,maxPlayers:8};
export function createCoopService(){
 const rooms=new Map(),parties=new Map();const alphabet='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
 const error=(message,status=400)=>Object.assign(Error(message),{status});
 function code(){let value;do{value=Array.from({length:4},()=>alphabet[crypto.randomInt(alphabet.length)]).join('')}while(rooms.has(value));return value}
 function member(acc,pick,slot){const p=acc.profile;return {id:acc.id,name:acc.name,guest:acc.guest,species:Number(pick.species)||p.lastSpecies||p.starter||1,skin:pick.skin??null,slot,host:slot===0,ready:slot===0,avatar:p.avatar??null,frame:p.frame??null,title:p.title??null,maps:p.biomes??{forest:0},at:Date.now(),seen:Date.now()}}
 function view(room){return {code:room.code,host:room.host,state:room.state,version:room.version,pub:room.pub,want:room.want??8,biome:room.biome,tier:room.tier,party:room.party,leadLeft:null,members:room.members.map(({seen,at,...m})=>m)}}
 function response(room,acc,after=0,chat=0){return {room:view(room),me:acc.id,signals:room.signals.filter(s=>s.to===acc.id&&s.id>after),chat:room.chat.filter(s=>s.id>chat)}}
 function leave(room,id){room.members=room.members.filter(m=>m.id!==id);if(!room.members.length){rooms.delete(room.code);return}if(room.host===id){room.host=room.members[0].id;for(const m of room.members){m.host=m.id===room.host;if(m.host)m.ready=true}}room.version++}
 function prune(){for(const room of rooms.values())for(const m of room.members.slice())if(Date.now()-m.seen>150000)leave(room,m.id)}
 function add(room,acc,pick){let m=room.members.find(m=>m.id===acc.id);if(m){m.seen=Date.now();return m}if(room.state!=='lobby')throw error('This run has already started. Join the next run.',409);if(room.members.length>=(room.want??8))throw error('Lobby full: eight players maximum',409);const slots=new Set(room.members.map(m=>m.slot));let slot=0;while(slots.has(slot))slot++;m=member(acc,pick,slot);m.host=false;m.ready=false;room.members.push(m);room.version++;return m}
 return {rooms,parties,access,async handle(route,method,acc,b={},url){
  if(!route.startsWith('/coop/'))return null;prune();
  if(!acc)throw error('Sign in to your private account first',401);
  if(route==='/coop/access')return access;
  if(route==='/coop/ice'){let servers=[];if(process.env.COOP_ICE_SERVERS_JSON){servers=JSON.parse(process.env.COOP_ICE_SERVERS_JSON);if(!Array.isArray(servers))throw error('Invalid private ICE configuration',503)}return {servers}}
  if(route==='/coop/invites')return [];
  if(route==='/coop/seeking')return {total:0,count:0,modes:[],groups:[]};
  if(route==='/coop/board')return {entries:[],me:null};
  if(route==='/coop/rooms'&&method==='POST'){
   for(const room of rooms.values()){if(room.members.some(m=>m.id===acc.id)&&room.state==='lobby')return response(room,acc)}
   if(rooms.size>=1000)throw error('Too many open rooms. Try later.',503);
   const room={code:code(),host:acc.id,state:'lobby',version:1,pub:0,biome:'forest',tier:0,party:null,members:[member(acc,b,0)],signals:[],chat:[],seq:0};rooms.set(room.code,room);return response(room,acc);
  }
  if(route==='/coop/quick'){
    const want=[2,3,4,8].includes(b.size)?b.size:8;let room=[...rooms.values()].find(r=>r.pub===1&&r.state==='lobby'&&r.want===want&&r.members.length<want&&(!b.biome||r.biome===b.biome));
    if(room)add(room,acc,b);else{room={code:code(),host:acc.id,state:'lobby',version:1,pub:1,want,biome:b.biome||'forest',tier:b.mode==='survival'?3:Math.max(0,Math.min(2,Number(b.tier)||0)),party:null,members:[member(acc,b,0)],signals:[],chat:[],seq:0};rooms.set(room.code,room)}return {...response(room,acc),moved:true,seeking:0};
  }
  if(route==='/coop/team'){const p=parties.get(url.searchParams.get('party'));return {live:!!p,entries:[],members:p?.members??[]}}
  const match=/^\/coop\/rooms\/([^/]+)(?:\/(\w+))?$/.exec(route);
  if(!match)throw error('Private co-op endpoint unavailable',404);
  const room=rooms.get(decodeURIComponent(match[1]).toUpperCase()),action=match[2];if(!room)throw error('Lobby not found',404);
  if(action==='join'&&method==='POST'){add(room,acc,b);return response(room,acc)}
  const mine=room.members.find(m=>m.id===acc.id);if(!mine)throw error('You are not in this lobby',403);mine.seen=Date.now();
  const host=()=>{if(room.host!==acc.id)throw error('Only the host can do that',403)};
  if(!action&&method==='GET')return response(room,acc,Number(url.searchParams.get('after'))||0,Number(url.searchParams.get('chat'))||0);
  switch(action){
   case 'me': if(Number.isInteger(b.species)&&b.species>0)mine.species=b.species;if(Object.hasOwn(b,'skin'))mine.skin=b.skin??null;if(typeof b.ready==='boolean')mine.ready=mine.host||b.ready;room.version++;break;
   case 'settings':host();if(typeof b.biome==='string'&&/^[a-z-]{1,30}$/.test(b.biome))room.biome=b.biome;if(Number.isInteger(b.tier)&&b.tier>=0&&b.tier<=3)room.tier=b.tier;for(const m of room.members)if(!m.host)m.ready=false;room.version++;break;
   case 'signal':if(!room.members.some(m=>m.id===b.to)||!['offer','answer','bye'].includes(b.kind)||typeof b.data!=='string'||b.data.length>100000)throw error('Invalid connection signal');room.signals.push({id:++room.seq,from:acc.id,to:b.to,kind:b.kind,data:b.data});room.signals=room.signals.slice(-1000);break;
   case 'chat':{const text=String(b.text??'').trim().slice(0,140);if(text)room.chat.push({id:++room.seq,from:acc.id,name:acc.name,text,at:Date.now()});room.chat=room.chat.slice(-80);break}
   case 'start':host();if(room.members.length<2||room.members.some(m=>!m.host&&!m.ready))throw error('Everyone must be ready before starting',409);if(room.state==='started')return response(room,acc);room.party=crypto.randomUUID();room.state='started';room.version++;parties.set(room.party,{seed:crypto.randomInt(1,2**31),biome:room.biome,tier:room.tier,members:room.members.map(m=>m.id)});if(parties.size>1000)parties.delete(parties.keys().next().value);break;
   case 'again':room.state='lobby';room.party=null;for(const m of room.members)m.ready=m.host;room.version++;break;
   case 'leave':leave(room,acc.id);return {};
   case 'kick':host();if(b.user===room.host)throw error('The host must leave instead');leave(room,b.user);break;
   case 'open':host();room.pub=b.on?2:0;if([2,3,4,8].includes(b.size)&&b.size>=room.members.length)room.want=b.size;room.version++;break;
   case 'invite':throw error('Share this lobby’s four-character code with your friend.',409);
   case 'standing':return {entries:[],members:room.members.map(m=>({id:m.id,name:m.name}))};
   default:throw error('Private co-op action unavailable',404);
  }
  return response(room,acc);
 }};
}
