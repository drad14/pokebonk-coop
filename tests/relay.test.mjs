import test from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';import {once} from 'node:events';import WebSocket,{WebSocketServer} from 'ws';import {attachNativeRelay} from '../native-relay.js';
test('native fallback authenticates room membership and forwards original control and binary data',{timeout:10000},async()=>{
 const server=http.createServer(),wss=new WebSocketServer({server});const tokens={a:{id:'a',slot:0},b:{id:'b',slot:1},c:{id:'c',slot:0}};attachNativeRelay(wss,(token,code)=>code===(token==='c'?'ROOM':'TEST')?tokens[token]:null);server.listen(0,'127.0.0.1');await once(server,'listening');const clients=[];
 const connect=async(token,code)=>{const ws=new WebSocket('ws://127.0.0.1:'+server.address().port),messages=[];clients.push(ws);ws.on('message',(data,binary)=>messages.push(binary?Buffer.from(data):JSON.parse(data)));await once(ws,'open');ws.send(JSON.stringify({t:'auth',token,code}));return {ws,messages}};
 const wait=async predicate=>{for(let i=0;i<200;i++){const value=predicate();if(value)return value;await new Promise(r=>setTimeout(r,10))}throw Error('Missing native relay message')};
 try{
 const bad=await connect('bad','TEST');assert.equal((await once(bad.ws,'close'))[0],4003);const a=await connect('a','TEST'),b=await connect('b','TEST'),other=await connect('c','ROOM');await wait(()=>a.messages.some(m=>m.t==='peers'&&m.ids.length===2));
 a.ws.send(JSON.stringify({t:'ctl',to:'b',payload:{t:'k',d:54321}}));await wait(()=>b.messages.some(m=>m.t==='ctl'&&m.from==='a'&&m.payload.d===54321));
 a.ws.send(Buffer.from([1,1,42,43,44]));const binary=await wait(()=>b.messages.find(Buffer.isBuffer));assert.deepEqual(binary,Buffer.from([1,0,42,43,44]));
 a.ws.send(JSON.stringify({t:'ctl',to:'c',payload:{t:'k',d:999}}));await new Promise(r=>setTimeout(r,40));assert.ok(!other.messages.some(m=>m.t==='ctl'));
 }finally{for(const ws of clients)ws.terminate();await new Promise(r=>wss.close(r));await new Promise(r=>server.close(r))}
});
