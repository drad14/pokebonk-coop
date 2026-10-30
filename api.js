// Local stand-in for api.pokebonk.com. Accounts live in ./data/accounts.json on
// the host machine; nothing is sent to the official servers or leaderboards.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { gachaView, pull, awardTickets } from './gacha.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.PBCOOP_DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA, 'accounts.json');

let db = { accounts: {} };
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
catch(error){if(error.code!=='ENOENT')throw new Error('Cannot load private saves; refusing to replace the existing accounts file',{cause:error})}
if(!db||!db.accounts||typeof db.accounts!=='object'||Array.isArray(db.accounts))throw Error('Invalid private accounts file; restore a valid backup before starting');

let saveTimer = null;
function persist(){
  clearTimeout(saveTimer);
  saveTimer=null;
  fs.mkdirSync(DATA,{recursive:true});
  const temporary=DB_FILE+'.tmp';
  fs.writeFileSync(temporary,JSON.stringify(db,null,1));
  fs.renameSync(temporary,DB_FILE);
}
export function flushPendingProfiles(){if(saveTimer)persist()}
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 200);
}

function newAccount(name, guest) {
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString('hex');
  const acc = { id, name, guest, token, created: Date.now(), profile: { name } };
  db.accounts[token] = acc;
  save();
  return acc;
}

const user = (a) => ({ id: a.id, name: a.name, guest: a.guest, token: a.token });

function byToken(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  return m ? db.accounts[m[1]] : null;
}

function byName(name) {
  return Object.values(db.accounts).find((a) => !a.guest && a.name.toLowerCase() === name.toLowerCase());
}

async function body(req) {
  let s = '';
  for await (const c of req) s += c;
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(value === undefined ? '' : JSON.stringify(value));
}

const union = (a = [], b = []) => [...new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])])];

// Applies a finished run to the player's local profile and returns the
// stardust earned (a simple, generous LAN formula).
function finishRun(p, r) {
  const prog = r.progress ?? {};
  p.counters ??= {};
  for (const [k, v] of Object.entries(prog.counters ?? {})) p.counters[k] = (p.counters[k] ?? 0) + v;
  p.research ??= {};
  for (const [k, v] of Object.entries(prog.research ?? {})) p.research[k] = (p.research[k] ?? 0) + v;
  p.seen = union(p.seen, prog.seen);
  p.league = union(p.league, prog.league);
  p.shinies = union(p.shinies, prog.shinies);
  p.forms = union(p.forms, prog.forms);
  p.played = union(p.played, [r.species]);
  const tierMult = 1 + (r.tier ?? 0) * 0.5;
  const stardust = Math.round(
    ((r.kills ?? 0) * 0.4 + (r.bosses ?? 0) * 40 + (r.legendaries ?? 0) * 120 + (r.victory ? 250 : 0)) * tierMult,
  );
  p.stardust = (p.stardust ?? 0) + stardust;
  p.totalStardust = (p.totalStardust ?? 0) + stardust;
  if (r.victory && r.biome) {
    p.biomes ??= { forest: 0 };
    p.biomes[r.biome] = Math.max(p.biomes[r.biome] ?? 0, (r.tier ?? 0) + 1);
  }
  p.runs = [...(p.runs ?? []), {
    species: r.species, biome: r.biome, tier: r.tier, stage: r.stage, time: r.time,
    kills: r.kills, level: r.level, victory: r.victory, date: Date.now(),
  }].slice(-50);
  return stardust;
}

export async function handleApi(req, res, route, url) {
  const m = req.method;
  const acc = byToken(req);
  const need = () => { if (!acc) { json(res, 401, { error: 'Session expired' }); return false; } return true; };

  if (route === '/status') return json(res, 200, { maintenance: { on: false }, lan: true,
    season: { n: 0, name: 'Private', live: false }, events: [] });
  if (route === '/leaderboard') return json(res, 200, {
    info: { n: 0, name: 'Private', live: false }, entries: [], players: 0, me: null });
  if (route === '/seasons/awards' && m === 'GET') return json(res, 200, []);
  if (route === '/runs/saved' && m === 'GET') return json(res, 200, { saved: null });
  // This mod uses its own relay, not the official game's party service.
  if (route === '/coop/access' && m === 'GET') return json(res, 200, { show: false, play: false });

  if (route === '/auth/guest' && m === 'POST') {
    const a = newAccount('Guest' + Math.floor(Math.random() * 9000 + 1000), true);
    return json(res, 200, user(a));
  }
  if (route === '/auth/me') return need() && json(res, 200, user(acc));
  if (route.startsWith('/auth/name')) {
    const name = url.searchParams.get('name') || '';
    return json(res, 200, { available: !byName(name) });
  }
  if ((route === '/auth/register' || route === '/auth/upgrade') && m === 'POST') {
    const b = await body(req);
    const name = String(b.name || '').trim().slice(0, 24) || 'Trainer';
    const existing = byName(name);
    if (existing) return json(res, 200, user(existing));
    if (route === '/auth/upgrade' && acc) {
      acc.name = name; acc.guest = false; acc.profile.name = name; save();
      return json(res, 200, user(acc));
    }
    return json(res, 200, user(newAccount(name, false)));
  }
  if (route === '/auth/login' && m === 'POST') {
    const b = await body(req);
    const name = String(b.name || '').trim().slice(0, 24);
    const a = byName(name) || newAccount(name || 'Trainer', false);
    return json(res, 200, user(a));
  }
  if (route === '/auth/logout') return json(res, 204);

  if(route==='/gacha'&&m==='GET'){
    if(!need())return;
    const result=gachaView(acc);persist();return json(res,200,result);
  }
  if(route==='/gacha/pull'&&m==='POST'){
    if(!need())return;
    const b=await body(req),before=structuredClone(acc);
    try{
      const receipt=pull(acc,b.count,b.requestId);
      persist();
      return json(res,200,{...gachaView(acc),...receipt,profile:{...acc.profile,name:acc.name}});
    }catch(error){
      for(const key of Object.keys(acc))delete acc[key];Object.assign(acc,before);
      return json(res,error.status||500,{error:error.status?error.message:'Could not save this pull. Your tickets were not spent.'});
    }
  }

  if (route === '/profile' && m === 'GET') {
    if (!need()) return;
    return json(res, 200, { profile: { ...acc.profile, name: acc.name }, now: Date.now() });
  }
  if (route === '/profile/prefs' && m === 'PUT') {
    if (!need()) return;
    Object.assign(acc.profile, await body(req));
    save();
    return json(res, 204);
  }
  if (route === '/profile/starter' && m === 'POST') {
    if (!need()) return;
    const b = await body(req);
    acc.profile.starter = b.id ?? acc.profile.starter;
    acc.profile.lastSpecies = b.id ?? acc.profile.lastSpecies;
    save();
    return json(res, 200, { profile: { ...acc.profile, name: acc.name } });
  }
  // Lab, items, quests: the game applies these to its local copy of the
  // profile first, so in LAN mode we simply store that copy.
  if (route === '/profile/full' && m === 'PUT') {
    if (!need()) return;
    const b = await body(req);
    if (b.profile && typeof b.profile === 'object') {
      const merged={...b.profile,name:acc.name};
      for(const field of ['league','unlocked','seen','shinies'])merged[field]=union(acc.profile[field],merged[field]);
      merged.captured={...merged.captured,...acc.profile.captured};
      acc.profile = merged;
      save();
    }
    return json(res, 200, { profile: { ...acc.profile, name: acc.name } });
  }

  // Runs are never ranked in LAN mode; progress is kept in the local profile.
  if (route === '/runs' && m === 'POST') {
    if (!need()) return;
    const ticket={id:'lan-'+crypto.randomUUID(),seed:crypto.randomInt(1,2**31),ranked:false};
    acc.activeRuns??={};acc.activeRuns[ticket.id]={created:Date.now()};save();
    return json(res,200,ticket);
  }
  if (/^\/runs\/[^/]+\/checkpoint$/.test(route)) return json(res, 204);
  if (/^\/runs\/[^/]+\/finish$/.test(route) && m === 'POST') {
    if (!need()) return;
    const { result = {} } = await body(req);
    const id=route.split('/')[2];
    if(acc.runReceipts?.[id])return json(res,200,{...acc.runReceipts[id],profile:{...acc.profile,name:acc.name}});
    if(!acc.activeRuns?.[id])return json(res,404,{error:'Private run ticket not found'});
    const stardust = finishRun(acc.profile, result);
    const tickets=awardTickets(acc,result);
    const record = {
      ...result,
      id: route.split('/')[2],
      date: Date.now(),
      ranked: false,
      score: Math.round((result.kills ?? 0) * 10 + (result.bosses ?? 0) * 500 + (result.victory ? 2000 : 0)),
    };
    const receipt={record,stardust,tickets,ranked:false};
    acc.runReceipts??={};acc.runReceipts[id]=receipt;
    const keys=Object.keys(acc.runReceipts);if(keys.length>100)delete acc.runReceipts[keys[0]];
    delete acc.activeRuns[id];persist();
    return json(res, 200, { ...receipt,profile:{...acc.profile,name:acc.name} });
  }

  if (m === 'GET') {
    if (/^\/(leaderboard|records|news|friends|mail|players|clans)/.test(route)) return json(res, 200, []);
  }
  return json(res, 404, { error: 'Not available in multiplayer mode' });
}

