require('dotenv').config({quiet:true});
const fs=require('node:fs');
const path=require('node:path');
const {Pool}=require('pg');
const {seal,open,digest}=require('../src/security/crypto');
const clinical=require('../src/security/clinical-store');
const db=require('../src/config/db');
const admin=require('dotenv').parse(fs.readFileSync(path.resolve(__dirname,'../../.private/admin.env')));
const pool=new Pool({host:admin.DB_HOST||'localhost',port:Number(admin.DB_PORT||5432),user:admin.DB_USER,password:admin.DB_PASSWORD,database:admin.DB_NAME||'mymedrecord'});
(async()=>{
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('mymedrecord-security-migration'))");
  await client.query(fs.readFileSync(path.resolve(__dirname,'../migrations/001_sensitive_data.sql'),'utf8'));
  await client.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS encrypted_payload jsonb');
  const applied=(await client.query("SELECT 1 FROM schema_migrations WHERE name='001_sensitive_data'")).rowCount;
  if(!applied) {
   for(const table of Object.keys(clinical.fields)) {
    const rows=(await client.query('SELECT * FROM '+table+' FOR UPDATE')).rows;
    for(const row of rows) {
     const plain=await clinical.decode(table,row,client);
     if(table==='documents' && plain.status!=='TEMP') plain.ocr_raw_text=null;
     const encoded=await clinical.encode(table,plain,client);
     const names=[...clinical.fields[table],'encrypted_payload'];
     await client.query('UPDATE '+table+' SET '+names.map((name,i)=>name+'=$'+(i+1)).join(',')+' WHERE id=$'+(names.length+1),[...names.map(name=>encoded[name]),row.id]);
     const verified=await clinical.decode(table,encoded,client);
     for(const field of clinical.fields[table]) if(JSON.stringify(verified[field])!==JSON.stringify(plain[field]??null)) throw new Error('Falló verificación del cifrado en '+table);
    }
   }
   const grants=(await client.query('SELECT * FROM access_grants FOR UPDATE')).rows;
   for(const grant of grants) {
    const context='grant:'+grant.id+':'+grant.patient_id;
    const token=grant.token_cipher?open(grant.token_cipher,context):grant.token;
    await client.query("UPDATE access_grants SET token=$1,token_hash=$2,token_cipher=$3,is_revoked=CASE WHEN grant_type='QR_TEMPORAL' THEN TRUE ELSE is_revoked END WHERE id=$4",['sealed:'+grant.id,digest(token),seal(token,context),grant.id]);
   }
   const bucket=process.env.SUPABASE_BUCKET||'medical-documents';
   const docs=(await client.query('SELECT id,file_path FROM documents')).rows;
   for(const doc of docs) {
    const marker='/storage/v1/object/public/'+bucket+'/';
    if(doc.file_path.includes(marker)) await client.query('UPDATE documents SET file_path=$1 WHERE id=$2',['supabase://'+bucket+'/'+doc.file_path.split(marker)[1].split('?')[0],doc.id]);
   }
   await client.query("UPDATE audit_logs SET details=details-'token'-'raw_text'-'ocr_raw_text'-'error'");
   await client.query("INSERT INTO schema_migrations(name) VALUES('001_sensitive_data')");
  }
  await client.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS encrypted_payload jsonb');
  const appointments=(await client.query('SELECT * FROM appointments WHERE encrypted_payload IS NULL FOR UPDATE')).rows;
  for(const row of appointments) {
    const encrypted=await clinical.encode('appointments',row,client);
    await client.query('UPDATE appointments SET reason=NULL,encrypted_payload=$1 WHERE id=$2',[encrypted.encrypted_payload,row.id]);
  }
  await client.query("UPDATE audit_logs SET details=details-'bloodType'-'healthInsurance'-'file_name'");
  await client.query(fs.readFileSync(path.resolve(__dirname,'../migrations/002_account_revocation.sql'),'utf8'));
  await client.query("INSERT INTO schema_migrations(name) VALUES('002_account_revocation') ON CONFLICT DO NOTHING");
  for(const [table,fields] of Object.entries(clinical.fields)) {
    await client.query('ALTER TABLE '+table+' ALTER COLUMN encrypted_payload SET NOT NULL');
    const required=new Set(['title','file_name','medication_name','test_name','result_value']);
    const condition=fields.map(field=>required.has(field)?field+" = '[cifrado]'":field+' IS NULL').join(' AND ');
    const constraint=table+'_clinical_cipher_only';
    if(!(await client.query('SELECT 1 FROM pg_constraint WHERE conname=$1',[constraint])).rowCount) {
      await client.query('ALTER TABLE '+table+' ADD CONSTRAINT '+constraint+' CHECK ('+condition+')');
    }
  }
  await client.query("INSERT INTO schema_migrations(name) VALUES('003_cipher_constraints') ON CONFLICT DO NOTHING");
  await client.query('COMMIT');
  console.log('Migración aplicada; contenido cifrado verificado y QR anteriores invalidados.');
 } catch(error) { await client.query('ROLLBACK'); throw error; }
 finally { client.release(); await pool.end(); await db.pool.end(); }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
