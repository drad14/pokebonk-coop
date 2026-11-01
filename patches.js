// Explicit, fail-closed modifications for verified official PokéBonk builds through 0.8.86.
export const isGameBundle=src=>src.includes('async boot()')&&src.includes('https://api.pokebonk.com');
export function patchPrivateLoader(src){const anchor='if(!y(location.hostname))b();else return';if(!src.includes('pokebonk:modules-ready'))return src;if(src.split(anchor).length!==2)throw Error('Unsupported loader');return src.replace(anchor,'if(!y(location.hostname)&&!window.LAN?.privateHost)b();else return')}
export function patchBundle(src){let code=src;const failed=[];const modern=src.includes('async boot(){oz(this);');
const xpCurve=/addXp\(e\)\{for\(this\.xp\+=e\*this\.stats\.xpGain\*this\.run\.diff\.xpMult;[^}]*?this\.xpNext=this\.([\w$]+)\(this\.level\)/.exec(src)?.[1];
const xpLevel=/([\w$]+)\(\)\{this\.level\+\+,this\.xpNext=this\.[\w$]+\(this\.level\),this\.xp=Math\.min\(this\.xp,this\.xpNext\*\.99\)/.exec(src)?.[1];
const patch=(name,find,replace,count=1)=>{if(code.split(find).length-1!==count){failed.push(name);return}code=code.split(find).join(replace)};
patch('private API','`https://api.pokebonk.com`','`/api`');
patch('private login',modern?'captcha:await kk()':'captcha:await Ck()','captcha:null',3);
patch('native mod bridge',modern?'async boot(){oz(this);':'async boot(){vR(this);','async boot(){window.__pbApp=this;window.LAN.game={normalize:'+(modern?'$O':'qO')+',portrait:'+(modern?'_O':'dO')+',xpMethods:{curve:"'+xpCurve+'",level:"'+xpLevel+'"},icon:Q,symbol:Z,click:()=>N.click(),nativeLobby:()=>'+(modern?'Jz':'iz')+'(this),nativeJoin:code=>'+(modern?'Yz':'az')+'(this,code,error=>this.notice(error.message)),nativeRoom:'+(modern?'PR':'KL')+',ticketKinds:()=>{for(const [name,col]of [["ticket-gold",16766758],["ticket-purple",11817983]]){if(!'+(modern?'Jg':'Gg')+'.includes(name)){const i='+(modern?'Jg':'Gg')+'.push(name)-1;'+(modern?'Yg':'Kg')+'[i]={shape:I.Square,col,pillar:2}}}return {gold:'+(modern?'Jg':'Gg')+'.indexOf("ticket-gold"),purple:'+(modern?'Jg':'Gg')+'.indexOf("ticket-purple"),square:I.Square,soft:I.Soft}}};window.LAN.init(this);'+(modern?'oz':'vR')+'(this);');
patch('gacha menu','!o.guest&&Nt(o.name)&&e.backend.renameAccount','window.LAN.menu.home(e,{screen:pe,gacha:te.children[3],navigation:l});!o.guest&&Nt(o.name)&&e.backend.renameAccount');
patch('ticket pickup rendering','let c=Math.sin(e*4+o)*.12,l=this.y[o]+c;','if(window.LAN?.tickets?.renderPickup(this,o,e))continue;let c=Math.sin(e*4+o)*.12,l=this.y[o]+c;');
patch('dispose menu placeholder','dispose(){this.title.dispose(),this.terrain?.dispose(),this.sprites.clear(),this.r.scene.remove(this.sprites.shadows.mesh)}','dispose(){this.title.dispose(),this.terrain?.dispose(),this.sprites.clear(),this.sprites.standIn.dispose(),this.r.scene.remove(this.sprites.shadows.mesh)}');
patch('eight native slots','for(let e=0;e<4;e++){let e={el:X(`div`,{class:`cp-slot`})','for(let e=0;e<8;e++){let e={el:X(`div`,{class:`cp-slot`})');
patch('eight rendered native slots',modern?'for(let e=0;e<4;e++)S(_[e],n.members[e],e)':'for(let e=0;e<4;e++)x(_[e],n.members[e],e)',modern?'for(let e=0;e<8;e++)S(_[e],n.members[e],e)':'for(let e=0;e<8;e++)x(_[e],n.members[e],e)');
patch('native room counter','${s}/4',modern?'${s}/${DC(n)}':'${s}/${xC(n)}',2);
patch('eight readiness portraits','Array.from({length:p?de:4}','Array.from({length:p?de:8}');
patch('eight open seat choices','[2,3,4].filter(e=>e>r)','[2,3,4,8].filter(e=>e>r)');
patch('native capacity',(modern?'DC':'xC')+'=e=>e.want&&e.want>=2&&e.want<=4?e.want:4',(modern?'DC':'xC')+'=e=>e.want&&e.want>=2&&e.want<=8?e.want:8');
patch('co-op menu range','c(`Con amigos · 2-4`)','`With friends · 2-8`',2);
patch('co-op menu tooltip','c(`Cooperativo: juega el modo clásico con 1-3 amigos`)','`Native co-op with up to 7 friends`');
patch('eight-player labels','{min:2,max:4}','{min:2,max:8}',2);
patch('eight-player name',(modern?'pz':'TR')+'={2:()=>c(`Dúo`),3:()=>c(`Trío`),4:()=>c(`Escuadra`)}',(modern?'pz':'TR')+'={2:()=>c(`Dúo`),3:()=>c(`Trío`),4:()=>c(`Escuadra`),8:()=>`8 players`}');
patch('eight-player filters','[2,3,4].map','[2,3,4,8].map',2);
patch('eight-player quick preference','[0,2,3,4].includes(t?.size)','[0,2,3,4,8].includes(t?.size)');
patch('eight player scaling',(modern?'OC':'SC')+'={1:1,2:.85,3:.8,4:.75},'+(modern?'kC':'CC')+'={1:1,2:1.25,3:1.5,4:1.75}',(modern?'OC':'SC')+'={1:1,2:.85,3:.8,4:.75,5:.75,6:.75,7:.75,8:.75},'+(modern?'kC':'CC')+'={1:1,2:1.25,3:1.5,4:1.75,5:2,6:2.25,7:2.5,8:2.75}');
const bridgeDeps=modern?['function $O(','function _O(','PR=class e','function Jz(','async function Yz(','Jg=[','Yg={']:['function qO(','function dO(','KL=class e','function iz(','async function az(','Gg=[','Kg={'];if(bridgeDeps.some(anchor=>!src.includes(anchor)))failed.push('native bridge helpers');
patch('private ladder summary title','c(`Partida no clasificada`)','`Private rankings`',4);
patch('private ladder summary fallback','c(`No cumple las comprobaciones del servidor.`)','`Private records update when this run finishes saving.`',3);
patch('private co-op guest note','c(`Con un invitado, este equipo no puntúa`)','`Finished runs count toward The Gay Boys Rank`');
if(!xpCurve||!xpLevel)failed.push('native team XP helpers');
if(!src.includes('p=7'))failed.push('native co-op protocol');return {code,failed}}
