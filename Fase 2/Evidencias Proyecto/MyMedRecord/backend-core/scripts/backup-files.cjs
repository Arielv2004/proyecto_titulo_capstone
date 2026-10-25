require('dotenv').config({quiet:true});
const fs=require('node:fs'),path=require('node:path');
const {seal,open}=require('../src/security/crypto');
const db=require('../src/config/db'),storage=require('../src/services/document.service');
(async()=>{
 const name='files-'+new Date().toISOString().replace(/[:.]/g,'-');
 const directory=path.resolve(__dirname,'../../.private/backups',name);
 fs.mkdirSync(directory,{recursive:true});
 const rows=(await db.query("SELECT id,patient_id,file_path,mime_type FROM documents WHERE status<>'ELIMINADO'")).rows;
 const entries=[],missing=[];
 for(const row of rows){
  try {
   const file=await storage.readStoredFile(row);
   const envelope=seal({id:row.id,patientId:row.patient_id,ref:row.file_path,mimeType:row.mime_type,bytes:file.buffer.toString('base64')},'file-backup:'+name+':'+row.id);
   if(open(envelope,'file-backup:'+name+':'+row.id).bytes!==file.buffer.toString('base64'))throw new Error('Integridad');
   fs.writeFileSync(path.join(directory,row.id+'.enc'),JSON.stringify(envelope));
   entries.push(row.id);
  }catch{missing.push(row.id);}
 }
 fs.writeFileSync(path.join(directory,'manifest.enc'),JSON.stringify(seal({createdAt:new Date(),entries,missing},'file-manifest:'+name)));
 console.log('Archivo: '+name);
 console.log('Archivos respaldados y verificados: '+entries.length+'. No disponibles: '+missing.length+'.');
 if(missing.length){console.error('Respaldo incompleto: consulta el manifiesto cifrado.');process.exitCode=1;}
})().catch(()=>{console.error('Respaldo de archivos no completado.');process.exitCode=1;}).finally(()=>db.pool.end());
