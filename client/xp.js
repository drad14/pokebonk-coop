// One host-owned XP bar and one set of XP gems for the whole party.
(()=>{
  const LAN=window.LAN;
  let current=null;
  const valid=n=>Number.isFinite(n)&&n>0;
  const active=s=>current===s&&s.run===LAN.run&&s.run.__lan?.sync&&s.run.state!=='over';
  function removeSlot(s,record){
    const q=s.run.pickups,i=record.index;
    if(s.byIndex.get(i)!==record.id)return;
    s.byIndex.delete(i);
    if(q.alive[i]&&q.kind[i]===0){q.alive[i]=0;q.count--;q.free.push(i)}
  }
  function clearOrbs(s){
    for(const record of s.orbs.values())removeSlot(s,record);
    s.orbs.clear();s.byIndex.clear();s.claims.clear();s.changed.clear();s.removed.clear();
  }
  function stage(s){
    if(s.stage===s.run.stage)return;
    clearOrbs(s);s.stage=s.run.stage;s.fullAt=0;
    if(!LAN.isHost)LAN.send({t:'xpsync',seed:s.run.seed,stage:s.stage});
  }
  function multiplier(s){
    const gains=[s.run.player.stats.xpGain];
    for(const peer of LAN.visiblePuppets(s.run))if(Number.isFinite(peer.target.xpg))gains.push(peer.target.xpg);
    return gains.reduce((sum,g)=>sum+Math.max(0,Math.min(100,g)),0)/gains.length;
  }
  function award(s,amount,levels=0){
    if(levels){s.nativeLevel();return}
    if(!valid(amount))return;
    const p=s.run.player;
    p.xp+=amount*multiplier(s)*s.run.diff.xpMult;
    while(p.xp>=p.xpNext&&valid(p.xpNext)){
      p.xp-=p.xpNext;p.level++;p.xpNext=p.xpForLevel(p.level);s.run.queueLevel();
    }
    p.afterLevel();
  }
  function collect(s,id){
    const record=s.orbs.get(id);
    if(!record){s.removed.add(id);return}
    const q=s.run.pickups;
    // A gem may have merged since a client last saw it: use its current value.
    const value=s.byIndex.get(record.index)===id?q.value[record.index]:record.value;
    removeSlot(s,record);s.orbs.delete(id);s.changed.delete(id);s.removed.add(id);
    award(s,value);
  }
  function createMirror(s,row){
    const [id,x,y,z,value]=row;
    if(!Number.isSafeInteger(id)||!valid(value)||![x,y,z].every(Number.isFinite)||s.claims.has(id))return;
    const q=s.run.pickups;
    let record=s.orbs.get(id);
    if(record&&(!q.alive[record.index]||s.byIndex.get(record.index)!==id)){
      s.orbs.delete(id);record=null;
    }
    if(!record){
      const index=q.free.length?q.free[q.free.length-1]:q.n,count=q.count;
      s.mirroring=true;
      try{s.nativeSpawn('xp',x,y-.6,z,value)}finally{s.mirroring=false}
      if(q.count===count)return;
      record={id,index,value};s.orbs.set(id,record);s.byIndex.set(index,id);
    }
    record.value=value;q.value[record.index]=value;
    q.x[record.index]=x;q.y[record.index]=y;q.z[record.index]=z;
  }
  function snapshot(s,full=false){
    if(!LAN.isHost||!active(s))return;
    const p=s.run.player,q=s.run.pickups;
    const records=full?s.orbs.values():[...s.changed].map(id=>s.orbs.get(id)).filter(Boolean);
    const orbs=Array.from(records,r=>[r.id,q.x[r.index],q.y[r.index],q.z[r.index],q.value[r.index]]);
    LAN.send({t:'xp',seed:s.run.seed,stage:s.stage,seq:++s.sequence,level:p.level,xp:p.xp,next:p.xpNext,
      full,orbs,removed:[...s.removed],acks:[...s.acks]});
    s.changed.clear();s.removed.clear();
  }
  function apply(s,m){
    if(m.stage!==s.run.stage||s.run.state==='transition'||m.seq<=s.received)return;
    if(!Number.isInteger(m.level)||m.level<1||m.level>10000||!valid(m.next)||!Number.isFinite(m.xp)||m.xp<0)return;
    const first=s.received===0;
    stage(s);s.received=m.seq;
    const p=s.run.player,delta=m.level-p.level;
    p.level=m.level;p.xp=m.xp;p.xpNext=m.next;
    for(let i=0;i<delta;i++)s.run.queueLevel();
    if(delta)p.afterLevel();
    const ack=(m.acks??[]).find(([actor])=>actor===LAN.key)?.[1]??0;
    if(first){
      let sequence=ack;
      for(const request of s.requests){request.seq=++sequence;LAN.send(request)}
      s.requestSequence=Math.max(s.requestSequence,sequence);
    }else s.requests=s.requests.filter(request=>request.seq>ack);
    s.requestSequence=Math.max(s.requestSequence,ack);
    if(m.full){
      const present=new Set((m.orbs??[]).map(row=>row[0]));
      for(const [id,record]of s.orbs)if(!present.has(id)){removeSlot(s,record);s.orbs.delete(id)}
      for(const id of s.claims)if(!present.has(id))s.claims.delete(id);
    }
    for(const id of m.removed??[]){const record=s.orbs.get(id);if(record)removeSlot(s,record);s.orbs.delete(id);s.claims.delete(id)}
    for(const row of m.orbs??[])createMirror(s,row);
  }
  function request(s,amount,levels=0){
    if(LAN.isHost){award(s,amount,levels);snapshot(s);return}
    const message={t:'xpgain',seed:s.run.seed,seq:++s.requestSequence,amount,levels};
    s.requests.push(message);if(s.received)LAN.send(message);
  }
  LAN.on('xp',m=>{
    const s=current;if(!s||LAN.isHost||m.from!==LAN.hostId||m.seed!==s.run.seed||!active(s))return;
    if(!s.latest||m.seq>s.latest.seq)s.latest=m;
    apply(s,m);
  });
  LAN.on('xpclaim',m=>{
    const s=current;if(!s||!LAN.isHost||!active(s)||m.seed!==s.run.seed||m.stage!==s.stage)return;
    for(const id of (Array.isArray(m.ids)?m.ids:[]).slice(0,500))if(Number.isSafeInteger(id)&&id>0)collect(s,id);
    snapshot(s);
  });
  LAN.on('xpgain',m=>{
    const s=current;if(!s||!LAN.isHost||!active(s)||m.seed!==s.run.seed)return;
    if(!Number.isSafeInteger(m.seq)||m.seq<1||typeof m.actor!=='string')return;
    const last=s.acks.get(m.actor)??0;
    if(m.seq>last&&m.seq<=last+100){
      if(!(m.levels===1&&m.amount===0)&&!(m.levels===0&&valid(m.amount)&&m.amount<=1e7))return;
      let waiting=s.incoming.get(m.actor);if(!waiting)s.incoming.set(m.actor,waiting=new Map);
      waiting.set(m.seq,m);
      let next=last+1;
      while(waiting.has(next)){
        const request=waiting.get(next);waiting.delete(next);award(s,request.amount,request.levels);s.acks.set(m.actor,next++);
      }
    }
    snapshot(s);
  });
  LAN.on('xpsync',m=>{const s=current;if(s&&LAN.isHost&&active(s)&&m.seed===s.run.seed)snapshot(s,true)});
  LAN.xp={
    install(run){
      if(!run.__lan?.sync)return;
      const q=run.pickups,p=run.player;
      const s=current={run,stage:run.stage,orbs:new Map,byIndex:new Map,changed:new Set,removed:new Set,claims:new Set,
        acks:new Map,incoming:new Map,requests:[],sequence:0,received:0,serial:0,requestSequence:0,sendAt:0,fullAt:0,retryAt:0,
        nativeSpawn:q.spawn.bind(q),nativeUpdate:q.update.bind(q),nativeXp:p.addXp.bind(p),nativeLevel:p.grantLevel.bind(p)};
      const merge=q.mergePickups?.bind(q);
      if(merge)q.mergePickups=()=>{
        if(!active(s))return merge();
        // Native merging removes a gem without collecting it. Protect shared
        // gems so that removal cannot be mistaken for a collection; coins can merge.
        const held=[];
        for(let i=0;i<q.n;i++)if(q.alive[i]&&q.kind[i]===0&&!q.attract[i]){held.push(i);q.attract[i]=1}
        try{return merge()}finally{for(const i of held)q.attract[i]=0}
      };
      p.addXp=amount=>{
        if(!active(s))return s.nativeXp(amount);
        if(!s.updating&&valid(amount))request(s,amount);
      };
      p.grantLevel=()=>active(s)?request(s,0,1):s.nativeLevel();
      // Remote enemy credit must not create a second set of XP gems.
      q.dropXp=(x,y,z,value)=>{if(LAN.isHost)q.spawn('xp',x,y,z,value)};
      q.spawn=(kind,x,y,z,value)=>{
        if(!active(s))return s.nativeSpawn(kind,x,y,z,value);
        stage(s);
        if(kind==='xp'&&!LAN.isHost&&!s.mirroring)return;
        if(kind==='xp'&&LAN.isHost&&s.orbs.size>=500){
          const record=s.orbs.values().next().value;
          if(record&&q.alive[record.index]&&s.byIndex.get(record.index)===record.id){
            q.value[record.index]+=value;record.value=q.value[record.index];s.changed.add(record.id);return;
          }
        }
        const index=q.free.length?q.free[q.free.length-1]:q.n,count=q.count;
        s.nativeSpawn(kind,x,y,z,value);
        if(q.count===count){if(kind==='xp'&&LAN.isHost)award(s,value);return}
        s.byIndex.delete(index);
        if(kind==='xp'&&LAN.isHost){
          const id=++s.serial;const record={id,index,value};s.orbs.set(id,record);s.byIndex.set(index,id);s.changed.add(id);
        }
      };
      q.update=dt=>{
        if(!active(s))return s.nativeUpdate(dt);
        stage(s);s.updating=true;
        try{s.nativeUpdate(dt)}finally{s.updating=false}
        for(const [id,record]of [...s.orbs])if(!q.alive[record.index]||q.kind[record.index]!==0||s.byIndex.get(record.index)!==id){
          if(LAN.isHost)collect(s,id);
          else{s.orbs.delete(id);if(s.byIndex.get(record.index)===id)s.byIndex.delete(record.index);s.claims.add(id)}
        }
        if(!LAN.isHost&&s.claims.size)LAN.send({t:'xpclaim',seed:run.seed,stage:s.stage,ids:[...s.claims]});
      };
      if(LAN.isHost)snapshot(s,true);else LAN.send({t:'xpsync',seed:run.seed,stage:run.stage});
    },
    pre(run){const s=current;if(s?.run!==run)return;stage(s);if(!LAN.isHost&&s.latest)apply(s,s.latest)},
    post(run,dt){
      const s=current;if(s?.run!==run||!active(s))return;stage(s);
      if(LAN.isHost){
        s.sendAt+=dt;s.fullAt+=dt;
        if(s.sendAt>=.2){s.sendAt=0;const full=s.fullAt>=1.5;if(full)s.fullAt=0;snapshot(s,full)}
      }else{
        s.retryAt+=dt;
        if(s.retryAt>=1){s.retryAt=0;
          if(s.claims.size)LAN.send({t:'xpclaim',seed:run.seed,stage:s.stage,ids:[...s.claims]});
          for(const message of s.requests)LAN.send(message);
        }
      }
    },
    reset(){current=null},
    get info(){const s=current;return s?{orbs:s.orbs.size,claims:s.claims.size,pending:s.requests.length,sequence:s.received||s.sequence}:null},
  };
})();
