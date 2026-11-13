const db=require('../config/db');
const {randomUUID}=require('node:crypto');
const {seal,open,digest,randomToken}=require('./crypto');
const grants=require('../repositories/access-grant.repository');
const documents=require('../services/document.service');
const {isValidRut}=require('../utils/rut.util');
const COOKIE='mymedrecord_consultation';
const fail=(message,statusCode=403)=>Object.assign(new Error(message),{statusCode});
const wrap=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(e){next(e);}};
async function audit(req,patientId,action,id,actor=null) {
  await db.query('INSERT INTO audit_logs(user_id,patient_id,action,details,ip_address) VALUES($1,$2,$3,$4,$5)',[actor,patientId,action,JSON.stringify({resourceId:id,modality:'QR',identityType:actor?'AUTHENTICATED':'DECLARED',result:'SUCCESS'}),req.ip]);
}
async function session(req,approved=true) {
  const credential=req.cookies?.[COOKIE];
  if(!credential) throw fail('Solicita autorización al paciente.');
  const row=(await db.query(`SELECT c.*,g.patient_id,g.is_revoked,g.expires_at AS grant_expires_at,u.is_active
    FROM qr_consultations c JOIN access_grants g ON g.id=c.grant_id JOIN users u ON u.id=g.patient_id
    WHERE c.credential_hash=$1`,[digest(credential)])).rows[0];
  if(!row || !row.is_active || row.is_revoked || new Date(row.grant_expires_at)<=new Date() || new Date(row.expires_at)<=new Date()) throw fail('El permiso no está vigente.');
  if(row.status==='PENDING' && new Date(row.request_expires_at)<=new Date()) throw fail('La solicitud caducó. Solicita un nuevo acceso.',410);
  if(approved && row.status!=='APPROVED') throw fail('El paciente todavía no ha aprobado esta consulta.');
  req.auditPatientId=row.patient_id;
  return row;
}
// Exchange the public QR once. Only its first reader receives the credential
// needed to complete identification. Neither operation grants clinical access.
async function takePass(token, replacementHash) {
  const reserved = token.startsWith('scan.');
  const result = await db.query(`UPDATE access_grants g
    SET token_hash=$2, access_count=1
    WHERE g.token_hash=$1 AND grant_type='QR_TEMPORAL'
      AND access_count=$3 AND NOT is_revoked AND expires_at>NOW()
      AND COALESCE(starts_at,created_at)<=NOW()
      AND EXISTS (SELECT 1 FROM users WHERE id=g.patient_id AND is_active)
      AND NOT EXISTS (SELECT 1 FROM qr_consultations WHERE grant_id=g.id)
    RETURNING g.id,g.patient_id,g.expires_at`,[digest(token),replacementHash,reserved ? 1 : 0]);
  if (!result.rowCount) throw fail('Este pase ya se utilizó o dejó de estar vigente. Solicita otro al paciente.',410);
  return result.rows[0];
}
exports.scan=wrap(async(req,res)=>{
  const token=req.body?.token;
  if(typeof token!=='string'||!token.trim()||token.length>150||token.trim().startsWith('scan.')) throw fail('Código QR no válido.',400);
  const credential='scan.'+randomToken();
  await takePass(token.trim(),digest(credential));
  res.set('Cache-Control','no-store').json({success:true,credential});
});
exports.request=wrap(async(req,res)=>{
  const {token,doctorRut,doctorName,doctorInstitution=''}=req.body||{};
  if(typeof token!=='string'||token.length>150||!isValidRut(doctorRut)||typeof doctorName!=='string'||!doctorName.trim()||doctorName.length>150||typeof doctorInstitution!=='string'||doctorInstitution.length>150) throw fail('Completa una identificación válida.',400);
  const id=randomUUID(),credential=randomToken();
  const grant=await db.transaction(async()=>{
    const grant=await takePass(token.trim(),null);
    await db.query(`INSERT INTO qr_consultations(id,grant_id,credential_hash,status,declared_identity,request_expires_at,expires_at)
      VALUES($1,$2,$3,'PENDING',$4,LEAST(NOW()+INTERVAL '5 minutes',$5),$5)`,
      [id,grant.id,digest(credential),seal({doctorRut:doctorRut.trim(),doctorName:doctorName.trim(),doctorInstitution:doctorInstitution.trim()},'consultation:'+id),grant.expires_at]);
    await audit(req,grant.patient_id,'QR_REQUEST',id);
    return grant;
  });
  res.cookie(COOKIE,credential,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',expires:new Date(grant.expires_at)});
  res.status(202).json({success:true,data:{id,status:'PENDING',requestExpiresAt:new Date(Math.min(Date.now()+300000,new Date(grant.expires_at).getTime()))}});
});
exports.status=wrap(async(req,res)=>{
 const row=await session(req,false);
 res.json({success:true,data:{id:row.id,status:row.status,requestExpiresAt:row.request_expires_at}});
});
exports.pending=wrap(async(req,res)=>{
 const rows=(await db.query(`SELECT c.* FROM qr_consultations c JOIN access_grants g ON g.id=c.grant_id
 WHERE g.patient_id=$1 AND NOT g.is_revoked AND g.expires_at>NOW() AND c.status='PENDING' AND c.request_expires_at>NOW() ORDER BY c.created_at`,[req.user.id])).rows;
 res.json({success:true,data:rows.map(r=>({id:r.id,grantId:r.grant_id,createdAt:r.created_at,requestExpiresAt:r.request_expires_at,...open(r.declared_identity,'consultation:'+r.id)}))});
});
exports.decide=wrap(async(req,res)=>{
 if(!['APPROVED','REJECTED'].includes(req.body?.decision)||!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw fail('Decisión no válida.',400);
 await db.transaction(async()=>{
 const row=(await db.query(`SELECT c.*,g.patient_id,g.is_revoked,g.expires_at AS grant_expires_at FROM qr_consultations c
 JOIN access_grants g ON g.id=c.grant_id WHERE c.id=$1 AND g.patient_id=$2 FOR UPDATE OF c,g`,[req.params.id,req.user.id])).rows[0];
 if(!row||row.status!=='PENDING'||row.is_revoked||new Date(row.request_expires_at)<=new Date()||new Date(row.grant_expires_at)<=new Date()) throw fail('La solicitud ya no está disponible.',409);
 await db.query('UPDATE qr_consultations SET status=$1,decided_at=NOW() WHERE id=$2',[req.body.decision,row.id]);
 await audit(req,req.user.id,'QR_'+req.body.decision,row.id,req.user.id);
 });
 res.json({success:true});
});
exports.record=wrap(async(req,res)=>{
 const row=await session(req);
 const clinicalData=await grants.getPatientClinicalData(row.patient_id);
 if(!clinicalData) throw fail('Ficha no disponible.',404);
 await audit(req,row.patient_id,'CONSULTA_MEDICA_QR',row.id);
 res.json({success:true,data:{clinicalData,grant:{id:row.grant_id,grantType:'QR_TEMPORAL',expiresAt:row.expires_at,minutesRemaining:Math.max(0,Math.ceil((new Date(row.expires_at)-Date.now())/60000)),identityType:'DECLARED',...open(row.declared_identity,'consultation:'+row.id)}}});
});
exports.check=wrap(async(req,res)=>{
 const row=await session(req);
 res.json({success:true,minutesRemaining:Math.max(0,Math.ceil((new Date(row.expires_at)-Date.now())/60000))});
});
exports.file=wrap(async(req,res)=>{
 const row=await session(req);
 const file=await documents.getDocumentFile(req.body?.documentId,row.patient_id);
 await audit(req,row.patient_id,'VIEW_SHARED_DOCUMENT',req.body.documentId);
 res.type(file.mimeType).set('Content-Disposition','inline; filename="documento"').send(file.buffer);
});
exports.end=wrap(async(req,res)=>{
 const credential=req.cookies?.[COOKIE];
 if(credential) await db.query("UPDATE qr_consultations SET status='REJECTED',decided_at=NOW() WHERE credential_hash=$1",[digest(credential)]);
 res.clearCookie(COOKIE,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/'});
 res.json({success:true});
});
exports.session=session;
