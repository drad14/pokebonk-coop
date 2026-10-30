// String patches applied to the game bundle at serve time. Each `find` must
// match exactly once; a mismatch is reported so a game update is noticed early.
// Top-level minified names change between game builds, so those anchors are
// regular expressions that capture the name instead of hard-coding it.

// The game bundle is recognised by its content, not its file name (the name
// changes with every PokéBonk release).
export const isGameBundle = (src) => src.includes('`https://api.pokebonk.com`') && src.includes('async boot()');

// Keep the normal origin check unless this private server's own co-op client
// was explicitly loaded. This lets the same local instance use its private
// private tunnel without routing any account calls upstream.
export function patchPrivateLoader(src){
  const anchor='if(!y(location.hostname))b();else return';
  if(!src.includes('pokebonk:modules-ready'))return src;
  if(src.split(anchor).length!==2)throw Error('Private loader is not compatible with this build');
  return src.replace(anchor,'if(!y(location.hostname)&&!window.LAN?.privateHost)b();else return');
}

const PATCHES = [
  {
    name: 'private local sign-in',
    find: 'captcha:await Sk()',
    replace: 'captcha:null',
    expected: 3,
    all: true,
  },
  {
    name: 'local api',
    find: '`https://api.pokebonk.com`',
    replace: '`/api`',
  },
  {
    // Exposes the app instance so the LAN client can reach the active run.
    name: 'expose app',
    find: /async boot\(\)\{([\w$]+)\(this\)/g,
    replace: 'async boot(){window.__pbApp=this;window.LAN.game={catalog:()=>j.pokemon.filter(e=>dt(e.id,t=>j.root(t).id)?.id===e.id).map(e=>({id:e.id,name:e.name,family:lI.family(e.id),rank:dt(e.id,t=>j.root(t).id).rank??"common",types:e.types})),normalize:KO,portrait:uO,section:JU,icon:Q,symbol:Z,click:()=>N.click()};$1(this)',
  },
  {
    name: 'native home party and gacha controls',
    find: '!o.guest&&Nt(o.name)&&e.backend.renameAccount',
    replace: 'window.LAN?.menu?.home(e,{screen:pe,party:D,gacha:te.children[3],partyIcon:Z(`friends`,36),gachaIcon:Q(`great-ball`),navigation:l});!o.guest&&Nt(o.name)&&e.backend.renameAccount',
  },
  {
    // Lets the LAN client force the host's seed/biome on everyone's run.
    name: 'run config',
    find: /([\w$]+)=\{\.\.\.\1,seed:([\w$]+)\.seed,boosts:\2\.boosts\?\?\[\],\.\.\.\2\.mutation\?\{mutation:\2\.mutation\}:\{\}\}/g,
    replace: '$1=(window.LAN?.runCfg??(x=>x))({...$1,seed:$2.seed,boosts:$2.boosts??[],...$2.mutation?{mutation:$2.mutation}:{}})',
  },
  {
    // Host: each enemy chases the nearest living player, not just the host.
    name: 'enemy target',
    find: 'update(e){let t=this.run,n=t.player,r=t.terrain,i=t.coop,a=n.pos.x,o=n.pos.z,s=n.pos.y,l=i?i.targets:null,u=i?i.targetSlots:null,d=l?l.length:0;this.grid.build(this.n,this.x,this.z,this.alive,this.radius,this.dying);let f=this.grid,p=this.sepOdd^=1,m=++this.lodFrame;for(let h=0;h<this.n;h++){if(!this.alive[h])continue;',
    replace: 'update(e){let t=this.run,n=t.player,r=t.terrain,i=t.coop,a=n.pos.x,o=n.pos.z,s=n.pos.y,l=i?i.targets:null,u=i?i.targetSlots:null,d=l?l.length:0;const __m=window.LAN?.multi;this.grid.build(this.n,this.x,this.z,this.alive,this.radius,this.dying);let f=this.grid,p=this.sepOdd^=1,m=++this.lodFrame;for(let h=0;h<this.n;h++){if(!this.alive[h])continue;if(__m){LAN.pickTarget(this.x[h],this.z[h]);a=LAN.tx;o=LAN.tz;s=LAN.ty}',
  },
  {
    // Host: only push the host's own player when the enemy is chasing them.
    name: 'enemy crowd push',
    find: 'if(!(x&16512)){let e=this.x[h]-a,t=this.z[h]-o,i=(ne+n.radius)*.8',
    replace: 'if(!(x&16512)&&(!__m||LAN.tHost)){let e=this.x[h]-a,t=this.z[h]-o,i=(ne+n.radius)*.8',
  },
  {
    // Host: contact damage only hits the host when chasing the host; clients
    // resolve their own contact damage.
    name: 'enemy contact damage',
    find: 'if(!(x&16512)&&k<me&&',
    replace: 'if(!(x&16512)&&(!__m||LAN.tHost)&&k<me&&',
  },
  {
    // A defeated player (spectating a friend) stops attacking.
    name: 'dead players do not attack',
    find: /([\w$]+)\.moves\.forEach\(\(([\w$]+),([\w$]+)\)=>\{\2&&this\.castMove\(\3,\2,([\w$]+)\)\}\)/g,
    replace: '$1.dead||$1.moves.forEach(($2,$3)=>{$2&&this.castMove($3,$2,$4)})',
  },
  {
    // Far-enemy recycling considers every player (and never runs on clients).
    name: 'far enemies',
    find: 'let t=u.x[e]-n.pos.x,r=u.z[e]-n.pos.z;if(t*t+r*r>5625&&',
    replace: 'let t=u.x[e]-n.pos.x,r=u.z[e]-n.pos.z;if((window.LAN?.farCheck?LAN.farCheck(u.x[e],u.z[e],t*t+r*r):t*t+r*r>5625)&&',
  },
];

// Returns { code, failed: [patch names that didn't match exactly once] }.
export function patchBundle(src) {
  let out = src;
  const failed = [];
  for (const p of PATCHES) {
    const count = typeof p.find === 'string'
      ? out.split(p.find).length - 1
      : (out.match(p.find) ?? []).length;
    if (count !== (p.expected ?? 1)) {
      console.error(`[patch] "${p.name}" matched ${count} times (expected ${p.expected ?? 1})`);
      failed.push(p.name);
      continue;
    }
    out = typeof p.find === 'string' ? p.all ? out.replaceAll(p.find,p.replace) : out.replace(p.find, () => p.replace) : out.replace(p.find, p.replace);
  }
  // Public aliases for the two run methods renamed in build mvv1omyf.
  for(const [hash,name] of [['$eq3rx9','onPlayerDeath'],['$1hokhmd','enterPortal'],['$jk3ra4','dropXp'],['$gr2dgo','xpForLevel'],['$k6fa72','queueLevel'],['$15vz9t6','afterLevel'],['$1562bls','grantLevel'],['$49udp','mergePickups'],['$eazrr8','showPause']]){
    if(!out.includes(hash+'('))failed.push('current run alias '+name);
    else out=out.replaceAll(hash,name);
  }
  return { code: out, failed };
}

