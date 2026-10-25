const router=require('express').Router();
const db=require('../config/db');
const auth=require('../middlewares/auth.middleware');
const patient=require('../middlewares/rbac.middleware')('PACIENTE');
const VERSION='2026-10-25.1';
router.use(auth,patient);
router.get('/notice',async(req,res,next)=>{try{
 const row=(await db.query('SELECT accepted_at FROM privacy_acceptances WHERE user_id=$1 AND version=$2',[req.user.id,VERSION])).rows[0];
 res.json({success:true,data:{version:VERSION,acceptedAt:row?.accepted_at||null}});
}catch(e){next(e);}});
router.post('/notice/accept',async(req,res,next)=>{try{
 if(req.body?.version!==VERSION||req.body?.accepted!==true)return res.status(400).json({success:false,message:'Debes aceptar la versión actual del aviso.'});
 await db.query('INSERT INTO privacy_acceptances(user_id,version) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,VERSION]);
 res.json({success:true});
}catch(e){next(e);}});
router.get('/export',require('./http').rateLimit('export',5,3600),async(req,res,next)=>{try{
 const profile=await require('../repositories/patient-profile.repository').findByUserId(req.user.id);
 const documents=await require('../repositories/document.repository').findByPatient(req.user.id);
 const acceptance=(await db.query('SELECT version,accepted_at FROM privacy_acceptances WHERE user_id=$1',[req.user.id])).rows;
 await db.query("INSERT INTO audit_logs(user_id,patient_id,action,details,ip_address) VALUES($1,$1,'EXPORT_PATIENT_DATA','{}',$2)",[req.user.id,req.ip]);
 res.attachment('mymedrecord-datos.json').json({exportVersion:1,exportedAt:new Date(),profile,documents,privacyAcceptance:acceptance,originals:'Los archivos originales se descargan desde Mi ficha con tu sesión vigente.'});
}catch(e){next(e);}});
module.exports=router;
