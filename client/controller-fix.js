// Clear stale native input and require neutral sticks after focus/reconnection.
(()=>{
 const raw=navigator.getGamepads?.bind(navigator);if(!raw)return;
 const blocked=new Set();let suspended=false;
 function reset(){const app=window.__pbApp;app?.pad?.releaseAll?.();app?.input?.releaseAll?.();if(app?.pad){app.pad.prev=[];app.pad.acts?.clear?.()}if(app?.run)app.run.autoRun=false;for(const pad of raw()??[])if(pad)blocked.add(pad.index)}
 function sanitize(pad){
  if(!pad?.connected)return null;
  const axes=Array.from(pad.axes??[],x=>Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0);
  const magnitude=Math.hypot(axes[0]??0,axes[1]??0),deadzone=.18;
  if(blocked.has(pad.index)&&magnitude<=deadzone&&!Array.from(pad.buttons??[]).some(b=>b.pressed||b.value>.5))blocked.delete(pad.index);
  const neutral=suspended||document.hidden||blocked.has(pad.index);
  if(neutral)axes.fill(0);
  if(neutral||magnitude<=deadzone){axes[0]=0;axes[1]=0}else{const scale=(Math.min(1,magnitude)-deadzone)/(1-deadzone)/magnitude;axes[0]*=scale;axes[1]*=scale}
  const buttons=neutral?Array.from(pad.buttons??[],()=>({pressed:false,touched:false,value:0})):pad.buttons;
  return new Proxy(pad,{get(target,key){if(key==='axes')return axes;if(key==='buttons')return buttons;return Reflect.get(target,key,target)}});
 }
 navigator.getGamepads=()=>Array.from(raw()??[],sanitize);
 addEventListener('blur',()=>{suspended=true;reset()});addEventListener('focus',()=>{suspended=false;reset()});
 document.addEventListener('visibilitychange',()=>{suspended=document.hidden;reset()});
 addEventListener('gamepaddisconnected',event=>{blocked.delete(event.gamepad.index);reset()});addEventListener('gamepadconnected',()=>reset());
 addEventListener('keydown',event=>{if(event.code==='F8'&&!/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName??'')){event.preventDefault();reset();window.__pbApp?.hud?.toast('Controller reset — release the stick and buttons to continue.',null)}},true);
 window.__pbController={reset,sanitize,get blocked(){return blocked.size}};
})();
