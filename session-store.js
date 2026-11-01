import fs from'node:fs';import path from'node:path';
// A separate generation-guarded row keeps room checkpoints out of profile saves.
export async function createSessionStore({connectionString,file,pool:providedPool,generation=Date.now()}={}){
 if(!connectionString&&!providedPool)return{async load(){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(error){if(error.code==='ENOENT')return null;throw Error('Cannot read private room checkpoint',{cause:error})}},async save(snapshot){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(snapshot));fs.renameSync(file+'.tmp',file)},async close(){}};
 const pool=providedPool??new(await import('pg')).default.Pool({connectionString,max:1,idleTimeoutMillis:5000,connectionTimeoutMillis:10000,query_timeout:15000});pool.on?.('error',()=>console.error('Private room database connection interrupted'));
 await pool.query('CREATE TABLE IF NOT EXISTS pokebonk_private_sessions (id INTEGER PRIMARY KEY CHECK (id=1), generation BIGINT NOT NULL, data JSONB NOT NULL)');
 return{async load(){const result=await pool.query('SELECT data FROM pokebonk_private_sessions WHERE id=1');return result.rows[0]?.data??null},async save(snapshot){await pool.query('INSERT INTO pokebonk_private_sessions(id,generation,data) VALUES(1,$1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET generation=EXCLUDED.generation,data=EXCLUDED.data WHERE pokebonk_private_sessions.generation <= EXCLUDED.generation',[generation,JSON.stringify(snapshot)])},async close(){await pool.end()}};
}
