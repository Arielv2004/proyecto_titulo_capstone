const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{randomUUID}=require('node:crypto');
require('dotenv').config({quiet:true});
const dotenv=require('dotenv'),{Pool}=require('pg');
const admin=dotenv.parse(fs.readFileSync(path.resolve(__dirname,'../../.private/admin.env')));
const source=process.env.DB_NAME;
const name='mmr_security_test_'+Date.now();
process.env.DELETION_LEDGER_PATH=path.resolve(__dirname,'../../.private/'+name+'-deletions.jsonl');
fs.writeFileSync(process.env.DELETION_LEDGER_PATH,'');
const management=new Pool({host:admin.DB_HOST||'localhost',port:Number(admin.DB_PORT||5432),user:admin.DB_USER,password:admin.DB_PASSWORD,database:source});
let db,server;
function docker(args,input){const r=spawnSync('docker',['exec',...(input?['-i']:[]),'mymedrecord_db',...args],{input,encoding:'utf8',maxBuffer:32*1024*1024});if(r.status!==0)throw Error('Preparación de BD de prueba falló: '+r.stderr);return r.stdout;}
const results=[];
async function check(label,fn){console.log('RUN '+label);await fn();results.push(label);console.log('PASS '+label);}
(async()=>{
 await management.query('CREATE DATABASE '+name);
 const schema=docker(['pg_dump','-U','postgres','--schema-only','--no-owner',source]);
 docker(['psql','-U','postgres','-v','ON_ERROR_STOP=1','-d',name],schema);
 process.env.DB_NAME=name;
 db=require('../src/config/db');
 const clinical=require('../src/security/clinical-store'),sessions=require('../src/security/sessions');
 const docs=require('../src/repositories/document.repository'),service=require('../src/services/document.service');
 const {seal,open}=require('../src/security/crypto');
 const ids=[randomUUID(),randomUUID(),randomUUID()];
 const password='Prueba-Ficticia-2026';
 const hash=await require('bcryptjs').hash(password,10);
 for(let i=0;i<3;i++)await db.query('INSERT INTO users(id,rut,first_name,last_name,email,password_hash,role) VALUES($1,$2,$3,$4,$5,$6,$7)',[ids[i],['11.111.111-1','22.222.222-2','12.345.678-5'][i],'Persona','Ficticia','test'+i+'@example.invalid',hash,i===2?'MEDICO':'PACIENTE']);
 await db.query("INSERT INTO doctor_profiles(user_id,professional_registry,specialty,institution_name_other,verification_status,is_available_for_sharing,verified_at) VALUES($1,'FICTICIO','General','Centro ficticio','VERIFICADO',TRUE,NOW())",[ids[2]]);
 await clinical.create('patient_profiles',{user_id:ids[0],allergies:['Prueba sensible'],blood_type:'O+'});
 const app=require('../src/app');
 await new Promise((resolve,reject)=>{server=app.listen(0,'127.0.0.1',resolve);server.once('error',reject);});
 console.log('HTTP de prueba listo');
 const base='http://127.0.0.1:'+server.address().port+'/api/v1';
 function browser(){const jar={};let csrf;return {jar,async call(method,route,body,withCsrf=true){
  if(!csrf && withCsrf && method!=='GET'){const r=await this.call('GET','/auth/csrf');csrf=r.body.token;}
  const headers={Cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join('; ')};
  const multipart=body instanceof FormData;
  if(body&&!multipart)headers['Content-Type']='application/json';
  if(csrf && withCsrf)headers['x-csrf-token']=csrf;
  const r=await fetch(base+route,{method,headers,body:body?(multipart?body:JSON.stringify(body)):undefined});
  for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0];jar[pair.slice(0,pair.indexOf('='))]=pair.slice(pair.indexOf('=')+1);}
  let data;const text=await r.text();try{data=JSON.parse(text);}catch{data=text;}
  return {status:r.status,body:data,headers:r.headers};
 }};}
 const patient=browser(),other=browser(),doctor=browser(),guest=browser(),second=browser(),stranger=browser();
 patient.jar.mymedrecord_session=await sessions.issue({id:ids[0]});
 other.jar.mymedrecord_session=await sessions.issue({id:ids[1]});
 doctor.jar.mymedrecord_session=await sessions.issue({id:ids[2]});
 await check('Registro con validación de servidor y perfil cifrado',async()=>{
  const registration=browser();
  const body='15000001';let sum=0,m=2;
  for(const d of body.split('').reverse()){sum+=Number(d)*m;m=m===7?2:m+1;}
  const dv=11-sum%11;const rut=body+'-'+(dv===11?'0':dv===10?'K':String(dv));
  const input={rut,firstName:'Registro',lastName:'Ficticio',email:'registro@example.invalid',password,role:'PACIENTE'};
  assert.equal((await registration.call('POST','/auth/register',{...input,password:'corta'})).status,400);
  const response=await registration.call('POST','/auth/register',input);
  assert.equal(response.status,201,JSON.stringify(response.body));
  const profile=(await db.query('SELECT encrypted_payload FROM patient_profiles WHERE user_id=$1',[response.body.data.user.id])).rows[0];assert(profile.encrypted_payload);
 });
 await check('Sesión, CSRF y perfil cifrado',async()=>{
  assert.equal((await patient.call('GET','/auth/me')).status,200);
  assert.equal((await patient.call('POST','/auth/logout',{},false)).status,403);
  const profile=await patient.call('GET','/patient-profile/me');assert.deepEqual(profile.body.data.allergies,['Prueba sensible']);
  const row=(await db.query('SELECT * FROM patient_profiles WHERE user_id=$1',[ids[0]])).rows[0];
  assert.equal(row.allergies,null);assert(!JSON.stringify(row.encrypted_payload).includes('Prueba sensible'));
  const payload=seal({clinical:'x'},'patient:a');assert.throws(()=>open(payload,'patient:b'));payload.tag=Buffer.alloc(16).toString('base64');assert.throws(()=>open(payload,'patient:a'));
 });
 if(process.env.RUN_LIVE_INTEGRATION==='1')await check('Carga real: Storage privado, OCR local, original, confirmación y borrado',async()=>{
  const bytes=fs.readFileSync(path.resolve(__dirname,'../../.private/ficticio.png'));
  const form=new FormData();form.append('file',new Blob([bytes],{type:'image/png'}),'ficticio.png');
  const uploaded=await patient.call('POST','/documents/analyze',form);
  assert.equal(uploaded.status,200,JSON.stringify(uploaded.body));const data=uploaded.body.data;
  assert(data.analysis.raw_text.toUpperCase().includes('FICTICIO'));
  const before=await docs.findById(data.tempId);assert(before.file_path.startsWith('supabase://'));
  assert.equal((await patient.call('POST','/documents/confirm',{tempId:data.tempId,editedData:{document_type:'INFORME',title:'Prueba integral ficticia'},wasReviewed:true})).status,200);
  const file=await patient.call('GET','/documents/'+data.tempId+'/file');assert.equal(file.status,200);assert.equal(file.headers.get('cache-control'),'no-store');
  assert.equal((await other.call('GET','/documents/'+data.tempId+'/file')).status,404);
  const backup=spawnSync(process.execPath,[path.resolve(__dirname,'backup-files.cjs')],{env:process.env,encoding:'utf8'});
  assert.equal(backup.status,0,backup.stdout+backup.stderr);
  const directory=path.resolve(__dirname,'../../.private/backups',backup.stdout.match(/Archivo: (files-[^\r\n]+)/)[1]);
  assert(await require('../src/services/supabase.service').deleteFile(before.file_path));
  const restored=spawnSync(process.execPath,[path.resolve(__dirname,'restore-files.cjs'),directory,name],{env:process.env,encoding:'utf8'});
  assert.equal(restored.status,0,restored.stdout+restored.stderr);
  const restoredDoc=await docs.findById(data.tempId);
  assert.deepEqual(await require('../src/services/supabase.service').downloadFile(restoredDoc.file_path),bytes);
  const removed=await patient.call('DELETE','/documents/'+data.tempId);assert.equal(removed.status,200);assert.equal(removed.body.data.fileDeleted,true);
  await assert.rejects(require('../src/services/supabase.service').downloadFile(restoredDoc.file_path));
  const replay=spawnSync(process.execPath,[path.resolve(__dirname,'restore-files.cjs'),directory,name],{env:process.env,encoding:'utf8'});
  assert.equal(replay.status,0);assert(replay.stdout.includes('omitidos: 1'));
 });
 let doc, snapshotFile;
 const restoreTarget='mmr_restore_'+name;
 await check('Confirmación, edición, lectura e IDOR documental',async()=>{
  doc=await docs.createDocument({patient_id:ids[0],uploaded_by:ids[0],title:'Ficticio',file_name:'test.pdf',file_path:'supabase://medical-documents/no-real-file.pdf',mime_type:'application/pdf',document_type:'RECETA',status:'TEMP',ocr_raw_text:'Texto temporal ficticio'});
  assert.equal((await other.call('POST','/documents/confirm',{tempId:doc.id,editedData:{},wasReviewed:true})).status,403);
  const confirmed=await patient.call('POST','/documents/confirm',{tempId:doc.id,editedData:{document_type:'RECETA',medications:[{name:'Medicamento ficticio'}]},wasReviewed:true});
  assert.equal(confirmed.status,200,JSON.stringify(confirmed.body));
  assert.equal((await docs.findById(doc.id)).ocr_raw_text,null);
  assert.equal((await patient.call('GET','/documents/'+doc.id)).body.data.structured.items[0].medication_name,'Medicamento ficticio');
  assert.equal((await other.call('GET','/documents/'+doc.id)).status,403);
  assert.equal((await other.call('PATCH','/documents/'+doc.id,{title:'Intrusión'})).status,404);
  assert.equal((await other.call('DELETE','/documents/'+doc.id)).status,403);
  assert.equal((await patient.call('PATCH','/documents/'+doc.id,{title:'Actualizado'})).status,200);
  assert.equal((await docs.findById(doc.id)).title,'Actualizado');
 });
 let grant,grant2;
 await check('QR: no entrega datos antes de aprobar y no transfiere sesión',async()=>{
  grant=(await patient.call('POST','/access-grants/generate',{durationHours:1})).body.data;
  grant2=(await patient.call('POST','/access-grants/generate',{durationHours:1})).body.data;
  assert.notEqual(grant.token,grant2.token);
  const requested=await guest.call('POST','/access-grants/validate',{token:grant.token,doctorRut:'12.345.678-5',doctorName:'Invitado ficticio'});
  assert.equal(requested.status,202,JSON.stringify(requested.body));
  assert.equal(requested.body.data.clinicalData,undefined);
  assert.equal((await guest.call('GET','/access-grants/qr/record')).status,403);
  const pending=(await patient.call('GET','/access-grants/qr/requests')).body.data;
  assert.equal(pending.length,1);
  assert.equal((await other.call('POST','/access-grants/qr/requests/'+pending[0].id+'/decision',{decision:'APPROVED'})).status,409);
  assert.equal((await patient.call('POST','/access-grants/qr/requests/'+pending[0].id+'/decision',{decision:'APPROVED'})).status,200);
  const record=await guest.call('GET','/access-grants/qr/record');assert.equal(record.status,200,JSON.stringify(record.body));
  assert.equal(record.body.data.grant.identityType,'DECLARED');
  assert.equal((await stranger.call('POST','/access-grants/qr/check',{token:grant.token})).status,403);
  assert.equal((await stranger.call('POST','/access-grants/qr/document-file',{token:grant.token,documentId:doc.id})).status,403);
 });
 await check('Dos pases independientes, revocación y caducidad de solicitud',async()=>{
  const requested=await second.call('POST','/access-grants/validate',{token:grant2.token,doctorRut:'12.345.678-5',doctorName:'Segundo ficticio'});
  const requestId=requested.body.data.id;
  await patient.call('POST','/access-grants/qr/requests/'+requestId+'/decision',{decision:'APPROVED'});
  await patient.call('PATCH','/access-grants/'+grant.id+'/revoke',{});
  assert.equal((await guest.call('GET','/access-grants/qr/record')).status,403);
  assert.equal((await second.call('GET','/access-grants/qr/record')).status,200);
  const third=browser();const r=await third.call('POST','/access-grants/validate',{token:grant2.token,doctorRut:'12.345.678-5',doctorName:'Expirado ficticio'});
  await db.query("UPDATE qr_consultations SET request_expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[r.body.data.id]);
  assert.equal((await third.call('GET','/access-grants/qr/status')).status,410);
 });
 await check('Médico verificado, permiso propio y suspensión',async()=>{
  const shared=await patient.call('POST','/access-grants/share',{doctorId:ids[2],durationHours:1});
  assert.equal(shared.status,201,JSON.stringify(shared.body));const token=shared.body.data.token;
  assert.equal((await doctor.call('GET','/access-grants/direct/'+token)).status,200);
  await db.query("UPDATE doctor_profiles SET verification_status='PENDIENTE' WHERE user_id=$1",[ids[2]]);
  assert.equal((await doctor.call('GET','/access-grants/direct/'+token)).status,403);
  assert.equal((await doctor.call('GET','/access-grants/direct/'+token+'/documents/'+doc.id+'/file')).status,403);
 });
 snapshotFile=path.resolve(__dirname,'../../.private/backups/'+name+'.json.enc');
 fs.mkdirSync(path.dirname(snapshotFile),{recursive:true});
 const dump=docker(['pg_dump','-U','postgres','--no-owner','--no-acl',name]);
 fs.writeFileSync(snapshotFile,JSON.stringify(seal({dump:Buffer.from(dump).toString('base64'),createdAt:new Date()},'backup:'+path.basename(snapshotFile))));
 await check('Borrado pendiente, reintento y limpieza de temporales',async()=>{
  const original=service._removeStoredFile;service._removeStoredFile=async()=>false;
  try {
   const deleted=await patient.call('DELETE','/documents/'+doc.id);
   assert.equal(deleted.status,200);assert.equal(deleted.body.data.fileDeleted,false);
   assert.equal((await patient.call('GET','/documents/'+doc.id)).status,404);
   const queue=(await db.query('SELECT * FROM document_deletions WHERE document_id=$1',[doc.id])).rows[0];assert.equal(queue.completed_at,null);
   service._removeStoredFile=async()=>true;
   await require('../src/security/maintenance').erase(doc.id);
   assert((await db.query('SELECT completed_at FROM document_deletions WHERE document_id=$1',[doc.id])).rows[0].completed_at);
   assert.equal((await db.query('SELECT count(*)::int n FROM prescriptions WHERE document_id=$1',[doc.id])).rows[0].n,0);
   const temp=await docs.createDocument({patient_id:ids[0],uploaded_by:ids[0],title:'Abandonado',file_name:'temp.pdf',file_path:'unused',mime_type:'application/pdf',document_type:'OTRO',status:'TEMP',ocr_raw_text:'Descartar'});
   await db.query("UPDATE documents SET created_at=NOW()-INTERVAL '25 hours' WHERE id=$1",[temp.id]);
   await require('../src/security/maintenance').run();
   assert.equal((await docs.findById(temp.id)).status,'ELIMINADO');
   assert.equal((await docs.findById(temp.id)).ocr_raw_text,null);
  }finally{service._removeStoredFile=original;}
 });
 await check('Exportación y aceptación versionada',async()=>{
  assert.equal((await patient.call('POST','/privacy/notice/accept',{version:'2026-10-25.1',accepted:true})).status,200);
  assert((await patient.call('GET','/privacy/notice')).body.data.acceptedAt);
  const exported=await patient.call('GET','/privacy/export');assert.equal(exported.status,200);assert.equal(exported.body.profile.user_id,ids[0]);assert.equal(exported.body.documents.length,0);
 });
 await check('Auditoría protegida y usuario sin superprivilegios',async()=>{
  await assert.rejects(db.query("UPDATE audit_logs SET action='ALTERADO'"),e=>e.code==='42501');
  await assert.rejects(db.query('DELETE FROM audit_logs'),e=>e.code==='42501');
  const role=(await db.query('SELECT rolsuper,rolcreaterole FROM pg_roles WHERE rolname=current_user')).rows[0];assert.equal(role.rolsuper,false);assert.equal(role.rolcreaterole,false);
 });
 if(process.env.PLAYWRIGHT_MODULE) await check('Navegador: QR, aprobación, móvil y revocación',async()=>{
  const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
  const errors=[];
  try{
   const pc=await browser.newContext({viewport:{width:1280,height:900}});
   await pc.addCookies([{name:'mymedrecord_session',value:patient.jar.mymedrecord_session,url:'http://localhost:5173',httpOnly:true,sameSite:'Strict'}]);
   const gc=await browser.newContext({viewport:{width:393,height:852}});
   for(const context of [pc,gc])await context.addInitScript(()=>{localStorage.setItem('mymedrecord_cookie_consent','essential_only');localStorage.setItem('mymedrecord_theme','dark');});
   for(const context of [pc,gc])await context.route('**/api/v1/**',async route=>{
    const request=route.request();
    const response=await route.fetch({url:base+new URL(request.url()).pathname.replace('/api/v1','')+new URL(request.url()).search});
    await route.fulfill({response});
   });
   const pp=await pc.newPage(),gp=await gc.newPage();
   for(const page of [pp,gp])page.on('pageerror',e=>errors.push(e.message));
   await pp.goto('http://localhost:5173/patient');
   const fresh=(await patient.call('POST','/access-grants/generate',{durationHours:1})).body.data;
   await gp.goto('http://localhost:5173/doctor/qr-access#token='+fresh.token);
   await gp.getByPlaceholder('Ej.: 12.345.678-5').fill('12.345.678-5');
   await gp.getByPlaceholder('Ej.: Dra. María González').fill('Visitante ficticio UI');
   await gp.getByPlaceholder('Ej.: Hospital Regional').fill('Centro ficticio');
   await gp.getByRole('button',{name:'Solicitar aprobación al paciente'}).click();
   await gp.getByText('Esperando aprobación del paciente',{exact:true}).waitFor();
   assert(!gp.url().includes(fresh.token));
   const card=pp.getByRole('region',{name:'Solicitudes de consulta QR'});
   await card.getByText('Visitante ficticio UI',{exact:true}).waitFor({timeout:15000});
   await pp.screenshot({path:path.resolve(__dirname,'../../.private/patient-approval-desktop.png'),fullPage:true});
   await card.getByRole('button',{name:'Aprobar consulta'}).click();
   await gp.getByText('Consentimiento temporal vigente',{exact:true}).waitFor({timeout:15000});
   assert.equal(await gp.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
   await gp.screenshot({path:path.resolve(__dirname,'../../.private/qr-approved-mobile.png'),fullPage:true});
   await patient.call('PATCH','/access-grants/'+fresh.id+'/revoke',{});
   await gp.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await gp.getByText('El código QR fue revocado o expiró.',{exact:true}).waitFor({timeout:10000});
   assert.deepEqual(errors,[]);
  } finally {await browser.close();}
 });
 await check('Logout, cuenta inactiva y límite de login',async()=>{
  const token=patient.jar.mymedrecord_session;
  assert.equal((await patient.call('POST','/auth/logout',{})).status,200);patient.jar.mymedrecord_session=token;
  assert.equal((await patient.call('GET','/auth/me')).status,401);
  await db.query('UPDATE users SET is_active=FALSE WHERE id=$1',[ids[1]]);
  assert.equal((await other.call('GET','/auth/me')).status,401);
  await db.query('UPDATE users SET is_active=TRUE WHERE id=$1',[ids[1]]);
  assert.equal((await other.call('GET','/auth/me')).status,401);
  const login=browser();assert.equal((await login.call('POST','/auth/login',{email:'test0@example.invalid',password})).status,200);
  for(let i=0;i<10;i++)await login.call('POST','/auth/login',{email:'test0@example.invalid',password:'incorrecta'});
  assert.equal((await login.call('POST','/auth/login',{email:'test0@example.invalid',password})).status,429);
 });
 await check('Restauración: descifrado y bajas posteriores al respaldo',async()=>{
  const result=spawnSync(process.execPath,[path.resolve(__dirname,'restore-security.cjs'),snapshotFile,restoreTarget],{env:process.env,encoding:'utf8',maxBuffer:2000000});
  assert.equal(result.status,0,result.stdout+result.stderr);
  const restored=new Pool({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:restoreTarget});
  try {
   assert.equal((await restored.query('SELECT status FROM documents WHERE id=$1',[doc.id])).rows[0].status,'ELIMINADO');
   assert.equal((await restored.query('SELECT count(*)::int n FROM access_grants WHERE NOT is_revoked')).rows[0].n,0);
   assert.equal((await restored.query('SELECT count(*)::int n FROM auth_sessions')).rows[0].n,0);
   const profile=(await restored.query('SELECT * FROM patient_profiles WHERE user_id=$1',[ids[0]])).rows[0];
   assert.deepEqual((await clinical.decode('patient_profiles',profile,restored)).allergies,['Prueba sensible']);
  }finally{await restored.end();}
 });
 fs.mkdirSync(path.resolve(__dirname,'../../.private'),{recursive:true});
 fs.writeFileSync(path.resolve(__dirname,'../../.private/security-test-results.json'),JSON.stringify({at:new Date(),results},null,2));
})().catch(e=>{console.error('FAIL',e.stack);process.exitCode=1;}).finally(async()=>{
 if(server)await new Promise(r=>server.close(r));
 if(db)await db.pool.end();
 await management.query('DROP DATABASE IF EXISTS mmr_restore_'+name+' WITH (FORCE)');
 const ledgerFile=process.env.DELETION_LEDGER_PATH;
 if(ledgerFile?.startsWith(path.resolve(__dirname,'../../.private')+path.sep)&&fs.existsSync(ledgerFile))fs.unlinkSync(ledgerFile);
 if(/^mmr_security_test_\d+$/.test(name))await management.query('DROP DATABASE IF EXISTS '+name+' WITH (FORCE)');
 await management.end();
});
