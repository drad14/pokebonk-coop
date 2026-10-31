// Additions only: native game owns movement, multiplayer, room lifecycle and HUD.
(()=>{
 const LAN=window.LAN={privateHost:true,run:null,ui:{refresh(){}},menu:{},handlers:{},on(t,fn){(this.handlers[t]??=[]).push(fn)}};
 LAN.toast=text=>window.__pbApp?.hud?.toast(text,null);
 LAN.init=app=>{
  const launch=app.launch.bind(app);app.launch=(...args)=>{const result=launch(...args);LAN.run=app.run;LAN.tickets?.install(app.run);return result};
  const menu=app.toMenu.bind(app);app.toMenu=(...args)=>{LAN.run=null;if(!app.run&&app.menuScene){app.menuScene.dispose();app.menuScene=null}return menu(...args)};
  // Private profile updates retain the native client behavior for lab/items/quests.
  const be=app.backend;
  const saveActions=async account=>{const profile=structuredClone(app.meta.profile);const result=await be.req('/profile/full','PUT',{profile},account.token);return LAN.game.normalize(result.profile)};
  // Native meta.act uses actions() whenever batching is available.
  for(const name of ['actions','buyLab','buyItem','buyShop','archiveItem','claimQuest','claimTask','rerollTask'])if(typeof be[name]==='function')be[name]=saveActions;
 };
})();
