// Additions only: native game owns movement, multiplayer, room lifecycle and HUD.
(()=>{
 const LAN=window.LAN={privateHost:true,run:null,ui:{refresh(){}},menu:{},handlers:{},on(t,fn){(this.handlers[t]??=[]).push(fn)}};
 LAN.toast=text=>window.__pbApp?.hud?.toast(text,null);
 LAN.init=app=>{
  const launch=app.launch.bind(app);app.launch=(...args)=>{const result=launch(...args);LAN.run=app.run;LAN.tickets?.install(app.run);return result};
  const menu=app.toMenu.bind(app);app.toMenu=(...args)=>{LAN.run=null;return menu(...args)};
  // Private profile updates retain the native client behavior for lab/items/quests.
  const be=app.backend;
  for(const name of ['buyLab','buyItem','archiveItem','claimQuest','claimTask','rerollTask'])if(typeof be[name]==='function')be[name]=async account=>{const result=await be.req('/profile/full','PUT',{profile:app.meta.profile},account.token);return app.meta.profile??result.profile};
 };
})();
