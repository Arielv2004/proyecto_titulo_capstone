require('dotenv').config({quiet:true});
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const directory=path.resolve(process.argv[2]||''),target=process.argv[3];
if(!/^mmr_(restore|security_test)_[a-z0-9_]+$/.test(target||''))throw new Error('Usa una base aislada mmr_restore_<nombre>.');
process.env.DB_NAME=target;
const db=require('../src/config/db'),{open}=require('../src/security/crypto');
const service=require('../src/services/document.service'),storage=require('../src/services/supabase.service');
(async()=>{
 const tombstones=new Set(require('../src/security/deletion-ledger').entries(true).map(row=>row.documentId));
 const name=path.basename(directory);
 const manifest=open(JSON.parse(fs.readFileSync(path.join(directory,'manifest.enc'))),'file-manifest:'+name);
 let restored=0,skipped=0;
 for(const id of manifest.entries){
  if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Manifiesto no válido');
  const row=(await db.query("SELECT * FROM documents WHERE id=$1 AND status<>'ELIMINADO'",[id])).rows[0];
  if(!row||tombstones.has(id)){skipped++;continue;}
  const archived=open(JSON.parse(fs.readFileSync(path.join(directory,id+'.enc'))),'file-backup:'+name+':'+id);
  if(archived.id!==id||archived.patientId!==row.patient_id)throw new Error('Archivo no corresponde al paciente');
  const bytes=Buffer.from(archived.bytes,'base64');
  let existing;
  try{existing=await service.readStoredFile(row);}catch{}
  if(existing){if(!existing.buffer.equals(bytes))throw new Error('El archivo vigente difiere del respaldo');continue;}
  const mime=require('../src/security/files').validateFile(bytes,archived.mimeType);
  const suffix={'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'}[mime];
  const uploaded=await storage.uploadFile(bytes,'restored-'+crypto.randomBytes(20).toString('hex')+suffix,mime);
  await db.query('UPDATE documents SET file_path=$1 WHERE id=$2',[uploaded.objectRef,id]);restored++;
 }
 console.log('Originales recuperados: '+restored+'. Bajas o registros ausentes omitidos: '+skipped+'.');
 if(manifest.missing.length){console.error('El respaldo no contiene todos los originales.');process.exitCode=1;}
})().catch(()=>{console.error('Restauración de originales incompleta. No habilites el destino.');process.exitCode=1;}).finally(()=>db.pool.end());
