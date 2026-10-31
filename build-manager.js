import fs from 'node:fs';import path from 'node:path';
const origin='https://pokebonk.com';
export async function prepareBuild({cache,root,validate,fetcher=fetch}){
 fs.mkdirSync(cache,{recursive:true});const indexPath=path.join(cache,'active-index.html'),recordPath=path.join(cache,'active-build.json');
 let saved;try{saved=JSON.parse(fs.readFileSync(recordPath,'utf8'))}catch{}
 let info={build:saved?.build??'mvv70wso',version:saved?.version??'0.8.83',latest:null,updateError:null,indexPath:fs.existsSync(indexPath)?indexPath:path.join(root,'private.html')};
 async function read(url){const response=await fetcher(url,{signal:AbortSignal.timeout(12000),cache:'no-store'});if(!response.ok)throw Error('Official asset request failed');return response.text()}
 try{
  const version=JSON.parse(await read(origin+'/version.json'));if(!/^[a-z0-9]{8}$/.test(version.build)||typeof version.version!=='string')throw Error('Invalid official version record');info.latest=version.version;
  const html=await read(origin+'/'),entry=/src="\.?\/?(assets\/main-[^"/]+\.js)"/.exec(html)?.[1];if(!entry||!entry.includes(version.build))throw Error('Official entry and version do not match');
  const loader=await read(origin+'/'+entry),main=[...loader.matchAll(/\.\/(main-[\w-]+\.js)/g)].map(m=>'assets/'+m[1]).find(x=>x!==entry);if(!main)throw Error('Official game entry missing');
  const game=await read(origin+'/'+main),result=validate(game);if(result.failed.length)throw Error('Native mod compatibility check failed: '+result.failed.join(', '));
  const normalized=html.replaceAll('./assets/','/assets/');
  for(const [file,text]of [[entry,loader],[main,game]]){const target=path.join(cache,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.tmp',text);fs.renameSync(target+'.tmp',target)}
  fs.writeFileSync(indexPath+'.tmp',normalized);fs.renameSync(indexPath+'.tmp',indexPath);fs.writeFileSync(recordPath,JSON.stringify(version));
  info={...info,build:version.build,version:version.version,indexPath};
 }catch(error){info.updateError=error.message;console.warn('Official update check:',error.message)}
 return info;
}
