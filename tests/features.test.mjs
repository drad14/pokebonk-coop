import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import WebSocket,{WebSocketServer} from 'ws';
import {pull,wallet,awardTickets,CATALOG} from '../gacha.js';
import {attachRelay,MAX_PLAYERS} from '../relay.js';
test('pull spending, replay protection and permanent duplicate/shiny rewards',()=>{
  const acc={profile:{}};
  assert.equal(wallet(acc).tickets,10);
  let n=0;const receipt=pull(acc,10,'ten-pull-request',()=>[.9,.1,.5,.5][n++%4]);
  assert.equal(receipt.results.length,10);assert.equal(wallet(acc).tickets,0);
  assert.equal(wallet(acc).pulls,10);assert.equal(acc.profile.league.length,1);
  assert.equal(acc.profile.stardust,135);
  assert.deepEqual(pull(acc,10,'ten-pull-request',()=>{throw Error('Must not reroll')}),receipt);
  assert.equal(wallet(acc).pulls,10);
  assert.throws(()=>pull(acc,1,'other-pull-request'),/Not enough/);
  assert.throws(()=>pull(acc,1000,'invalid-pull-request'),/1, 10 or 100/);
  assert.throws(()=>pull(acc,1,'ten-pull-request'),/different/);
  wallet(acc).tickets=2;
  let seq=[.9,0,0,0];const shiny=pull(acc,1,'shiny-pull-request',()=>seq.shift()).results[0];
  assert.equal(shiny.shiny,true);assert.equal(shiny.newShiny,true);
  seq=[.9,0,0,0];const again=pull(acc,1,'shiny-pull-again',()=>seq.shift()).results[0];
  assert.equal(again.shiny,true);assert.equal(again.duplicate,true);assert.equal(again.dust,50);
  assert.ok(acc.profile.shinies.includes(shiny.id));
});
test('run ticket earnings are capped and no reward for zero progress',()=>{
  const acc={profile:{}};
  assert.equal(awardTickets(acc,{time:0,bosses:0,victory:false}),0);
  assert.equal(awardTickets(acc,{time:125,bosses:1,victory:false}),3);
  assert.equal(awardTickets(acc,{time:99999,bosses:999,victory:true}),30);
  assert.equal(awardTickets(acc,{time:NaN,bosses:-5}),0);
  assert.equal(wallet(acc).tickets,43);
});
test('all catalog rarities can be rolled and only playable catalog members are awarded',()=>{
  for(const [rank,value]of [['common',.1],['uncommon',.7],['rare',.95],['legendary',.999]]){
    const acc={profile:{}},sequence=[.9,value,.5,.5];
    const result=pull(acc,1,'rarity-test-'+rank,()=>sequence.shift()).results[0];
    assert.equal(result.rank,rank);assert.ok(CATALOG.some(p=>p.id===result.id));
  }
  assert.equal(new Set(CATALOG.map(p=>p.id)).size,79);
});

test('eight peers share snapshots; ninth rejected; full-party host reconnect keeps the run',{timeout:15000},async()=>{
  const server=http.createServer(),wss=new WebSocketServer({server});attachRelay(wss);
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`ws://127.0.0.1:${server.address().port}`,peers=[];
  const wait=async(peer,predicate)=>{
    const until=Date.now()+4000;
    while(Date.now()<until){const found=peer.messages.find(predicate);if(found)return found;await new Promise(r=>setTimeout(r,10))}
    throw Error('Expected relay message was not received');
  };
  let roomCode;
  const connect=key=>{
    const ws=new WebSocket(url+'/?key='+key+(roomCode?'&room='+roomCode:'&action=create')),peer={ws,messages:[],binary:[]};peers.push(peer);
    ws.on('message',(data,binary)=>binary?peer.binary.push(Buffer.from(data)):peer.messages.push(JSON.parse(data)));
    return peer;
  };
  try{
    const first=connect('test-host');roomCode=(await wait(first,m=>m.t==='welcome')).roomCode;assert.match(roomCode,/^\d{4}$/);
    for(let i=1;i<MAX_PLAYERS;i++)await wait(connect('test-'+i),m=>m.t==='welcome');
    await wait(first,m=>m.t==='roster'&&m.players.length===8);
    const extra=connect('ninth');const [code]=await once(extra.ws,'close');assert.equal(code,4008);
    const seed=123456;first.ws.send(JSON.stringify({t:'start',cfg:{seed,biome:'forest',tier:0}}));
    for(const p of peers.slice(1,8))await wait(p,m=>m.t==='start'&&m.cfg.seed===seed);
    const payload=Buffer.from([1,2,3,4,5]);first.ws.send(payload);
    const until=Date.now()+4000;while(peers.slice(1,8).some(p=>!p.binary.length)&&Date.now()<until)await new Promise(r=>setTimeout(r,10));
    for(const p of peers.slice(1,8))assert.deepEqual(p.binary[0],payload);
    peers[1].ws.send(JSON.stringify({t:'xp',seed,stage:1,seq:1,level:999,xp:0,next:10}));
    await new Promise(r=>setTimeout(r,50));
    assert.ok(peers.slice(2,8).every(p=>!p.messages.some(m=>m.t==='xp')),'Guests cannot impersonate the shared XP authority');
    first.ws.send(JSON.stringify({t:'xp',seed,stage:1,seq:2,level:5,xp:3,next:20}));
    for(const p of peers.slice(1,8))await wait(p,m=>m.t==='xp'&&m.level===5);
    const returned=connect('test-host'),welcome=await wait(returned,m=>m.t==='welcome');
    assert.equal(welcome.host,welcome.id);assert.equal(welcome.run.cfg.seed,seed);
    assert.equal(welcome.run.xp.level,5);
    await wait(returned,m=>m.t==='roster'&&m.players.length===8);
    assert.ok(peers.slice(1,8).every(p=>!p.messages.some(m=>m.t==='hostLeft')));
  }finally{
    for(const p of peers)p.ws.terminate();
    await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r));
  }
});


test('explicit four-digit lobbies isolate players, runs, XP and binary snapshots',{timeout:15000},async()=>{
  const server=http.createServer(),wss=new WebSocketServer({server});attachRelay(wss);
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url='ws://127.0.0.1:'+server.address().port,peers=[];
  const connect=query=>{const ws=new WebSocket(url+'/?'+query),p={ws,messages:[],binary:[]};peers.push(p);ws.on('message',(d,b)=>b?p.binary.push(Buffer.from(d)):p.messages.push(JSON.parse(d)));return p};
  const wait=async(p,pred)=>{for(let i=0;i<200;i++){const m=p.messages.find(pred);if(m)return m;await new Promise(r=>setTimeout(r,10))}throw Error('Missing room message')};
  try{
    const noRoom=connect('key=outsider');assert.equal((await once(noRoom.ws,'close'))[0],4004);
    const a=connect('action=create&key=a'),aw=await wait(a,m=>m.t==='welcome');
    assert.match(aw.roomCode,/^\d{4}$/);
    const b=connect('action=create&key=b'),bw=await wait(b,m=>m.t==='welcome');assert.notEqual(aw.roomCode,bw.roomCode);
    const guest=connect('room='+aw.roomCode+'&key=g');await wait(guest,m=>m.t==='welcome');await wait(a,m=>m.t==='roster'&&m.players.length===2);
    assert.ok(b.messages.filter(m=>m.t==='roster').every(m=>m.players.length===1));
    for(const t of ['start','xp'])a.ws.send(JSON.stringify({t,cfg:{seed:42},seed:42,level:5}));
    a.ws.send(Buffer.from([9,8,7]));
    await wait(guest,m=>m.t==='xp');await new Promise(r=>setTimeout(r,60));
    assert.equal(guest.binary.length,1);assert.equal(b.binary.length,0);assert.ok(!b.messages.some(m=>['start','xp'].includes(m.t)));
    guest.ws.send(JSON.stringify({t:'p',to:bw.id,x:99}));await new Promise(r=>setTimeout(r,40));assert.ok(!b.messages.some(m=>m.t==='p'));
    a.ws.close();await once(a.ws,'close');guest.ws.close();await once(guest.ws,'close');await new Promise(r=>setTimeout(r,20));
    const refreshed=connect('room='+aw.roomCode+'&key=a');await wait(refreshed,m=>m.t==='welcome');
    await wait(refreshed,m=>m.t==='roster'&&m.players.length===1);
    const invalid=connect('room=abcd');assert.equal((await once(invalid.ws,'close'))[0],4004);
  }finally{for(const p of peers)p.ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r))}
});

