export function publicOrigin(value){
  if(!value?.trim())return null;
  let url;try{url=new URL(value.trim())}catch{throw Error('PUBLIC_URL must be a full http:// or https:// address')}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash){
    throw Error('PUBLIC_URL must be an http(s) origin, without credentials, path, query or fragment');
  }
  return url.origin;
}

export function hostedEnvironment(env=process.env){return env.RENDER==='true'||!!env.KOYEB_APP_ID||!!env.KOYEB_PUBLIC_DOMAIN}
export function hostedOrigin(env=process.env){
 const explicit=env.PUBLIC_URL?.trim()||env.RENDER_EXTERNAL_URL?.trim();if(explicit)return publicOrigin(explicit);
 const domain=env.KOYEB_PUBLIC_DOMAIN?.trim();return domain?publicOrigin('https://'+domain):null;
}
