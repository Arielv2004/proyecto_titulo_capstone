require('dotenv').config({quiet:true});
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const storage=require('../src/services/supabase.service'),db=require('../src/config/db');
(async()=>{
 await storage.assertPrivate();
 const client=require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const listed=await client.storage.from(process.env.SUPABASE_BUCKET).list('',{limit:100});
 assert(!listed.error);
 let checked=0;
 for(const item of listed.data||[]) if(item.id) {
  const old=process.env.SUPABASE_URL+'/storage/v1/object/public/'+process.env.SUPABASE_BUCKET+'/'+encodeURIComponent(item.name);
  assert(!(await fetch(old)).ok,'Una URL pública anterior continúa accesible');checked++;
 }
 console.log('PASS URLs públicas existentes bloqueadas: '+checked);
 const row=(await db.query("SELECT file_path FROM documents WHERE file_path LIKE 'supabase://%' AND status<>'ELIMINADO' LIMIT 1")).rows[0];
 if(row){const old=process.env.SUPABASE_URL+'/storage/v1/object/public/'+process.env.SUPABASE_BUCKET+'/'+storage.objectPath(row.file_path);const r=await fetch(old);assert(!r.ok,'La antigua URL pública continúa accesible');console.log('PASS antigua URL pública bloqueada');}
 const buffer=fs.readFileSync(path.resolve(__dirname,'../../.private/ficticio.png'));
 let uploaded;
 try{
  uploaded=await storage.uploadFile(buffer,'security-test-'+crypto.randomBytes(12).toString('hex')+'.png','image/png');
  assert.deepEqual(await storage.downloadFile(uploaded.objectRef),buffer);
  const publicUrl=process.env.SUPABASE_URL+'/storage/v1/object/public/'+process.env.SUPABASE_BUCKET+'/'+storage.objectPath(uploaded.objectRef);
  assert(!(await fetch(publicUrl)).ok);
  assert(!(await fetch(publicUrl.replace('/public/','/authenticated/'))).ok);
  console.log('PASS subida, lectura autenticada y denegación de descarga anónima');
 }finally{if(uploaded)assert(await storage.deleteFile(uploaded.objectRef));}
})().catch(e=>{console.error('FAIL',e.message);process.exitCode=1;}).finally(()=>db.pool.end());
