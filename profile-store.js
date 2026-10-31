import fs from 'node:fs';import path from 'node:path';
export function validateProfiles(value){if(!value||!value.accounts||typeof value.accounts!=='object'||Array.isArray(value.accounts))throw Error('Invalid private save store');return value}
export async function createProfileStore({connectionString,file,pool:providedPool}={}){
 if(!connectionString&&!providedPool){return {kind:'file',async load(){try{return validateProfiles(JSON.parse(fs.readFileSync(file,'utf8')))}catch(error){if(error.code==='ENOENT')return {accounts:{}};throw Error('Cannot load private saves; refusing to replace them',{cause:error})}},async save(db){validateProfiles(db);fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(db));fs.renameSync(temp,file)},async close(){}}}
 const pool=providedPool??new (await import('pg')).default.Pool({connectionString,max:1,idleTimeoutMillis:5000,connectionTimeoutMillis:10000,query_timeout:15000});
 pool.on?.('error',()=>console.error('Private database connection interrupted'));
 let revision=0,loaded=false;
 await pool.query('CREATE TABLE IF NOT EXISTS pokebonk_private_profiles (id INTEGER PRIMARY KEY CHECK (id=1), revision BIGINT NOT NULL, data JSONB NOT NULL)');
 let initial={accounts:{}};if(file&&fs.existsSync(file))initial=validateProfiles(JSON.parse(fs.readFileSync(file,'utf8')));
 await pool.query('INSERT INTO pokebonk_private_profiles(id,revision,data) VALUES (1,0,$1::jsonb) ON CONFLICT (id) DO NOTHING',[JSON.stringify(initial)]);
 return {kind:'postgres',async load(){const result=await pool.query('SELECT revision,data FROM pokebonk_private_profiles WHERE id=1');if(result.rows.length!==1)throw Error('Private save row missing');revision=Number(result.rows[0].revision);loaded=true;return validateProfiles(result.rows[0].data)},async save(db){if(!loaded)throw Error('Load saves before writing');validateProfiles(db);const result=await pool.query('UPDATE pokebonk_private_profiles SET data=$1::jsonb, revision=revision+1 WHERE id=1 AND revision=$2 RETURNING revision',[JSON.stringify(db),revision]);if(result.rowCount!==1)throw Error('Another server updated these saves; restart this instance before writing');revision=Number(result.rows[0].revision)},async close(){await pool.end()}};
}
