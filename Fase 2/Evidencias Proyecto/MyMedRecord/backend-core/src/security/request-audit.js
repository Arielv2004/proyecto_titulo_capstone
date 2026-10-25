const db=require('../config/db');
module.exports=(req,res,next)=>{
 res.on('finish',()=>{
  const route=req.route?.path;
  if(typeof route!=='string' || ['/health','/csrf','/qr/status','/qr/requests','/me'].includes(route)) return;
  if(!req.user && res.statusCode<400 && !req.auditPatientId) return;
  const details={route,method:req.method,result:res.statusCode<400?'SUCCESS':'DENIED_OR_FAILED',httpStatus:res.statusCode,identityType:req.user?'AUTHENTICATED':req.auditPatientId?'DECLARED':'ANONYMOUS'};
  db.query('INSERT INTO audit_logs(user_id,patient_id,action,details,ip_address) VALUES($1,$2,$3,$4,$5)',
    [req.user?.id||null,req.auditPatientId||(req.user?.role==='PACIENTE'?req.user.id:null),'HTTP_ACCESS',JSON.stringify(details),req.ip])
    .catch(()=>console.error('[Auditoría] No se pudo registrar un evento HTTP.'));
 });
 next();
};
