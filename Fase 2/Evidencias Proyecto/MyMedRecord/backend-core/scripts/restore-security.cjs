require('dotenv').config({quiet:true});
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {Pool}=require('pg'),dotenv=require('dotenv');
const {open}=require('../src/security/crypto');
const clinical=require('../src/security/clinical-store');
const ledger=require('../src/security/deletion-ledger');
const backupFile=process.argv[2],target=process.argv[3];
if(!backupFile||!/^mmr_restore_[a-z0-9_]+$/.test(target||''))throw new Error('Uso: node scripts/restore-security.cjs <respaldo> mmr_restore_<nombre>. Solo restaura a una BD nueva.');
const archive=open(JSON.parse(fs.readFileSync(backupFile,'utf8')),'backup:'+path.basename(backupFile));
const tombstones=ledger.entries(true);
const admin=dotenv.parse(fs.readFileSync(path.resolve(__dirname,'../../.private/admin.env')));
const options={host:admin.DB_HOST||'localhost',port:Number(admin.DB_PORT||5432),user:admin.DB_USER,password:admin.DB_PASSWORD};
const manager=new Pool({...options,database:admin.DB_NAME||'mymedrecord'});
let restored;
(async()=>{
 await manager.query('CREATE DATABASE '+target);
 const result=spawnSync('docker',['exec','-i','mymedrecord_db','psql','-U','postgres','-v','ON_ERROR_STOP=1','-d',target],{input:Buffer.from(archive.dump,'base64'),maxBuffer:16*1024*1024});
 if(result.status!==0)throw new Error('Restauración fallida; la BD destino no debe usarse.');
 restored=new Pool({...options,database:target});
 const migrated=(await restored.query("SELECT to_regclass('public.auth_sessions') AS t")).rows[0].t;
 if(!migrated)throw new Error('El respaldo es anterior a la migración. Mantén la BD aislada y migra antes de habilitarla.');
 await restored.query("UPDATE access_grants SET is_revoked=TRUE");
 await restored.query('DELETE FROM auth_sessions');
 await restored.query('DELETE FROM qr_consultations');
 for(const entry of tombstones){
  const row=(await restored.query('SELECT * FROM documents WHERE id=$1 AND patient_id=$2',[entry.documentId,entry.patientId])).rows[0];
  if(!row)continue;
  await restored.query('DELETE FROM prescriptions WHERE document_id=$1',[row.id]);
  await restored.query('DELETE FROM lab_reports WHERE document_id=$1',[row.id]);
  await clinical.update('documents',row.id,{status:'ELIMINADO',...Object.fromEntries(clinical.fields.documents.map(key=>[key,null]))},restored);
  await restored.query('INSERT INTO document_deletions(document_id,patient_id) VALUES($1,$2) ON CONFLICT(document_id) DO UPDATE SET completed_at=NULL,next_attempt_at=NOW()',[row.id,row.patient_id]);
 }
 let count=0;
 for(const table of Object.keys(clinical.fields)){
  for(const row of (await restored.query('SELECT * FROM '+table)).rows){await clinical.decode(table,row,restored);count++;}
 }
 await restored.query('GRANT USAGE ON SCHEMA public TO mymedrecord_app');
 await restored.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO mymedrecord_app');
 await restored.query('REVOKE UPDATE,DELETE,TRUNCATE ON audit_logs FROM mymedrecord_app');
 await restored.query('REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON schema_migrations FROM mymedrecord_app');
 console.log('Restauración aislada verificada: '+count+' registros descifrados. Sesiones y permisos anulados; bajas posteriores reaplicadas.');
})().catch(()=>{console.error('Restauración no validada. Mantén el destino aislado.');process.exitCode=1;}).finally(async()=>{if(restored)await restored.end();await manager.end();await require('../src/config/db').pool.end();});
