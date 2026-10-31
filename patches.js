// Explicit, fail-closed modifications for official PokéBonk 0.8.83 / mvv70wso.
export const isGameBundle=src=>src.includes('async boot()')&&src.includes('https://api.pokebonk.com');
export function patchPrivateLoader(src){const anchor='if(!y(location.hostname))b();else return';if(!src.includes('pokebonk:modules-ready'))return src;if(src.split(anchor).length!==2)throw Error('Unsupported loader');return src.replace(anchor,'if(!y(location.hostname)&&!window.LAN?.privateHost)b();else return')}
export function patchBundle(src){let code=src;const failed=[];
const patch=(name,find,replace,count=1)=>{if(code.split(find).length-1!==count){failed.push(name);return}code=code.split(find).join(replace)};
patch('private API','`https://api.pokebonk.com`','`/api`');
patch('private login','captcha:await Ck()','captcha:null',3);
patch('native mod bridge','async boot(){vR(this);','async boot(){window.__pbApp=this;window.LAN.game={normalize:qO,portrait:dO,icon:Q,symbol:Z,click:()=>N.click(),nativeLobby:()=>iz(this),nativeJoin:code=>az(this,code,error=>this.notice(error.message)),nativeRoom:KL,ticketKinds:()=>{for(const [name,col]of [["ticket-gold",16766758],["ticket-purple",11817983]]){if(!Gg.includes(name)){const i=Gg.push(name)-1;Kg[i]={shape:I.Square,col,pillar:2}}}return {gold:Gg.indexOf("ticket-gold"),purple:Gg.indexOf("ticket-purple"),square:I.Square,soft:I.Soft}}};window.LAN.init(this);vR(this);');
patch('gacha menu','!o.guest&&Nt(o.name)&&e.backend.renameAccount','window.LAN.menu.home(e,{screen:pe,gacha:te.children[3],navigation:l});!o.guest&&Nt(o.name)&&e.backend.renameAccount');
patch('ticket pickup rendering','let c=Math.sin(e*4+o)*.12,l=this.y[o]+c;','if(window.LAN?.tickets?.renderPickup(this,o,e))continue;let c=Math.sin(e*4+o)*.12,l=this.y[o]+c;');
patch('eight native slots','for(let e=0;e<4;e++){let e={el:X(`div`,{class:`cp-slot`})','for(let e=0;e<8;e++){let e={el:X(`div`,{class:`cp-slot`})');
patch('native capacity','xC=e=>e.want&&e.want>=2&&e.want<=4?e.want:4','xC=e=>e.want&&e.want>=2&&e.want<=8?e.want:8');
patch('co-op menu range','c(`Con amigos · 2-4`)','`With friends · 2-8`',2);
patch('co-op menu tooltip','c(`Cooperativo: juega el modo clásico con 1-3 amigos`)','`Native co-op with up to 7 friends`');
patch('eight-player labels','{min:2,max:4}','{min:2,max:8}',2);
patch('eight-player name','TR={2:()=>c(`Dúo`),3:()=>c(`Trío`),4:()=>c(`Escuadra`)}','TR={2:()=>c(`Dúo`),3:()=>c(`Trío`),4:()=>c(`Escuadra`),8:()=>`8 players`}');
patch('eight-player filters','[2,3,4].map','[2,3,4,8].map',2);
patch('eight-player quick preference','[0,2,3,4].includes(t?.size)','[0,2,3,4,8].includes(t?.size)');
patch('eight player scaling','SC={1:1,2:.85,3:.8,4:.75},CC={1:1,2:1.25,3:1.5,4:1.75}','SC={1:1,2:.85,3:.8,4:.75,5:.75,6:.75,7:.75,8:.75},CC={1:1,2:1.25,3:1.5,4:1.75,5:2,6:2.25,7:2.5,8:2.75}');
if(!src.includes('p=7'))failed.push('native co-op protocol');return {code,failed}}
