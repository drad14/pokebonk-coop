// A hidden click reward on the actual moving Gastly sprites in the native menu.
(()=>{
 const LAN=window.LAN;let busy=false,pending=null,notice;
 function hit(x,y){
  const app=window.__pbApp,scene=app?.menuScene;
  if(app?.run||scene?.mode!=='title'||!document.querySelector('.screen.mm:not(.auth)')||document.querySelector('dialog[open]'))return false;
  const batch=scene.sprites?.batches.get(92),camera=app.r.camera,canvas=document.getElementById('game');
  if(!batch?.ready||!canvas)return false;
  const rect=canvas.getBoundingClientRect(),positions=batch.aPos.array,sizes=batch.aSize.array;
  camera.updateMatrixWorld();
  for(let i=0;i<batch.count;i++){
   if(batch.aFx.array[i*4+1]>.65)continue;
   const world=camera.position.clone().set(positions[i*3],positions[i*3+1],positions[i*3+2]);
   const depth=-world.clone().applyMatrix4(camera.matrixWorldInverse).z;if(depth<=0)continue;
   const center=world.project(camera);if(center.z<-1||center.z>1)continue;
   const cx=rect.left+(center.x+1)*rect.width/2,cy=rect.top+(1-center.y)*rect.height/2;
   const width=sizes[i*2]*camera.projectionMatrix.elements[0]*rect.width/(2*depth),height=sizes[i*2+1]*camera.projectionMatrix.elements[5]*rect.height/(2*depth);
   if(Math.abs(x-cx)<=width*.46&&Math.abs(y-cy)<=height*.46)return true;
  }
  return false;
 }
 function pop(text,x,y){
  notice?.remove();notice=document.createElement('span');notice.textContent=text;
  notice.style.cssText='position:fixed;z-index:100;pointer-events:none;padding:7px 13px;border-radius:99px;background:#302346;color:#e6c8ff;border:2px solid #bd80ff;box-shadow:0 4px 12px #0005;font:900 14px Nunito,system-ui;';
  notice.style.left=Math.max(8,Math.min(innerWidth-185,x-60))+'px';notice.style.top=Math.max(8,y-45)+'px';document.body.append(notice);
  const n=notice;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)n.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-30px)'}],{duration:1400,easing:'ease-out',fill:'forwards'});setTimeout(()=>n.remove(),1450);
 }
 async function claim(x,y){
  if(busy)return;const account=window.__pbApp?.meta.account;if(!account)return;
  busy=true;if(!pending||pending.account!==account.id)pending={account:account.id,requestId:crypto.randomUUID()};
  try{
   const response=await fetch('/api/gacha/ghost',{method:'POST',headers:{Authorization:'Bearer '+account.token,'Content-Type':'application/json'},body:JSON.stringify({requestId:pending.requestId})});
   const value=await response.json();if(!response.ok)throw Error('Ticket save failed');
   pending=null;LAN.tickets.adopt(value);pop('+1 purple ticket 👻',x,y);
  }catch{pop('Tap again to save 👻',x,y)}finally{busy=false}
 }
 addEventListener('click',event=>{
  if(event.button!==0)return;const screen=document.querySelector('.screen.mm:not(.auth)');
  // Respect menu buttons and panels that visually cover the scenery.
  if(event.target!==screen&&event.target?.id!=='game')return;
  if(!hit(event.clientX,event.clientY))return;event.preventDefault();event.stopImmediatePropagation();claim(event.clientX,event.clientY);
 },true);
})();
