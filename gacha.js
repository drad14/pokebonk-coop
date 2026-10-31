import fs from 'node:fs';
import crypto from 'node:crypto';

export const CATALOG=JSON.parse(fs.readFileSync(new URL('./catalog.json',import.meta.url),'utf8'));
export const RARITIES={common:60,uncommon:30,rare:9,legendary:1};
export const SHINY_DENOMINATOR=128;
const pools=Object.fromEntries(Object.keys(RARITIES).map(rank=>[rank,CATALOG.filter(p=>p.rank===rank)]));
if(Object.values(pools).some(p=>!p.length))throw Error('Incomplete playable gacha catalog');
const random=()=>crypto.randomInt(0,2**24)/2**24;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});

export function wallet(acc){
  const state=acc.gacha??= {tickets:10,pulls:0,recent:[],requests:[]};
  state.goldTickets??=0;
  return state;
}
export function gachaView(acc){
  const state=wallet(acc);
  return {tickets:state.tickets,purpleTickets:state.tickets,goldTickets:state.goldTickets,pulls:state.pulls,recent:state.recent.slice(-10),poolSize:CATALOG.length,
    odds:{rarities:RARITIES,shinyDenominator:SHINY_DENOMINATOR,pokemon:25,dust:{100:50,1000:20,2000:5}},
    earning:'10 gold tickets or 1 purple ticket = 1 roll. KOs: 1% gold, 0.1% purple, as personal ground pickups. Finished-run rewards remain purple tickets.'};
}
export function awardTickets(acc,result){
  const safe=(x,max)=>Number.isFinite(x)?Math.max(0,Math.min(max,Math.floor(x))):0;
  const amount=safe(result.time/60,20)+safe(result.bosses,5)+(result.victory===true?5:0);
  wallet(acc).tickets+=amount;
  return amount;
}
export function pull(acc,count,requestId,rng=random,currency='purple'){
  if(![1,10,100].includes(count))throw fail('Choose 1, 10 or 100 pulls.');
  if(!['gold','purple'].includes(currency))throw fail('Choose gold or purple tickets.');
  if(typeof requestId!=='string'||!/^[-\w]{12,80}$/.test(requestId))throw fail('A valid pull request ID is required.');
  const state=wallet(acc),previous=state.requests.find(r=>r.requestId===requestId);
  if(previous){if(previous.count!==count||(previous.currency??'purple')!==currency)throw fail('This request ID belongs to a different pull.');return previous;}
  const field=currency==='gold'?'goldTickets':'tickets',cost=count*(currency==='gold'?10:1);
  if(state[field]<cost)throw fail('Not enough '+currency+' tickets.',409);
  const profile=acc.profile;
  for(const field of ['league','unlocked','seen','shinies'])profile[field]??=[];
  profile.captured??={};
  const results=[];
  for(let i=0;i<count;i++){
    const outcome=rng();
    if(outcome<.75){
      const dust=outcome<.5?100:outcome<.7?1000:2000;
      profile.stardust=(profile.stardust??0)+dust;profile.totalStardust=(profile.totalStardust??0)+dust;
      results.push({kind:'dust',name:dust+' stardust',dust,rank:dust===2000?'rare':dust===1000?'uncommon':'common'});continue;
    }
    const roll=rng()*100;let sum=0,rank='legendary';
    for(const [name,chance]of Object.entries(RARITIES)){sum+=chance;if(roll<sum){rank=name;break}}
    const choices=pools[rank],pokemon=choices[Math.floor(rng()*choices.length)];
    const shiny=rng()<1/SHINY_DENOMINATOR;
    const newPokemon=!profile.league.includes(pokemon.id),newShiny=shiny&&!profile.shinies.includes(pokemon.id);
    const duplicate=!newPokemon&&!newShiny,dust=duplicate?(shiny?50:15):0;
    for(const [field,value]of [['league',pokemon.id],['unlocked',pokemon.family],['seen',pokemon.id]]){
      if(!profile[field].includes(value))profile[field].push(value);
    }
    if(newShiny)profile.shinies.push(pokemon.id);
    profile.captured[pokemon.family]??=Date.now();
    profile.stardust=(profile.stardust??0)+dust;
    profile.totalStardust=(profile.totalStardust??0)+dust;
    results.push({kind:'pokemon',id:pokemon.id,name:pokemon.name,rank,shiny,newPokemon,newShiny,duplicate,dust});
  }
  state[field]-=cost;state.pulls+=count;
  state.recent=[...state.recent,...results].slice(-50);
  const receipt={requestId,count,currency,cost,results};
  state.requests=[...state.requests,receipt].slice(-20);
  return receipt;
}

// Hidden menu reward; request receipts make a retried click safe.
export function claimGhostTicket(acc,requestId){
 if(typeof requestId!=='string'||!/^[-\w]{12,80}$/.test(requestId))throw fail('A valid ticket request ID is required.');
 const state=wallet(acc);state.ghostClaims??=[];
 if(state.ghostClaims.includes(requestId))return {awarded:0};
 state.tickets++;state.ghostClaims.push(requestId);state.ghostClaims=state.ghostClaims.slice(-64);
 return {awarded:1};
}
