export function publicOrigin(value){
  if(!value?.trim())return null;
  let url;try{url=new URL(value.trim())}catch{throw Error('PUBLIC_URL must be a full http:// or https:// address')}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash){
    throw Error('PUBLIC_URL must be an http(s) origin, without credentials, path, query or fragment');
  }
  return url.origin;
}
